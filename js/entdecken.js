// Bereich „Entdecken“: Was lebt hier?
// Standard: Arten nach Häufigkeit bei iNaturalist. Schalter „Genauer rechnen“ nimmt GBIF dazu (früher Reiter „Kombi“).
import { $, $$, esc, fmt, plural, local } from "./util.js";
import { API, INAT_DE, PRIO, inat, getJSON, isAbort, findInatTaxon } from "./api.js";
import { state, set, on, GROUPS, whereParams } from "./state.js";
import { makeList } from "./liste.js";
import { showPins, clearPins } from "./karte.js";

let openDetail = () => {};
export const setDetailOpener = fn => { openDetail = fn; };

let list, abort, lastKey;

export function initEntdecken(){
  $("#groups").innerHTML = GROUPS.map(g =>
    `<button class="chip" data-id="${g.id}" aria-pressed="${g.id === state.group}">${g.label}</button>`).join("");
  $("#groups").onclick = e => {
    const b = e.target.closest(".chip"); if (!b || b.disabled) return;
    set({ group:b.dataset.id });
  };
  $("#research").checked = state.research;
  $("#research").onchange = e => set({ research:e.target.checked });
  $("#combo").checked = state.combo;
  $("#combo").onchange = e => set({ combo:e.target.checked });

  list = makeList($("#exList"), {
    emptyHTML:`<div class="state">Hier wurden noch keine Arten dieser Gruppe gemeldet. Zoom heraus oder wähle eine andere Gruppe.</div>`,
    onTotal:n => $("#exTotal").textContent = n == null ? "" : plural(n, "Art", "Arten"),
    onFirstPage:res => { if (!state.combo && state.mode === "entdecken") showPins(lastParams, res); },
    onPick:pick
  });

  on("*", (s, changed) => {
    if (changed.includes("group")) $$("#groups .chip").forEach(x => x.setAttribute("aria-pressed", x.dataset.id === state.group));
    if (state.mode !== "entdecken") return;
    if (changed.some(k => ["center","radius","group","research","combo"].includes(k))) load();
  });
}

export async function pick(card){
  if (card.dataset.id) return openDetail(+card.dataset.id);
  // Art nur bei GBIF bekannt: bei iNaturalist nachschlagen
  const ct = card.querySelector(".ct"), old = ct.textContent;
  ct.textContent = "Suche Steckbrief …";
  try{
    const id = await findInatTaxon(card.dataset.sci, card.dataset.icon === "Plantae" ? "Plantae" : null);
    if (id) return openDetail(id);
    ct.textContent = "Kein Steckbrief bei iNaturalist";
  }catch{ ct.textContent = old; }
}

let lastParams;
function params(){
  const g = GROUPS.find(x => x.id === state.group);
  const p = new URLSearchParams({ iconic_taxa:g.taxa, ...whereParams() });
  if (state.research) p.set("quality_grade", "research");
  return p;
}

export function load(){
  const p = params();
  const key = p.toString() + "|" + state.combo;
  if (key === lastKey) return;
  lastKey = key; lastParams = p;
  abort?.abort(); abort = new AbortController();
  $("#exBody").scrollTop = 0;
  $("#comboNote").hidden = !state.combo;
  updateGroupAvailability(p, abort.signal);
  if (state.combo) return loadCombo(p, abort.signal).catch(() => { lastKey = null; });
  list.load(p, abort.signal).catch(() => { lastKey = null; });
}
export const reset = () => { lastKey = null; };

/* Gruppen ohne Funde im Umkreis ausgrauen – eine Abfrage für alle Gruppen */
async function updateGroupAvailability(p, signal){
  const q = new URLSearchParams(p); q.delete("iconic_taxa");
  try{
    const d = await inat("/observations/iconic_taxa_species_counts", q, { signal, prio:PRIO.low });
    const by = Object.fromEntries((d.results || []).map(r => [r.taxon?.name, r.count]));
    $$("#groups .chip").forEach(b => {
      const g = GROUPS.find(x => x.id === b.dataset.id);
      if (g.id === "all") return;
      const n = by[g.taxa] || 0;
      b.disabled = n === 0;
      b.title = n ? plural(n, "Art", "Arten") + " hier" : "Hier keine Funde";
    });
    if ($("#groups .chip[aria-pressed=true]")?.disabled) set({ group:"all" });
  }catch(err){
    if (!isAbort(err)) $$("#groups .chip").forEach(b => { b.disabled = false; });
  }
}

/* =====================================================================
   Genauer rechnen: iNaturalist + GBIF
   Je Quelle zählt der Anteil einer Art an ihrer eigenen Gruppe (Vögel unter Vögeln), damit
   große Vogelzählungen nicht alles überdecken. Kombiniert wird mit dem geometrischen Mittel:
   Weit oben steht nur, was BEIDE Quellen häufig sehen. Arten aus nur einer Quelle bleiben,
   werden aber stark abgewertet.
   ===================================================================== */
const GBIF_NAME_STORE = "pn-gbif-names";
const gbifNames = new Map(Object.entries(local.get(GBIF_NAME_STORE, {})));
const COMBO_GBIF_TOP = 1000, COMBO_INAT_PAGES = 3, COMBO_MAX_KM = 250;

