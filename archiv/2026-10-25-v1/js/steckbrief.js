// Steckbrief einer Art – mittel ausführlich, nur Felder mit echten, freien Daten:
// Fotos, Namen, Gefährdung, Zahlen, Jahreszeit, Beschreibung, Verwechslungsarten, Systematik, Verbreitung.
import { $, $$, esc, fmt, plural, photoSize, isFree, licName, groupColor, commonName } from "./util.js";
import { API, INAT_DE, PRIO, inat, getJSON, isAbort } from "./api.js";
import { state, set, whereParams } from "./state.js";
import { showRangeMap, closeRangeMap } from "./karte.js";
import { cardHTML } from "./liste.js";

const RANK_DE = { kingdom:"Reich", phylum:"Stamm", class:"Klasse", order:"Ordnung", family:"Familie", genus:"Gattung", species:"Art", subspecies:"Unterart", variety:"Varietät", hybrid:"Hybride" };
const IUCN = { 10:["LC","Nicht gefährdet","#86b86f"], 20:["NT","Potenziell gefährdet","#c5c45a"], 30:["VU","Gefährdet","#e7ad4f"], 40:["EN","Stark gefährdet","#e0794a"], 50:["CR","Vom Aussterben bedroht","#e04a4a"], 60:["EW","In der Natur ausgestorben","#b07cc0"], 70:["EX","Ausgestorben","#9a9a9a"] };
const MONTHS = ["J","F","M","A","M","J","J","A","S","O","N","D"];
const MONTH_LONG = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

let abort, onClose = () => {}, onOpen = () => {};
export const setDetailHooks = (open, close) => { onOpen = open; onClose = close; };

export function initSteckbrief(){
  $("#back").onclick = closeDetail;
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#detail").hidden) closeDetail(); });
  $("#detailBody").addEventListener("click", e => {
    const c = e.target.closest(".card[data-id]");
    if (c) openDetail(+c.dataset.id);
  });
}

export function closeDetail(){
  abort?.abort();
  $("#detail").hidden = true;
  closeRangeMap();
  set({ detail:null });
  onClose();
}

export async function openDetail(id){
  abort?.abort(); abort = new AbortController();
  const signal = abort.signal;
  $("#detail").hidden = false;
  set({ detail:id });
  onOpen();
  const body = $("#detailBody");
  body.scrollTop = 0;
  body.innerHTML = `<div class="hero skel"></div><div class="d-sec"><div class="skel line" style="width:70%;height:26px"></div></div>`;
  try{
    const { results:[t] } = await inat(`/taxa/${id}`, INAT_DE, { signal, prio:PRIO.high });
    if (signal.aborted) return;
    render(t);
    loadLocal(t, signal);
    loadSeason(t, signal);
    loadWikipedia(t, signal);
    loadSimilar(t, signal);
    loadGbif(t, signal);
  }catch(err){
    if (!isAbort(err)) body.innerHTML = `<div class="state">Der Steckbrief konnte nicht geladen werden. ${esc(err.message)}.</div>`;
  }
}

function iucnOf(t){
  const s = (t.conservation_statuses || []).find(x => !x.place && x.iucn) || (t.conservation_statuses || []).find(x => x.iucn);
  return s ? IUCN[s.iucn] : null;
}

