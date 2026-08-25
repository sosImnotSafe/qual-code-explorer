(function(){
"use strict";

const RAW = JSON.parse(document.getElementById('app-data').textContent);
const CONVERSATIONS = RAW.conversations;
const FAMILIES = RAW.families;
const META = RAW.meta;

const FAMILY_COLOR_VAR = {
  'Mismatch':'--fam-mismatch',
  'ATTITUDE':'--fam-attitude',
  'EVIDENCE':'--fam-evidence',
  'EXTRA':'--fam-extra',
  'FUTURE':'--fam-future',
  'INVOKE':'--fam-invoke',
  'LACK':'--fam-lack',
  'SIGNAL':'--fam-signal',
  'THEME':'--fam-theme'
};

function famColor(fam){
  const v = FAMILY_COLOR_VAR[fam] || '--fam-unknown';
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}
function famLabel(fam){
  if(fam === 'Mismatch') return 'Mismatch';
  return fam.charAt(0) + fam.slice(1).toLowerCase();
}

// ---------------- State ----------------
const state = {
  filterUnit: 'turn', // 'turn' (turn-level criteria) | 'participant' (participant-level criteria)
  source: 'all', // 'all' | 'human' | 'llm'
  coders: new Set(META.coders),
  search: '',
  sampleNumberSearch: '',
  participantIdSearch: '',
  selectedTurns: new Set([1, 2, 3, 4]), // multiple choice on specific turns
  targetParticipant: null,
  targetTurn: null,
  ranges: {
    pre_score: {min:0, max:100, lo:0, hi:100},
    post_score: {min:0, max:100, lo:0, hi:100},
    change_score: {min:-40, max:100, lo:-40, hi:100},
    turn_number: {min:1, max:4, lo:1, hi:4}
  },
  queryGroups: [] // CNF: array of groups. Each group: array of {code, negate}
};

let openFamilies = new Set();
let renderedCount = 50;

// ---------------- Deep-Linking / URL Sync ----------------
function stateToUrl(){
  const params = new URLSearchParams();
  if(state.filterUnit !== 'turn') params.set('unit', state.filterUnit);
  if(state.source !== 'all') params.set('source', state.source);
  if(state.coders.size < META.coders.length){
    params.set('coder', Array.from(state.coders).join(','));
  }
  if(state.search) params.set('q', state.search);
  if(state.sampleNumberSearch) params.set('sample', state.sampleNumberSearch);
  if(state.participantIdSearch) params.set('participant', state.participantIdSearch);
  if(state.selectedTurns.size < 4 && state.selectedTurns.size > 0){
    params.set('turns', Array.from(state.selectedTurns).sort().join(','));
  }
  if(state.targetTurn !== null) params.set('target_turn', String(state.targetTurn));

  const r = state.ranges;
  if(r.pre_score.lo > 0 || r.pre_score.hi < 100) params.set('pre', `${r.pre_score.lo}..${r.pre_score.hi}`);
  if(r.post_score.lo > 0 || r.post_score.hi < 100) params.set('post', `${r.post_score.lo}..${r.post_score.hi}`);
  if(r.change_score.lo > -40 || r.change_score.hi < 100) params.set('change', `${r.change_score.lo}..${r.change_score.hi}`);
  if(r.turn_number.lo > 1 || r.turn_number.hi < 4) params.set('turn_range', `${r.turn_number.lo}..${r.turn_number.hi}`);

  if(state.queryGroups.length > 0){
    const groupStrs = state.queryGroups.map(g=>{
      return g.map(e => (e.negate ? '!' : '') + e.code).join('|');
    }).filter(Boolean);
    if(groupStrs.length > 0) params.set('codes', groupStrs.join(','));
  }

  const str = params.toString();
  return str ? '?' + str : window.location.pathname;
}

function updateUrl(){
  const newUrl = stateToUrl();
  window.history.replaceState(null, '', newUrl);
}

function parseUrlToState(){
  const params = new URLSearchParams(window.location.search);
  if(params.has('unit') || params.has('scope')){
    const u = (params.get('unit') || params.get('scope')).toLowerCase();
    if(['turn', 'participant'].includes(u)) state.filterUnit = u;
  }
  if(params.has('source')){
    const src = params.get('source').toLowerCase();
    if(['all', 'human', 'llm'].includes(src)) state.source = src;
  }
  if(params.has('coder')){
    const coders = params.get('coder').split(',').map(s=>s.trim()).filter(Boolean);
    if(coders.length > 0) state.coders = new Set(coders);
  }
  if(params.has('q')) state.search = params.get('q');
  if(params.has('search')) state.search = params.get('search');
  
  if(params.has('participant')) state.participantIdSearch = params.get('participant');
  if(params.has('pid')) state.participantIdSearch = params.get('pid');
  
  if(params.has('sample')) state.sampleNumberSearch = params.get('sample');
  if(params.has('sid')) state.sampleNumberSearch = params.get('sid');
  
  if(params.has('turns') || params.has('turn')){
    const val = params.get('turns') || params.get('turn');
    const turns = val.split(',').map(Number).filter(n => n >= 1 && n <= 4);
    if(turns.length > 0) state.selectedTurns = new Set(turns);
  }
  if(params.has('target_turn')){
    const tt = parseInt(params.get('target_turn'), 10);
    if(!isNaN(tt)) state.targetTurn = tt;
  }

  ['pre_score', 'post_score', 'change_score', 'turn_number'].forEach(key=>{
    const shortKey = key.replace('_score','');
    let val = params.get(shortKey) || params.get(key);
    if(val && val.includes('..')){
      const [lo, hi] = val.split('..').map(Number);
      if(!isNaN(lo)) state.ranges[key].lo = Math.max(state.ranges[key].min, lo);
      if(!isNaN(hi)) state.ranges[key].hi = Math.min(state.ranges[key].max, hi);
    } else if(val && val.includes('-') && !val.startsWith('-')){
      const [lo, hi] = val.split('-').map(Number);
      if(!isNaN(lo)) state.ranges[key].lo = Math.max(state.ranges[key].min, lo);
      if(!isNaN(hi)) state.ranges[key].hi = Math.min(state.ranges[key].max, hi);
    }
    if(params.has(shortKey + '_min')){
      const v = Number(params.get(shortKey + '_min'));
      if(!isNaN(v)) state.ranges[key].lo = Math.max(state.ranges[key].min, v);
    }
    if(params.has(shortKey + '_max')){
      const v = Number(params.get(shortKey + '_max'));
      if(!isNaN(v)) state.ranges[key].hi = Math.min(state.ranges[key].max, v);
    }
  });

  if(params.has('codes') || params.has('q_codes')){
    const raw = params.get('codes') || params.get('q_codes');
    state.queryGroups = [];
    const groups = raw.split(',');
    groups.forEach(g=>{
      g = g.replace(/^[\\(\\[]/, '').replace(/[\\)\\]]$/, '').trim();
      if(!g) return;
      const entries = g.split('|').map(item=>{
        item = item.trim();
        const negate = item.startsWith('!');
        const code = negate ? item.slice(1) : item;
        return { code, negate };
      }).filter(e=>Boolean(e.code));
      if(entries.length > 0) state.queryGroups.push(entries);
    });
  }
}
// ---------------- Filtering Logic ----------------
function convMatchesBase(conv){
  if(state.source !== 'all' && conv.source !== state.source) return false;
  if(state.coders.size > 0 && !state.coders.has(conv.coder)) return false;
  
  if(state.sampleNumberSearch && String(conv.sample_number) !== state.sampleNumberSearch && String(conv.original_sample_number) !== state.sampleNumberSearch) return false;
  if(state.participantIdSearch && String(conv.participant_id) !== state.participantIdSearch) return false;

  const r = state.ranges;
  if(conv.pre_score < r.pre_score.lo || conv.pre_score > r.pre_score.hi) return false;
  if(conv.post_score < r.post_score.lo || conv.post_score > r.post_score.hi) return false;
  if(conv.change_score < r.change_score.lo || conv.change_score > r.change_score.hi) return false;

  return true;
}

function turnMatchesTurnFilters(turn){
  if(!state.selectedTurns.has(turn.turn_number)) return false;
  if(turn.turn_number < state.ranges.turn_number.lo || turn.turn_number > state.ranges.turn_number.hi) return false;
  
  if(state.search){
    if(!turn.text.toLowerCase().includes(state.search.toLowerCase())) return false;
  }
  return true;
}

// Participant-level code matching (evaluates across all eligible turns of the participant)
function convMatchesCodes(conv){
  if(!state.queryGroups.length) return true;
  const convCodes = new Set();
  conv.turns.forEach(t => {
    if(state.selectedTurns.has(t.turn_number)){
      if(t.turn_number >= state.ranges.turn_number.lo && t.turn_number <= state.ranges.turn_number.hi){
        t.codes.forEach(c => convCodes.add(c.code));
      }
    }
  });

  for(const group of state.queryGroups){
    if(!group.length) continue;
    const groupSatisfied = group.some(entry => {
      return entry.negate ? !convCodes.has(entry.code) : convCodes.has(entry.code);
    });
    if(!groupSatisfied) return false;
  }
  return true;
}

// Turn-level code matching (evaluates strictly within an individual turn)
function turnMatchesCodes(turn){
  if(!state.queryGroups.length) return true;
  const turnCodes = new Set(turn.codes.map(c=>c.code));
  for(const group of state.queryGroups){
    if(!group.length) continue;
    const groupSatisfied = group.some(entry => {
      return entry.negate ? !turnCodes.has(entry.code) : turnCodes.has(entry.code);
    });
    if(!groupSatisfied) return false;
  }
  return true;
}

function computeResults(){
  const results = [];
  let totalMatchingTurns = 0;
  const matchingTurnItems = [];

  for(const conv of CONVERSATIONS){
    if(!convMatchesBase(conv)) continue;

    if(state.filterUnit === 'participant'){
      if(!convMatchesCodes(conv)) continue;
      
      const turnFlags = conv.turns.map(t=>{
        return turnMatchesTurnFilters(t);
      });
      const anyMatch = turnFlags.some(Boolean);
      if(anyMatch){
        results.push({conv, turnFlags});
        const count = turnFlags.filter(Boolean).length;
        totalMatchingTurns += count;
        conv.turns.forEach((t, i)=>{
          if(turnFlags[i]) matchingTurnItems.push({conv, turn: t});
        });
      }
    } else {
      const turnFlags = conv.turns.map(t=>{
        return turnMatchesTurnFilters(t) && turnMatchesCodes(t);
      });
      const anyMatch = turnFlags.some(Boolean);
      if(anyMatch){
        results.push({conv, turnFlags});
        const count = turnFlags.filter(Boolean).length;
        totalMatchingTurns += count;
        conv.turns.forEach((t, i)=>{
          if(turnFlags[i]) matchingTurnItems.push({conv, turn: t});
        });
      }
    }
  }
  return {results, totalMatchingTurns, matchingTurnItems};
}

function computeFacetCounts(){
  const counts = new Map();
  for(const conv of CONVERSATIONS){
    if(!convMatchesBase(conv)) continue;

    if(state.filterUnit === 'participant'){
      const seenInConv = new Set();
      for(const t of conv.turns){
        if(!turnMatchesTurnFilters(t)) continue;
        for(const c of t.codes){
          if(!seenInConv.has(c.code)){
            seenInConv.add(c.code);
            counts.set(c.code, (counts.get(c.code)||0)+1);
          }
        }
      }
    } else {
      for(const t of conv.turns){
        if(!turnMatchesTurnFilters(t)) continue;
        for(const c of t.codes){
          counts.set(c.code, (counts.get(c.code)||0)+1);
        }
      }
    }
  }
  return counts;
}

// ---------------- Query Helpers ----------------
function findEntry(code){
  for(let gi=0; gi<state.queryGroups.length; gi++){
    const ei = state.queryGroups[gi].findIndex(e=>e.code===code);
    if(ei !== -1) return {gi, ei};
  }
  return null;
}

function toggleCodeInQuery(code){
  const found = findEntry(code);
  if(!found){
    state.queryGroups.push([{code, negate:false}]);
  } else {
    const entry = state.queryGroups[found.gi][found.ei];
    if(!entry.negate){
      entry.negate = true;
    } else {
      state.queryGroups[found.gi].splice(found.ei, 1);
      if(state.queryGroups[found.gi].length === 0) state.queryGroups.splice(found.gi, 1);
    }
  }
  renderAll();
}

function removeEntryAt(gi, ei){
  state.queryGroups[gi].splice(ei, 1);
  if(state.queryGroups[gi].length === 0) state.queryGroups.splice(gi, 1);
  renderAll();
}
function toggleNegateAt(gi, ei){
  state.queryGroups[gi][ei].negate = !state.queryGroups[gi][ei].negate;
  renderAll();
}
function addNewGroup(){
  state.queryGroups.push([]);
  renderAll();
}
function removeGroupAt(gi){
  state.queryGroups.splice(gi, 1);
  renderAll();
}
function mergeGroupUp(gi){
  if(gi<=0 || gi>=state.queryGroups.length) return;
  state.queryGroups[gi-1] = state.queryGroups[gi-1].concat(state.queryGroups[gi]);
  state.queryGroups.splice(gi, 1);
  renderAll();
}
function splitGroupAt(gi, ei){
  const group = state.queryGroups[gi];
  if(ei<=0 || ei>=group.length) return;
  const tail = group.splice(ei);
  state.queryGroups.splice(gi+1, 0, tail);
  renderAll();
}

// ---------------- DOM Helpers ----------------
function el(tag, attrs={}, children=[]){
  const e = document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==='class') e.className = v;
    else if(k==='html') e.innerHTML = v;
    else if(k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for(const c of [].concat(children)){
    if(c==null) continue;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
}

function showToast(msg){
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'), 2500);
}

function copyText(text, successMsg){
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(text).then(()=>showToast(successMsg)).catch(()=>fallbackCopy(text, successMsg));
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg){
  const t = document.createElement('textarea');
  t.value = text;
  t.style.position = 'fixed';
  t.style.left = '-9999px';
  document.body.appendChild(t);
  t.select();
  try {
    document.execCommand('copy');
    showToast(successMsg);
  } catch(e){
    showToast('Failed to copy to clipboard');
  }
  document.body.removeChild(t);
}

function fmtScore(v){
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

// ---------------- Dual Slider ----------------
function renderDualSlider(container, key, cfg, label, onChange){
  const block = el('div', {class:'range-block'});
  const header = el('div', {class:'range-header'});
  header.append(el('span', {class:'range-label'}, label));

  const inputsRow = el('div', {class:'range-inputs-row'});
  const inLo = el('input', {
    type:'number', class:'range-num-input', min:cfg.min, max:cfg.max, value:cfg.lo
  });
  const inHi = el('input', {
    type:'number', class:'range-num-input', min:cfg.min, max:cfg.max, value:cfg.hi
  });
  inputsRow.append(inLo, el('span', {style:'color:var(--ink-faint);'}, '–'), inHi);
  header.appendChild(inputsRow);

  const sliderWrap = el('div', {class:'range-slider-wrap'});
  const slider = el('div', {class:'dual-slider'});
  const fill = el('div', {class:'fill'});
  const thumbLo = el('div', {class:'thumb', tabindex:'0', role:'slider', 'aria-label':label+' minimum'});
  const thumbHi = el('div', {class:'thumb', tabindex:'0', role:'slider', 'aria-label':label+' maximum'});
  slider.append(fill, thumbLo, thumbHi);
  sliderWrap.appendChild(slider);

  block.append(header, sliderWrap);
  container.appendChild(block);

  const span = cfg.max - cfg.min;
  function pct(v){ return ((v - cfg.min) / span) * 100; }
  function valFromPct(p){
    let v = cfg.min + (p/100)*span;
    v = Math.round(v);
    return Math.max(cfg.min, Math.min(cfg.max, v));
  }
  function updateVisuals(){
    const loP = pct(cfg.lo), hiP = pct(cfg.hi);
    thumbLo.style.left = loP + '%';
    thumbHi.style.left = hiP + '%';
    fill.style.left = loP + '%';
    fill.style.width = Math.max(0, hiP - loP) + '%';
    inLo.value = cfg.lo;
    inHi.value = cfg.hi;
  }
  updateVisuals();

  inLo.addEventListener('change', ()=>{
    let v = Number(inLo.value);
    if(isNaN(v)) v = cfg.min;
    cfg.lo = Math.max(cfg.min, Math.min(cfg.hi, v));
    updateVisuals();
    onChange();
  });
  inHi.addEventListener('change', ()=>{
    let v = Number(inHi.value);
    if(isNaN(v)) v = cfg.max;
    cfg.hi = Math.min(cfg.max, Math.max(cfg.lo, v));
    updateVisuals();
    onChange();
  });

  function bindDrag(thumb, which){
    thumb.addEventListener('pointerdown', (e)=>{
      thumb.setPointerCapture(e.pointerId);
      const rect = slider.getBoundingClientRect();
      function move(ev){
        let p = ((ev.clientX - rect.left) / rect.width) * 100;
        p = Math.max(0, Math.min(100, p));
        const v = valFromPct(p);
        if(which==='lo') cfg.lo = Math.min(v, cfg.hi);
        else cfg.hi = Math.max(v, cfg.lo);
        updateVisuals();
        onChange();
      }
      function up(ev){
        thumb.releasePointerCapture(e.pointerId);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }
  bindDrag(thumbLo, 'lo');
  bindDrag(thumbHi, 'hi');
}

// ---------------- Rendering: Filters Panel ----------------
function renderFilters(){
  const root = document.getElementById('filters');
  root.innerHTML = '';

  // 0. Filter Unit Selector (Turn vs Participant)
  const unitSection = el('div', {class:'filter-section'});
  unitSection.append(el('div', {class:'filter-section-title'}, 'Filter Evaluation Unit'));
  const unitSwitch = el('div', {class:'source-switch'});
  const unitOpts = [
    {id:'turn', label:'Turn Level (Local)'},
    {id:'participant', label:'Participant (Global)'}
  ];
  unitOpts.forEach(opt=>{
    const optEl = el('div', {class:'source-option' + (state.filterUnit===opt.id ? ' active' : '')}, opt.label);
    optEl.addEventListener('click', ()=>{
      state.filterUnit = opt.id;
      renderAll();
    });
    unitSwitch.appendChild(optEl);
  });
  unitSection.appendChild(unitSwitch);
  unitSection.appendChild(el('div', {style:'font-size:11px; color:var(--ink-muted); margin-top:4px; line-height:1.35;'},
    state.filterUnit === 'participant'
      ? 'Participant mode: codes evaluate across the entire conversation.'
      : 'Turn mode: codes evaluate strictly within individual turns.'
  ));
  root.appendChild(unitSection);

  // 1. Source selector
  const srcSection = el('div', {class:'filter-section'});
  srcSection.append(el('div', {class:'filter-section-title'}, 'Dataset Source'));
  const srcSwitch = el('div', {class:'source-switch'});
  const opts = [
    {id:'all', label:`All (${META.n_conversations})`},
    {id:'human', label:`Human (${META.n_human_conversations})`},
    {id:'llm', label:`LLM (${META.n_llm_conversations})`}
  ];
  opts.forEach(opt=>{
    const optEl = el('div', {class:'source-option' + (state.source===opt.id ? ' active' : '')}, opt.label);
    optEl.addEventListener('click', ()=>{
      state.source = opt.id;
      renderAll();
    });
    srcSwitch.appendChild(optEl);
  });
  srcSection.appendChild(srcSwitch);
  root.appendChild(srcSection);

  // 2. Coders selector
  const coderSection = el('div', {class:'filter-section'});
  const coderTitle = el('div', {class:'filter-section-title'}, [
    document.createTextNode('Coders / Models'),
    el('span', {class:'reset-link', onclick:()=>{
      state.coders = new Set(META.coders);
      renderAll();
    }}, 'select all')
  ]);
  coderSection.appendChild(coderTitle);
  const coderRow = el('div', {class:'coder-row'});
  META.coders.forEach(c=>{
    const chip = el('div', {class:'coder-chip' + (state.coders.has(c) ? ' active' : '')}, c.replace('Coder_','Coder '));
    chip.addEventListener('click', ()=>{
      if(state.coders.has(c)){
        if(state.coders.size > 1) state.coders.delete(c);
      } else {
        state.coders.add(c);
      }
      renderAll();
    });
    coderRow.appendChild(chip);
  });
  coderSection.appendChild(coderRow);
  root.appendChild(coderSection);

  // 3. Search & IDs
  const searchSection = el('div', {class:'filter-section'});
  searchSection.append(el('div', {class:'filter-section-title'}, 'Search & Navigation'));
  const searchBox = el('div', {class:'search-box'});
  searchBox.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  const searchInput = el('input', {type:'text', placeholder:'Search within turn text…', value:state.search});
  searchInput.addEventListener('input', (e)=>{
    state.search = e.target.value;
    renderedCount = 50;
    renderFeed();
    renderStats();
    renderActiveFiltersBar();
    updateUrl();
  });
  searchBox.appendChild(searchInput);
  searchSection.appendChild(searchBox);

  const idRow = el('div', {style:'display:flex; gap:8px; margin-top:8px;'});
  const partCol = el('div', {style:'flex:1;'});
  partCol.append(
    el('label', {style:'display:block; font-size:11px; color:var(--ink-muted); margin-bottom:3px;'}, 'Participant ID'),
    el('input', {type:'number', placeholder:'All', value:state.participantIdSearch || '', style:'width:100%; padding:6px; border:1px solid var(--line); border-radius:4px; font-size:12px; font-family:var(--font-mono);',
      oninput:(e)=>{
        state.participantIdSearch = e.target.value.trim();
        renderedCount = 50;
        renderAll();
      }
    })
  );
  const sampleCol = el('div', {style:'flex:1;'});
  sampleCol.append(
    el('label', {style:'display:block; font-size:11px; color:var(--ink-muted); margin-bottom:3px;'}, 'Sample #'),
    el('input', {type:'number', placeholder:'All', value:state.sampleNumberSearch || '', style:'width:100%; padding:6px; border:1px solid var(--line); border-radius:4px; font-size:12px; font-family:var(--font-mono);',
      oninput:(e)=>{
        state.sampleNumberSearch = e.target.value.trim();
        renderedCount = 50;
        renderAll();
      }
    })
  );
  idRow.append(partCol, sampleCol);
  searchSection.appendChild(idRow);

  const turnRow = el('div', {style:'margin-top:8px;'});
  turnRow.append(el('div', {style:'display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;'}, [
    el('label', {style:'font-size:11px; color:var(--ink-muted);'}, 'Specific Turns (Multi-choice)'),
    el('span', {class:'reset-link', onclick:()=>{
      state.selectedTurns = new Set([1, 2, 3, 4]);
      renderAll();
    }}, 'select all')
  ]));
  const turnPills = el('div', {class:'turn-pills-row'});
  
  const allPill = el('div', {class:'turn-pill' + (state.selectedTurns.size === 4 ? ' active' : '')}, 'All');
  allPill.addEventListener('click', ()=>{
    state.selectedTurns = new Set([1, 2, 3, 4]);
    renderAll();
  });
  turnPills.appendChild(allPill);

  [1, 2, 3, 4].forEach(tNum => {
    const isSelected = state.selectedTurns.has(tNum);
    const pill = el('div', {class:'turn-pill' + (isSelected ? ' active' : '')}, `T${tNum}`);
    pill.addEventListener('click', ()=>{
      if(state.selectedTurns.size === 4){
        state.selectedTurns = new Set([tNum]);
      } else if(state.selectedTurns.has(tNum)){
        if(state.selectedTurns.size > 1) state.selectedTurns.delete(tNum);
        else state.selectedTurns = new Set([1, 2, 3, 4]);
      } else {
        state.selectedTurns.add(tNum);
      }
      renderAll();
    });
    turnPills.appendChild(pill);
  });
  turnRow.appendChild(turnPills);
  searchSection.appendChild(turnRow);
  root.appendChild(searchSection);

  // 4. Numeric Belief Ranges
  const numSection = el('div', {class:'filter-section'});
  const numTitle = el('div', {class:'filter-section-title'}, [
    document.createTextNode('Belief Metrics'),
    el('span', {class:'reset-link', onclick:()=>{
      state.ranges.pre_score = {min:0,max:100,lo:0,hi:100};
      state.ranges.post_score = {min:0,max:100,lo:0,hi:100};
      state.ranges.change_score = {min:-40,max:100,lo:-40,hi:100};
      state.ranges.turn_number = {min:1,max:4,lo:1,hi:4};
      renderAll();
    }}, 'reset')
  ]);
  numSection.appendChild(numTitle);
  renderDualSlider(numSection, 'pre_score', state.ranges.pre_score, 'Pre-score (Initial belief)', renderAll);
  renderDualSlider(numSection, 'post_score', state.ranges.post_score, 'Post-score (Final belief)', renderAll);
  renderDualSlider(numSection, 'change_score', state.ranges.change_score, 'Change score (Pre − Post)', renderAll);
  root.appendChild(numSection);

  // 5. Code Filters & CNF Query Builder
  const codeSection = el('div', {class:'filter-section'});
  const codeTitle = el('div', {class:'filter-section-title'}, [
    document.createTextNode('Qualitative Codes'),
    el('span', {class:'reset-link', onclick:()=>{ state.queryGroups = []; renderAll(); }}, 'clear')
  ]);
  codeSection.appendChild(codeTitle);
  codeSection.appendChild(el('div', {style:'font-size:11px; color:var(--ink-muted); margin:-4px 0 10px; line-height:1.4;'},
    'Click a code to add it as an AND clause. Click again to negate (! NOT), click once more to remove. Connectors toggle between AND and OR.'));

  const queryBox = el('div', {class:'query-builder'});
  renderQueryBuilder(queryBox);
  codeSection.appendChild(queryBox);

  const expandRow = el('div', {class:'expand-all-row'}, [
    el('span', {onclick:()=>{ FAMILIES.forEach(f=>openFamilies.add(f.family)); renderFilters(); }}, 'expand all'),
    el('span', {onclick:()=>{ openFamilies.clear(); renderFilters(); }}, 'collapse all')
  ]);
  codeSection.appendChild(expandRow);

  const facetCounts = computeFacetCounts();

  FAMILIES.forEach(f=>{
    const color = famColor(f.family);
    const isOpen = openFamilies.has(f.family);
    const group = el('div', {class:'family-group' + (isOpen?' open':'')});
    const header = el('div', {class:'family-header'});
    header.append(
      el('div', {class:'dot', style:`background:${color}`}),
      el('div', {class:'name'}, famLabel(f.family)),
      el('div', {class:'count'}, `${f.subs.length}`),
      el('div', {class:'chevron', html:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>'})
    );
    header.addEventListener('click', ()=>{
      if(openFamilies.has(f.family)) openFamilies.delete(f.family);
      else openFamilies.add(f.family);
      renderFilters();
    });
    const body = el('div', {class:'family-body'});
    f.subs.forEach(s=>{
      const found = findEntry(s.code);
      const mode = found ? (state.queryGroups[found.gi][found.ei].negate ? 'not' : 'and') : null;
      const chip = el('div', {
        class:'code-chip' + (mode ? ' mode-'+mode : ''),
        style:`--chip-color:${color}`,
        'data-code': s.code
      });
      const cnt = facetCounts.get(s.code) || 0;
      chip.append(
        document.createTextNode((s.sub || famLabel(f.family)) + ' '),
        el('span', {class:'n'}, `${cnt}`)
      );
      chip.addEventListener('click', ()=>toggleCodeInQuery(s.code));
      chip.addEventListener('mouseenter', ()=>highlightCode(s.code, true));
      chip.addEventListener('mouseleave', ()=>highlightCode(s.code, false));
      body.appendChild(chip);
    });
    group.append(header, body);
    codeSection.appendChild(group);
  });

  root.appendChild(codeSection);
}

function renderQueryBuilder(container){
  container.innerHTML = '';
  if(!state.queryGroups.length){
    container.appendChild(el('div', {class:'query-empty-hint'}, 'No code filters active. Click any code below to filter.'));
    return;
  }
  state.queryGroups.forEach((group, gi)=>{
    if(gi>0){
      container.appendChild(el('div', {
        class:'query-connector-and',
        title:'Click to convert this AND into OR (merges with previous group)',
        onclick:()=>mergeGroupUp(gi)
      }, 'AND'));
    }
    const groupEl = el('div', {class:'query-group'});
    group.forEach((entry, ei)=>{
      if(ei>0){
        groupEl.appendChild(el('span', {
          class:'query-connector-or',
          title:'Click to convert this OR into AND (splits into new group)',
          onclick:()=>splitGroupAt(gi, ei)
        }, 'OR'));
      }
      const color = famColor(codeFamilyOf(entry.code));
      const entryChip = el('span', {
        class:'query-entry' + (entry.negate ? ' negated' : ''),
        style:`--chip-color:${color}`
      });
      entryChip.append(
        el('span', {class:'query-entry-label', onclick:()=>toggleNegateAt(gi, ei)},
          (entry.negate ? '! ' : '') + labelForCode(entry.code)),
        el('span', {class:'query-entry-remove', onclick:()=>removeEntryAt(gi, ei)}, '×')
      );
      groupEl.appendChild(entryChip);
    });
    const removeGroupBtn = el('span', {class:'query-group-remove', onclick:()=>removeGroupAt(gi)}, 'remove');
    groupEl.appendChild(removeGroupBtn);
    container.appendChild(groupEl);
  });
  container.appendChild(el('div', {class:'query-add-group-btn', onclick:()=>addNewGroup()}, '+ New AND group'));
}

function codeFamilyOf(code){
  for(const f of FAMILIES){
    if(f.subs.some(s=>s.code===code)) return f.family;
  }
  return '?';
}
function labelForCode(code){
  for(const f of FAMILIES){
    const s = f.subs.find(s=>s.code===code);
    if(s) return famLabel(f.family) + (s.sub ? ' · ' + s.sub : '');
  }
  return code;
}

function highlightCode(code, on){
  document.querySelectorAll(`.turn-code-chip[data-code="${CSS.escape(code)}"]`).forEach(el=>{
    el.classList.toggle('chip-highlight', on);
  });
}

function renderActiveFiltersBar(){
  const bar = document.getElementById('activeFiltersBar');
  bar.innerHTML = '';
  const pills = [];

  if(state.source !== 'all'){
    pills.push({
      label: `Source: ${state.source.toUpperCase()}`,
      onremove: ()=>{ state.source = 'all'; renderAll(); }
    });
  }
  if(state.coders.size < META.coders.length){
    pills.push({
      label: `Coders: ${Array.from(state.coders).map(c=>c.replace('Coder_','Coder ')).join(', ')}`,
      onremove: ()=>{ state.coders = new Set(META.coders); renderAll(); }
    });
  }
  if(state.search){
    pills.push({
      label: `Text: "${state.search}"`,
      onremove: ()=>{ state.search = ''; renderAll(); }
    });
  }
  if(state.participantIdSearch){
    pills.push({
      label: `Participant #${state.participantIdSearch}`,
      onremove: ()=>{ state.participantIdSearch = ''; renderAll(); }
    });
  }
  if(state.sampleNumberSearch){
    pills.push({
      label: `Sample #${state.sampleNumberSearch}`,
      onremove: ()=>{ state.sampleNumberSearch = ''; renderAll(); }
    });
  }
  if(state.filterUnit === 'participant'){
    pills.push({
      label: 'Unit: Participant Level',
      onremove: ()=>{ state.filterUnit = 'turn'; renderAll(); }
    });
  }
  if(state.selectedTurns.size < 4 && state.selectedTurns.size > 0){
    const turnStr = Array.from(state.selectedTurns).sort().map(t=>`T${t}`).join(', ');
    pills.push({
      label: `Turns: ${turnStr}`,
      onremove: ()=>{ state.selectedTurns = new Set([1, 2, 3, 4]); renderAll(); }
    });
  }
  const r = state.ranges;
  if(r.pre_score.lo > 0 || r.pre_score.hi < 100){
    pills.push({
      label: `Pre: ${r.pre_score.lo}..${r.pre_score.hi}`,
      onremove: ()=>{ state.ranges.pre_score = {min:0,max:100,lo:0,hi:100}; renderAll(); }
    });
  }
  if(r.post_score.lo > 0 || r.post_score.hi < 100){
    pills.push({
      label: `Post: ${r.post_score.lo}..${r.post_score.hi}`,
      onremove: ()=>{ state.ranges.post_score = {min:0,max:100,lo:0,hi:100}; renderAll(); }
    });
  }
  if(r.change_score.lo > -40 || r.change_score.hi < 100){
    pills.push({
      label: `Change: ${r.change_score.lo}..${r.change_score.hi}`,
      onremove: ()=>{ state.ranges.change_score = {min:-40,max:100,lo:-40,hi:100}; renderAll(); }
    });
  }
  state.queryGroups.forEach((g, gi)=>{
    g.forEach((e, ei)=>{
      pills.push({
        label: (e.negate ? 'NOT ' : '') + labelForCode(e.code),
        negated: e.negate,
        onremove: ()=>removeEntryAt(gi, ei)
      });
    });
  });

  if(pills.length === 0){
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'flex';
  bar.appendChild(el('span', {class:'active-filters-title'}, 'Active Filters:'));
  pills.forEach(p=>{
    const pill = el('span', {class:'filter-pill' + (p.negated ? ' negated':'')}, [
      document.createTextNode(p.label + ' '),
      el('span', {class:'remove-pill', onclick:p.onremove}, '×')
    ]);
    bar.appendChild(pill);
  });
  bar.appendChild(el('span', {class:'clear-all-link', onclick:()=>resetAllFilters()}, 'Reset all'));
}

function resetAllFilters(){
  state.filterUnit = 'turn';
  state.source = 'all';
  state.coders = new Set(META.coders);
  state.search = '';
  state.sampleNumberSearch = '';
  state.participantIdSearch = '';
  state.selectedTurns = new Set([1, 2, 3, 4]);
  state.targetParticipant = null;
  state.targetTurn = null;
  state.ranges.pre_score = {min:0,max:100,lo:0,hi:100};
  state.ranges.post_score = {min:0,max:100,lo:0,hi:100};
  state.ranges.change_score = {min:-40,max:100,lo:-40,hi:100};
  state.ranges.turn_number = {min:1,max:4,lo:1,hi:4};
  state.queryGroups = [];
  renderAll();
}

// ---------------- Card Rendering ----------------
function renderCard(conv, turnFlags){
  const card = el('div', {class:'conversation-card', id:`conv-${conv.participant_id}`});
  if(state.targetParticipant === conv.participant_id){
    card.classList.add('target-focus');
  }

  const header = el('div', {class:'card-header'});
  header.append(
    el('div', {class:'source-badge ' + conv.source}, conv.source),
    el('div', {class:'coder-badge'}, conv.coder.replace('Coder_','Coder ')),
    el('div', {class:'tag'}, ['Participant ', el('b',{}, `${conv.participant_id}`)]),
    el('div', {class:'tag'}, ['Sample ', el('b',{}, `#${conv.sample_number}`)])
  );

  const scoreTrack = el('div', {class:'score-track'});
  const dumbbell = el('div', {class:'score-dumbbell'});
  const preP = conv.pre_score, postP = conv.post_score;
  const lo = Math.min(preP, postP), hi = Math.max(preP, postP);
  dumbbell.append(
    el('div', {class:'line', style:'left:0%; width:100%;'}),
    el('div', {class:'bar', style:`left:${lo}%; width:${hi-lo}%;`}),
    el('div', {class:'pt pre', style:`left:${preP}%;`, title:`Pre: ${fmtScore(preP)}`}),
    el('div', {class:'pt post', style:`left:${postP}%;`, title:`Post: ${fmtScore(postP)}`})
  );
  const changeCls = conv.change_score > 0 ? 'up' : (conv.change_score < 0 ? 'down' : 'flat');
  const changeChip = el('div', {class:'change-chip '+changeCls}, `${conv.change_score>0?'+':''}${fmtScore(conv.change_score)}`);
  
  const cardLinkBtn = el('button', {
    class:'card-link-btn',
    title:'Copy permanent link to this conversation',
    onclick:()=>{
      const url = `${window.location.origin}${window.location.pathname}?participant=${conv.participant_id}`;
      copyText(url, `Copied link for Participant #${conv.participant_id}!`);
    }
  }, [
    el('span', {html:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'})
  ]);

  scoreTrack.append(
    el('span', {class:'tag', style:'font-size:10.5px;'}, `pre ${fmtScore(preP)} → post ${fmtScore(postP)}`),
    dumbbell,
    changeChip,
    cardLinkBtn
  );
  header.appendChild(scoreTrack);
  card.appendChild(header);

  const turnsWrap = el('div', {class:'turns'});
  const anyFilterActive = state.search || state.queryGroups.length > 0 || state.turnFilter !== null ||
    state.ranges.turn_number.lo > 1 || state.ranges.turn_number.hi < 4;

  conv.turns.forEach((t, i)=>{
    const matched = turnFlags[i];
    const isTargetTurn = (state.targetParticipant === conv.participant_id && state.targetTurn === t.turn_number);
    const row = el('div', {
      class:'turn-row' + (matched ? ' matched':'') + (anyFilterActive && !matched ? ' dimmed':'') + (isTargetTurn ? ' target-turn-focus':''),
      id:`turn-${conv.participant_id}-${t.turn_number}`
    });

    row.append(el('div', {class:'turn-marker'}, `${t.turn_number}`));
    
    const content = el('div', {class:'turn-content'});
    const metaHeader = el('div', {class:'turn-meta-header'});
    metaHeader.append(el('span', {class:'turn-label'}, `Turn ${t.turn_number}`));
    if(anyFilterActive && matched){
      metaHeader.append(el('span', {class:'turn-match-badge'}, 'MATCH'));
    }

    const turnLinkBtn = el('button', {
      class:'turn-permalink-btn',
      title:'Copy link to this specific turn',
      onclick:()=>{
        const url = `${window.location.origin}${window.location.pathname}?participant=${conv.participant_id}&turn=${t.turn_number}`;
        copyText(url, `Copied link to Turn ${t.turn_number} (Participant #${conv.participant_id})!`);
      }
    }, [
      el('span', {html:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'}),
      document.createTextNode('cite')
    ]);
    metaHeader.appendChild(turnLinkBtn);
    content.appendChild(metaHeader);

    const textLine = el('p', {class:'turn-text'}, t.text);
    content.appendChild(textLine);

    if(t.codes.length){
      const codesWrap = el('div', {class:'turn-codes'});
      t.codes.forEach(c=>{
        const color = famColor(c.family);
        const chip = el('span', {
          class:'turn-code-chip',
          'data-code': c.code
        });
        chip.style.setProperty('--chip-bg', hexToRgba(color, 0.12));
        chip.style.setProperty('--chip-fg', color);
        chip.style.setProperty('--chip-border', hexToRgba(color, 0.35));
        chip.append(
          el('span', {class:'fam'}, famLabel(c.family) + (c.sub? ' · ':'')),
          c.sub || ''
        );
        codesWrap.appendChild(chip);
      });
      content.appendChild(codesWrap);
    } else {
      content.appendChild(el('div', {class:'no-codes'}, 'no codes assigned'));
    }
    row.appendChild(content);
    turnsWrap.appendChild(row);
  });
  card.appendChild(turnsWrap);
  return card;
}

function hexToRgba(hex, alpha){
  hex = hex.replace('#','').trim();
  if(hex.length===3) hex = hex.split('').map(c=>c+c).join('');
  const r = parseInt(hex.substring(0,2),16);
  const g = parseInt(hex.substring(2,4),16);
  const b = parseInt(hex.substring(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------------- Rendering: Feed & Stats ----------------
function renderFeed(){
  const feed = document.getElementById('feed');
  const paginationBar = document.getElementById('paginationBar');
  feed.innerHTML = '';
  
  const {results} = computeResults();

  if(!results.length){
    feed.appendChild(el('div', {class:'feed-empty'}, [
      el('div', {class:'glyph'}, '∅'),
      el('div', {style:'font-size:16px; font-weight:600; margin-bottom:4px;'}, 'No matching conversations'),
      el('div', {style:'font-size:13px;'}, 'Try broadening your filters or resetting code requirements.')
    ]));
    paginationBar.style.display = 'none';
    return;
  }

  const slice = results.slice(0, renderedCount);
  const frag = document.createDocumentFragment();
  slice.forEach(({conv, turnFlags})=> frag.appendChild(renderCard(conv, turnFlags)));
  feed.appendChild(frag);

  if(results.length > renderedCount){
    paginationBar.style.display = 'flex';
    document.getElementById('loadMoreBtn').textContent = `Load More (${renderedCount} of ${results.length} displayed)`;
  } else {
    paginationBar.style.display = 'none';
  }
}

function renderStats(){
  const {results, totalMatchingTurns} = computeResults();
  const statsBar = document.getElementById('statsBar');
  statsBar.innerHTML = '';
  statsBar.append(
    el('span', {}, [document.createTextNode('conversations (participants) '), el('b',{}, `${results.length}`), document.createTextNode(` / ${META.n_conversations}`)]),
    el('span', {class:'divider'}),
    el('span', {}, [document.createTextNode('matching turns '), el('b',{}, `${totalMatchingTurns}`), document.createTextNode(` / ${META.n_turns}`)])
  );
}

function renderAll(){
  renderFilters();
  renderFeed();
  renderStats();
  renderActiveFiltersBar();
  updateUrl();
}

// ---------------- Export Feature ----------------
function exportCurrentData(){
  const {results} = computeResults();
  const exportRows = [];
  results.forEach(({conv, turnFlags})=>{
    conv.turns.forEach((t, i)=>{
      exportRows.push({
        participant_id: conv.participant_id,
        sample_number: conv.sample_number,
        source: conv.source,
        coder: conv.coder,
        pre_score: conv.pre_score,
        post_score: conv.post_score,
        change_score: conv.change_score,
        turn_number: t.turn_number,
        turn_text: t.text,
        codes: t.codes.map(c=>c.code).join(' | '),
        filter_matched: turnFlags[i] ? 'YES' : 'NO'
      });
    });
  });

  const headers = Object.keys(exportRows[0] || {});
  const csvLines = [headers.join(',')];
  exportRows.forEach(r=>{
    const row = headers.map(h=>`"${String(r[h]).replace(/"/g, '""')}"`).join(',');
    csvLines.push(row);
  });
  const blob = new Blob([csvLines.join('\n')], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DcodeD_export_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${exportRows.length} turns to CSV!`);
}

// ---------------- Event Listeners & Initialization ----------------
document.getElementById('copyShareLinkBtn').addEventListener('click', ()=>{
  const fullUrl = window.location.href;
  copyText(fullUrl, 'Shareable reference link copied to clipboard!');
});

document.getElementById('exportBtn').addEventListener('click', exportCurrentData);

document.getElementById('loadMoreBtn').addEventListener('click', ()=>{
  renderedCount += 50;
  renderFeed();
});

document.getElementById('filtersToggleBtn').addEventListener('click', ()=>{
  document.getElementById('filters').classList.add('open');
  document.getElementById('filtersScrim').classList.add('open');
});
document.getElementById('filtersScrim').addEventListener('click', ()=>{
  document.getElementById('filters').classList.remove('open');
  document.getElementById('filtersScrim').classList.remove('open');
});

// Initialize from URL
parseUrlToState();
renderAll();

// Auto-scroll to target participant/turn if present in URL
if(state.participantIdSearch || state.targetParticipant){
  const targetId = state.participantIdSearch || state.targetParticipant;
  setTimeout(()=>{
    const targetEl = document.getElementById(`conv-${targetId}`);
    if(targetEl){
      targetEl.scrollIntoView({behavior:'smooth', block:'center'});
    }
  }, 200);
}

})();

