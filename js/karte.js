// Globus mit Kartenbild, Satellit, Waben (Funddichte), Umkreis und Fotos der Lebewesen.
import { $, esc, fmt, photoSize, isFree, licName, groupColor, commonName, circle, debounce, isMobile } from "./util.js";
import { API, INAT_DE, PRIO, inat, getJSON, isAbort } from "./api.js";
import { state, set, on, HOME, GROUPS, radiusForZoom, zoomForRadius } from "./state.js";

const SAT_TILES = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg";
const ATTR_EOX = '<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless</a> by EOX (CC BY-NC-SA 4.0)';
const ATTR_GBIF = '<a href="https://www.gbif.org" target="_blank" rel="noopener">GBIF</a>';
const ATTR_INAT = '<a href="https://www.inaturalist.org" target="_blank" rel="noopener">iNaturalist</a>';

export let map;
let openDetail = () => {};
export const setDetailOpener = fn => { openDetail = fn; };

export function initMap(){
  map = new maplibregl.Map({
    container:"map",
    style:"https://tiles.openfreemap.org/styles/liberty",
    center:HOME.center,
    zoom:zoomForRadius(HOME.km),
    attributionControl:{ compact:true }
  });
  if (!isMobile()) map.addControl(new maplibregl.NavigationControl({ visualizePitch:true }), "bottom-right");

  map.on("style.load", () => {
    map.setProjection({ type:"globe" });
    map.setSky?.({ "atmosphere-blend":["interpolate",["linear"],["zoom"],0,1,5,1,7,0], "sky-color":"#0a0f0e", "horizon-color":"#1b2b26", "fog-color":"#0a0f0e" });
    const firstSymbol = map.getStyle().layers.find(l => l.type === "symbol")?.id;
    map.addSource("sat", { type:"raster", tiles:[SAT_TILES], tileSize:256, maxzoom:15, attribution:ATTR_EOX });
    map.addLayer({ id:"sat", type:"raster", source:"sat", layout:{ visibility:"none" } }, firstSymbol);
    addWaben(firstSymbol);
    map.addSource("area", { type:"geojson", data:circle(state.center.lng, state.center.lat, state.radius) });
    map.addLayer({ id:"area-fill", type:"fill", source:"area", paint:{ "fill-color":"#e7ad4f", "fill-opacity":0.05 } });
    map.addLayer({ id:"area-line", type:"line", source:"area", paint:{ "line-color":"#e7ad4f", "line-width":1.5, "line-dasharray":[2,2] } });
    syncLayers();
  });

  map.on("moveend", debounce(() => {
    const c = map.getCenter();
    set({ center:{ lng:c.lng, lat:c.lat }, radius:radiusForZoom(map.getZoom()) });
  }, 500));
  map.on("click", e => map.easeTo({ center:e.lngLat, duration:700 }));
  map.on("zoom", () => { cancelAnimationFrame(declutterRaf); declutterRaf = requestAnimationFrame(declutter); });
  map.on("moveend", declutter);

  on("center", drawArea); on("radius", drawArea);
  on("center", loadPlaceName); on("radius", loadPlaceName);
  on("group", syncWaben);

  // Knöpfe auf der Karte
  $("#tgSat").onclick = e => toggle(e.currentTarget, "sat");
  $("#tgWaben").onclick = e => toggle(e.currentTarget, "waben");
  $("#tgLocate").onclick = locate;
  initSearch();
  loadPlaceName();
}

/* ---------- Ebenen ---------- */
const layerOn = { sat:false, waben:true };
function toggle(btn, id){
  layerOn[id] = !layerOn[id];
  btn.setAttribute("aria-pressed", layerOn[id]);
  syncLayers();
}
function syncLayers(){
  for (const id of ["sat", "waben"]) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", layerOn[id] ? "visible" : "none");
  $("#tgSat").setAttribute("aria-pressed", layerOn.sat);
  $("#tgWaben").setAttribute("aria-pressed", layerOn.waben);
}

