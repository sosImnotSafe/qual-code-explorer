import os
import json
from build_dataset import build_data

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def main():
    print("1. Processing and assembling unified dataset...")
    data = build_data()
    json_str = json.dumps(data, ensure_ascii=False)
    
    print(f"   - Total conversations: {data['meta']['n_conversations']}")
    print(f"   - Human conversations: {data['meta']['n_human_conversations']}")
    print(f"   - LLM conversations: {data['meta']['n_llm_conversations']}")
    print(f"   - Total turns: {data['meta']['n_turns']}")
    print(f"   - Total code families: {len(data['families'])}")

    # Read template, css, js
    with open(os.path.join(BASE_DIR, 'src', 'template.html'), 'r', encoding='utf-8') as f:
        template = f.read()
    with open(os.path.join(BASE_DIR, 'src', 'style.css'), 'r', encoding='utf-8') as f:
        css = f.read()
    with open(os.path.join(BASE_DIR, 'src', 'app.js'), 'r', encoding='utf-8') as f:
        js = f.read()

    # Inject CSS, DATA, JS into single assembly
    html = template.replace('/* CSS_INJECTED_HERE */', css)
    html = html.replace('/* DATA_INJECTED_HERE */', json_str)
    html = html.replace('/* JS_INJECTED_HERE */', js)

    index_path = os.path.join(BASE_DIR, 'index.html')
    explorer_path = os.path.join(BASE_DIR, 'turn_code_explorer.html')

    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(html)
    with open(explorer_path, 'w', encoding='utf-8') as f:
        f.write(html)

    # Also save data.json in dataset/ for API / export reference
    data_json_path = os.path.join(BASE_DIR, 'dataset', 'unified_data.json')
    with open(data_json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)

    print(f"2. Successfully generated standalone single-assembly apps:")
    print(f"   - {index_path} ({len(html)/1024/1024:.2f} MB)")
    print(f"   - {explorer_path} ({len(html)/1024/1024:.2f} MB)")
    print(f"   - {data_json_path} ({len(json_str)/1024/1024:.2f} MB)")

if __name__ == '__main__':
    main()
