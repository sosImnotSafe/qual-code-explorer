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

    # Verify no SIGNAL codes in LLM conversations
    llm_signals = [
        (c['participant_id'], t['turn_number'], code['code'])
        for c in data['conversations'] if c['source'] == 'llm'
        for t in c['turns']
        for code in t['codes']
        if code['family'] == 'SIGNAL' or code['code'].startswith('SIGNAL-')
    ]
    assert len(llm_signals) == 0, f"Found {len(llm_signals)} SIGNAL codes in LLM!"

    # Verify human conversations retain all families
    human_fams = set(code['family'] for c in data['conversations'] if c['source'] == 'human' for t in c['turns'] for code in t['codes'])
    assert 'SIGNAL' in human_fams, "Human conversations missing SIGNAL family"
    assert 'THEME' in human_fams, "Human conversations missing THEME family"
    assert 'EVIDENCE' in human_fams, "Human conversations missing EVIDENCE family"
    assert 'ATTITUDE' in human_fams, "Human conversations missing ATTITUDE family"
    assert 'EXTRA' in human_fams, "Human conversations missing EXTRA family"
    assert 'FUTURE' in human_fams, "Human conversations missing FUTURE family"
    assert 'INVOKE' in human_fams, "Human conversations missing INVOKE family"
    assert 'LACK' in human_fams, "Human conversations missing LACK family"
    assert 'Mismatch' in human_fams, "Human conversations missing Mismatch family"

    print("✓ Dataset integrity test passed (1,137 convs, 4,548 turns, zero LLM SIGNAL codes, full Human 9-family codebook)")
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
        assert 'id="activeFiltersBar"' in content
        assert 'id="statsBar"' in content
        
        # Check embedded JSON
        m = re.search(r'<script id="app-data" type="application/json">(.*?)</script>', content, re.DOTALL)
        assert m, "app-data JSON tag not found"
        data = json.loads(m.group(1))
        assert len(data['conversations']) == 1137
        
        print(f"✓ Standalone single assembly {filename} verified ({len(content)/1024/1024:.2f} MB)")

def test_filtering_logic(data):
    convs = data['conversations']

    # Test 1: Turn-level filter: Turn has 'THEME-Domestic Politics' AND NOT 'EVIDENCE-Anomalies'
    turn_matches = []
    for c in convs:
        for t in c['turns']:
            t_codes = set(item['code'] for item in t['codes'])
            if 'THEME-Domestic Politics' in t_codes and 'EVIDENCE-Anomalies' not in t_codes:
                turn_matches.append((c['participant_id'], t['turn_number']))
    assert len(turn_matches) > 0, "Expected turn-level matches"

    # Test 2: Participant-level filter: Participant has 'THEME-Domestic Politics' anywhere AND NOT 'THEME-Space' anywhere
    part_matches = []
    for c in convs:
        c_codes = set(item['code'] for t in c['turns'] for item in t['codes'])
        if 'THEME-Domestic Politics' in c_codes and 'THEME-Space' not in c_codes:
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

    print(f"✓ Filtering logic test passed (Turn-level matching: {len(turn_matches)} turns, Participant-level matching: {len(part_matches)} participants, Multi-turn T1+T3 selection: {len(t1_t3_turns)} turns)")

if __name__ == '__main__':
    data = test_dataset()
    test_html_files()
    test_filtering_logic(data)
    print("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!")