function render(t){
  const photos = (t.taxon_photos || []).map(x => x.photo).filter(isFree).slice(0, 8);
  if (!photos.length && isFree(t.default_photo)) photos.push(t.default_photo);
  const first = photos[0];
  const iucn = iucnOf(t);
  const anc = (t.ancestors || []).filter(a => ["kingdom","phylum","class","order","family","genus"].includes(a.rank));
  const credit = p => p ? `${esc(p.attribution || "")}` : "";

  $("#detailBody").innerHTML = `
    ${first ? `<div class="hero"><img id="heroImg" src="${esc(photoSize(first.url || first.square_url, "large"))}" alt="${esc(commonName(t))}"></div>
      <p class="credit" id="heroCredit">${credit(first)}</p>` : `<div class="hero empty"><span>Kein frei lizenziertes Foto</span></div>`}
    ${photos.length > 1 ? `<div class="thumbs" id="thumbs">${photos.map((p, i) =>
      `<button data-i="${i}" aria-pressed="${i === 0}" aria-label="Foto ${i + 1}"><img src="${esc(photoSize(p.url || p.square_url, "square"))}" alt=""></button>`).join("")}</div>` : ""}

    <div class="d-sec">
      <div>
        <h2 class="d-name">${esc(commonName(t))}</h2>
        ${t.preferred_common_name ? `<p class="d-sci">${esc(t.name)}</p>` : ""}
      </div>
      <div class="badges">
        <span class="badge" style="--c:${groupColor(t)}">${esc(RANK_DE[t.rank] || t.rank)}</span>
        ${iucn ? `<span class="badge iucn" style="--c:${iucn[2]}">${iucn[0]} · ${iucn[1]}</span>` : ""}
        ${t.extinct ? `<span class="badge">ausgestorben</span>` : ""}
      </div>
      <div class="facts">
        ${state.placeSet ? `<div class="fact"><b id="fLocal">…</b><span>Beobachtungen um ${esc(state.place)}</span></div>` : ""}
        <div class="fact"><b>${fmt(t.observations_count)}</b><span>Beobachtungen weltweit</span></div>
        <div class="fact"><b id="fGbif">…</b><span>Fundmeldungen bei GBIF</span></div>
      </div>
      <button class="btn primary range-btn" id="showRange" aria-expanded="false">Verbreitungsgebiet zeigen</button>
      <div class="range" id="rangeBox" hidden>
        <div class="range-map" id="rangeMap"></div>
        <p class="note"><span class="lg-range"></span> Fundorte bei iNaturalist${state.placeSet ? ` · <span class="lg-here"></span> ${esc(state.place)}` : ""}</p>
      </div>
    </div>

    <div class="d-sec">
      <h3 class="h">Jahreszeit</h3>
      <div id="season" class="season"><div class="skel line" style="height:70px"></div></div>
    </div>

    <div class="d-sec">
      <h3 class="h">Beschreibung</h3>
      <div class="prose" id="wiki"><div class="skel line" style="height:60px"></div></div>
    </div>

    <div class="d-sec" id="simSec">
      <h3 class="h">Verwechslungsarten</h3>
      <p class="note">Arten, mit denen diese bei iNaturalist am häufigsten verwechselt wird.</p>
      <div class="grid" id="similar"><div class="skel line" style="height:50px"></div></div>
    </div>

    ${anc.length ? `<div class="d-sec">
      <h3 class="h">Systematik</h3>
      <ul class="tax">${anc.map(a => `<li><span class="r">${RANK_DE[a.rank]}</span><span class="n">${esc(a.preferred_common_name || "")}${a.preferred_common_name ? " · " : ""}<i>${esc(a.name)}</i></span></li>`).join("")}
        <li><span class="r">${esc(RANK_DE[t.rank] || t.rank)}</span><span class="n"><i>${esc(t.name)}</i></span></li></ul>
    </div>` : ""}

    <div class="d-sec">
      <h3 class="h">Mehr erfahren</h3>
      <div class="actions">
        <a class="btn" href="https://www.inaturalist.org/taxa/${t.id}" target="_blank" rel="noopener">iNaturalist</a>
        <a class="btn" id="gbifLink" href="https://www.gbif.org/search?q=${encodeURIComponent(t.name)}" target="_blank" rel="noopener">GBIF</a>
        <a class="btn" id="wikiLink" href="https://de.wikipedia.org/wiki/${encodeURIComponent(t.name)}" target="_blank" rel="noopener">Wikipedia</a>
      </div>
    </div>`;

  $("#thumbs")?.addEventListener("click", e => {
    const b = e.target.closest("button[data-i]"); if (!b) return;
    const p = photos[+b.dataset.i];
    $("#heroImg").src = photoSize(p.url || p.square_url, "large");
    $("#heroCredit").textContent = p.attribution || "";
    $$("#thumbs button").forEach(x => x.setAttribute("aria-pressed", x === b));
  });
  $("#showRange").onclick = e => {
    const btn = e.currentTarget, open = btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", open);
    btn.textContent = open ? "Verbreitungsgebiet ausblenden" : "Verbreitungsgebiet zeigen";
    $("#rangeBox").hidden = !open;
    if (open){ showRangeMap($("#rangeMap"), t.id); $("#rangeBox").scrollIntoView({ block:"nearest", behavior:"smooth" }); }
    else closeRangeMap();
  };
}

async function loadLocal(t, signal){
  try{
    if (!state.placeSet) return;
    const d = await inat("/observations", { taxon_id:t.id, ...whereParams(), per_page:0 }, { signal });
    $("#fLocal").textContent = fmt(d.total_results);
  }catch(err){ if (!isAbort(err) && $("#fLocal")) $("#fLocal").textContent = "–"; }
}

