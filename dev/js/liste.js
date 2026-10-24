// Die Artenliste nach Häufigkeit – eine einzige Liste für Entdecken und Bestimmen.
// iNaturalist liefert die Arten nach Zahl der Beobachtungen sortiert. Die Rangfolge wird in fünf
// Stufen geteilt; jede Stufe zeigt zuerst 2 Arten und lädt auf Wunsch weitere nach.
import { esc, fmt, plural, photoSize, freePhoto, groupColor, commonName } from "./util.js";
import { inat, INAT_DE, PRIO, isAbort } from "./api.js";

const TIERS = [
  { id:"t1", label:"Häufig",         bars:5, to:0.05 },
  { id:"t2", label:"Mittelhäufig",   bars:4, to:0.20 },
  { id:"t3", label:"Weniger häufig", bars:3, to:0.45 },
  { id:"t4", label:"Selten",         bars:2, to:0.75 },
  { id:"t5", label:"Sehr selten",    bars:1, to:1.00 }
];
const PAGE = 50, MAX_RANK = 10000, FIRST = 2, MORE = 4;

export function cardHTML({ count, taxon:t, label }){
  const ph = freePhoto(t);
  const img = ph ? photoSize(ph.square_url || ph.url, "small") : null;
  const credit = ph ? ` title="Foto: ${esc(ph.attribution)}"` : "";
  return `<button class="card" ${t.id ? `data-id="${t.id}"` : `data-sci="${esc(t.name)}" data-icon="${esc(t.iconic_taxon_name || "")}"`} style="--c:${groupColor(t)}">
    ${img ? `<img src="${esc(img)}" alt=""${credit} loading="lazy">` : `<span class="noimg" aria-hidden="true"></span>`}
    <span class="meta">
      <span class="cn">${esc(commonName(t))}</span>
      ${t.preferred_common_name ? `<span class="sn">${esc(t.name)}</span>` : ""}
      <span class="ct">${label ? esc(label) : plural(count, "Beobachtung", "Beobachtungen") + " hier"}</span>
    </span></button>`;
}
const skeletons = n => Array.from({ length:n }, () => `<div class="card skel-card"><span class="noimg skel"></span><span class="meta"><span class="skel line"></span></span></div>`).join("");
const barsHTML = n => `<span class="freq" aria-hidden="true">${[1,2,3,4,5].map(i => `<i class="${i <= n ? "on" : ""}" style="height:${3 + i * 2.4}px"></i>`).join("")}</span>`;

/**
 * Liste in einem Kasten anlegen.
 * onTotal(n)       – Gesamtzahl der Arten (null = lädt)
 * onPick(card)     – Antippen einer Art
 */