// Waben: Funddichte aller Fundmeldungen bei GBIF als Sechsecke – fertige Kartenbilder, kosten keine iNaturalist-Anfragen
function wabenUrl(){
  const g = GROUPS.find(x => x.id === state.group);
  const p = new URLSearchParams({ style:"green.poly", bin:"hex", hexPerTile:"40" });
  if (g?.gbif) p.set("taxonKey", g.gbif);
  return `${API.gbifMap}/{z}/{x}/{y}@1x.png?${p}`;
}
function addWaben(before){
  map.addSource("waben", { type:"raster", tiles:[wabenUrl()], tileSize:512, attribution:ATTR_GBIF });
  map.addLayer({ id:"waben", type:"raster", source:"waben", paint:{ "raster-opacity":0.5 } }, before);
}
function syncWaben(){
  if (!map?.getSource("waben")) return;
  map.getSource("waben").setTiles([wabenUrl()]);
}

function drawArea(){
  map?.getSource("area")?.setData(circle(state.center.lng, state.center.lat, state.radius));
}

/* ---------- Verbreitung einer Art (iNaturalist-Raster) ---------- */
export function setSpeciesOverlay(taxonId){
  if (map.getLayer("species")) map.removeLayer("species");
  if (map.getSource("species")) map.removeSource("species");
  if (!taxonId) return;
  const q = new URLSearchParams({ taxon_id:taxonId, color:"#e7ad4f" });
  if (state.research) q.set("quality_grade", "research");
  map.addSource("species", { type:"raster", tileSize:256, tiles:[`${API.inat}/grid/{z}/{x}/{y}.png?${q}`], attribution:ATTR_INAT });
  map.addLayer({ id:"species", type:"raster", source:"species", paint:{ "raster-opacity":0.9 } });
}

/* ---------- Ortsname zur Kartenmitte (Nominatim, gemerkt und gedrosselt) ---------- */
let placeAbort;
async function loadPlaceName(){
  const z = map ? map.getZoom() : 9, c = state.center;
  const nz = z < 5 ? 3 : z < 7 ? 5 : z < 10 ? 8 : 10;
  const round = n => n.toFixed(nz >= 10 ? 2 : 1);   // gerundet: gleiche Gegend = gleiche Anfrage
  placeAbort?.abort(); placeAbort = new AbortController();
  try{
    const d = await getJSON(`${API.nominatim}/reverse?format=jsonv2&lat=${round(c.lat)}&lon=${round(c.lng)}&zoom=${nz}&accept-language=de`,
      { signal:placeAbort.signal, prio:PRIO.low });
    if (d.error){ set({ place:"Offenes Meer oder unbenannt" }); return; }
    const a = d.address || {};
    set({ place:d.name || a.village || a.town || a.city || a.state || a.country || "Unbenannte Gegend" });
  }catch(err){
    // Nominatim kennt hier keinen Namen (z. B. auf dem Meer) – bei Verbindungsfehlern bleibt der alte Name
    if (!isAbort(err) && /Fehler 4/.test(err.message)) set({ place:"Unbenannte Gegend" });
  }
}

/* ---------- Ortssuche: erst nach dem Absenden (Regel von Nominatim) ---------- */
function initSearch(){
  const form = $("#search"), box = $("#searchResults"), input = $("#searchInput");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const q = input.value.trim();
    if (q.length < 2) return;
    box.hidden = false;
    box.innerHTML = `<li class="muted">Suche …</li>`;
    try{
      const d = await getJSON(`${API.nominatim}/search?format=jsonv2&limit=6&accept-language=de&q=${encodeURIComponent(q)}`, { prio:PRIO.high });
      box.innerHTML = d.length ? d.map((r, i) => `<li><button type="button" data-i="${i}">${esc(r.display_name)}</button></li>`).join("")
        : `<li class="muted">Nichts gefunden. Versuch es mit einem Ortsnamen.</li>`;
      box.onclick = ev => {
        const b = ev.target.closest("button[data-i]"); if (!b) return;
        const r = d[+b.dataset.i];
        box.hidden = true; input.blur();
        const bb = r.boundingbox?.map(Number);
        if (bb) map.fitBounds([[bb[2], bb[0]], [bb[3], bb[1]]], { maxZoom:11, duration:1400, padding:40 });
        else map.flyTo({ center:[+r.lon, +r.lat], zoom:10 });
      };
    }catch{
      box.innerHTML = `<li class="muted">Die Ortssuche ist gerade nicht erreichbar.</li>`;
    }
  });
  input.addEventListener("input", () => { if (!input.value.trim()) box.hidden = true; });
  document.addEventListener("click", e => { if (!e.target.closest("#search")) box.hidden = true; });
}

