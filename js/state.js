// Ein gemeinsamer Zustand für die ganze Seite.
// Wer etwas ändert, ruft set(); wer darauf reagieren will, hört mit on() zu.

export const HOME = { name:"Pinnow", center:[11.548, 53.603], km:30 };

// Umkreis folgt dem Zoom, für alle Bereiche gleich: grob die halbe sichtbare Breite, zwischen 5 und 250 km.
export const RADIUS_MIN = 5, RADIUS_MAX = 250;
export const radiusForZoom = z => Math.round(Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, 9000 / Math.pow(2, z - 1))));
export const zoomForRadius = km => 1 + Math.log2(9000 / km);

// Gruppen für Entdecken (iNaturalist „iconic taxa“) und die passende GBIF-Nummer für Waben und Kombi
export const GROUPS = [
  { id:"all",   label:"Alle",         taxa:"Plantae,Fungi,Mammalia,Aves,Reptilia,Amphibia,Actinopterygii,Insecta,Arachnida,Mollusca,Animalia", gbif:null },
  { id:"plants",label:"Pflanzen",     taxa:"Plantae",        gbif:6 },
  { id:"fungi", label:"Pilze",        taxa:"Fungi",          gbif:5 },
  { id:"birds", label:"Vögel",        taxa:"Aves",           gbif:212 },
  { id:"ins",   label:"Insekten",     taxa:"Insecta",        gbif:216 },
  { id:"mamm",  label:"Säugetiere",   taxa:"Mammalia",       gbif:359 },
  { id:"amph",  label:"Amphibien",    taxa:"Amphibia",       gbif:131 },
  { id:"rept",  label:"Reptilien",    taxa:"Reptilia",       gbif:358 },
  { id:"fish",  label:"Fische",       taxa:"Actinopterygii", gbif:204 },
  { id:"arach", label:"Spinnentiere", taxa:"Arachnida",      gbif:367 },
  { id:"moll",  label:"Weichtiere",   taxa:"Mollusca",       gbif:52 }
];

export const state = {
  mode:"entdecken",          // "entdecken" | "bestimmen"
  center:{ lng:HOME.center[0], lat:HOME.center[1] },
  radius:HOME.km,
  place:HOME.name,
  group:"all",
  research:true,             // nur bestätigte Funde
  combo:false,               // genauer rechnen mit GBIF
  detail:null                // geöffnete Art (iNaturalist-Nummer)
};

const listeners = new Map();
export function on(key, fn){ (listeners.get(key) || listeners.set(key, []).get(key)).push(fn); }
export function set(patch){
  const changed = Object.keys(patch).filter(k => state[k] !== patch[k]);
  Object.assign(state, patch);
  if (!changed.length) return;
  new Set([...changed, "*"]).forEach(k => (listeners.get(k) || []).forEach(fn => fn(state, changed)));
}

// Ort und Umkreis als Abfrage-Parameter für iNaturalist
export const whereParams = () => ({ lat:state.center.lat.toFixed(4), lng:state.center.lng.toFixed(4), radius:state.radius });
