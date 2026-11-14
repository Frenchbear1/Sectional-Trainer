'use strict';

const byId = id => document.getElementById(id);
const indexPanel = byId('index');
const search = byId('search');
const list = byId('results');
const family = byId('family');
const layer = byId('layer');
const map = byId('map');
const tiles = byId('tiles');
const target = byId('target');
const notice = byId('map-notice');
const guidePdf = 'https://aeronav.faa.gov/user_guide/cug-complete_20260709.pdf';
const vfr = 'https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/vfr/';
const ifr = 'https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/ifr/';
const tileRoot = 'https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/';
const layers = {
  sectional: { service:'VFR_Sectional', min:8, max:12, source:vfr, key:'b2b667091778aac9', date:'10/29/2026' },
  tac: { service:'VFR_Terminal', min:10, max:12, source:vfr, key:'99ba5db502764b43' },
  low: { service:'IFR_AreaLow', min:7, max:12, source:ifr, key:'bd96c0d55091a399' },
  high: { service:'IFR_High', min:5, max:9, source:ifr, key:'8d9ad9945b7b276b' }
};
const home = { lat:40.66, lon:-75.46, zoom:10 };
const view = { ...home };
const normalize = value => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const readSaved = () => {
  try { return new Set(JSON.parse(localStorage.getItem('sectional-trainer-saved') || '[]')); }
  catch { return new Set(); }
};
const saved = readSaved();
function readPins() {
  try {
    const stored = JSON.parse(localStorage.getItem('sectional-trainer-pins') || '{}');
    return new Map(Object.entries(stored).filter(([,examples]) => Array.isArray(examples)));
  } catch {return new Map();}
}
const ownPins = readPins();
const rows = window.CHART_INDEX.flatMap(group => group.rows.map(row => {
  const [title, aliases = '', description = '', exampleKey = ''] = row.split('|');
  return {
    id: group.id + '-' + normalize(title).replaceAll(' ','-'), group: group.id, section:group.section,
    title, aliases, description, examples:window.CHART_EXAMPLES[exampleKey] || [],
    searchable:normalize(title + ' ' + aliases + ' ' + group.section + ' ' + description)
  };
}));
const byExample = new Map(rows.map(row => [row.id,row]));
for (const row of rows) row.examples = [...(ownPins.get(row.id) || []),...row.examples];
let active = null;
let exampleNumber = 0;
let showTarget = true;
let teaching = false;
let filter = 'all';
let pin = null;
let frame = 0;
let lastTileSignature = '';
let visibleImages = [];
let rootStatus = '';
let sampleState = null;
let sampleNotice = '';
let sampleVersion = 0;
let matches = [];
const exampleStatus = item => item?.kind || (Number.isFinite(item?.lat) ? 'Chart location' : item?.url ? 'FAA source' : 'Example pending');
const featureRoot = 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/ArcGIS/rest/services/';
const featureSources = [
  {id:'US_Airport', label:'Airport', code:'ICAO_ID', fallback:'IDENT', name:'NAME', group:'sec-airports'},
  {id:'NAVAIDSystem', label:'Navaid', code:'IDENT', name:'NAME_TXT', group:'sec-airports'},
  {id:'DesignatedPoints', label:'Designated point', code:'IDENT', group:'sec-nav'},
  {id:'Class_Airspace', label:'Class airspace', code:'ICAO_ID', fallback:'IDENT', name:'NAME', group:'sec-airspace'},
  {id:'Special_Use_Airspace', label:'Special use airspace', name:'NAME', group:'sec-airspace'},
  {id:'ATS_Route', label:'Airway segment', code:'IDENT', group:'sec-airspace'},
  {id:'Stadiums', label:'Stadium', name:'NAME', group:'sec-airspace'}
];
let featureRows = [];
let featureTimer;
let featureMessage = '';
let featureRequest = 0;

