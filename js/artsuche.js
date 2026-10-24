// Lebewesen suchen: Vorschläge schon beim Tippen (iNaturalist-Autovervollständigung, deutsche Namen).
// Die Anfragen laufen über dieselbe Warteschlange wie alles andere; getippt wird erst nach einer kurzen Pause gesucht.
import { esc, debounce, photoSize, freePhoto, commonName, groupColor } from "./util.js";
import { inat, INAT_DE, PRIO, isAbort } from "./api.js";

const RANK_DE = { kingdom:"Reich", phylum:"Stamm", subphylum:"Unterstamm", class:"Klasse", subclass:"Unterklasse", superorder:"Überordnung", order:"Ordnung",
  suborder:"Unterordnung", infraorder:"Teilordnung", superfamily:"Überfamilie", family:"Familie", subfamily:"Unterfamilie", tribe:"Tribus",
  genus:"Gattung", subgenus:"Untergattung", section:"Sektion", complex:"Artkomplex", species:"Art", subspecies:"Unterart", variety:"Varietät", hybrid:"Hybride" };

// Reihenfolge: Name beginnt mit dem Gesuchten vor allem anderen, dann Arten vor höheren Gruppen, dann häufig beobachtet
const score = (t, q) => {
  const n = commonName(t).toLowerCase(), s = t.name.toLowerCase(); q = q.toLowerCase();
  return (n === q || s === q ? 0 : n.startsWith(q) || s.startsWith(q) ? 1 : 2) * 10 + (["species","subspecies","variety","hybrid"].includes(t.rank) ? 0 : 1);
};

export function initArtsuche(openDetail){
  for (const form of document.querySelectorAll("form.taxsearch")){
    const input = form.querySelector("input"), box = form.querySelector("ul");
    let abort, list = [], active = -1;

    const render = () => {
      box.innerHTML = list.length ? list.map((t, i) => {
        const ph = freePhoto(t);
        return `<li><button type="button" data-i="${i}" aria-selected="${i === active}">
          ${ph ? `<img src="${esc(photoSize(ph.square_url || ph.url, "square"))}" alt="" loading="lazy">` : `<span class="noimg" style="--c:${groupColor(t)}"></span>`}
          <span><b>${esc(commonName(t))}</b><i>${esc(t.name)}</i><small>${esc(RANK_DE[t.rank] || t.rank)}</small></span></button></li>`;
      }).join("") : `<li class="muted">Nichts gefunden.</li>`;
      box.hidden = false;
    };
    const search = debounce(async () => {
      const q = input.value.trim();
      if (q.length < 2){ box.hidden = true; return; }
      abort?.abort(); abort = new AbortController();
      try{
        const d = await inat("/taxa/autocomplete", { q, per_page:12, is_active:"true", ...INAT_DE }, { signal:abort.signal, prio:PRIO.high });
        if (input.value.trim() !== q) return;
        list = (d.results || []).map((t, i) => [t, i]).sort((a, b) => score(a[0], q) - score(b[0], q) || a[1] - b[1]).map(x => x[0]).slice(0, 8);
        active = -1; render();
      }catch(err){ if (!isAbort(err)){ box.innerHTML = `<li class="muted">Die Suche ist gerade nicht erreichbar.</li>`; box.hidden = false; } }
    }, 300);
    const pick = i => {
      const t = list[i]; if (!t) return;
      box.hidden = true; input.blur();
      openDetail(t.id);
    };

    input.addEventListener("input", search);
    input.addEventListener("keydown", e => {
      if (box.hidden || !list.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp"){
        e.preventDefault();
        active = (active + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length; render();
      } else if (e.key === "Escape") box.hidden = true;
    });
    form.addEventListener("submit", e => { e.preventDefault(); if (list.length) pick(active >= 0 ? active : 0); else search(); });
    box.addEventListener("click", e => { const b = e.target.closest("button[data-i]"); if (b) pick(+b.dataset.i); });
    document.addEventListener("click", e => { if (!form.contains(e.target)) box.hidden = true; });
  }
}