function locate(){
  const btn = $("#tgLocate");
  if (!navigator.geolocation){ btn.title = "Dieser Browser kennt keinen Standort"; return; }
  btn.classList.add("busy");
  navigator.geolocation.getCurrentPosition(p => {
    btn.classList.remove("busy");
    map.flyTo({ center:[p.coords.longitude, p.coords.latitude], zoom:Math.max(map.getZoom(), zoomForRadius(10)), duration:1400 });
  }, () => { btn.classList.remove("busy"); btn.title = "Standort nicht verfügbar – im Browser erlauben"; }, { enableHighAccuracy:false, timeout:10000 });
}

/* Platz für Panel bzw. Bottom-Sheet, damit die Kartenmitte sichtbar bleibt */
export function setMapPadding(bottom){
  map?.easeTo({ padding:{ top:0, right:0, left:0, bottom }, duration:250 });
}
export const flyToRadius = km => map.easeTo({ zoom:zoomForRadius(km), duration:900 });

/* =====================================================================
   Fotos der Lebewesen auf der Karte
   – Grundauswahl: die häufigsten Arten (2/3 Tiere, 1/3 Pflanzen), am Handy 5, am PC 9
   – Zonen: Arten, die an einer Stelle des Umkreises auffällig häufiger sind (See, Wald …)
   – Nur Fotos mit freier Lizenz; Fotos rücken zur Seite, statt sich zu überdecken
   ===================================================================== */
const ANIMALS = ["Mammalia","Aves","Reptilia","Amphibia","Actinopterygii","Insecta","Arachnida","Mollusca","Animalia"];
const PIN_PX = 54, ZONE_GRID = 5;
const pins = { markers:[], key:null, abort:null };
const iconOf = t => t?.iconic_taxon_name || "Animalia";

export function clearPins(){ pins.markers.forEach(m => m.remove()); pins.markers = []; pins.key = null; pins.abort?.abort(); }

/** Fotos zeigen. base: iNaturalist-Parameter (Ort, Filter); pool: Arten nach Häufigkeit (erste Listenseite). */
export async function showPins(base, pool){
  const b = new URLSearchParams(base);
  ["locale","preferred_place_id","per_page","page"].forEach(k => b.delete(k));
  const key = b.toString() + "|" + isMobile();
  if (key === pins.key) return;
  clearPins(); pins.key = key;
  pins.abort = new AbortController();
  const signal = pins.abort.signal;
  const max = isMobile() ? 5 : 9, zoneMax = isMobile() ? 2 : 4;
  try{
    const s = new URLSearchParams(b);
    s.set("photos", "true"); s.set("photo_license", "cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa,cc-by-nd,cc-by-nc-nd");
    s.set("per_page", "200"); Object.entries(INAT_DE).forEach(([k, v]) => s.set(k, v));
    const d = await inat("/observations", s, { signal, prio:PRIO.low });
    if (signal.aborted) return;
    const sample = (d.results || []).filter(o => o.geojson && o.taxon && isFree(o.photos?.[0]));
    const c = { lat:+b.get("lat"), lng:+b.get("lng") }, radius = +b.get("radius");
    // Grundauswahl aus der Häufigkeitsliste, Fundort aus der Stichprobe
    const animals = pool.filter(r => ANIMALS.includes(iconOf(r.taxon))), plants = pool.filter(r => iconOf(r.taxon) === "Plantae");
    let main = [...animals.slice(0, Math.ceil(max * 2 / 3)), ...plants.slice(0, Math.floor(max / 3))];
    if (main.length < max) main = [...main, ...pool.filter(r => !main.includes(r))].slice(0, max);
    const taken = new Set();
    main.forEach(r => { const o = sample.find(x => x.taxon.id === r.taxon.id); if (o){ addPin(r.taxon, o); taken.add(r.taxon.id); } });
    if (radius) zonePicks(sample, c, radius, taken, zoneMax).forEach(z => addPin(z.o.taxon, z.o, true));
    declutter();
  }catch(err){ if (!isAbort(err)) pins.key = null; }
}