function el(tag, className, value) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (value !== undefined) item.textContent = value;
  return item;
}
function link(label, url) {
  const item = el('a', '', label);
  item.href = url;
  item.target = '_blank';
  item.rel = 'noopener';
  return item;
}
function action(label, handler, selected = false) {
  const item = el('button', selected ? 'selected' : '', label);
  item.type = 'button';
  item.addEventListener('click', handler);
  return item;
}
function setIndex(open) {
  indexPanel.classList.toggle('open', open);
  byId('open-index').setAttribute('aria-expanded', String(open));
  if (open) search.focus();
}
function score(row, query, words) {
  const title = normalize(row.title);
  if (title === query) return 100;
  if (title.startsWith(query)) return 70;
  if (title.includes(query)) return 55;
  if (normalize(row.aliases).includes(query)) return 50;
  if (!words.every(word => row.searchable.includes(word))) return -1;
  return 15 + words.filter(word => title.includes(word)).length * 5;
}
function renderList(keepScroll = false) {
  const originalScroll = list.scrollTop;
  const query = normalize(search.value);
  const words = query.split(' ').filter(Boolean);
  const matched = rows.filter(row => (family.value === 'all' || family.value === row.group) &&
      (filter !== 'examples' || row.examples.length) && (filter !== 'saved' || saved.has(row.id)))
    .map((row, index) => [row, query ? score(row,query,words) : 0, index])
    .filter(entry => entry[1] >= 0)
    .sort((a,b) => b[1]-a[1] || (query ? 0 : Number(Boolean(b[0].examples.length))-Number(Boolean(a[0].examples.length))) || a[2]-b[2]);
  byId('count').textContent = matched.length.toLocaleString() + ' / ' + rows.length.toLocaleString();
  const result = document.createDocumentFragment();
  const appendRow = row => {
    const button = action('', () => select(row));
    button.className = 'result';
    button.dataset.id = row.id;
    if (active?.id === row.id) button.setAttribute('aria-current','true');
    const icon = el('span','result-icon',row.examples.length ? '◉' : '◇');
    icon.setAttribute('aria-hidden','true');
    const copy = el('span','result-copy');
    copy.append(el('strong','result-title',row.title), el('span','result-meta',row.section + ' · ' + exampleStatus(row.examples[0])));
    button.append(icon, copy, el('span','result-arrow','›'));
    result.append(button);
  };
  const locations = filter === 'saved' ? [] : featureRows.filter(row => family.value === 'all' || row.group === family.value);
  if (locations.length || featureMessage) {
    if (locations.length) result.append(el('p','result-divider','FAA feature search'));
    for (const row of locations) appendRow(row);
    if (featureMessage) result.append(el('p','result-divider',featureMessage));
    if (matched.length && locations.length) result.append(el('p','result-divider','Guide index'));
  }
  for (const [row] of matched) appendRow(row);
  if (!matched.length && !locations.length && !featureMessage) result.append(byId('empty').content.cloneNode(true));
  list.replaceChildren(result);
  list.scrollTop = keepScroll ? originalScroll : 0;
}

