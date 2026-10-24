// Wuchsformen europäischer Gefäßpflanzen nach der World Checklist of Vascular Plants (WCVP),
// Royal Botanic Gardens, Kew, CC BY 4.0. Govaerts R. et al. (2021), Scientific Data 8: 215.
// Auswahl: anerkannte Arten mit Vorkommen in Europa (heimisch oder eingeführt, nicht ausgestorben).
// Zuordnung aus „lifeform_description“: tree → Baum; shrub/subshrub → Strauch; climber/climbing/liana/scrambling annual|perennial → Kletterpflanze;
// hydro…/helophyte → Wasser- und Sumpfpflanze; geophyte → Zwiebel & Knolle; annual/biennial/perennial (ohne Baum, Strauch, Kletter-, Wasserpflanze) → Kraut.
// Gräser und Farne nach Familie (Poaceae, Cyperaceae, Juncaceae bzw. Farn- und Bärlappfamilien). Eine Art kann in mehreren Gruppen stehen.
// Jede Gruppe liegt in einer eigenen Datei und wird erst geladen, wenn jemand sie wählt.
export const WUCHS_STATS = {"H": 18102, "B": 1083, "S": 5529, "Z": 2860, "G": 2213, "K": 217, "F": 388, "W": 417};
const cache = {};
/** Menge wissenschaftlicher Namen einer Wuchsform (B, S, H, G, K, W, Z, F) */
export async function wuchsSet(code){
  if (cache[code]) return cache[code];
  const { default:s } = await import(`./${code.toLowerCase()}.js`);
  return cache[code] = new Set(s.split("|").flatMap(g => { const [gen, sp] = g.split(":"); return sp.split(",").map(e => gen + " " + e); }));
}
