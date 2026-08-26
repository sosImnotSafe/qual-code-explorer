import json
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def test_dataset():
    data_path = os.path.join(BASE_DIR, 'dataset', 'unified_data.json')
    data = json.load(open(data_path, 'r', encoding='utf-8'))
    
    assert len(data['conversations']) == 1137, f"Expected 1137 convs, got {len(data['conversations'])}"
    assert data['meta']['n_human_conversations'] == 228
    assert data['meta']['n_llm_conversations'] == 909
    assert sum(len(c['turns']) for c in data['conversations']) == 4548

    # Verify coders naming (feedback 3: only 'LLM', no model names)
    assert data['meta']['coders'] == ['Coder_A', 'Coder_B', 'Coder_C', 'LLM']
    for c in data['conversations']:
        if c['source'] == 'llm':
            assert c['coder'] == 'LLM', f"Expected coder 'LLM', got '{c['coder']}'"
    for coder in data['meta']['coders']:
        assert 'gemini' not in coder.lower() and 'flash' not in coder.lower() and '3.7' not in coder, f"Unexpected model name in coder: {coder}"

    # Verify custom Belief State ordering (feedback 1: certain, incertain, high/low investment, high/low strength, maintaining, repeat, becoming, turning point)
    bs_family = next((f for f in data['families'] if f['family'] == 'BELIEF-STATE'), None)
    assert bs_family is not None, "BELIEF-STATE family not found"
    expected_bs_order = [
        'BELIEF-STATE-Certain',
        'BELIEF-STATE-Uncertain',
        'BELIEF-STATE-High-Investment',
        'BELIEF-STATE-Low-Investment',
        'BELIEF-STATE-High-Strength',
        'BELIEF-STATE-Low-Strength',
        'BELIEF-STATE-Maintaining-Certainty',
        'BELIEF-STATE-Repetition-or-Resistance',
        'BELIEF-STATE-Becoming-Uncertain',
        'BELIEF-STATE-Turning-Point'
    ]
    actual_bs_order = [s['code'] for s in bs_family['subs']]
    assert actual_bs_order == expected_bs_order, f"Expected BELIEF-STATE order {expected_bs_order}, got {actual_bs_order}"

    # Verify pre_scores all start from 50 (feedback 4)
    min_pre = min(c['pre_score'] for c in data['conversations'])
    assert min_pre >= 50.0, f"Expected min pre_score >= 50, got {min_pre}"

    # Verify AI responses are present for turns 1, 2, 3 in all conversations (feedback 2)
    for c in data['conversations']:
        assert len(c['turns'][0].get('ai_response', '')) > 0, f"Missing T1 AI response in participant {c['participant_id']}"
        assert len(c['turns'][1].get('ai_response', '')) > 0, f"Missing T2 AI response in participant {c['participant_id']}"
        assert len(c['turns'][2].get('ai_response', '')) > 0, f"Missing T3 AI response in participant {c['participant_id']}"

    # Verify no BELIEF-STATE (SIGNAL) codes in LLM conversations
    llm_signals = [
        (c['participant_id'], t['turn_number'], code['code'])
        for c in data['conversations'] if c['source'] == 'llm'
        for t in c['turns']
        for code in t['codes']
        if code['family'] == 'BELIEF-STATE' or code['code'].startswith('BELIEF-STATE-') or code['family'] == 'SIGNAL'
    ]
    assert len(llm_signals) == 0, f"Found {len(llm_signals)} BELIEF-STATE codes in LLM!"

    # Verify human conversations retain all 8 publishable families (feedback 1)
    human_fams = set(code['family'] for c in data['conversations'] if c['source'] == 'human' for t in c['turns'] for code in t['codes'])
    expected_fams = {
        'BELIEF-STATE',
        'THEME',
        'EVIDENCE',
        'CONVERSATION',
        'ATTITUDE',
        'FUTURE-STANCE',
        'EMOTIONAL-RESPONSE',
        'ENGAGEMENT'
    }
    for ef in expected_fams:
        assert ef in human_fams, f"Human conversations missing family: {ef}"

    print(f"✓ Dataset integrity test passed (1,137 convs, 4,548 turns, Belief State custom order verified, 'LLM' naming verified, zero LLM BELIEF-STATE codes, full Human 8-family taxonomy)")
    return data


def test_html_files():
    for filename in ['index.html', 'turn_code_explorer.html']:
        path = os.path.join(BASE_DIR, filename)
        assert os.path.exists(path), f"File missing: {filename}"
        content = open(path, 'r', encoding='utf-8').read()
        
        # Check title and elements
        assert '<title>DcodeD' in content
        assert 'id="app-data"' in content
        assert 'id="feed"' in content
        assert 'id="filters"' in content
        assert 'id="copyShareLinkBtn"' in content
        assert 'id="toggleAllAiBtn"' in content
        assert 'id="activeFiltersBar"' in content
        assert 'id="cohortSummaryPanel"' in content
        assert 'id="statsBar"' in content
        assert 'turn-ai-wrap' in content
        assert 'Gemini 3.7' not in content, f"Found model name 'Gemini 3.7' in {filename}"
        
        # Check embedded JSON
        m = re.search(r'<script id="app-data" type="application/json">(.*?)</script>', content, re.DOTALL)
        assert m, "app-data JSON tag not found"
        data = json.loads(m.group(1))
        assert len(data['conversations']) == 1137
        
        print(f"✓ Standalone single assembly {filename} verified ({len(content)/1024/1024:.2f} MB)")

def test_filtering_logic(data):
    convs = data['conversations']

    # Test 1: Turn-level filter: Turn has 'THEME-Domestic-Politics' AND NOT 'EVIDENCE-Anomalies'
    turn_matches = []
    for c in convs:
        for t in c['turns']:
            t_codes = set(item['code'] for item in t['codes'])
            if 'THEME-Domestic-Politics' in t_codes and 'EVIDENCE-Anomalies' not in t_codes:
                turn_matches.append((c['participant_id'], t['turn_number']))
    assert len(turn_matches) > 0, "Expected turn-level matches"

    # Test 2: Participant-level filter: Participant has 'THEME-Domestic-Politics' anywhere AND NOT 'THEME-Space-and-UFOs' anywhere
    part_matches = []
    for c in convs:
        c_codes = set(item['code'] for t in c['turns'] for item in t['codes'])
        if 'THEME-Domestic-Politics' in c_codes and 'THEME-Space-and-UFOs' not in c_codes:
            part_matches.append(c['participant_id'])
    assert len(part_matches) > 0, "Expected participant-level matches"

    # Test 3: Multiple choice turn filter: Selected turns {1, 3}
    t1_t3_turns = []
    selected_turns = {1, 3}
    for c in convs:
        for t in c['turns']:
            if t['turn_number'] in selected_turns:
                t1_t3_turns.append((c['participant_id'], t['turn_number']))
    assert len(t1_t3_turns) == len(convs) * 2, f"Expected {len(convs)*2} turns for T1 and T3, got {len(t1_t3_turns)}"

    print(f"✓ Filtering logic test passed (Turn-level: {len(turn_matches)} matches, Participant-level: {len(part_matches)} matches, Multi-turn T1+T3: {len(t1_t3_turns)} turns)")

if __name__ == '__main__':
    data = test_dataset()
    test_html_files()
    test_filtering_logic(data)
    print("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!")