function details() {
  const panel = byId('details');
  const copy = el('div');
  const actions = el('div','actions');
  if (!active) {
    copy.append(el('h2','','Lehigh Valley, Pennsylvania'));
    copy.append(el('p','','Start with KABE’s Class C shelves or pick any marking from the index.'));
    actions.append(action('Show Class C', () => select(rows.find(row => row.title === 'Class C airspace')),true));
  } else {
    const item = active.examples[exampleNumber];
    copy.append(el('p','meta',active.section + ' · ' + exampleStatus(item) + (item ? ' · ' + item.name : '')));
    copy.append(el('h2','',teaching && item ? 'Find the marking on the chart' : active.title));
    copy.append(el('p','',teaching && item ? 'Reveal the marking when the student is ready.' : active.description || (item ? item.note : 'Open the guide and use this title to find the related illustration or text.')));
    if (!teaching && item?.note && active.description && item.note !== active.description) copy.append(el('p','',item.note));
    if (!item) copy.append(el('p','','Chart example pending.'));
    if (item?.url) actions.append(link(item.kind === 'FAA chart PDF' ? 'Open FAA PDF ↗' : 'Open FAA source ↗',item.url));
    if (Number.isFinite(item?.lat)) {
      actions.append(action(teaching ? 'Reveal' : 'Quiz mode', () => { teaching = !teaching; showTarget = !teaching; details(); schedule(); },true));
      if (!teaching) actions.append(action(showTarget ? 'Hide marker' : 'Show marker', () => { showTarget = !showTarget; details(); schedule(); }));
    }
    if (active.examples.length > 1) actions.append(action('Next ' + (exampleNumber+1) + '/' + active.examples.length, () => jumpExample((exampleNumber+1)%active.examples.length)));
    if (!teaching && !active.live) actions.append(action('Pin chart center', () => {
      const entry = {name:'Saved chart center',kind:'My example',lat:view.lat,lon:view.lon,zoom:view.zoom,layer:layer.value};
      ownPins.set(active.id,[entry,...(ownPins.get(active.id)||[])]);
      active.examples.unshift(entry);
      try { localStorage.setItem('sectional-trainer-pins',JSON.stringify(Object.fromEntries(ownPins))); } catch {}
      jumpExample(0);
      renderList(true);
    }));
    if (!teaching && item?.kind === 'My example') actions.append(action('Remove pin', () => {
      ownPins.set(active.id,(ownPins.get(active.id)||[]).filter(entry => entry !== item));
      active.examples.splice(exampleNumber,1);
      try { localStorage.setItem('sectional-trainer-pins',JSON.stringify(Object.fromEntries(ownPins))); } catch {}
      jumpExample(0);
      renderList(true);
    }));
    if (!active.live) actions.append(action(saved.has(active.id) ? 'Saved' : 'Save', () => {
      if (saved.has(active.id)) saved.delete(active.id); else saved.add(active.id);
      try { localStorage.setItem('sectional-trainer-saved', JSON.stringify([...saved])); } catch {}
      details();
      renderList(true);
    }));
    if (!active.live) actions.append(link('FAA guide ↗',guidePdf));
  }
  panel.replaceChildren(copy, actions);
}
function jumpExample(number) {
  resetScan();
  exampleNumber = number;
  teaching = false;
  showTarget = true;
  const place = active?.examples[number];
  pin = null;
  if (Number.isFinite(place?.lat)) {
    layer.value = place.layer || 'sectional';
    setView(place.lat,place.lon,place.zoom ?? 12);
    pin = { lat:place.lat, lon:place.lon, layer:layer.value };
  }
  details();
  schedule();
}
function select(row) {
  if (!row) return;
  active = row;
  jumpExample(0);
  renderList(true);
  setIndex(false);
}

