// Ein gemeinsamer Zustand für die ganze Seite.
// Wer etwas ändert, ruft set(); wer darauf reagieren will, hört mit on() zu.

export const HOME = { name:"Pinnow", center:[11.548, 53.603], km:30 };

// Umkreis um den gesuchten Ort, für alle Bereiche gleich, zwischen 5 und 250 km.
export const RADIUS_MIN = 5, RADIUS_MAX = 250;
export const RADII = [5, 10, 30, 50, 100, 250];   // Auswahl für den Umkreis um den gesuchten Ort
export const radiusForZoom = z => Math.round(Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, 9000 / Math.pow(2, z - 1))));
export const zoomForRadius = km => 1 + Math.log2(9000 / km);

// Gruppen für Entdecken (iNaturalist „iconic taxa“; Bäume und Sträucher: Pflanzen, gefiltert nach Wuchsform aus WCVP) und die passenden GBIF-Nummern für Waben und „genauer rechnen“.
// GBIF führt Strahlenflosser und Reptilien nicht als eigene Klasse; dort stehen die Ordnungen
// (Fische: alle Ordnungen, die in Deutschland bei iNaturalist vorkommen; Reptilien: Schuppenkriechtiere und Schildkröten).
export const GBIF_FISH_ORDERS = [548,1313,1153,587,550,590,495,588,549,708,773,538,498,547,1103,772,1068,537,496,1069,1165,1167,1067,499,1162,1311,1305,889];
export const GROUPS = [
  { id:"all",   label:"Alle",         taxa:"Plantae,Fungi,Mammalia,Aves,Reptilia,Amphibia,Actinopterygii,Insecta,Arachnida,Mollusca,Animalia", gbif:null },
  { id:"plants",label:"Pflanzen",     taxa:"Plantae",        gbif:[6] },
  { id:"fungi", label:"Pilze",        taxa:"Fungi",          gbif:[5] },
  { id:"birds", label:"Vögel",        taxa:"Aves",           gbif:[212] },
  { id:"ins",   label:"Insekten",     taxa:"Insecta",        gbif:[216] },
  { id:"mamm",  label:"Säugetiere",   taxa:"Mammalia",       gbif:[359] },
  { id:"amph",  label:"Amphibien",    taxa:"Amphibia",       gbif:[131] },
  { id:"rept",  label:"Reptilien",    taxa:"Reptilia",       gbif:[11592253,11418114] },
  { id:"fish",  label:"Fische",       taxa:"Actinopterygii", gbif:GBIF_FISH_ORDERS },
  { id:"arach", label:"Spinnentiere", taxa:"Arachnida",      gbif:[367] },
  { id:"moll",  label:"Weichtiere",   taxa:"Mollusca",       gbif:[52] },
  // Pflanzen nach Wuchsform (zweite Zeile unter „Pflanzen“). wuchs: Liste aus der WCVP (daten/wuchs/), moos: Gruppen bei iNaturalist
  { id:"trees",  parent:"plants", label:"Bäume",              taxa:"Plantae", gbif:null, wuchs:"B" },
  { id:"shrubs", parent:"plants", label:"Sträucher",          taxa:"Plantae", gbif:null, wuchs:"S" },
  { id:"herbs",  parent:"plants", label:"Kräuter & Blumen",   taxa:"Plantae", gbif:null, wuchs:"H" },
  { id:"grass",  parent:"plants", label:"Gräser",             taxa:"Plantae", gbif:null, wuchs:"G" },
  { id:"climb",  parent:"plants", label:"Kletterpflanzen",    taxa:"Plantae", gbif:null, wuchs:"K" },
  { id:"water",  parent:"plants", label:"Wasser & Sumpf",     taxa:"Plantae", gbif:null, wuchs:"W" },
  { id:"bulbs",  parent:"plants", label:"Zwiebel & Knolle",   taxa:"Plantae", gbif:null, wuchs:"Z" },
  { id:"ferns",  parent:"plants", label:"Farne",              taxa:"Plantae", gbif:null, wuchs:"F" },
  { id:"moss",   parent:"plants", label:"Moose",              taxa:"Plantae", gbif:null, inatTaxa:["Bryophyta","Marchantiophyta","Anthocerotophyta"] }
];

export const state = {
  mode:"entdecken",          // "entdecken" | "bestimmen"
  center:{ lng:HOME.center[0], lat:HOME.center[1] },
  radius:HOME.km,
  place:HOME.name,
  placeSet:false,            // erst nach Suche, Standort oder „zuletzt gesucht“
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
