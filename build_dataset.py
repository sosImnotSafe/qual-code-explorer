import csv
import json
import os
from collections import defaultdict, Counter

def build_data():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_dir = os.path.join(os.path.dirname(base_dir), 'dataset') if os.path.basename(base_dir) == 'scripts' else os.path.join(base_dir, 'dataset')
    
    f228_path = os.path.join(dataset_dir, 'full-228-recoded.csv')
    r1137_path = os.path.join(dataset_dir, 'rerun-1137.csv')
    
    f228 = list(csv.DictReader(open(f228_path, encoding='utf-8')))
    r1137 = list(csv.DictReader(open(r1137_path, encoding='utf-8')))
    
    # 1. Process 228 Human conversations (keep all qualitative code families: SIGNAL, THEME, EVIDENCE, ATTITUDE, etc.)
    human_convs = {}
    for r in f228:
        s_num = int(float(r['sample_number']))
        coder = r['coder']
        key = ('human', s_num, coder)
        if key not in human_convs:
            human_convs[key] = {
                'sample_number': s_num,
                'original_sample_number': int(float(r.get('original_sample_number') or s_num)),
                'source': 'human',
                'coder': coder,
                'participant_id': int(float(r['participant_id'])),
                'pre_score': float(r['pre_score']),
                'post_score': float(r['post_score']),
                'change_score': float(r['change_score']),
                'turns': []
            }
        codes = []
        for c in (r['codes'] or '').split('|'):
            c = c.strip()
            if c:
                fam = c.split('-')[0]
                sub = c[len(fam)+1:] if '-' in c else ''
                codes.append({'code': c, 'family': fam, 'sub': sub})
        human_convs[key]['turns'].append({
            'turn_number': int(float(r['turn_number'])),
            'text': r['user_turn_text'],
            'codes': codes
        })

    # Sort turns inside human conversations by turn_number
    for cv in human_convs.values():
        cv['turns'].sort(key=lambda t: t['turn_number'])

    # 2. Process 909 LLM conversations (remove SIGNAL family codes per user instructions!)
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
                    'coder': 'LLM (Gemini 3.7 Flash)',
                    'participant_id': p_id,
                    'pre_score': float(r['pre_score']),
                    'post_score': float(r['post_score']),
                    'change_score': float(r['change_score']),
                    'turns': []
                }
            codes = []
            for c in (r['codes'] or '').split('|'):
                c = c.strip()
                if c:
                    fam = c.split('-')[0]
                    # REMOVE SIGNAL CODES FROM LLM-CODED
                    if fam == 'SIGNAL':
                        continue
                    sub = c[len(fam)+1:] if '-' in c else ''
                    codes.append({'code': c, 'family': fam, 'sub': sub})
            llm_convs[key]['turns'].append({
                'turn_number': int(float(r['turn_number'])),
                'text': r['text'],
                'codes': codes
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
                    code_meta[c['code']] = (c['family'], c['sub'])

    # Group into families
    family_map = defaultdict(list)
    for code, (fam, sub) in sorted(code_meta.items()):
        family_map[fam].append({
            'code': code,
            'sub': sub,
            'count': code_counts[code]
        })

    FAMILY_ORDER = ['SIGNAL', 'THEME', 'EVIDENCE', 'ATTITUDE', 'EXTRA', 'FUTURE', 'INVOKE', 'LACK', 'Mismatch']
    families = []
    for fam in FAMILY_ORDER:
        if fam in family_map:
            # sort subcodes alphabetically
            subs = sorted(family_map[fam], key=lambda x: x['code'])
            families.append({
                'family': fam,
                'subs': subs
            })
    # Any other families
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
        'coders': ['Coder_A', 'Coder_B', 'Coder_C', 'LLM (Gemini 3.7 Flash)']
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