// Funde je Monat: zuerst im Umkreis; bei sehr wenigen Funden weltweit
async function loadSeason(t, signal){
  const box = () => $("#season");
  try{
    const q = { taxon_id:t.id, date_field:"observed", interval:"month_of_year", verifiable:"true" };
    let d = await inat("/observations/histogram", state.placeSet ? { ...q, ...whereParams() } : q, { signal, prio:PRIO.low });
    let vals = Object.values(d.results?.month_of_year || {}), where = state.placeSet ? "im Umkreis" : "weltweit";
    if (vals.reduce((a, b) => a + b, 0) < 12){
      d = await inat("/observations/histogram", q, { signal, prio:PRIO.low });
      vals = Object.values(d.results?.month_of_year || {}); where = "weltweit";
    }
    const max = Math.max(...vals, 0);
    if (!box()) return;
    if (!max){ box().innerHTML = `<p class="note">Noch zu wenige Funde mit Datum.</p>`; return; }
    const now = new Date().getMonth();
    const top = vals.indexOf(max);
    box().innerHTML = `<div class="bars" role="img" aria-label="Funde je Monat ${where}, am meisten im ${MONTH_LONG[top]}">
      ${vals.map((v, i) => `<div class="bar${i === now ? " now" : ""}" title="${MONTH_LONG[i]}: ${plural(v, "Fund", "Funde")}"><i style="height:${Math.max(v ? 4 : 1, Math.round(v / max * 100))}%"></i><span>${MONTHS[i]}</span></div>`).join("")}
    </div><p class="note">Funde je Monat ${where} · am meisten im ${MONTH_LONG[top]} · hervorgehoben: jetzt</p>`;
  }catch(err){ if (!isAbort(err) && box()) box().innerHTML = `<p class="note">Jahreszeit nicht verfügbar.</p>`; }
}

// Die ersten Sätze des deutschen Wikipedia-Artikels (gesucht über den wissenschaftlichen Namen)
async function loadWikipedia(t, signal){
  const el = () => $("#wiki");
  try{
    const q = new URLSearchParams({ action:"query", format:"json", origin:"*", redirects:"1", titles:t.name,
      prop:"extracts|info|pageprops", exsentences:"5", explaintext:"1", inprop:"url", ppprop:"disambiguation" });
    const d = await getJSON(`${API.wikiApi}?${q}`, { signal });
    const page = Object.values(d.query?.pages || {})[0];
    if (page && !("missing" in page) && !page.pageprops && page.extract && el()){
      const text = page.extract.split(/\n+/).filter(Boolean).slice(0, 3).map(p => `<p>${esc(p)}</p>`).join("");
      el().innerHTML = `${text}<p class="src">Text: Wikipedia, <a href="${esc(page.fullurl)}" target="_blank" rel="noopener">Artikel „${esc(page.title)}“</a>, CC BY-SA 4.0</p>`;
      $("#wikiLink").href = page.fullurl;
      return;
    }
  }catch(err){ if (isAbort(err)) return; }
  if (!el()) return;
  const txt = (t.wikipedia_summary || "").replace(/<[^>]+>/g, "");
  el().innerHTML = txt ? `<p>${esc(txt)}</p><p class="src">Text: englische Wikipedia über iNaturalist, CC BY-SA</p>`
    : `<p class="note">Zu dieser Art gibt es noch keinen deutschen Wikipedia-Artikel.</p>`;
}

async function loadSimilar(t, signal){
  try{
    const d = await inat("/identifications/similar_species", { taxon_id:t.id, ...INAT_DE }, { signal, prio:PRIO.low });
    const res = (d.results || []).slice(0, 4);
    if (!$("#similar")) return;
    if (!res.length){ $("#simSec").hidden = true; return; }
    $("#similar").innerHTML = res.map(r => cardHTML({ taxon:r.taxon, label:`${plural(r.count, "Verwechslung", "Verwechslungen")}` })).join("");
  }catch(err){ if (!isAbort(err) && $("#simSec")) $("#simSec").hidden = true; }
}

async function loadGbif(t, signal){
  try{
    const m = await getJSON(`${API.gbif}/species/match?name=${encodeURIComponent(t.name)}&strict=true`, { signal });
    if (!m.usageKey){ $("#fGbif").textContent = "–"; return; }
    const o = await getJSON(`${API.gbif}/occurrence/search?taxonKey=${m.usageKey}&limit=0`, { signal });
    $("#fGbif").textContent = fmt(o.count);
    $("#gbifLink").href = `https://www.gbif.org/species/${m.usageKey}`;
  }catch(err){ if (!isAbort(err) && $("#fGbif")) $("#fGbif").textContent = "–"; }
}
