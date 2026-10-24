// Bereich „Liste“: alle Lebewesen am Ort als aufklappbarer Baum – Gruppe › Ordnung › Familie › Gattung › Art.
// Der ganze Baum kommt mit EINER Abfrage (iNaturalist /observations/taxonomy). Deutsche Namen und kleine Bilder
// werden erst beim Aufklappen nachgeladen (30 Taxa je Abfrage), damit die Seite schnell bleibt.
import { $, $$, esc, fmt, plural, photoSize, freePhoto, debounce } from "./util.js";
import { inat, INAT_DE, PRIO, isAbort } from "./api.js";
import { state, on, whereParams } from "./state.js";

let openDetail = () => {};
export const setDetailOpener = fn => { openDetail = fn; };

const MAIN = new Set(["order", "family", "genus", "species", "hybrid"]);
const RANK = { order:"Ordnung", family:"Familie", genus:"Gattung", species:"Art", hybrid:"Hybride" };
const GRP = [
  ["plants", "Pflanzen", ["Plantae"]], ["fungi", "Pilze & Flechten", ["Fungi"]], ["birds", "Vögel", ["Aves"]],
  ["mamm", "Säugetiere", ["Mammalia"]], ["rept", "Reptilien", ["Reptilia"]], ["amph", "Amphibien", ["Amphibia"]],
  ["fish", "Fische", ["Actinopterygii"]], ["ins", "Insekten", ["Insecta"]], ["arach", "Spinnentiere", ["Arachnida"]],
  ["moll", "Weichtiere", ["Mollusca"]], ["other", "Weitere Lebewesen", []]
];
const PAGE = 60, THUMBS = 3;
const ui = { filter:"all", sort:"count", q:"" };
let T = null, abort, lastKey, names = new Map(), open = new Set();

export function initListe(){
  $("#lsFilter").innerHTML = [["all", "Alle"], ...GRP.map(g => [g[0], g[1]])]
    .map(([id, l]) => `<button class="chip" type="button" data-f="${id}" aria-pressed="${id === ui.filter}">${esc(l)}</button>`).join("");
  $("#lsFilter").onclick = e => { const b = e.target.closest("[data-f]"); if (!b || b.disabled) return; ui.filter = b.dataset.f; markFilter(); render(); };
  $("#lsSort").onchange = e => { ui.sort = e.target.value; sortAll(); render(); };
  $("#lsQ").addEventListener("input", debounce(() => { ui.q = $("#lsQ").value.trim(); search(); }, 250));
  $("#lsForm").addEventListener("submit", e => { e.preventDefault(); const b = $("#lsHits button"); if (b) b.click(); });
  $("#lsTree").addEventListener("click", onTreeClick);
  $("#lsHits").addEventListener("click", e => { const b = e.target.closest("[data-id]"); if (b) reveal(+b.dataset.id); });
  on("*", (s, changed) => {
    if (state.mode !== "liste") return;
    if (changed.some(k => ["center", "radius", "research", "mode", "placeSet", "place"].includes(k))) load();
  });
}
const markFilter = () => $$("#lsFilter .chip").forEach(b => b.setAttribute("aria-pressed", b.dataset.f === ui.filter));

/* ---------- Laden und Baum bauen ---------- */
export async function load(){
  if (!state.placeSet) return;
  const p = { ...whereParams(), ...INAT_DE };
  if (state.research) p.quality_grade = "research";
  const key = JSON.stringify(p);
  if (key === lastKey) return;
  lastKey = key;
  abort?.abort(); abort = new AbortController();
  $("#lsTree").innerHTML = `<div class="state">Lade alle Lebewesen im Umkreis …</div>`;
  $("#lsStat").textContent = "";
  try{
    const d = await inat("/observations/taxonomy", p, { signal:abort.signal, prio:PRIO.high });
    T = build(d.results || []);
    open = new Set();
    sortAll(); render(); search();
  }catch(err){
    if (isAbort(err)) return;
    lastKey = null;
    $("#lsTree").innerHTML = `<div class="state">Die Liste konnte nicht geladen werden. ${esc(err.message)}.</div>`;
  }
}

