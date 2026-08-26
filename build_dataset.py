import csv
import json
import os
import re
from collections import defaultdict, Counter

def load_code_mapping(base_dir):
    mapping_file = os.path.join(base_dir, 'codebook_code_name_changes.csv')
    mapping = {}
    if os.path.exists(mapping_file):
        with open(mapping_file, 'r', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                p = row.get('previous_code', '').strip()
                n = row.get('new_code', '').strip()
                if p and n:
                    mapping[p] = n

    aliases = {
        'EVIDENCE-Eyewitness/Anecdotal': 'EVIDENCE-Eyewitness',
        'EVIDENCE-Anecdotal': 'EVIDENCE-Personal-Anecdote',
        'EXTRA-Fallacy User': 'CONVERSATION-Logical-Fallacy',
        'FUTURE-IDC (I Don\'t Care)': 'FUTURE-STANCE-Apathy',
        'THEME-Others': 'THEME-Government-Cover-Up',
        'EXTRA-Others': 'CONVERSATION-Topic-Shift',
        'FUTURE-Others': 'FUTURE-STANCE-Hedging',
        'EVIDENCE-Others': 'EVIDENCE-Unspecified-Source'
    }
    for k, v in aliases.items():
        if k not in mapping:
            mapping[k] = v

    for v in list(mapping.values()):
        mapping[v] = v
    return mapping

def parse_codebook_definitions(base_dir):
    md_path = os.path.join(base_dir, 'codebook_publishable_final.md')
    if not os.path.exists(md_path):
        return {}
    with open(md_path, 'r', encoding='utf-8') as f:
        text = f.read()
    defs = {}
    sections = re.split(r'####\s+`([^`]+)`', text)
    for i in range(1, len(sections), 2):
        code = sections[i].strip()
        body = sections[i+1].strip()
        desc = body.split('\n\n')[0].strip().replace('\n', ' ')
        defs[code] = desc
    return defs

def build_data():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_dir = os.path.join(os.path.dirname(base_dir), 'dataset') if os.path.basename(base_dir) == 'scripts' else os.path.join(base_dir, 'dataset')
    
    f228_path = os.path.join(dataset_dir, 'full-228-recoded.csv')
    r1137_path = os.path.join(dataset_dir, 'rerun-1137.csv')
    all_data_path = os.path.join(base_dir, 'AllDataFiltered.Cluster.PPI.8.28.24.csv')
    
    code_mapping = load_code_mapping(base_dir)
    code_defs = parse_codebook_definitions(base_dir)

    ai_turn_lookup = {}
    if os.path.exists(all_data_path):
        with open(all_data_path, 'r', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                x_val = (row.get('X') or '').strip()
                try:
                    pid = int(float(x_val))
                    ai_turn_lookup[pid] = {
                        1: (row.get('GPTResponse') or '').strip(),
                        2: (row.get('GPTResponse2') or '').strip(),
                        3: (row.get('GPTResponse3') or '').strip(),
                        4: ''
                    }
                except Exception:
                    continue

    f228 = list(csv.DictReader(open(f228_path, encoding='utf-8')))
    r1137 = list(csv.DictReader(open(r1137_path, encoding='utf-8')))

    def parse_codes(raw_str, is_llm=False):
        codes = []
        for raw_c in (raw_str or '').split('|'):
            raw_c = raw_c.strip()
            if not raw_c or raw_c in ('Mismatch', 'SIGNAL-Mismatch'):
                continue
            mapped = code_mapping.get(raw_c, raw_c)
            parts = mapped.split('-')
            if mapped.startswith(('FUTURE-STANCE', 'EMOTIONAL-RESPONSE', 'BELIEF-STATE')):
                fam = '-'.join(parts[:2])
                sub = '-'.join(parts[2:])
            else:
                fam = parts[0]
                sub = '-'.join(parts[1:])

            if is_llm and (fam in ('BELIEF-STATE', 'SIGNAL')):
                continue

            codes.append({
                'code': mapped,
                'family': fam,
                'sub': sub,
                'definition': code_defs.get(mapped, '')
            })
        return codes

    # 1. Process 228 Human conversations
    human_convs = {}
    for r in f228:
        s_num = int(float(r['sample_number']))
        coder = r['coder']
        key = ('human', s_num, coder)
        p_id = int(float(r['participant_id']))
        if key not in human_convs:
            human_convs[key] = {
                'sample_number': s_num,
                'original_sample_number': int(float(r.get('original_sample_number') or s_num)),
                'source': 'human',
                'coder': coder,
                'participant_id': p_id,
                'pre_score': float(r['pre_score']),
                'post_score': float(r['post_score']),
                'change_score': float(r['change_score']),
                'turns': []
            }
        t_num = int(float(r['turn_number']))
        ai_resp = ai_turn_lookup.get(p_id, {}).get(t_num, '')
        human_convs[key]['turns'].append({
            'turn_number': t_num,
            'text': r['user_turn_text'],
            'ai_response': ai_resp,
            'codes': parse_codes(r['codes'], is_llm=False)
        })

    # Sort turns inside human conversations by turn_number
    for cv in human_convs.values():
        cv['turns'].sort(key=lambda t: t['turn_number'])

    # 2. Process 909 LLM conversations (excludes BELIEF-STATE per specification)
    llm_convs = {}
    for r in r1137:
        if r['source'] == 'llm':
            s_num = int(float(r['sample_number']))
            p_id = int(float(r['participant_id']))
            key = ('llm', s_num, p_id)
            if key not in llm_convs:
                llm_convs[key] = {
                    'sample_number': s_num,
                    'original_sample_number': int(float(r.get('original_sample_number') or s_num)),
                    'source': 'llm',
                    'coder': 'LLM',
                    'participant_id': p_id,
                    'pre_score': float(r['pre_score']),
                    'post_score': float(r['post_score']),
                    'change_score': float(r['change_score']),
                    'turns': []
                }
            t_num = int(float(r['turn_number']))
            ai_resp = ai_turn_lookup.get(p_id, {}).get(t_num, '')
            llm_convs[key]['turns'].append({
                'turn_number': t_num,
                'text': r['text'],
                'ai_response': ai_resp,
                'codes': parse_codes(r['codes'], is_llm=True)
            })

    # Sort turns inside LLM conversations by turn_number
    for cv in llm_convs.values():
        cv['turns'].sort(key=lambda t: t['turn_number'])

    conversations = list(human_convs.values()) + list(llm_convs.values())
    
    # 3. Build Codebook Families
    code_counts = Counter()
    code_meta = {}
    for conv in conversations:
        for turn in conv['turns']:
            for c in turn['codes']:
                code_counts[c['code']] += 1
                if c['code'] not in code_meta:
                    code_meta[c['code']] = (c['family'], c['sub'], c.get('definition', ''))

    # Group into families
    family_map = defaultdict(list)
    for code, (fam, sub, defn) in sorted(code_meta.items()):
        family_map[fam].append({
            'code': code,
            'sub': sub,
            'count': code_counts[code],
            'definition': defn
        })

    # Custom Subcode Ordering: BELIEF-STATE
    # Requested order: certain, incertain (uncertain), high and low investment, high and low strength, maintaining, repeat, becoming and turning point
    BELIEF_STATE_SUB_ORDER = [
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
    bs_order_index = {code: i for i, code in enumerate(BELIEF_STATE_SUB_ORDER)}

    FAMILY_ORDER = [
        'BELIEF-STATE',
        'THEME',
        'EVIDENCE',
        'CONVERSATION',
        'ATTITUDE',
        'FUTURE-STANCE',
        'EMOTIONAL-RESPONSE',
        'ENGAGEMENT'
    ]
    families = []
    for fam in FAMILY_ORDER:
        if fam in family_map:
            if fam == 'BELIEF-STATE':
                subs = sorted(family_map[fam], key=lambda x: bs_order_index.get(x['code'], 999))
            else:
                subs = sorted(family_map[fam], key=lambda x: x['code'])
            families.append({
                'family': fam,
                'subs': subs
            })
    for fam in sorted(family_map.keys()):
        if fam not in FAMILY_ORDER:
            families.append({
                'family': fam,
                'subs': sorted(family_map[fam], key=lambda x: x['code'])
            })

    meta = {
        'n_conversations': len(conversations),
        'n_turns': sum(len(c['turns']) for c in conversations),
        'n_human_conversations': len(human_convs),
        'n_llm_conversations': len(llm_convs),
        'sources': ['human', 'llm'],
        'coders': ['Coder_A', 'Coder_B', 'Coder_C', 'LLM']
    }

    return {
        'meta': meta,
        'families': families,
        'conversations': conversations
    }

if __name__ == '__main__':
    data = build_data()
    print('Metadata:', data['meta'])
    print('Families count:', len(data['families']))
    for f in data['families']:
        print(f"  {f['family']}: {len(f['subs'])} codes, total turn occurrences = {sum(s['count'] for s in f['subs'])}")