const clamp = (number, min, max) => Math.max(min, Math.min(max, number));
const wrap = value => ((value % 1) + 1) % 1;
function project(lat,lon) {
  const rad = clamp(lat,-85.05112878,85.05112878)*Math.PI/180;
  return { x:wrap((lon+180)/360),y:(1-Math.asinh(Math.tan(rad))/Math.PI)/2 };
}
function unproject(x,y) {
  return {lon:wrap(x)*360-180,lat:Math.atan(Math.sinh(Math.PI*(1-2*clamp(y,0,1))))*180/Math.PI};
}
function setView(lat,lon,zoom) {
  Object.assign(view,{lat,lon,zoom:clamp(zoom,layers[layer.value].min,15)});
  schedule();
}
function coordAt(x,y) {
  const center = project(view.lat,view.lon);
  const scale = 256*2**view.zoom;
  return {x:center.x+(x-map.clientWidth/2)/scale,y:center.y+(y-map.clientHeight/2)/scale};
}
function zoomAt(zoom,x=map.clientWidth/2,y=map.clientHeight/2,anchor=coordAt(x,y)) {
  zoom = clamp(zoom,layers[layer.value].min,15);
  const scale = 256*2**zoom;
  const next = unproject(anchor.x-(x-map.clientWidth/2)/scale,anchor.y-(y-map.clientHeight/2)/scale);
  setView(next.lat,next.lon,zoom);
}
function schedule() {
  if (!frame) frame = requestAnimationFrame(draw);
}
function mapStatus() {
  const ready = visibleImages.filter(img => img.dataset.state === 'ready').length;
  const loading = visibleImages.some(img => !img.dataset.state);
  const record = layers[layer.value];
  const status = sampleNotice || (!visibleImages.length ? '' : !ready ? (loading ? 'Loading FAA chart…' : 'Chart tiles did not load here. Try another layer or open Original charts.') :
    view.zoom > record.max ? 'At FAA tile detail limit. Open the original chart for more detail.' : '');
  if (status !== rootStatus) {
    rootStatus = status;
    notice.textContent = status;
    notice.hidden = !status;
  }
}
function draw() {
  frame = 0;
  const record = layers[layer.value];
  const center = project(view.lat,view.lon);
  const width = map.clientWidth;
  const height = map.clientHeight;
  if (width < 1 || height < 1) return;
  const z = clamp(Math.floor(view.zoom + .001), record.min, record.max);
  const tileCount = 2**z;
  const size = 256*2**(view.zoom-z);
  const left = width/2 - center.x*tileCount*size;
  const top = height/2 - center.y*tileCount*size;
  const x0 = Math.floor(-left/size), x1 = Math.floor((width-left)/size);
  const y0 = Math.max(0,Math.floor(-top/size)), y1 = Math.min(tileCount-1,Math.floor((height-top)/size));
  const sig = [record.service,record.key,z,x0,x1,y0,y1].join('/');
  if (sig !== lastTileSignature) {
    lastTileSignature = sig;
    const next = new Set();
    const images = new Map([...tiles.children].map(img => [img.dataset.tile,img]));
    visibleImages = [];
    for (let y=y0; y<=y1; y++) for (let x=x0; x<=x1; x++) {
      const position = [record.service,record.key,z,x,y].join('/');
      let img = images.get(position);
      if (!img) {
        img = el('img','tile');
        img.alt = '';
        img.draggable = false;
        img.dataset.tile = position;
        img.dataset.x = x;
        img.dataset.y = y;
        const tileUrl = tileRoot + record.service + '/MapServer/tile/' + z + '/' + y + '/' + ((x%tileCount+tileCount)%tileCount);
        img.addEventListener('load', () => {img.dataset.state = 'ready'; mapStatus();});
        img.addEventListener('error', () => {
          if (!img.dataset.retried) {
            img.dataset.retried = 'true';
            img.src = tileUrl + '?blankTile=false';
          } else {
            img.dataset.state = 'error';
            mapStatus();
          }
        });
        img.src = tileUrl + '?blankTile=false&cacheKey=' + encodeURIComponent(record.key || '');
        tiles.append(img);
      }
      next.add(position);
      visibleImages.push(img);
    }
    for (const [position,img] of images) if (!next.has(position)) img.remove();
  }
  for (const img of visibleImages) {
    img.style.width = (size+.12)+'px';
    img.style.height = (size+.12)+'px';
    img.style.transform = 'translate(' + (left+Number(img.dataset.x)*size) + 'px,' + (top+Number(img.dataset.y)*size) + 'px)';
  }
  target.hidden = !pin || !showTarget || pin.layer !== layer.value;
  if (!target.hidden) {
    const point = project(pin.lat,pin.lon);
    const dx = wrap(point.x-center.x+.5)-.5;
    const scale = 256*2**view.zoom;
    target.style.left = (width/2+dx*scale)+'px';
    target.style.top = (height/2+(point.y-center.y)*scale)+'px';
  }
  byId('zoom-in').disabled = view.zoom >= 15;
  byId('zoom-out').disabled = view.zoom <= record.min;
  byId('position').textContent = view.lat.toFixed(3) + '°, ' + view.lon.toFixed(3) + '° · Zoom ' + view.zoom.toFixed(1);
  byId('edition').textContent = record.date ? 'FAA tiles · ' + record.date : 'FAA chart tiles';
  byId('original').href = record.source;
  drawMatches(center,width,height);
  mapStatus();
}

