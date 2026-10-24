// Bereich „Entdecken“: Was lebt hier?
// Standard: Arten nach Häufigkeit bei iNaturalist. Schalter „Genauer rechnen“ nimmt GBIF dazu (früher Reiter „Kombi“).
import { $, $$, esc, fmt, plural, local } from "./util.js";
import { API, INAT_DE, PRIO, inat, getJSON, isAbort, findInatTaxon, taxonIdsOf } from "./api.js";
import { state, set, on, GROUPS, GBIF_FISH_ORDERS, whereParams } from "./state.js";
import { makeList } from "./liste.js";

let openDetail = () => {};
export const setDetailOpener = fn => { openDetail = fn; };

let list, abort, lastKey, lastTotal = null;

const isPlantForm = id => GROUPS.find(x => x.id === id)?.parent === "plants";
function markGroups(){
  $$("#groups .chip").forEach(x => x.setAttribute("aria-pressed", x.dataset.id === state.group || (x.dataset.id === "plants" && isPlantForm(state.group))));
  const show = state.group === "plants" || isPlantForm(state.group);
  $("#plantForms").hidden = !show;
  $$("#plantForms .chip").forEach(x => x.setAttribute("aria-pressed", x.dataset.id === state.group));
}
export function initEntdecken(){
  const chip = g => `<button class="chip" data-id="${g.id}" aria-pressed="false">${g.label}</button>`;
  $("#groups").innerHTML = GROUPS.filter(g => !g.parent).map(chip).join("");
  $("#plantForms").innerHTML = `<span class="sub-label">Wuchsform</span>` + chip({ id:"plants", label:"Alle Pflanzen" }) + GROUPS.filter(g => g.parent === "plants").map(chip).join("");
  for (const box of [$("#groups"), $("#plantForms")]) box.onclick = e => {
    const b = e.target.closest(".chip"); if (!b || b.disabled) return;
    set({ group:b.dataset.id });
  };
  markGroups();
  $("#research").checked = state.research;
  $("#research").onchange = e => set({ research:e.target.checked });
  $("#combo").checked = state.combo;
  $("#combo").onchange = e => set({ combo:e.target.checked });

  list = makeList($("#exList"), {
    emptyHTML:`<div class="state">Hier wurden noch keine Arten dieser Gruppe gemeldet. Zoom heraus oder wähle eine andere Gruppe.</div>`,
    onTotal:n => { lastTotal = n; $("#exTotal").textContent = n == null ? "" : plural(n, "Art", "Arten"); },
    onPick:pick
  });

  on("*", (s, changed) => {
    if (changed.includes("group")) markGroups();
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

export async function load(){
  if (!state.placeSet) return;
  const p = params();
  const g0 = GROUPS.find(x => x.id === state.group);
  if (g0.inatTaxa){
    try{
      const ids = await taxonIdsOf(g0.inatTaxa, { prio:PRIO.high });
      if (ids.length){ p.delete("iconic_taxa"); p.set("taxon_id", ids.join(",")); }
    }catch{}
  }
  const key = p.toString() + "|" + state.combo + "|" + state.group;
  if (key === lastKey) return;
  lastKey = key; lastParams = p;
  abort?.abort(); abort = new AbortController();
  $("#exBody").scrollTop = 0;
  $("#comboNote").hidden = !state.combo;
  updateGroupAvailability(p, abort.signal);
  $("#gbifMore").hidden = true;
  const g = GROUPS.find(x => x.id === state.group);
  if (g.wuchs) return loadWuchs(g, p, abort.signal).catch(() => { lastKey = null; });
  if (state.combo) return loadCombo(p, abort.signal).catch(() => { lastKey = null; });
  const signal = abort.signal;
  list.load(p, signal).then(() => checkGbifMore(signal)).catch(() => { lastKey = null; });
}
export const reset = () => { lastKey = null; };

/* Bäume und Sträucher: iNaturalist kennt keine Wuchsform, und gewöhnliche Bäume fotografiert kaum jemand.
   Deshalb kommen die Pflanzenarten im Umkreis aus iNaturalist UND GBIF (Florenkartierungen, Herbarien),
   behalten werden die, die in der World Checklist of Vascular Plants (Kew) als Baum bzw. Strauch stehen.
   Arten nur bei GBIF bekommen Foto und deutschen Namen aus der Pflanzenliste der weiteren Umgebung (250 km).
   Die Listen (daten/wuchs/) werden erst geladen, wenn jemand die Gruppe wählt. */
const WUCHS_PAGES = 4, WUCHS_REGION_PAGES = 4;
const binomial = s => { const w = s.split(" "); return w[1] === "×" ? w.slice(0, 3).join(" ") : w.slice(0, 2).join(" "); };
async function loadWuchs(g, p, signal){
  const stat = $("#comboStat");
  $("#comboNote").hidden = false;
  list.clear(`<section class="tier"><div class="grid"></div></section>`);
  stat.textContent = `Suche ${g.label} bei iNaturalist und GBIF …`;
  const km = Math.min(state.radius, COMBO_MAX_KM);
  const gp = new URLSearchParams({ geoDistance:`${state.center.lat.toFixed(4)},${state.center.lng.toFixed(4)},${km}km`, taxonKey:6,
    facet:"scientificName", facetLimit:10000, limit:0, occurrenceStatus:"PRESENT", hasGeospatialIssue:"false" });
  try{
    const [keep, first, gbif] = await Promise.all([
      import("../daten/wuchs/index.js").then(m => m.wuchsSet(g.wuchs)),
      inat("/observations/species_counts", withPage(p, 1), { signal, prio:PRIO.high }),
      getJSON(`${API.gbif}/occurrence/search?${gp}`, { signal }).catch(err => { if (isAbort(err)) throw err; return null; })
    ]);
    const all = [...(first.results || [])];
    for (let pg = 2; pg <= WUCHS_PAGES && all.length < first.total_results; pg++){
      stat.textContent = `Suche ${g.label} … ${fmt(all.length)} von ${fmt(first.total_results)} Pflanzenarten bei iNaturalist geprüft`;
      const d = await inat("/observations/species_counts", withPage(p, pg), { signal });
      all.push(...(d.results || []));
    }
    if (signal.aborted) return;
    const by = new Map();
    all.forEach(x => { if (keep.has(x.taxon.name)) by.set(x.taxon.name, { taxon:x.taxon, i:x.count, g:0 }); });
    (gbif?.facets?.[0]?.counts || []).forEach(x => {
      const n = binomial(x.name);
      if (!keep.has(n)) return;
      const e = by.get(n) || by.set(n, { taxon:null, i:0, g:0 }).get(n);
      e.g += x.count;
    });
    // Arten nur bei GBIF: Foto und deutschen Namen aus der weiteren Umgebung holen
    const missing = [...by].filter(([, e]) => !e.taxon);
    if (missing.length){
      const rp = new URLSearchParams({ iconic_taxa:"Plantae", lat:state.center.lat.toFixed(2), lng:state.center.lng.toFixed(2), radius:250, ...INAT_DE, per_page:500 });
      for (let pg = 1; pg <= WUCHS_REGION_PAGES && missing.some(([, e]) => !e.taxon); pg++){
        stat.textContent = `Hole Fotos und Namen für ${plural(missing.filter(([, e]) => !e.taxon).length, "Art", "Arten")} aus der Umgebung …`;
        rp.set("page", pg);
        const d = await inat("/observations/species_counts", rp, { signal });
        (d.results || []).forEach(x => { const e = by.get(x.taxon.name); if (e && !e.taxon) e.taxon = x.taxon; });
        if (!d.results?.length || pg * 500 >= d.total_results) break;
      }
    }
    if (signal.aborted) return;
    const out = [...by].map(([n, e]) => ({
      taxon:e.taxon || { id:null, name:n, iconic_taxon_name:"Plantae" },
      count:e.i + e.g, score:e.i + e.g,
      label:[e.i && `${fmt(e.i)} iNat`, e.g && `${fmt(e.g)} GBIF`].filter(Boolean).join(" · ")
    })).sort((a, b) => b.score - a.score);
    const nI = [...by.values()].filter(e => e.i).length, nG = [...by.values()].filter(e => e.g && !e.i).length;
    stat.textContent = `${plural(out.length, "Art", "Arten")}: ${fmt(nI)} bei iNaturalist, ${fmt(nG)} weitere nur bei GBIF. ` +
      `Wuchsform nach der World Checklist of Vascular Plants (Kew)` + ({ S:", mit Halb- und Zwergsträuchern.", G:": Süßgräser, Sauergräser und Binsen.", F:": Farne, Schachtelhalme und Bärlappe.", Z:": Pflanzen mit Zwiebel, Knolle oder Wurzelstock." }[g.wuchs] || ".") +
      (gbif ? "" : " GBIF war gerade nicht erreichbar.") + (state.radius > COMBO_MAX_KM ? ` GBIF-Umkreis höchstens ${COMBO_MAX_KM} km.` : "");
    await list.load(null, signal, out);
  }catch(err){
    if (isAbort(err)) return;
    stat.textContent = "";
    list.clear(`<div class="state">Die Daten konnten nicht geladen werden. ${esc(err.message)}.</div>`);
    throw err;
  }
}
function withPage(p, pg){ const q = new URLSearchParams(p); Object.entries(INAT_DE).forEach(([k, v]) => q.set(k, v)); q.set("per_page", 500); q.set("page", pg); return q; }

/* Für manche Gruppen (z. B. Fische) hat iNaturalist nur wenige Meldungen, GBIF aber viele aus Kartierungen
   und Museen. Dann bietet die Seite an, beide Quellen zusammen zu zeigen. */
async function checkGbifMore(signal){
  const g = GROUPS.find(x => x.id === state.group);
  if (!g.gbif || lastTotal == null || signal.aborted) return;
  const gp = new URLSearchParams({ geoDistance:`${state.center.lat.toFixed(4)},${state.center.lng.toFixed(4)},${state.radius}km`,
    facet:"speciesKey", facetLimit:1000, limit:0, occurrenceStatus:"PRESENT", hasGeospatialIssue:"false" });
  g.gbif.forEach(k => gp.append("taxonKey", k));
  try{
    const d = await getJSON(`${API.gbif}/occurrence/search?${gp}`, { signal });
    const n = d.facets?.[0]?.counts?.length || 0;
    if (signal.aborted || n < lastTotal * 1.5 || n - lastTotal < 5) return;
    const box = $("#gbifMore");
    box.innerHTML = `<b>${esc(g.label)}: GBIF kennt hier ${fmt(n)} Arten, iNaturalist nur ${fmt(lastTotal)}.</b> GBIF sammelt auch Kartierungen, Zählungen und Museumsfunde. <button class="btn primary" type="button">Alle zusammen zeigen</button>`;
    box.querySelector("button").onclick = () => { $("#combo").checked = true; set({ combo:true }); };
    box.hidden = false;
  }catch{}
}

/* Gruppen ohne Funde im Umkreis ausgrauen – eine Abfrage für alle Gruppen */
async function updateGroupAvailability(p, signal){
  const q = new URLSearchParams(p); q.delete("iconic_taxa");
  try{
    const d = await inat("/observations/iconic_taxa_species_counts", q, { signal, prio:PRIO.low });
    const by = Object.fromEntries((d.results || []).map(r => [r.taxon?.name, r.count]));
    $$("#groups .chip").forEach(b => {
      const g = GROUPS.find(x => x.id === b.dataset.id);
      if (!g || g.id === "all") return;
      const n = by[g.taxa] || 0;
      b.disabled = n === 0;
      b.title = n ? plural(n, "Art", "Arten") + " hier" : "Hier keine Funde";
    });
    if ($("#groups .chip[aria-pressed=true]")?.disabled) set({ group:"all" });
    $$("#plantForms .chip").forEach(b => { b.disabled = !by.Plantae; });
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
  if (cl) return cl;
  if (GBIF_FISH_ORDERS.includes(s.orderKey)) return "Actinopterygii";
  return s.phylum === "Mollusca" ? "Mollusca" : "Animalia";
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
  (g.gbif || []).forEach(k => gp.append("taxonKey", k));
  list.clear(`<section class="tier"><div class="grid"></div></section>`);
  stat.textContent = "Lade iNaturalist und GBIF …";
  try{
    const [inat1, gbif] = await Promise.all([
      inat("/observations/species_counts", ip, { signal, prio:PRIO.high }),
      getJSON(`${API.gbif}/occurrence/search?${gp}`, { signal })
    ]);
    const inatList = [...(inat1.results || [])];
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
    // Sehr kleine Gruppen (z. B. eine einzige Egel-Art) sollen nicht künstlich nach oben rutschen:
    // jede Gruppe zählt mindestens mit 5 % aller Funde der Quelle.
    const floorTot = (tot) => { const all = Object.values(tot).reduce((a, b) => a + b, 0); Object.keys(tot).forEach(k => tot[k] = Math.max(tot[k], all * 0.05)); };
    floorTot(iTot); floorTot(gTot);
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
