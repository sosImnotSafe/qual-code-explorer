# DcodeD — Qualitative Coding Explorer

**DcodeD** is an interactive, standalone single-assembly application for exploring, filtering, analyzing, and referencing qualitative coding results from belief-change conversations.

---

## 📊 Dataset Overview

The explorer unifies the complete dataset of **1,137 conversations** (4,548 dialogue turns):

1. **Human-Coded Subset (228 conversations / 912 turns)**:
   - Coded by human annotators: `Coder_A`, `Coder_B`, `Coder_C`.
   - Comprehensive 9-family qualitative codebook: `SIGNAL`, `THEME`, `EVIDENCE`, `ATTITUDE`, `EXTRA`, `FUTURE`, `INVOKE`, `LACK`, `Mismatch` (64 distinct codes).
2. **LLM-Coded Corpus (909 conversations / 3,636 turns)**:
   - Coded with `gemini-3.7-flash (OvO V4)`.
   - Per specification, all `SIGNAL` codes have been removed from the LLM-coded data.
   - Retains the core dialogue families: `EVIDENCE` and `THEME`.

---

## 🔗 URL Reference & Permalinks (For Paper Citations)

The app features a bidirectional deep-linking engine. Every filter change updates the URL in real time without refreshing, and opening any link restores the exact filter state.

### Citation Link Examples

| Query Description | Example URL Parameter |
| :--- | :--- |
| **Filter Unit: Turn Level** | `?unit=turn` (code criteria match within individual turns) |
| **Filter Unit: Participant Level** | `?unit=participant` (code criteria evaluate across whole conversation) |
| **View Mode: Turns Feed** | `?view=turns` (itemized turn-by-turn list) |
| **View Mode: Conversations** | `?view=conversations` (dialogue cards with full turns) |
| **Direct Participant Link** | `?participant=7` |
| **Direct Turn Link (Auto-scrolls & Highlights)** | `?participant=7&turn=2` |
| **Source Filter** | `?source=human` or `?source=llm` |
| **Coder Filter** | `?coder=Coder_A,Coder_B` |
| **Score Bounds** | `?pre=60..100&change=20..50` |
| **Text Search** | `?q=election` |
| **Having Label X** | `?codes=THEME-Domestic Politics` |
| **NOT Having Label Y** | `?codes=!EVIDENCE-Anomalies` |
| **AND / OR Combinations** | `?codes=(THEME-Domestic Politics\|THEME-Historical Event),(!EVIDENCE-Anomalies)` |
| **Full Combined Citation** | `?unit=participant&source=human&coder=Coder_A&codes=INVOKE-General&pre=50..100` |

### Built-in Sharing Tools:
- **"Share View" Topbar Button**: Copies the current view's permanent URL to the clipboard with one click.
- **Card & Turn "🔗" Icons**: Copies direct permalinks to individual conversations or specific turns.
- **CSV Export Button**: Exports the filtered turns and metadata to CSV.

---

## 🚀 Deployment Guide

### Single Assembly Architecture
The entire application is completely self-contained in a single file (`index.html` or `turn_code_explorer.html`). It has zero server dependencies and zero runtime build requirements.

### Deploying to Vercel (Recommended)
1. **Option 1: Vercel CLI**:
   ```bash
   npx vercel
   ```
2. **Option 2: Git Integration**:
   Push this repository to GitHub/GitLab and import the project into your Vercel dashboard. Vercel will automatically detect the static project and deploy it with global CDN caching.

### Other Static Hosting
- **GitHub Pages**: Go to *Repository Settings* → *Pages* → *Deploy from branch (`main` / root)*.
- **Netlify / Cloudflare Pages**: Connect the repo or drag-and-drop the directory.

---

## 🛠 Rebuilding the Dataset

To re-generate `index.html` and `turn_code_explorer.html` from raw CSVs:

```bash
python3 build_app.py
```