const pointers = new Map();
let gesture = null;
function mapPoint(event) {
  const rect = map.getBoundingClientRect();
  return {x:event.clientX-rect.left,y:event.clientY-rect.top};
}
function gestureStart() {
  const [a,b] = pointers.values();
  if (!a) {gesture=null; return;}
  const mid = b ? {x:(a.x+b.x)/2,y:(a.y+b.y)/2} : a;
  gesture = { anchor:coordAt(mid.x,mid.y), start:view.zoom, distance:b ? Math.hypot(a.x-b.x,a.y-b.y) : 0 };
}
map.addEventListener('pointerdown', event => {
  if (sampleState || event.button > 0 || pointers.size >= 2) return;
  pointers.set(event.pointerId,mapPoint(event));
  map.setPointerCapture(event.pointerId);
  map.classList.add('dragging');
  gestureStart();
});
map.addEventListener('pointermove', event => {
  if (!gesture || !pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId,mapPoint(event));
  const [a,b] = pointers.values();
  if (b && gesture.distance > 1) {
    const ratio = Math.max(.02,Math.hypot(a.x-b.x,a.y-b.y)/gesture.distance);
    zoomAt(gesture.start+Math.log2(ratio),(a.x+b.x)/2,(a.y+b.y)/2,gesture.anchor);
  } else zoomAt(view.zoom,a.x,a.y,gesture.anchor);
});
for (const type of ['pointerup','pointercancel','lostpointercapture']) map.addEventListener(type,event => {
  if (!pointers.delete(event.pointerId)) return;
  if (!pointers.size) map.classList.remove('dragging');
  gestureStart();
});
map.addEventListener('wheel',event => {
  event.preventDefault();
  const {x,y} = mapPoint(event);
  const delta = event.deltaMode === 1 ? event.deltaY*16 : event.deltaY;
  zoomAt(view.zoom-clamp(delta/180,-.9,.9),x,y);
},{passive:false});
map.addEventListener('dblclick',event => {
  const {x,y} = mapPoint(event);
  zoomAt(view.zoom+1,x,y);
});
map.addEventListener('keydown',event => {
  const delta = {ArrowUp:[0,-85],ArrowDown:[0,85],ArrowLeft:[-85,0],ArrowRight:[85,0]}[event.key];
  if (delta) {
    const next = coordAt(map.clientWidth/2+delta[0],map.clientHeight/2+delta[1]);
    const point = unproject(next.x,next.y);
    setView(point.lat,point.lon,view.zoom);
  } else if (['+','=','-','−'].includes(event.key)) zoomAt(view.zoom+(['+','='].includes(event.key)?1:-1));
  else return;
  event.preventDefault();
});
byId('zoom-in').addEventListener('click',() => zoomAt(view.zoom+1));
byId('zoom-out').addEventListener('click',() => zoomAt(view.zoom-1));
byId('home').addEventListener('click',() => {
  resetScan();
  layer.value = 'sectional'; active=null; pin=null; teaching=false;
  setView(home.lat,home.lon,home.zoom);
  details();
  renderList(true);
});
byId('open-index').addEventListener('click',() => setIndex(!indexPanel.classList.contains('open')));
layer.addEventListener('change',() => {resetScan(); setView(view.lat,view.lon,view.zoom);});
family.addEventListener('change',() => renderList());
search.addEventListener('input',() => {
  const request = ++featureRequest;
  clearTimeout(featureTimer);
  featureRows = [];
  featureMessage = '';
  renderList();
  const raw = search.value.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9 -]{2,36}$/.test(raw) || raw.split(/\s+/).length > 4) return;
  const normalized = normalize(raw);
  if (rows.some(row => normalize(row.title) === normalized && row.examples.some(item => Number.isFinite(item.lat)))) return;
  featureTimer = setTimeout(() => searchFeatures(raw,request),350);
});
search.addEventListener('keydown',event => {
  if (event.key === 'Escape') setIndex(false);
  if (event.key === 'Enter') {
    const id = list.querySelector('[data-id]')?.dataset.id;
    select(byExample.get(id) || featureRows.find(row => row.id === id));
  }
});
for (const option of document.querySelectorAll('[data-filter]')) option.addEventListener('click',() => {
  filter = option.dataset.filter;
  for (const btn of document.querySelectorAll('[data-filter]')) {
    btn.classList.toggle('selected',btn === option);
    btn.setAttribute('aria-pressed',String(btn === option));
  }
  renderList();
});
for (const [value,label] of [['all','All chart families'],...window.CHART_INDEX.map(group => [group.id,group.label])]) {
  family.add(new Option(label,value));
}
if (typeof ResizeObserver === 'function') new ResizeObserver(schedule).observe(map);
else window.addEventListener('resize',schedule);
renderList();
details();
schedule();