function iconicFromGbif(s){
  if (s.kingdom === "Plantae") return "Plantae";
  if (s.kingdom === "Fungi") return "Fungi";
  const cl = { Mammalia:"Mammalia", Aves:"Aves", Reptilia:"Reptilia", Squamata:"Reptilia", Testudines:"Reptilia", Amphibia:"Amphibia",
    Actinopterygii:"Actinopterygii", Insecta:"Insecta", Arachnida:"Arachnida" }[s.class];
  return cl || (s.phylum === "Mollusca" ? "Mollusca" : "Animalia");
}
async function gbifResolve(keys, signal, progress){
  const todo = keys.filter(k => !gbifNames.has(String(k)));
  let i = 0, done = 0;
  const work = async () => {
    while (i < todo.length){
      const k = todo[i++];
      if (++done % 25 === 0) progress(done, todo.length);
      try{
        const s = await getJSON(`${API.gbif}/species/${k}`, { signal });
        gbifNames.set(String(k), [s.canonicalName || s.species || "", iconicFromGbif(s)]);
      }catch(err){ if (isAbort(err)) throw err; }
    }
  };
  await Promise.all(Array.from({ length:4 }, work));
  local.set(GBIF_NAME_STORE, Object.fromEntries(gbifNames));
}

async function loadCombo(p, signal){
  const g = GROUPS.find(x => x.id === state.group);
  const stat = $("#comboStat");
  const ip = new URLSearchParams(p); ip.set("quality_grade", "research");
  Object.entries(INAT_DE).forEach(([k, v]) => ip.set(k, v));
  ip.set("radius", Math.min(state.radius, COMBO_MAX_KM)); ip.set("per_page", 500);
  const gp = new URLSearchParams({ geoDistance:`${state.center.lat.toFixed(4)},${state.center.lng.toFixed(4)},${Math.min(state.radius, COMBO_MAX_KM)}km`,
    facet:"speciesKey", facetLimit:COMBO_GBIF_TOP, limit:0, occurrenceStatus:"PRESENT", hasGeospatialIssue:"false" });
  if (g.gbif) gp.set("taxonKey", g.gbif);
  list.clear(`<section class="tier"><div class="grid"></div></section>`);
  stat.textContent = "Lade iNaturalist und GBIF …";
  try{
    const [inat1, gbif] = await Promise.all([
      inat("/observations/species_counts", ip, { signal, prio:PRIO.high }),
      getJSON(`${API.gbif}/occurrence/search?${gp}`, { signal })
    ]);
    const inatList = [...(inat1.results || [])];
    showPins(ip, inatList);
    for (let pg = 2; pg <= COMBO_INAT_PAGES && inatList.length < inat1.total_results; pg++){
      stat.textContent = `Lade weitere iNaturalist-Arten … ${fmt(inatList.length)} von ${fmt(inat1.total_results)}`;
      const q = new URLSearchParams(ip); q.set("page", pg);
      const d = await inat("/observations/species_counts", q, { signal });
      inatList.push(...(d.results || []));
    }
    const counts = gbif.facets?.[0]?.counts || [];
    stat.textContent = "Gleiche die Artnamen ab …";
    await gbifResolve(counts.map(x => x.name), signal, (n, all) => stat.textContent = `Gleiche die Artnamen ab … ${fmt(n)} von ${fmt(all)} (nur beim ersten Mal)`);
    if (signal.aborted) return;
    const iconOf = t => t?.iconic_taxon_name || "Animalia";
    const gMap = new Map();
    counts.forEach(x => { const n = gbifNames.get(String(x.name)); if (n?.[0]) gMap.set(n[0].toLowerCase(), [x.count, n[1]]); });
    const iTot = {}, gTot = {}, iMin = {}, gMin = {};
    inatList.forEach(x => { const k = iconOf(x.taxon); iTot[k] = (iTot[k] || 0) + x.count; });
    gMap.forEach(([n, k]) => { gTot[k] = (gTot[k] || 0) + n; });
    inatList.forEach(x => { const k = iconOf(x.taxon); iMin[k] = Math.min(iMin[k] ?? 1, x.count / iTot[k]); });
    gMap.forEach(([n, k]) => { gMin[k] = Math.min(gMin[k] ?? 1, n / gTot[k]); });
    const floorI = k => (iMin[k] ?? 1e-4) / 2, floorG = k => (gMin[k] ?? 1e-4) / 2;
    let both = 0, single = 0;
    const out = [], seen = new Set();
    inatList.forEach(x => {
      const nm = x.taxon.name.toLowerCase(), gm = gMap.get(nm), k = iconOf(x.taxon);
      seen.add(nm);
      const sI = x.count / iTot[k], sG = gm ? gm[0] / gTot[gm[1]] : floorG(k);
      gm ? both++ : single++;
      out.push({ taxon:x.taxon, count:x.count, score:Math.sqrt(sI * sG),
        label:gm ? `${fmt(x.count)} iNat · ${fmt(gm[0])} GBIF` : `${fmt(x.count)} iNat · nicht bei GBIF` });
    });
    gMap.forEach(([n, k], nm) => {
      if (seen.has(nm)) return;
      single++;
      out.push({ taxon:{ id:null, name:nm.charAt(0).toUpperCase() + nm.slice(1), iconic_taxon_name:k }, count:n,
        score:Math.sqrt(floorI(k) * (n / gTot[k])), label:`nicht bei iNat · ${fmt(n)} GBIF` });
    });
    out.sort((a, b) => b.score - a.score);
    stat.textContent = `${fmt(out.length)} Arten: ${fmt(both)} in beiden Quellen, ${fmt(single)} nur in einer – diese stark abgewertet.` +
      (state.radius > COMBO_MAX_KM ? ` Umkreis hier höchstens ${COMBO_MAX_KM} km.` : "");
    await list.load(null, signal, out);
  }catch(err){
    if (isAbort(err)) return;
    stat.textContent = "";
    list.clear(`<div class="state">Die Daten konnten nicht geladen werden. ${esc(err.message)}.</div>`);
    throw err;
  }
}