function zoneOf(o, c, radius){
  const [lng, lat] = o.geojson.coordinates;
  const dy = (lat - c.lat) * 111.32, dx = (lng - c.lng) * 111.32 * Math.cos(c.lat * Math.PI / 180);
  const size = 2 * radius / ZONE_GRID;
  return `${Math.floor((dx + radius) / size)}:${Math.floor((dy + radius) / size)}`;
}
function zonePicks(sample, c, radius, taken, max){
  const all = new Map(), zones = new Map();
  sample.forEach(o => {
    const id = o.taxon.id, z = zoneOf(o, c, radius);
    all.set(id, (all.get(id) || 0) + 1);
    if (!zones.has(z)) zones.set(z, { n:0, sp:new Map() });
    const Z = zones.get(z); Z.n++; Z.sp.set(id, [(Z.sp.get(id)?.[0] || 0) + 1, o]);
  });
  const N = sample.length, cands = [];
  zones.forEach(Z => {
    if (Z.n < 4) return;
    const best = {};
    Z.sp.forEach(([k, o], id) => {
      if (k < 2 || taken.has(id)) return;
      const lift = (k / Z.n) / (all.get(id) / N);
      const score = lift * Math.sqrt(k), kind = iconOf(o.taxon) === "Plantae" ? "p" : "a";
      if (lift >= 1.8 && (!best[kind] || score > best[kind].score)) best[kind] = { score, o, id, kind };
    });
    Object.values(best).forEach(x => cands.push(x));
  });
  const a = cands.filter(x => x.kind === "a").sort((x, y) => y.score - x.score), pl = cands.filter(x => x.kind === "p").sort((x, y) => y.score - x.score);
  const out = [], used = new Set();
  while (out.length < max && (a.length || pl.length)){
    for (const arr of [a, pl]){
      while (arr.length && used.has(arr[0].id)) arr.shift();
      if (arr.length && out.length < max){ const x = arr.shift(); used.add(x.id); out.push(x); }
    }
  }
  return out;
}

function addPin(t, o, zone){
  const ph = o.photos[0];
  const el = document.createElement("button");
  el.className = "ppin" + (zone ? " zone" : "");
  el.style.setProperty("--c", groupColor(t));
  const credit = `${ph.attribution || ""}`.replace(/\s+/g, " ");
  el.title = `${commonName(t)}${zone ? " – typisch für diese Stelle" : ""}\nFoto: ${credit}`;
  el.setAttribute("aria-label", `${commonName(t)} – Steckbrief öffnen`);
  el.innerHTML = `<img src="${esc(photoSize(ph.url, "square"))}" alt="" loading="lazy">`;
  el.addEventListener("click", e => { e.stopPropagation(); openDetail(t.id); });
  const m = new maplibregl.Marker({ element:el, anchor:"center" }).setLngLat(o.geojson.coordinates).addTo(map);
  pins.markers.push(m);
}

const RING = [[0, 0]];
[1, 2, 3].forEach(r => { const n = 6 * r; for (let i = 0; i < n; i++){ const a = 2 * Math.PI * i / n + r; RING.push([Math.cos(a) * PIN_PX * r, Math.sin(a) * PIN_PX * r]); } });
let declutterRaf = 0;
function declutter(){
  const placed = [];
  pins.markers.forEach(m => {
    const p = map.project(m.getLngLat());
    const spot = RING.find(([ox, oy]) => placed.every(q => Math.hypot(p.x + ox - q[0], p.y + oy - q[1]) >= PIN_PX));
    m.getElement().style.visibility = spot ? "" : "hidden";
    if (!spot) return;
    m.setOffset(spot);
    placed.push([p.x + spot[0], p.y + spot[1]]);
  });
}