function build(raw){
  const by = new Map(raw.map(x => [x.id, x]));
  const nodes = new Map();
  const groupOf = x => (GRP.find(g => g[2].includes(x.iconic_taxon_name)) || GRP[GRP.length - 1])[0];
  for (const g of GRP) nodes.set(g[0], { id:g[0], group:true, label:g[1], kids:[], obs:0, sp:0 });
  const up = new Map();
  const mainParent = x => {          // nächster Vorfahr mit Hauptrang
    if (up.has(x.id)) return up.get(x.id);
    let p = by.get(x.parent_id), res = null;
    while (p){ if (MAIN.has(p.rank)){ res = p.id; break; } p = by.get(p.parent_id); }
    up.set(x.id, res);
    return res;
  };
  for (const x of raw){
    if (!MAIN.has(x.rank)) continue;
    nodes.set(x.id, { id:x.id, sci:x.name, rank:x.rank, obs:x.descendant_obs_count || 0, kids:[], sp:0, g:groupOf(x) });
  }
  for (const n of nodes.values()){
    if (n.group) continue;
    const pid = mainParent(by.get(n.id));
    n.parent = pid && nodes.has(pid) ? pid : n.g;
    nodes.get(n.parent).kids.push(n);
  }
  const count = n => { n.sp = (n.rank === "species" || n.rank === "hybrid") ? 1 : 0; for (const k of n.kids) n.sp += count(k); return n.sp; };
  for (const g of GRP){ const r = nodes.get(g[0]); r.obs = r.kids.reduce((a, k) => a + k.obs, 0); count(r); }
  const species = [...nodes.values()].filter(n => n.rank === "species" || n.rank === "hybrid");
  return { nodes, species, families:[...nodes.values()].filter(n => n.rank === "family").length };
}

function sortAll(){
  if (!T) return;
  const cmp = ui.sort === "az" ? (a, b) => a.sci.localeCompare(b.sci) : (a, b) => b.obs - a.obs || a.sci.localeCompare(b.sci);
  for (const n of T.nodes.values()) n.kids.sort(cmp);
}

/* ---------- Zeichnen ---------- */
const isLeaf = n => n.rank === "species" || n.rank === "hybrid";
// Ketten mit nur einem Kind zusammenfassen (z. B. Ordnung › Familie mit einer einzigen Gattung)
function chain(n){ const c = [n]; while (!isLeaf(c[c.length - 1]) && c[c.length - 1].kids.length === 1 && !isLeaf(c[c.length - 1].kids[0])) c.push(c[c.length - 1].kids[0]); return c; }

function render(){
  if (!T) return;
  const roots = GRP.map(g => T.nodes.get(g[0])).filter(r => r.sp > 0);
  $$("#lsFilter .chip").forEach(b => { const r = T.nodes.get(b.dataset.f); if (r) b.disabled = !r.sp; });
  const shown = ui.filter === "all" ? roots : roots.filter(r => r.id === ui.filter);
  const sp = shown.reduce((a, r) => a + r.sp, 0);
  $("#lsStat").textContent = `${plural(sp, "Art", "Arten")} · ${plural(T.families, "Familie", "Familien")} im Umkreis`;
  $("#lsTree").innerHTML = shown.length ? shown.map(r => rowHTML(r, 0)).join("") : `<div class="state">Hier wurden noch keine Lebewesen gemeldet.</div>`;
  groupThumbs(shown);
  for (const id of open) expand(id, false);
}

function rowHTML(n, depth, thumb){
  const c = n.group ? [n] : chain(n), last = c[c.length - 1];
  const nm = n.group ? n.label : chainText(c);
  const leaf = isLeaf(last);
  const ph = thumb && !n.group ? names.get(last.id)?.photo : null;
  return `<div class="ls-node" data-node="${esc(last.id)}" style="--d:${depth}">
    <button class="ls-row${leaf ? " leaf" : ""}" type="button" data-id="${esc(last.id)}" ${leaf ? "" : `aria-expanded="${open.has(String(last.id))}"`}>
      <span class="ls-tw" aria-hidden="true">${leaf ? "" : "▸"}</span>
      ${n.group ? `<span class="ls-thumbs" data-thumbs="${esc(n.id)}"></span>` : thumb ? `<span class="ls-th" data-th="${last.id}">${ph ? `<img src="${esc(photoSize(ph.square_url || ph.url, "square"))}" alt="" loading="lazy" title="Foto: ${esc(ph.attribution)}">` : ""}</span>` : ""}
      <span class="ls-nm"><b${n.group ? "" : ` data-chain="${c.map(x => x.id).join(" ")}"`}>${esc(nm)}</b>${n.group ? "" : `<i>${esc(RANK[last.rank] || "")} ${esc(last.sci)}</i>`}</span>
      <span class="ls-ct">${leaf ? `${fmt(last.obs)} Funde` : `${fmt(last.sp)} ${last.sp === 1 ? "Art" : "Arten"}`}</span>
    </button>
    ${leaf ? "" : `<div class="ls-kids" data-kids="${esc(last.id)}" hidden></div>`}
  </div>`;
}
const labelOf = x => names.get(x.id)?.common || x.sci;
// Kette als Text, gleiche Namen hintereinander nur einmal (Familie „Reiher“ › Gattung „Reiher“)
const chainText = c => c.map(labelOf).filter((t, i, a) => t !== a[i - 1]).join(" › ");

