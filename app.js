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
const targetInk = byId('target-ink');
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
const guideAssets = window.FAA_GUIDE_ASSETS;
const mapExamples = window.FAA_MAP_EXAMPLES;
const guideDialog = byId('guide-dialog');
const thumbObserver = new IntersectionObserver(items => {
  for (const { target: crop, isIntersecting } of items) {
    if (!isIntersecting) continue;
    crop.style.backgroundImage = crop.dataset.background;
    thumbObserver.unobserve(crop);
  }
}, {root:list,rootMargin:'160px'});
const guideKind = illustration => illustration[3] === 1 ? 'FAA guide illustration' :
  illustration[3] === 2 ? 'Related FAA guide detail' : 'FAA guide page reference';
const guideExample = illustration => ({
  name: illustration[2],kind:guideKind(illustration),
  url:guidePdf+'#page='+illustration[1],illustration
});

function verifiedExamples(title, examples) {
  if (/^(VOR\/DME|IFR VOR\/DME)$/.test(title)) {
    return [mapExamples.etx,mapExamples.sbj].map(item => title.startsWith('IFR') ?
      {...item,layer:'low',ink:'blue',kind:'FAA data location'} : item);
  }
  if (title === 'VORTAC') return [mapExamples.pottstown];
  const additional = {
    'Military operations area':mapExamples.duke,
    'Warning area':mapExamples.warning,
    'Alert area':mapExamples.alert,
    'Victor airway centerline':mapExamples.v29
  }[title];
  if (additional) return [{...additional,kind:'FAA boundary or route geometry',
    note:'The highlight follows the feature’s published FAA geometry.'}];
  if (/^TRSA|^Terminal Radar Service Area$/i.test(title)) return [];
  const verified = examples.map(item => {
    let geometry;
    if (title==='Class C airspace') geometry = mapExamples.abe;
    if (/^Class B (airspace|on a Terminal Area Chart)$/.test(title)) geometry = item.layer==='tac' ? mapExamples.jfk : mapExamples.phl;
    if (title==='Class D airspace') geometry = item.name.includes('Reading') ? mapExamples.rdg : mapExamples.ttn;
    if (title==='Restricted area') geometry = mapExamples.r5002;
    if (title==='Prohibited area') geometry = mapExamples.p56;
    if (geometry) return {...item,...geometry,kind:'FAA boundary geometry',note:'The outline follows the FAA dataset for this feature. Check the original chart for labels and printed detail.'};
    if (/^(Lehigh Valley International|Towered civil landplane airport|Airport runway pattern)$/.test(title)) return {...item,ink:'blue',radius:83,note:'The highlight follows the blue airport symbol on the chart.'};
    if (/^(Queen City Airport|Greenwood Lake Airport|Non-towered civil landplane airport)$/.test(title)) return {...item,ink:'magenta',radius:78,note:'The highlight follows the magenta airport symbol on the chart.'};
    return item;
  });
  if (title==='Class C airspace') verified.push({...mapExamples.mdt,kind:'FAA boundary geometry',
    note:'Compare the Harrisburg Class C boundaries with the shelves at Allentown.'});
  return verified;
}
const rows = window.CHART_INDEX.flatMap(group => group.rows.map(row => {
  const [title, aliases = '', description = '', exampleKey = ''] = row.split('|');
  const id = group.id + '-' + normalize(title).replaceAll(' ','-');
  const illustration = guideAssets.rows[id];
  const examples = verifiedExamples(title,window.CHART_EXAMPLES[exampleKey] || []);
  return {
    id,group:group.id,section:group.section,title,aliases,description,illustration,
    examples: illustration ? [...examples,guideExample(illustration)] : examples,
    searchable:normalize(title + ' ' + aliases + ' ' + group.section + ' ' + description)
  };
}));
const figureRows = guideAssets.panels.map(([asset,page,title,group,tight],index) => {
  const illustration = [asset,page,title,tight];
  return {id:'guide-'+index,title,group,section:'FAA Chart Users’ Guide',illustration,
    searchable:normalize(title+' page '+page),examples:[guideExample(illustration)]};
});
const byExample = new Map([...rows,...figureRows].map(row => [row.id,row]));
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
let symbolCandidates = null;
let selectedBox = null;
let inkState = null;
let selectedPixels = null;
const exampleStatus = item => item?.kind || (Number.isFinite(item?.lat) ? 'Chart location' : 'FAA source');
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
function guideCrop(illustration, lazy = false) {
  const [atlas,x,y,width,height,atlasHeight] = guideAssets.locations[illustration[0]];
  const crop = el('span','guide-crop');
  const background = 'url(guide/faa-'+String(atlas).padStart(2,'0')+'.webp)';
  crop.style.setProperty('--crop-aspect',width/height);
  crop.style.setProperty('--crop-max',Math.max(width*1.35,110)+'px');
  crop.style.backgroundSize = (2048/width*100)+'% '+(atlasHeight/height*100)+'%';
  crop.style.backgroundPosition = (x/(2048-width)*100)+'% '+(y/(atlasHeight-height)*100)+'%';
  if (lazy) {
    crop.dataset.background = background;
    thumbObserver.observe(crop);
  } else crop.style.backgroundImage = background;
  return crop;
}
function guideThumbnail(illustration, handler) {
  const thumb = handler ? action('',handler) : el('span');
  thumb.className = 'guide-thumb';
  if (handler) thumb.setAttribute('aria-label','Enlarge FAA guide figure');
  else thumb.setAttribute('aria-hidden','true');
  thumb.append(guideCrop(illustration,!handler));
  return thumb;
}
function openGuide(title, illustration) {
  byId('guide-title').textContent = title;
  byId('guide-credit').textContent = guideKind(illustration)+' · page '+illustration[1]+' · July 9, 2026';
  const crop = guideCrop(illustration);
  crop.setAttribute('role','img');
  crop.setAttribute('aria-label',illustration[2]);
  byId('guide-figure').replaceChildren(crop);
  byId('guide-page').href = guidePdf+'#page='+illustration[1];
  guideDialog.showModal();
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
  thumbObserver.disconnect();
  if (symbolCandidates !== null) {
    byId('count').textContent = symbolCandidates.length + ' possible';
    const heading = el('p','result-divider','Possible chart symbols');
    const clear = action('Clear selection', resetScan);
    const entries = symbolCandidates.map(({row, cue}) => {
      const button = action('', () => {
        selectedPixels.mask = makeInkMask(selectedPixels.image,
          symbolCandidates.find(candidate => candidate.row === row).color);
        select(row,true);
      });
      button.className = 'result';
      const copy = el('span','result-copy');
      copy.append(el('strong','result-title',row.title), el('span','result-meta',cue));
      if (row.illustration) button.append(guideThumbnail(row.illustration));
      button.append(copy);
      return button;
    });
    if (!entries.length) entries.push(el('p','empty','Try a tighter box around one marking.'));
    list.replaceChildren(heading, ...entries, clear);
    list.scrollTop = 0;
    return;
  }
  const originalScroll = list.scrollTop;
  const query = normalize(search.value);
  const words = query.split(' ').filter(Boolean);
  const collection = filter==='guide' ? figureRows : rows;
  const matched = collection.filter(row => (family.value === 'all' || family.value === row.group) &&
      (filter !== 'examples' || row.examples.some(item => !item.illustration)) && (filter !== 'saved' || saved.has(row.id)))
    .map((row, index) => [row, query ? score(row,query,words) : 0, index])
    .filter(entry => entry[1] >= 0)
    .sort((a,b) => b[1]-a[1] || (query ? 0 : Number(Boolean(b[0].examples.some(item => !item.illustration)))-Number(Boolean(a[0].examples.some(item => !item.illustration)))) || a[2]-b[2]);
  byId('count').textContent = matched.length.toLocaleString() + ' / ' + collection.length.toLocaleString();
  const result = document.createDocumentFragment();
  const appendRow = row => {
    const button = action('', () => select(row));
    button.className = 'result';
    button.dataset.id = row.id;
    if (active?.id === row.id) button.setAttribute('aria-current','true');
    const icon = row.illustration ? guideThumbnail(row.illustration) : el('span','result-icon','◉');
    icon.setAttribute('aria-hidden','true');
    const copy = el('span','result-copy');
    const source = row.illustration ? guideKind(row.illustration)+' · p. '+row.illustration[1] : exampleStatus(row.examples[0]);
    copy.append(el('strong','result-title',row.title), el('span','result-meta',source));
    button.append(icon, copy, el('span','result-arrow','›'));
    result.append(button);
  };
  const showLocations = filter !== 'saved' && filter !== 'guide';
  const locations = showLocations ? featureRows.filter(row => family.value === 'all' || row.group === family.value) : [];
  if (showLocations && (locations.length || featureMessage)) {
    if (locations.length) result.append(el('p','result-divider','FAA feature search'));
    for (const row of locations) appendRow(row);
    if (featureMessage) result.append(el('p','result-divider',featureMessage));
    if (matched.length && locations.length) result.append(el('p','result-divider','Guide index'));
  }
  for (const [row] of matched) appendRow(row);
  if (!matched.length && !locations.length) result.append(byId('empty').content.cloneNode(true));
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
    copy.append(el('p','meta', selectedPixels ? 'Selected chart marking' : active.section + ' · ' + exampleStatus(item) + (item ? ' · ' + item.name : '')));
    copy.append(el('h2','',teaching && item ? 'Find the marking on the chart' : active.title));
    copy.append(el('p','',teaching && item ? 'Reveal the marking when the student is ready.' : active.description || (item ? item.note : 'Open the guide and use this title to find the related illustration or text.')));
    if (!teaching && item?.note && active.description && item.note !== active.description) copy.append(el('p','',item.note));
    if (item?.url && !selectedPixels) actions.append(link(item.illustration ? 'FAA guide page ↗' : item.kind === 'FAA chart PDF' ? 'Open FAA PDF ↗' : 'Open FAA source ↗',item.url));
    if (Number.isFinite(item?.lat) && !selectedPixels && (pin?.paths || pin?.ink)) {
      actions.append(action(teaching ? 'Reveal' : 'Quiz mode', () => { teaching = !teaching; showTarget = !teaching; details(); schedule(); },true));
      if (!teaching) actions.append(action(showTarget ? 'Hide highlight' : 'Show highlight', () => { showTarget = !showTarget; details(); schedule(); }));
    }
    if (selectedPixels) actions.append(action('Open example', () => jumpExample(0)));
    else if (active.examples.length > 1) actions.append(action('Next ' + (exampleNumber+1) + '/' + active.examples.length, () => jumpExample((exampleNumber+1)%active.examples.length)));
    if (!teaching && !active.live && !active.id.startsWith('guide-')) actions.append(action('Pin chart center', () => {
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
  }
  const illustration = active?.examples[exampleNumber]?.illustration || active?.illustration;
  const info = el('div','guide-detail');
  if (illustration && !teaching) {
    info.append(guideThumbnail(illustration,() => openGuide(active.title,illustration)));
    if (active.examples[exampleNumber]?.illustration) actions.append(action('Enlarge FAA figure',() => openGuide(active.title,illustration)));
  }
  info.append(copy);
  panel.replaceChildren(info,actions);
}
function jumpExample(number) {
  resetScan();
  exampleNumber = number;
  teaching = false;
  showTarget = true;
  const place = active?.examples[number];
  pin = null;
  inkState = null;
  if (Number.isFinite(place?.lat)) {
    layer.value = place.layer || 'sectional';
    setView(place.lat,place.lon,place.zoom ?? 12);
    pin = {...place,layer:layer.value};
  }
  details();
  schedule();
}
function select(row, fromScan = false) {
  if (!row) return;
  active = row;
  if (fromScan && selectedPixels) {
    exampleNumber = 0;
    teaching = false;
    showTarget = true;
    pin = null;
    inkState = null;
    sampleNotice = 'Showing the ink within the selected area.';
    selectionOutline.hidden = true;
    details();
    schedule();
  } else {
    jumpExample(0);
    if (row.id.startsWith('guide-')) openGuide(row.title,row.illustration);
  }
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
  const nextZoom = clamp(zoom,layers[layer.value].min,15);
  if (sampleState && (lat !== view.lat || lon !== view.lon || nextZoom !== view.zoom)) resetScan();
  Object.assign(view,{lat,lon,zoom:nextZoom});
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
        img.addEventListener('load', () => {img.dataset.state = 'ready'; mapStatus(); if (pin?.ink) schedule();});
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
  drawHighlight(center,width,height);
  byId('zoom-in').disabled = view.zoom >= 15;
  byId('zoom-out').disabled = view.zoom <= record.min;
  byId('position').textContent = view.lat.toFixed(3) + '°, ' + view.lon.toFixed(3) + '° · Zoom ' + view.zoom.toFixed(1);
  byId('edition').textContent = record.date ? 'FAA tiles · ' + record.date : 'FAA chart tiles';
  byId('original').href = record.source;
  drawSelection(center,width,height);
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
  if (sampleState) return;
  const {x,y} = mapPoint(event);
  const delta = event.deltaMode === 1 ? event.deltaY*16 : event.deltaY;
  zoomAt(view.zoom-clamp(delta/180,-.9,.9),x,y);
},{passive:false});
map.addEventListener('dblclick',event => {
  if (sampleState) return;
  const {x,y} = mapPoint(event);
  zoomAt(view.zoom+1,x,y);
});
map.addEventListener('keydown',event => {
  if (event.key === 'Escape' && (sampleState || selectedBox)) {resetScan(); return;}
  if (sampleState) return;
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
byId('close-index').addEventListener('click',() => setIndex(false));
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
    examples:[{name:title,kind:paths ? 'FAA boundary or route geometry' : 'FAA data location',lat,lon,zoom:paths?10:12,layer:chart,paths,
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
const selectionOutline = el('div');
selectionOutline.style.cssText = 'position:absolute;pointer-events:none;z-index:3;border:2px solid #faff92;background:#faff9225;box-shadow:0 0 0 1px #253438';
selectionOutline.hidden = true;
scanMarks.append(selectionOutline);
scanButton.title = 'Drag a box around a chart symbol to filter the index';

function resetScan() {
  sampleVersion++;
  sampleState = null;
  sampleNotice = '';
  selectedBox = null;
  selectedPixels = null;
  selectionOutline.hidden = true;
  if (symbolCandidates !== null) {
    symbolCandidates = null;
    renderList();
  }
  scanButton.textContent = 'Match symbol';
  scanButton.setAttribute('aria-pressed','false');
  map.classList.remove('sampling');
  schedule();
}

scanButton.addEventListener('click', () => {
  if (sampleState) { resetScan(); return; }
  resetScan();
  sampleState = {layer:layer.value, pointerId:null};
  sampleNotice = 'Drag a box tightly around one chart symbol.';
  scanButton.textContent = 'Cancel match';
  scanButton.setAttribute('aria-pressed','true');
  map.classList.add('sampling');
  map.focus({preventScroll:true});
  schedule();
});

function dragBox(start, end) {
  const left = Math.floor(clamp(Math.min(start.x,end.x),0,map.clientWidth));
  const top = Math.floor(clamp(Math.min(start.y,end.y),0,map.clientHeight));
  const right = Math.ceil(clamp(Math.max(start.x,end.x),0,map.clientWidth));
  const bottom = Math.ceil(clamp(Math.max(start.y,end.y),0,map.clientHeight));
  return {x:left,y:top,w:right-left,h:bottom-top};
}

function showBox({x,y,w,h}) {
  selectionOutline.hidden = false;
  Object.assign(selectionOutline.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});
}

function drawSelection(center,width,height) {
  if (!selectedBox || selectedPixels?.mask) return;
  const scale = 256*2**view.zoom;
  const ratio = 2**(view.zoom-selectedBox.zoom);
  showBox({
    x:width/2+(wrap(selectedBox.x-center.x+.5)-.5)*scale,
    y:height/2+(selectedBox.y-center.y)*scale,
    w:selectedBox.w*ratio,h:selectedBox.h*ratio
  });
}

map.addEventListener('pointerdown', event => {
  if (!sampleState || sampleState.busy || sampleState.pointerId !== null ||
      event.button !== 0 || pointers.size) return;
  sampleState.pointerId = event.pointerId;
  sampleState.start = mapPoint(event);
  map.setPointerCapture(event.pointerId);
  showBox(dragBox(sampleState.start,sampleState.start));
});
map.addEventListener('pointermove', event => {
  if (sampleState?.pointerId !== event.pointerId) return;
  showBox(dragBox(sampleState.start,mapPoint(event)));
});
for (const type of ['pointercancel','lostpointercapture']) map.addEventListener(type,event => {
  if (sampleState?.pointerId !== event.pointerId) return;
  sampleState.pointerId = null;
  selectionOutline.hidden = true;
});
map.addEventListener('pointerup', async event => {
  const state = sampleState;
  if (state?.pointerId !== event.pointerId) return;
  state.pointerId = null;
  const box = dragBox(state.start,mapPoint(event));
  if (box.w < 4 || box.h < 4 || box.w > 360 || box.h > 360) {
    selectionOutline.hidden = true;
    sampleNotice = 'Drag a box between 4 and 360 pixels wide and tall. Zoom in for small markings.';
    schedule();
    return;
  }
  state.busy = true;
  const request = ++sampleVersion;
  selectedBox = {...box,...coordAt(box.x,box.y),zoom:view.zoom};
  showBox(box);
  sampleNotice = 'Reading the colors and shape inside the box.';
  schedule();
  try {
    const snapshot = await chartPixels(box);
    if (request !== sampleVersion) return;
    selectedPixels = {image:snapshot,box:selectedBox};
    symbolCandidates = rankSymbols(describeSymbol(snapshot),state.layer);
    renderList();
    setIndex(true);
    sampleNotice = symbolCandidates.length
      ? symbolCandidates.length + ' possible symbols in the index. Compare their visual cues with the chart.'
      : 'No clear symbol in the selection. Try a tighter box or zoom in.';
  } catch {
    if (request !== sampleVersion) return;
    sampleNotice = 'Could not read the chart pixels in this box. Wait for the tiles to load and try again.';
  }
  sampleState = null;
  scanButton.textContent = 'Match symbol';
  scanButton.setAttribute('aria-pressed','false');
  map.classList.remove('sampling');
  schedule();
});

async function chartPixels(box) {
  const canvas = document.createElement('canvas');
  canvas.width = box.w;
  canvas.height = box.h;
  const ctx = canvas.getContext('2d',{willReadFrequently:true});
  const images = visibleImages.filter(img => img.dataset.state === 'ready').map(img => {
    const transform = /^translate\(([-.\d]+)px,\s*([-.\d]+)px\)$/.exec(img.style.transform);
    return {url:img.src,x:Number(transform?.[1])-box.x,y:Number(transform?.[2])-box.y,size:parseFloat(img.style.width)};
  }).filter(({x,y,size}) => x<box.w && y<box.h && x+size>0 && y+size>0);
  if (!images.length) throw new Error('No chart tiles in selection');
  await Promise.allSettled(images.map(image => new Promise((resolve,reject) => {
    const bitmap = new Image();
    bitmap.crossOrigin = 'anonymous';
    const timeout = setTimeout(() => reject(new Error('Chart tile timed out')),5000);
    bitmap.onload = () => {
      clearTimeout(timeout);
      ctx.drawImage(bitmap,image.x,image.y,image.size,image.size);
      resolve();
    };
    bitmap.onerror = error => {clearTimeout(timeout); reject(error);};
    bitmap.src = image.url;
  })));
  return ctx.getImageData(0,0,box.w,box.h);
}

function describeSymbol({data,width,height}) {
  const colors = {blue:0,magenta:0,dark:0,green:0,brown:0};
  let covered = 0;
  for (let i=0;i<data.length;i+=4) {
    if (data[i+3] < 220) continue;
    covered++;
    const color = chartInk(data[i],data[i+1],data[i+2]);
    if (color) colors[color]++;
  }
  if (covered < width*height*.75) throw new Error('Incomplete tile coverage');
  return {colors,aspect:Math.max(width/height,height/width),area:covered};
}

// Families are ranked by visible ink and whether the crop is long or compact.
// Several markings share the same colors, so keep plausible alternatives.
const symbolProfiles = [
  ['blue','line',/^Class [BD] (airspace|surface area)|^Victor airway centerline|^(Prohibited|Restricted|Warning) area/,'Blue or cyan boundary or route line'],
  ['blue','compact',/^VOR|^TACAN|with tower|^Class [BD] (shelf|ceiling)|^Maximum Elevation Figure|^Victor airway number/,'Compact blue or cyan marking'],
  ['magenta','line',/^Class C (airspace|cutout)|^Class E (surface|700-foot)|^Military operations area|^Alert area|^Isogonic line/,'Magenta boundary, vignette, or line'],
  ['magenta','compact',/^Class C floor|without tower|^Restricted or private airport|^NDB|^Glider operations|^Parachute jumping area|^Isogonic value/,'Compact magenta marking'],
  ['dark','line',/^Railroad|^Road|^Military training route/,'Dark line or route'],
  ['dark','compact',/^Obstruction|^Airport runway pattern|^Airport data grouping|^Railroad station/,'Compact dark symbol or annotation'],
  ['green','line',/river|wooded|forest/i,'Green or blue-green chart detail'],
  ['green','compact',/wooded|forest|vegetation/i,'Compact green chart detail'],
  ['brown','line',/contour|terrain relief|ridge/i,'Brown line associated with terrain'],
  ['brown','compact',/contour|terrain relief|spot elevation/i,'Compact brown terrain detail'],
  ['blue','line',/^IFR (Class [BCDE] airspace|T-route|Q-route|colored federal airway)/,'Blue IFR route or airspace marking'],
  ['magenta','line',/^IFR (military operations area|alert area|special use airspace)/,'Magenta IFR airspace marking'],
  ['dark','line',/^IFR (jet route|direct route|ATS route|one-way airway arrow|ARTCC boundary)/,'Dark IFR route or boundary line'],
  ['dark','compact',/^IFR (minimum enroute altitude|minimum obstruction clearance altitude|route leg distance|off-route obstruction clearance altitude|center frequency box|VFR waypoint)/,'Compact IFR label or waypoint']
];

function rankSymbols({colors,aspect,area},chartLayer) {
  const peak = Math.max(...Object.values(colors));
  if (peak < Math.max(5,area*.009)) return [];
  const compact = aspect<1.6;
  const relevantRows = rows.filter(row => chartLayer==='low' || chartLayer==='high'
    ? /^ifr/.test(row.group) : !/^ifr/.test(row.group));
  const candidates = new Map();
  for (const [color,shape,titles,cue] of symbolProfiles) {
    const count = colors[color];
    if (count < Math.max(5,peak*.22,area*.006)) continue;
    const score = count/peak + ((shape==='compact')===compact ? .45 : 0);
    for (const row of relevantRows) {
      if (!titles.test(row.title) || (candidates.get(row.id)?.score ?? 0) >= score) continue;
      candidates.set(row.id,{row,cue,score,color});
    }
  }
  return [...candidates.values()].sort((a,b) => b.score-a.score)
    .slice(0,10);
}

function chartInk(r,g,b) {
  const lightest = Math.max(r,g,b);
  const darkest = Math.min(r,g,b);
  if (b-g>12 && r-g>14 && lightest<246) return 'magenta';
  if (b-r>21 && b>=g-5 && darkest<172) return 'blue';
  if (g-r>17 && g-b>8 && darkest<165) return 'green';
  if (r-b>30 && r-g>8 && darkest<170) return 'brown';
  if (lightest<126 && lightest-darkest<47) return 'dark';
  return '';
}

function makeInkMask({data,width,height}, color, centerOnly = false) {
  const count = width*height;
  const remaining = new Uint8Array(count);
  const mask = new Uint8Array(count);
  for (let i=0;i<count;i++) {
    const p=i*4;
    remaining[i] = data[p+3]>220 && chartInk(data[p],data[p+1],data[p+2])===color ? 1 : 0;
  }
  const components = [];
  const queue = new Int32Array(count);
  for (let i=0;i<count;i++) {
    if (!remaining[i]) continue;
    let length=1, nearest=Infinity;
    remaining[i]=0;
    queue[0]=i;
    for (let j=0;j<length;j++) {
      const current=queue[j], x=current%width, y=Math.floor(current/width);
      nearest=Math.min(nearest,Math.hypot(x-width/2,y-height/2));
      for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) {
        if (x+dx<0 || x+dx>=width || y+dy<0 || y+dy>=height) continue;
        const next=current+dy*width+dx;
        if (remaining[next]) {
          remaining[next]=0;
          queue[length++]=next;
        }
      }
    }
    if (length>=3) components.push({pixels:queue.slice(0,length),nearest});
  }
  const largest = Math.max(0,...components.map(part => part.pixels.length));
  if (!largest) return null;
  if (centerOnly) {
    const nearby = components.filter(part => part.nearest <= 12);
    if (!nearby.length) return null;
    const anchor = nearby.sort((a,b) => b.pixels.length/(1+b.nearest)-a.pixels.length/(1+a.nearest))[0];
    const primary = new Set(anchor.pixels);
    for (const part of components) {
      if (part.nearest > Math.min(width,height)*.46) continue;
      if (part===anchor || part.pixels.length >= anchor.pixels.length*.12 &&
          part.pixels.some(p => {
            const x=p%width,y=Math.floor(p/width);
            for (let dy=-5;dy<=5;dy++) for (let dx=-5;dx<=5;dx++) {
              if (x+dx>=0 && x+dx<width && y+dy>=0 && y+dy<height && primary.has(p+dy*width+dx)) return true;
            }
            return false;
          })) for (const p of part.pixels) mask[p]=1;
    }
  } else {
    for (const part of components) {
      if (part.pixels.length>=Math.max(3,largest*.055)) for (const p of part.pixels) mask[p]=1;
    }
  }
  return {mask,width,height};
}

function paintInk(raster) {
  targetInk.width=raster.width;
  targetInk.height=raster.height;
  const context=targetInk.getContext('2d');
  const pixels=context.createImageData(raster.width,raster.height);
  const {mask,width,height}=raster;
  for (let p=0;p<mask.length;p++) {
    if (!mask[p]) continue;
    const x=p%width, y=Math.floor(p/width);
    for (let dy=-2;dy<=2;dy++) for (let dx=-2;dx<=2;dx++) {
      if (dx*dx+dy*dy>5 || x+dx<0 || x+dx>=width || y+dy<0 || y+dy>=height) continue;
      const i=(p+dy*width+dx)*4;
      if (!pixels.data[i+3]) pixels.data.set([10,50,45,190],i);
    }
    pixels.data.set([248,255,136,172],p*4);
  }
  context.putImageData(pixels,0,0);
}

let drawnRaster = null;
function drawHighlight(center,width,height) {
  const visible = showTarget && pin?.layer === layer.value;
  const scale=256*2**view.zoom;
  const screenPoint = ({x,y}) => ({
    x:width/2+(wrap(x-center.x+.5)-.5)*scale,
    y:height/2+(y-center.y)*scale
  });
  const paths = visible ? pin.paths : null;
  target.style.display=paths ? '' : 'none';
  if (paths) {
    const outline = paths.map(path => path.map(([lon,lat],index) => {
      const pt=screenPoint(project(lat,lon));
      return (index?'L':'M')+pt.x.toFixed(1)+' '+pt.y.toFixed(1);
    }).join(' ')).join(' ');
    for (const line of target.children) line.setAttribute('d',outline);
  }

  if (visible && pin.ink && !inkState) {
    const point=screenPoint(project(pin.lat,pin.lon));
    const radius=pin.radius || 24;
    const box={x:Math.floor(point.x-radius),y:Math.floor(point.y-radius),w:radius*2,h:radius*2};
    if (box.x>=0 && box.y>=0 && box.x+box.w<=width && box.y+box.h<=height &&
        visibleImages.length && visibleImages.every(img => img.dataset.state)) {
      const request=pin;
      const state={box:{...coordAt(box.x,box.y),zoom:view.zoom}};
      inkState=state;
      chartPixels(box).then(image => {
        if (pin!==request || inkState!==state) return;
        state.mask=makeInkMask(image,request.ink,true);
        schedule();
      }).catch(() => {});
    }
  }
  const rendered = selectedPixels?.mask ? selectedPixels : visible ? inkState : null;
  targetInk.hidden=!rendered?.mask;
  if (!rendered?.mask) return;
  if (drawnRaster!==rendered.mask) {
    paintInk(rendered.mask);
    drawnRaster=rendered.mask;
  }
  const point=screenPoint(rendered.box);
  const ratio=2**(view.zoom-rendered.box.zoom);
  Object.assign(targetInk.style,{
    left:point.x+'px',top:point.y+'px',
    width:rendered.mask.width*ratio+'px',height:rendered.mask.height*ratio+'px'
  });
}