const jsonp = (url, callback) => {
  const name = 'faa_' + Math.random().toString(36).slice(2);
  const script = el('script');
  const cleanup = () => {script.remove(); delete window[name];};
  window[name] = data => {clearTimeout(timeout); cleanup(); callback(data);};
  const timeout = setTimeout(cleanup,8000);
  script.addEventListener('error',() => {clearTimeout(timeout); cleanup();},{once:true});
  script.src = url + (url.includes('?') ? '&' : '?') + 'f=json&callback=' + name;
  document.head.append(script);
};
function applyDirectory(data) {
  for (const record of Object.values(layers)) {
    const service = data.services?.find(item => item.name === record.service);
    if (service?.cacheKey && record.key !== service.cacheKey) {record.key = service.cacheKey; record.date = '';}
    fetch(tileRoot + record.service + '/MapServer?f=json&cacheKey=' + encodeURIComponent(record.key))
      .then(response => response.ok ? response.json() : null)
      .then(meta => { if (meta) applyMetadata(record,meta); })
      .catch(() => jsonp(tileRoot + record.service + '/MapServer?cacheKey=' + encodeURIComponent(record.key), meta => applyMetadata(record,meta)));
  }
  schedule();
}
function applyMetadata(record,meta) {
  if (Number.isInteger(meta.minLOD)) record.min = meta.minLOD;
  if (Number.isInteger(meta.maxLOD)) record.max = meta.maxLOD;
  const tag = [meta.documentInfo?.Subject,meta.documentInfo?.Comments,meta.serviceDescription].join(' ').match(/(?:latest charts on|effective(?: as of)?)\s+(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i);
  if (tag) record.date = tag[1].replaceAll('-', '/');
  setView(view.lat,view.lon,view.zoom);
}
fetch(tileRoot + '?f=json',{cache:'no-cache'})
  .then(response => {if (!response.ok) throw new Error('Directory unavailable'); return response.json();})
  .then(applyDirectory)
  .catch(() => jsonp(tileRoot,applyDirectory));

async function queryApi(url) {
  try {
    const response = await fetch(url,{signal:AbortSignal.timeout(5500)});
    if (response.ok) return response.json();
  } catch {}
  return null;
}

function toFeature(source, feature) {
  const fields = feature.attributes || {};
  const code = fields[source.code] || fields[source.fallback];
  const name = fields[source.name];
  if (!code && !name) return null;
  const geom = feature.geometry || {};
  const paths = geom.paths || geom.rings;
  let lat = geom.y;
  let lon = geom.x;
  if (paths?.length) {
    const path = paths[0];
    if (!path.length) return null;
    const local = path.reduce((best,point) => Math.hypot(point[0]-view.lon,point[1]-view.lat) < Math.hypot(best[0]-view.lon,best[1]-view.lat) ? point : best);
    [lon,lat] = local;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180) return null;
  const title = [name,code && code !== name ? code : ''].filter(Boolean).join(' · ');
  const chart = source.id === 'DesignatedPoints' && !/^VP/.test(code || '') ? 'low' :
    source.id === 'ATS_Route' && /^[JQ]/.test(code || '') ? 'high' : 'sectional';
  return {
    id:'live-'+source.id+'-'+fields.OBJECTID,group:source.group,section:source.label,title,code,
    description:'Coordinates from FAA aeronautical data. This lookup does not verify the printed marking at that point.',
    examples:[{name:title,kind:'FAA data location',lat,lon,zoom:paths?10:12,layer:chart,
      url:featureRoot+source.id+'/FeatureServer/0'}],live:true
  };
}

async function searchFeatures(raw,request) {
  const compact = raw.replace(/[- ]/g,'');
  const looksLikeId = /^[A-Z0-9]{3,7}$/.test(compact) && !raw.includes(' ');
  const airspaceCode = compact.match(/^([PRAW])(\d{2,5}[A-Z]?)$/);
  const candidates = featureSources.filter(source => source.id !== 'ATS_Route' || /^[VJTQ]\d{1,4}$/.test(compact));
  const queries = candidates.map(async source => {
    const tests = [];
    if (source.code && looksLikeId) tests.push("UPPER("+source.code+") = '"+compact+"'");
    if (source.fallback && looksLikeId) tests.push("UPPER("+source.fallback+") = '"+compact+"'");
    if (source.name) {
      if (source.id === 'Special_Use_Airspace' && airspaceCode) {
        tests.push("UPPER(NAME) LIKE '%"+airspaceCode[1]+"-"+airspaceCode[2]+"%'");
        tests.push("UPPER(NAME) LIKE '%"+compact+"%'");
      } else tests.push("UPPER("+source.name+") LIKE '%"+raw+"%'");
    }
    if (!tests.length) return {ok:true,rows:[]};
    const url = new URL(featureRoot+source.id+'/FeatureServer/0/query');
    url.search = new URLSearchParams({where:tests.join(' OR '),outFields:[...new Set(['OBJECTID',source.code,source.fallback,source.name].filter(Boolean))].join(','),returnGeometry:'true',outSR:'4326',geometryPrecision:'5',resultRecordCount:'5',f:'json'});
    const data = await queryApi(url);
    return {ok:Array.isArray(data?.features),rows:(data?.features || []).map(feature=>toFeature(source,feature)).filter(Boolean)};
  });
  const responses = await Promise.all(queries);
  if (request !== featureRequest) return;
  featureRows = responses.flatMap(result=>result.rows)
    .sort((a,b)=>Number(b.code===compact)-Number(a.code===compact) || a.title.localeCompare(b.title))
    .slice(0,14);
  featureMessage = responses.some(result=>result.ok) ? '' : 'FAA feature search unavailable';
  renderList(true);
}

const scanButton = byId('scanner');
const scanMarks = byId('scan-marks');
function resetScan() {
  sampleVersion++;
  sampleState = null;
  sampleNotice = '';
  matches = [];
  scanMarks.replaceChildren();
  scanButton.textContent = 'Match symbol';
  scanButton.setAttribute('aria-pressed','false');
  map.classList.remove('sampling');
  schedule();
}
scanButton.addEventListener('click',() => {
  if (sampleState || sampleNotice) {resetScan(); return;}
  matches = [];
  sampleState = {layer:layer.value,first:null};
  sampleNotice = 'Tap opposite corners around a small, clear symbol.';
  scanButton.textContent = 'Cancel match';
  scanButton.setAttribute('aria-pressed','true');
  map.classList.add('sampling');
  schedule();
});
map.addEventListener('click',async event => {
  if (!sampleState || sampleState.busy) return;
  if (event.target.closest('.scan-mark')) return;
  const state = sampleState;
  const point = mapPoint(event);
  if (!state.first) {
    state.first = coordAt(point.x,point.y);
    sampleNotice = 'Tap the opposite corner of the symbol.';
    schedule();
    return;
  }
  const first = state.first;
  const end = coordAt(point.x,point.y);
  const scale = 256*2**view.zoom;
  const dx = (wrap(first.x-end.x+.5)-.5)*scale;
  const dy = (first.y-end.y)*scale;
  const w = Math.round(Math.abs(dx)), h = Math.round(Math.abs(dy));
  const x = Math.round(point.x+Math.min(0,dx)), y = Math.round(point.y+Math.min(0,dy));
  if (w<8 || h<8 || w>108 || h>108 || x<0 || y<0 || x+w>map.clientWidth || y+h>map.clientHeight) {
    state.first = null;
    sampleNotice = 'Choose a small box around the whole symbol, at least 8 pixels on each side.';
    schedule();
    return;
  }
  state.busy = true;
  const scanView = { ...view };
  const mapWidth = map.clientWidth, mapHeight = map.clientHeight;
  sampleNotice = 'Looking for similar colors and shapes in this view…';
  schedule();
  const request = ++sampleVersion;
  try {
    const snapshot = await chartPixels();
    if (request !== sampleVersion) return;
    const found = findSimilar(snapshot,x,y,w,h);
    const center = project(scanView.lat,scanView.lon);
    matches = found.map(item => ({
      ...unproject(center.x+(item.x+w/2-mapWidth/2)/scale,center.y+(item.y+h/2-mapHeight/2)/scale),
      layer:state.layer,zoom:scanView.zoom,w,h,score:item.score
    }));
    sampleNotice = matches.length ? matches.length + ' possible matches. Select an outline to inspect it.' : 'No close matches in this chart view.';
  } catch {
    if (request !== sampleVersion) return;
    sampleNotice = 'Chart pixels are unavailable for matching in this browser or chart area.';
  }
  sampleState = null;
  scanButton.textContent = 'Clear match';
  scanButton.setAttribute('aria-pressed','false');
  map.classList.remove('sampling');
  schedule();
});
async function chartPixels() {
  const canvas = document.createElement('canvas');
  canvas.width = map.clientWidth;
  canvas.height = map.clientHeight;
  const ctx = canvas.getContext('2d',{willReadFrequently:true});
  const images = visibleImages.filter(img => img.dataset.state === 'ready').map(img => {
    const transform = /^translate\(([-.\d]+)px,\s*([-.\d]+)px\)$/.exec(img.style.transform);
    return {url:img.src,x:Number(transform?.[1]),y:Number(transform?.[2]),size:parseFloat(img.style.width)};
  });
  if (!images.length) throw new Error('No visible tiles');
  await Promise.all(images.map(image => new Promise((resolve,reject) => {
    const bitmap = new Image();
    bitmap.crossOrigin = 'anonymous';
    bitmap.onload = () => {ctx.drawImage(bitmap,image.x,image.y,image.size,image.size); resolve();};
    bitmap.onerror = reject;
    bitmap.src = image.url;
  })));
  return ctx.getImageData(0,0,canvas.width,canvas.height);
}
function findSimilar(image,x,y,w,h) {
  const {data,width,height} = image;
  const get = (px,py) => (py*width+px)*4;
  const samples = [];
  const cols = Math.min(10,w);
  const lines = Math.min(10,h);
  for (let row=0;row<lines;row++) for (let col=0;col<cols;col++) {
    const dx = Math.floor((col+.5)*w/cols), dy = Math.floor((row+.5)*h/lines);
    const i = get(x+dx,y+dy);
    if (data[i+3] < 220) throw new Error('Sample extends off chart');
    const r=data[i],g=data[i+1],b=data[i+2];
    samples.push({dx,dy,r,g,b,priority:Math.max(r,g,b)-Math.min(r,g,b)+(255-Math.min(r,g,b))*.4});
  }
  samples.sort((a,b) => b.priority-a.priority);
  const seeds = samples.slice(0,8);
  if (seeds[0].priority < 12) return [];
  function distance(px,py,points) {
    let total = 0, weight = 0;
    for (const {dx,dy,r,g,b,priority} of points) {
      const i = get(px+dx,py+dy);
      if (data[i+3] < 220) return Infinity;
      const diff = Math.abs(r-data[i])+Math.abs(g-data[i+1])+Math.abs(b-data[i+2]);
      const factor = .35 + Math.min(1,priority/145);
      total += diff*factor;
      weight += factor;
    }
    return total/(3*weight);
  }
  const result = [];
  const step = Math.max(2,Math.ceil(Math.sqrt(width*height/210000)));
  for (let py=0;py<=height-h;py+=step) for (let px=0;px<=width-w;px+=step) {
    if (Math.abs(px-x)<w*.8 && Math.abs(py-y)<h*.8) continue;
    if (distance(px,py,seeds)>37) continue;
    const score = distance(px,py,samples);
    if (score>26) continue;
    const nearby = result.findIndex(item => Math.abs(item.x-px)<w/2 && Math.abs(item.y-py)<h/2);
    const item = {x:px,y:py,score};
    if (nearby>=0) {
      if (score<result[nearby].score) result[nearby] = item;
    } else result.push(item);
    if (result.length>32) result.sort((a,b)=>a.score-b.score).splice(22);
  }
  return result.sort((a,b)=>a.score-b.score).slice(0,12);
}
function drawMatches(center,width,height) {
  if (!matches.length) {if (scanMarks.children.length) scanMarks.replaceChildren(); return;}
  if (scanMarks.children.length !== matches.length) {
    scanMarks.removeAttribute('aria-hidden');
    scanMarks.replaceChildren(...matches.map((item,index) => {
      const button = action('',() => {
        setView(item.lat,item.lon,view.zoom);
        sampleNotice = 'Possible match ' + (index+1) + ' of ' + matches.length + '. Verify the shape on the chart before pinning it.';
        schedule();
      });
      button.className = 'scan-mark';
      button.setAttribute('aria-label','Inspect possible match '+(index+1));
      return button;
    }));
  }
  const scale = 256*2**view.zoom;
  for (const [index,item] of matches.entries()) {
    const mark = scanMarks.children[index];
    const pt = project(item.lat,item.lon);
    const ratio = 2**(view.zoom-item.zoom);
    mark.hidden = item.layer !== layer.value;
    mark.style.left = (width/2+(wrap(pt.x-center.x+.5)-.5)*scale)+'px';
    mark.style.top = (height/2+(pt.y-center.y)*scale)+'px';
    mark.style.width = (item.w*ratio)+'px';
    mark.style.height = (item.h*ratio)+'px';
  }
}