function onTreeClick(e){
  const more = e.target.closest("[data-more]");
  if (more){ const id = more.dataset.more; more.remove(); fillKids(id, +more.dataset.from); return; }
  const b = e.target.closest(".ls-row"); if (!b) return;
  if (b.classList.contains("leaf")) return openDetail(+b.dataset.id);
  const id = b.dataset.id;
  if (open.has(id)) collapse(id); else expand(id, true);
}
function collapse(id){
  open.delete(id);
  const box = $(`[data-kids="${CSS.escape(id)}"]`); if (box) box.hidden = true;
  $(`.ls-row[data-id="${CSS.escape(id)}"]`)?.setAttribute("aria-expanded", "false");
}
function expand(id, remember){
  const n = T.nodes.get(/^\d+$/.test(id) ? +id : id); if (!n) return;
  const box = $(`[data-kids="${CSS.escape(String(id))}"]`); if (!box) return;
  if (remember) open.add(String(id));
  $(`.ls-row[data-id="${CSS.escape(String(id))}"]`)?.setAttribute("aria-expanded", "true");
  box.hidden = false;
  if (!box.childElementCount) fillKids(String(id), 0);
}
function fillKids(id, from){
  const n = T.nodes.get(/^\d+$/.test(id) ? +id : id);
  const box = $(`[data-kids="${CSS.escape(id)}"]`);
  const depth = (+box.closest(".ls-node").style.getPropertyValue("--d") || 0) + 1;
  const kids = n.kids.slice(from, from + PAGE);
  box.insertAdjacentHTML("beforeend", kids.map((k, i) => rowHTML(k, depth, from + i < THUMBS)).join("") +
    (n.kids.length > from + PAGE ? `<button class="ls-more" type="button" data-more="${esc(id)}" data-from="${from + PAGE}" style="--d:${depth}">${fmt(n.kids.length - from - PAGE)} weitere anzeigen</button>` : ""));
  loadNames(kids.map(k => chain(k)).flat().map(k => k.id));
  for (const k of kids){ const last = chain(k).pop(); if (open.has(String(last.id))) expand(String(last.id), false); }
}

/* ---------- Deutsche Namen und Bilder nachladen ---------- */
async function loadNames(ids){
  const todo = [...new Set(ids)].filter(id => typeof id === "number" && !names.has(id));
  for (let i = 0; i < todo.length; i += 30){
    const part = todo.slice(i, i + 30);
    try{
      const d = await inat(`/taxa/${part.join(",")}`, INAT_DE, { prio:PRIO.normal });
      for (const t of d.results || []) names.set(t.id, { common:t.preferred_common_name || "", photo:freePhoto(t) });
      part.forEach(id => { if (!names.has(id)) names.set(id, {}); paint(id); });
    }catch(err){ if (isAbort(err)) return; }
  }
}
function paint(id){
  const x = names.get(id); if (!x || !T) return;
  $$(`[data-chain~="${id}"]`).forEach(el => { el.textContent = chainText(el.dataset.chain.split(" ").map(i => T.nodes.get(+i))); });
  $$(`[data-th="${id}"]`).forEach(el => { if (x.photo && !el.firstChild) el.innerHTML = `<img src="${esc(photoSize(x.photo.square_url || x.photo.url, "square"))}" alt="" loading="lazy" title="Foto: ${esc(x.photo.attribution)}">`; });
}
// Je Gruppe drei Mini-Bilder der häufigsten Arten
async function groupThumbs(roots){
  const top = new Map();
  for (const r of roots){
    const sp = T.species.filter(s => s.g === r.id).sort((a, b) => b.obs - a.obs).slice(0, THUMBS);
    top.set(r.id, sp.map(s => s.id));
  }
  await loadNames([...top.values()].flat());
  for (const [g, ids] of top){
    const el = $(`[data-thumbs="${g}"]`); if (!el) continue;
    el.innerHTML = ids.map(id => names.get(id)?.photo).filter(Boolean)
      .map(ph => `<img src="${esc(photoSize(ph.square_url || ph.url, "square"))}" alt="" loading="lazy" title="Foto: ${esc(ph.attribution)}">`).join("");
  }
}