export function makeList(box, { emptyHTML, onTotal = () => {}, onPick }){
  const L = { ctx:null, closed:new Set() };

  function getPage(c, n){
    if (c.static) return Promise.resolve({ total_results:c.static.length, results:c.static.slice((n - 1) * PAGE, n * PAGE) });
    const p = new URLSearchParams(c.params);
    Object.entries(INAT_DE).forEach(([k, v]) => p.set(k, v));
    p.set("per_page", PAGE); p.set("page", n);
    return inat("/observations/species_counts", p, { signal:c.signal, prio:n === 1 ? PRIO.high : PRIO.normal });
  }
  async function range(c, start, count){
    const out = [];
    for (let n = Math.floor(start / PAGE) + 1; n <= Math.floor((start + count - 1) / PAGE) + 1; n++){
      const d = await getPage(c, n), base = (n - 1) * PAGE;
      d.results.forEach((r, i) => { const rank = base + i; if (rank >= start && rank < start + count) out.push(r); });
    }
    return out;
  }
  async function fill(c, t, howMany, replace){
    const grid = box.querySelector(`[data-grid="${t.id}"]`), btn = box.querySelector(`.more[data-tier="${t.id}"]`);
    const count = Math.min(howMany, t.end - (t.start + t.shown));
    if (count <= 0) return;
    if (!replace){ btn.disabled = true; btn.textContent = "Lädt …"; }
    const items = await range(c, t.start + t.shown, count);
    if (L.ctx !== c) return;
    const html = items.map(cardHTML).join("");
    if (replace) grid.innerHTML = html; else grid.insertAdjacentHTML("beforeend", html);
    if (replace && items.length && !c.static){
      const hi = items[0].count;
      box.querySelector(`[data-range="${t.id}"]`).textContent = `bis ${plural(hi, "Beobachtung", "Beobachtungen")} je Art`;
    }
    t.shown += items.length;
    const left = t.end - t.start - t.shown;
    btn.hidden = left <= 0 || !items.length;
    btn.disabled = false;
    btn.textContent = `${Math.min(MORE, left)} weitere · noch ${fmt(left)}`;
  }

  /** params: iNaturalist-Filter; staticList: fertige Liste (Kombi) statt Abfrage */
  L.load = async (params, signal, staticList) => {
    const c = L.ctx = { params, signal, tiers:[], static:staticList || null };
    box.innerHTML = `<section class="tier"><div class="grid">${skeletons(4)}</div></section>`;
    onTotal(null);
    try{
      const first = await getPage(c, 1);
      if (L.ctx !== c) return;
      const total = first.total_results;
      onTotal(total);
      if (!total){ box.innerHTML = emptyHTML; return; }
      const n = Math.min(total, MAX_RANK);
      let prev = 0;
      c.tiers = TIERS.map(t => {
        const end = t.to === 1 ? n : Math.min(n, Math.max(prev + 1, Math.round(t.to * n)));
        const tier = { ...t, start:prev, end, shown:0 }; prev = end; return tier;
      }).filter(t => t.end > t.start);
      box.innerHTML = c.tiers.map(t => `
        <section class="tier${L.closed.has(t.id) ? " collapsed" : ""}" data-sec="${t.id}">
          <header class="tier-head">
            ${barsHTML(t.bars)}
            <h3><button class="tier-tog" data-tog="${t.id}" aria-expanded="${!L.closed.has(t.id)}">${t.label}<span class="chev" aria-hidden="true">▾</span></button></h3>
            <span class="tier-meta">${plural(t.end - t.start, "Art", "Arten")}</span>
          </header>
          <p class="tier-range" data-range="${t.id}"></p>
          <div class="grid" data-grid="${t.id}">${skeletons(Math.min(FIRST, t.end - t.start))}</div>
          <button class="btn more" data-tier="${t.id}" hidden>Weitere</button>
        </section>`).join("") +
        (total > MAX_RANK ? `<p class="note">${fmt(total)} Arten – iNaturalist liefert nur die ersten ${fmt(MAX_RANK)}. Zoom hinein für eine vollständige Einteilung.</p>` : "");
      for (const t of c.tiers){ await fill(c, t, FIRST, true); if (L.ctx !== c) return; }
    }catch(err){
      if (isAbort(err) || L.ctx !== c) return;
      L.ctx = null;
      box.innerHTML = `<div class="state">Die Arten konnten nicht geladen werden. ${esc(err.message)}. Prüfe die Internetverbindung und versuche es gleich noch einmal.</div>`;
    }
  };
  L.clear = html => { L.ctx = null; box.innerHTML = html || ""; onTotal(null); };

  const toggle = (id, open) => {
    const sec = box.querySelector(`.tier[data-sec="${id}"]`); if (!sec) return;
    open = open ?? sec.classList.contains("collapsed");
    sec.classList.toggle("collapsed", !open);
    sec.querySelector(".tier-tog").setAttribute("aria-expanded", open);
    open ? L.closed.delete(id) : L.closed.add(id);
  };
  box.addEventListener("click", async e => {
    const tog = e.target.closest(".tier-tog");
    if (tog) return toggle(tog.dataset.tog);
    const shut = e.target.closest(".tier.collapsed");
    if (shut){ e.preventDefault(); return toggle(shut.dataset.sec, true); }
    const card = e.target.closest(".card[data-id], .card[data-sci]");
    if (card) return onPick(card);
    const btn = e.target.closest(".more[data-tier]");
    if (!btn || !L.ctx) return;
    const c = L.ctx, t = c.tiers.find(x => x.id === btn.dataset.tier);
    try{ await fill(c, t, MORE, false); }
    catch{ if (L.ctx === c){ btn.disabled = false; btn.textContent = "Laden fehlgeschlagen – erneut versuchen"; } }
  });
  return L;
}