/* ---------- Suche links: wissenschaftlich sofort, deutsch über iNaturalist ---------- */
let sAbort;
async function search(){
  const box = $("#lsHits"), q = ui.q.toLowerCase();
  if (!T || q.length < 2){ box.innerHTML = q ? "" : `<p class="note">Tippe einen deutschen oder wissenschaftlichen Namen. Treffer zeigen nur, was hier vorkommt.</p>`; return; }
  const local = [...T.nodes.values()].filter(n => !n.group && (n.sci.toLowerCase().includes(q) || (names.get(n.id)?.common || "").toLowerCase().includes(q)));
  const hits = new Map(local.map(n => [n.id, n]));
  show();
  sAbort?.abort(); sAbort = new AbortController();
  try{
    const d = await inat("/taxa/autocomplete", { q:ui.q, per_page:30, ...INAT_DE }, { signal:sAbort.signal, prio:PRIO.high });
    for (const t of d.results || []){
      const n = T.nodes.get(t.id); if (!n) continue;
      if (!names.has(t.id)) names.set(t.id, { common:t.preferred_common_name || "", photo:freePhoto(t) });
      hits.set(t.id, n);
    }
    if (ui.q.toLowerCase() === q) show();
  }catch{}
  function show(){
    const list = [...hits.values()].sort((a, b) => (isLeaf(a) - isLeaf(b)) || b.obs - a.obs).slice(0, 25);
    box.innerHTML = list.length ? `<ul class="ls-hits">${list.map(n => `<li><button type="button" data-id="${n.id}">
      <b>${esc(names.get(n.id)?.common || n.sci)}</b><i>${esc(RANK[n.rank] || "")} ${esc(n.sci)}</i><small>${esc(pathOf(n))}</small></button></li>`).join("")}</ul>`
      : `<p class="note">Hier nichts gefunden.</p>`;
  }
}
const pathOf = n => { const p = []; let x = T.nodes.get(n.parent); while (x && !x.group){ p.unshift(names.get(x.id)?.common || x.sci); x = T.nodes.get(x.parent); } if (x) p.unshift(x.label); return p.join(" › "); };

// Treffer im Baum zeigen: Gruppe wählen, Vorfahren aufklappen, hinscrollen, kurz markieren
function reveal(id){
  const n = T.nodes.get(id); if (!n) return;
  if (ui.filter !== "all" && ui.filter !== n.g){ ui.filter = n.g; markFilter(); render(); }
  const anc = []; let x = T.nodes.get(n.parent);
  while (x){ anc.unshift(x); x = T.nodes.get(x.parent); }
  for (const a of anc){
    const shown = a.group ? a : chain(a).pop();
    if (!isLeaf(shown)) expand(String(shown.id), true);
    // Kind steht evtl. hinter „weitere anzeigen“
    for (let guard = 0; guard < 50; guard++){
      if ($(`.ls-row[data-id="${id}"]`) || !$(`[data-more="${CSS.escape(String(shown.id))}"]`)) break;
      $(`[data-more="${CSS.escape(String(shown.id))}"]`).click();
    }
  }
  const row = $(`.ls-row[data-id="${id}"]`) || $(`[data-chain~="${id}"]`)?.closest(".ls-row");
  if (!row) return;
  row.scrollIntoView({ block:"center", behavior:"smooth" });
  row.classList.add("flash"); setTimeout(() => row.classList.remove("flash"), 1600);
  if (isLeaf(n)) row.focus({ preventScroll:true });
}
