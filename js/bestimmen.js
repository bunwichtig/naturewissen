// Bereich „Bestimmen“: Was habe ich gesehen?
// Zwei Wege: mit Foto (Pflanzen über Pl@ntNet) oder nach Merkmalen (eigene Tabelle mit Belegen + iNaturalist).
import { $, $$, esc, fmt, plural, local } from "./util.js";
import { API, PRIO, isAbort, taxonIdsOf, findInatTaxon } from "./api.js";
import { state, on, whereParams } from "./state.js";
import { makeList } from "./liste.js";
import { MERKMALE, GRUPPEN } from "../daten/merkmale.js";
import { pick } from "./entdecken.js";

let openDetail = () => {};
export const setDetailOpener = fn => { openDetail = fn; };

const bs = { way:"foto", sel:{}, now:false, bloom:false, list:null, abort:null, lastKey:null, matches:[] };
const MONTH_DE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const NOW_M = new Date().getMonth() + 1;

export function initBestimmen(){
  $("#ways").onclick = e => { const b = e.target.closest("[data-way]"); if (b) setWay(b.dataset.way); };
  initFoto();
  initMerkmale();
  on("*", (s, changed) => {
    if (state.mode !== "bestimmen" || bs.way !== "merkmale") return;
    if (changed.some(k => ["center","radius"].includes(k))) runMerkmale();
  });
}

export function setWay(way){
  bs.way = way;
  $$("#ways [data-way]").forEach(b => b.setAttribute("aria-pressed", b.dataset.way === way));
  $("#wayFoto").hidden = way !== "foto";
  $("#wayMerkmale").hidden = way !== "merkmale";
  $("#beBody").scrollTop = 0;
  if (way === "merkmale") runMerkmale();
}
export function onEnter(){ if (bs.way === "merkmale"){ bs.lastKey = null; runMerkmale(); } }

/* =====================================================================
   Mit Foto: Pflanzen über Pl@ntNet
   Bis zu 5 Fotos (Kamera-App oder Galerie), je Foto der Pflanzenteil. Fotos bleiben im Browser,
   nur zur Bestimmung gehen sie an Pl@ntNet. Schlüssel: kostenlos auf my.plantnet.org, nur auf diesem Gerät gespeichert.
   ===================================================================== */
const KEY_STORE = "pn-plantnet-key", MAX_SHOTS = 5;
const ORGANS = [["auto","Automatisch"],["flower","Blüte"],["leaf","Blatt"],["fruit","Frucht"],["bark","Rinde"]];
const idf = { shots:[], busy:false };
let sessionKey = "";
const apiKey = () => local.get(KEY_STORE, "") || sessionKey;

function initFoto(){
  if (!apiKey()) showKeyForm();
  $("#fotoKind").onclick = e => {
    const b = e.target.closest("[data-kind]"); if (!b) return;
    $$("#fotoKind [data-kind]").forEach(x => x.setAttribute("aria-pressed", x === b));
    const plant = b.dataset.kind === "pflanze";
    $("#fotoPlant").hidden = !plant;
    $("#fotoOther").hidden = plant;
    if (plant && !apiKey()) showKeyForm();
  };
  $("#fileCam").onchange = e => { addFiles(e.target.files); e.target.value = ""; };
  $("#fileGallery").onchange = e => { addFiles(e.target.files); e.target.value = ""; };
  $("#fileOther").onchange = e => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setCompare(URL.createObjectURL(f));
    setWay("merkmale");
  };
  $("#toMerkmale").onclick = () => setWay("merkmale");
  $("#shots").onchange = e => { const s = e.target.closest("select"); if (s) idf.shots[+s.dataset.i].organ = s.value; };
  $("#shots").onclick = e => {
    const b = e.target.closest("[data-del]"); if (!b) return;
    const [s] = idf.shots.splice(+b.dataset.del, 1); URL.revokeObjectURL(s.url);
    renderShots();
  };
  $("#idfGo").onclick = identify;
  $("#keyEdit").onclick = showKeyForm;
  $("#keySave").onclick = saveKeyForm;
  $("#idfResult").addEventListener("click", async e => {
    const b = e.target.closest("button[data-sci]"); if (!b) return;
    const label = b.textContent; b.disabled = true; b.textContent = "Suche …";
    try{
      const id = await findInatTaxon(b.dataset.sci, "Plantae");
      if (id) openDetail(id); else b.textContent = "Nicht bei iNaturalist";
    }catch{ b.textContent = "Fehler – erneut versuchen"; }
    b.disabled = false; if (b.textContent === "Suche …") b.textContent = label;
  });
  $("#cmpClose").onclick = () => setCompare(null);
  $("#cmpImg").onclick = e => e.currentTarget.classList.toggle("big");
  renderShots();
}

let cmpUrl = null;
function setCompare(url){
  if (cmpUrl) URL.revokeObjectURL(cmpUrl);
  cmpUrl = url;
  $("#cmp").hidden = !url;
  if (url) $("#cmpImg").src = url;
}

function showKeyForm(){
  $("#keyBox").hidden = false;
  $("#keyInput").value = local.get(KEY_STORE, "") || sessionKey;
  $("#keyMsg").innerHTML = "";
}
async function saveKeyForm(){
  const k = $("#keyInput").value.trim(), btn = $("#keySave");
  if (!k){ $("#keyMsg").innerHTML = `<div class="alert">Bitte einen Schlüssel eintragen.</div>`; return; }
  btn.disabled = true; btn.textContent = "Prüfe …";
  try{
    const r = await fetch(`${API.plantnet}/quota/daily?api-key=${encodeURIComponent(k)}`);
    if (r.status === 401 || r.status === 403){ $("#keyMsg").innerHTML = `<div class="alert"><b>Pl@ntNet lehnt den Schlüssel ab.</b> Prüfe, ob er vollständig kopiert ist.</div>`; return; }
    if (!local.set(KEY_STORE, k)) sessionKey = k;
    $("#keyBox").hidden = true;
  }catch{
    if (!local.set(KEY_STORE, k)) sessionKey = k;
    $("#keyMsg").innerHTML = corsHelp("Der Schlüssel ist gespeichert, aber Pl@ntNet hat die Anfrage blockiert.");
  }finally{ btn.disabled = false; btn.textContent = "Prüfen & speichern"; }
}
function corsHelp(title){
  return `<div class="alert"><b>${esc(title)}</b> Auf <a href="https://my.plantnet.org/" target="_blank" rel="noopener">my.plantnet.org</a> unter <i>Settings</i>:
    <ol><li>„expose my API key“ ankreuzen.</li><li>Bei „Authorized domains“ <code>${esc(location.host || "deine Domain")}</code> eintragen.</li><li>Speichern, kurz warten, neu versuchen.</li></ol></div>`;
}

async function addFiles(files){
  for (const f of [...files]){
    if (idf.shots.length >= MAX_SHOTS) break;
    const url = URL.createObjectURL(f);
    try{
      const img = new Image(); img.src = url; await img.decode();
      const blob = await toJpeg(img, img.naturalWidth, img.naturalHeight);
      idf.shots.push({ blob, url:URL.createObjectURL(blob), organ:"auto" });
    }catch{
      $("#idfMsg").innerHTML = `<div class="alert"><b>${esc(f.name)} konnte nicht gelesen werden.</b> Bitte ein JPG- oder PNG-Foto wählen.</div>`;
    }finally{ URL.revokeObjectURL(url); }
  }
  renderShots();
}
// Kurze Seite auf höchstens 1280 px: so rechnet Pl@ntNet, und der Upload geht schneller
function toJpeg(src, w, h){
  const s = Math.min(1, 1280 / Math.min(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * s); c.height = Math.round(h * s);
  c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error("Foto konnte nicht umgewandelt werden")), "image/jpeg", 0.9));
}
function renderShots(){
  $("#shots").innerHTML = idf.shots.map((s, i) => `<li>
      <img src="${s.url}" alt="Foto ${i + 1}">
      <select data-i="${i}" aria-label="Was zeigt Foto ${i + 1}?">${ORGANS.map(([v, l]) => `<option value="${v}"${v === s.organ ? " selected" : ""}>${l}</option>`).join("")}</select>
      <button class="x" data-del="${i}" aria-label="Foto ${i + 1} entfernen">✕</button></li>`).join("");
  const full = idf.shots.length >= MAX_SHOTS;
  $("#fileCam").disabled = $("#fileGallery").disabled = full;
  $("#idfGo").disabled = !idf.shots.length || idf.busy;
  $("#idfGo").textContent = idf.busy ? "Bestimme …" : idf.shots.length ? `Pflanze bestimmen · ${plural(idf.shots.length, "Foto", "Fotos")}` : "Pflanze bestimmen";
}

async function identify(){
  if (!idf.shots.length || idf.busy) return;
  if (!apiKey()){ showKeyForm(); return; }
  idf.busy = true; renderShots(); $("#idfMsg").innerHTML = "";
  const fd = new FormData();
  idf.shots.forEach((s, i) => { fd.append("images", s.blob, `foto-${i + 1}.jpg`); fd.append("organs", s.organ); });
  const q = new URLSearchParams({ "api-key":apiKey(), lang:"de", "nb-results":"5", "include-related-images":"true" });
  let r, d;
  try{
    r = await fetch(`${API.plantnet}/identify/all?${q}`, { method:"POST", body:fd });
    d = await r.json().catch(() => null);
  }catch{
    idf.busy = false; renderShots();
    $("#idfMsg").innerHTML = corsHelp("Pl@ntNet ist nicht erreichbar.");
    return;
  }
  idf.busy = false; renderShots();
  const left = d?.remainingIdentificationRequests;
  $("#quota").textContent = left == null ? "" : `noch ${fmt(left)} Bestimmungen heute`;
  if (r.status === 404) return showResult([], "Auf den Fotos wurde keine Pflanze sicher erkannt. Versuche ein schärferes Foto, näher dran, am besten Blüte oder Blatt einzeln.");
  if (r.status === 401 || r.status === 403){ showKeyForm(); $("#keyMsg").innerHTML = `<div class="alert"><b>Pl@ntNet lehnt den Schlüssel ab.</b> Prüfe den Schlüssel und die Domain-Freigabe.</div>`; return; }
  if (r.status === 429){ $("#idfMsg").innerHTML = `<div class="alert"><b>Tageslimit erreicht.</b> Die 500 kostenlosen Bestimmungen für heute sind verbraucht.</div>`; return; }
  if (!r.ok || !d?.results){ $("#idfMsg").innerHTML = `<div class="alert"><b>Die Bestimmung hat nicht geklappt (${r.status}).</b> ${esc(d?.message || "")}</div>`; return; }
  showResult(d.results);
}

function showResult(results, emptyMsg){
  const top = results[0]?.score ?? 0;
  $("#idfResult").innerHTML = !results.length ? `<div class="alert"><b>Keine Art erkannt.</b> ${esc(emptyMsg || "")}</div>` : `
    ${top < 0.3 ? `<div class="alert"><b>Die Bestimmung ist unsicher.</b> Vergleiche die Bilder genau oder ergänze Fotos von anderen Pflanzenteilen.</div>` : ""}
    <h3 class="h">Wahrscheinlichste Arten</h3>
    <div class="hits">${results.map(hitHTML).join("")}</div>
    <p class="note">Automatische Bestimmungen können falsch sein. Iss oder berühre nie eine Pflanze nur aufgrund dieses Ergebnisses.</p>`;
}
function hitHTML(r, i){
  const sp = r.species || {};
  const sci = sp.scientificNameWithoutAuthor || sp.scientificName || "";
  const common = (sp.commonNames || [])[0];
  const fam = sp.family?.scientificNameWithoutAuthor || "";
  const im = (r.images || [])[0];
  const credit = im ? [im.author ? `© ${im.author}` : "", im.license].filter(Boolean).join(" · ") : "";
  const pct = Math.round((r.score || 0) * 100);
  return `<div class="hit">
    ${im?.url?.s ? `<img src="${esc(im.url.s)}" alt="" loading="lazy">` : `<span class="noimg"></span>`}
    <div>
      <div class="cn">${esc(common || sci)}</div>
      ${common ? `<div class="sn">${esc(sci)}</div>` : ""}
      ${fam ? `<div class="fam">Familie ${esc(fam)}</div>` : ""}
      <div class="score"><span class="bar"><i style="width:${Math.max(2, pct)}%"></i></span>${pct < 1 ? "< 1" : pct} %</div>
      <button class="btn${i === 0 ? " primary" : ""}" data-sci="${esc(sci)}">Steckbrief</button>
      ${credit ? `<div class="cr">Vergleichsfoto: ${esc(credit)} (Pl@ntNet)</div>` : ""}
    </div></div>`;
}

/* =====================================================================
   Nach Merkmalen: was man draußen sieht → passende Gruppen aus der Merkmalstabelle
   → die häufigsten Arten dieser Gruppen im Umkreis (iNaturalist)
   ===================================================================== */
const SEC_OF_SURFACE = { blatt:"pflanze", pilz:"pilz" };    // alle anderen Oberflächen → Tier
const SECS = [["all","Erster Eindruck"],["tier","Bei Tieren"],["pflanze","Bei Pflanzen"],["pilz","Bei Pilzen"],["ort","Ort & Zeit"]];
const DIRECT = 25;   // bis zu so vielen Gruppen einzeln abfragen, darüber grob nach Klasse/Reich

const activeSec = () => bs.sel.s ? (SEC_OF_SURFACE[bs.sel.s] || "tier") : null;
const matches = sel => GRUPPEN.filter(e => Object.entries(sel).every(([k, v]) => e.a[k]?.has(v)));

function initMerkmale(){
  bs.list = makeList($("#mkList"), {
    emptyHTML:`<div class="state">Im Umkreis wurde dazu nichts gemeldet. Lass ein Merkmal weg oder zoom heraus.</div>`,
    onTotal:n => $("#mkTotal").textContent = n == null ? "" : plural(n, "Art", "Arten"),
    onPick:pick
  });
  $("#mkForm").onclick = e => {
    const b = e.target.closest(".chip"); if (!b || b.disabled) return;
    if (b.dataset.flag){ bs[b.dataset.flag] = !bs[b.dataset.flag]; }
    else {
      const q = b.dataset.q, v = b.dataset.v;
      if (bs.sel[q] === v) delete bs.sel[q]; else bs.sel[q] = v;
      if (q === "s"){   // andere Oberfläche → Merkmale der ausgeblendeten Bereiche entfernen
        const act = activeSec();
        MERKMALE.forEach(x => { if (act && ["tier","pflanze","pilz"].includes(x.sec) && x.sec !== act) delete bs.sel[x.id]; });
        if (act !== "pflanze") bs.bloom = false;
      }
    }
    const y = $("#beBody").scrollTop; renderMerkmale(); $("#beBody").scrollTop = y;
    runMerkmale();
  };
  $("#mkReset").onclick = () => { bs.sel = {}; bs.now = false; bs.bloom = false; renderMerkmale(); runMerkmale(); };
  renderMerkmale();
}

function renderMerkmale(){
  const act = activeSec();
  $("#mkForm").innerHTML = SECS.map(([sec, title]) => {
    if (act && ["tier","pflanze","pilz"].includes(sec) && sec !== act) return "";
    if (!act && ["tier","pflanze","pilz"].includes(sec)) return "";
    const qs = MERKMALE.filter(q => q.sec === sec);
    let html = qs.map(q => {
      const cur = bs.sel[q.id];
      const chips = q.opts.map(([v, l]) => {
        const on = cur === v;
        const n = on || q.id === "s" ? 1 : matches({ ...bs.sel, [q.id]:v }).length;
        return `<button class="chip" data-q="${q.id}" data-v="${v}" aria-pressed="${on}"${n ? "" : ` disabled title="Passt nicht zur bisherigen Auswahl"`}>${esc(l)}</button>`;
      }).join("");
      return `<div class="mk-q"><span class="mk-label">${esc(q.label)}</span><div class="chips">${chips}</div></div>`;
    }).join("");
    if (sec === "pflanze") html += `<div class="mk-q"><span class="mk-label">Blüte</span><div class="chips"><button class="chip" data-flag="bloom" aria-pressed="${bs.bloom}">blüht gerade</button></div></div>`;
    if (sec === "ort") html += `<div class="mk-q"><span class="mk-label">Wann?</span><div class="chips"><button class="chip" data-flag="now" aria-pressed="${bs.now}">gerade eben (${MONTH_DE[NOW_M - 1]})</button></div></div>`;
    return `<section class="mk-sec"><h4>${title}</h4>${html}</section>`;
  }).join("");
}

let mkTimer;
function runMerkmale(){ clearTimeout(mkTimer); mkTimer = setTimeout(doRun, 350); }
async function doRun(){
  if (state.mode !== "bestimmen" || bs.way !== "merkmale") return;
  const any = Object.keys(bs.sel).length > 0;
  const key = JSON.stringify([bs.sel, bs.now, bs.bloom, whereParams()]);
  if (key === bs.lastKey) return;
  bs.lastKey = key;
  bs.abort?.abort();
  if (!any){
    bs.params = null;
    bs.list.clear();
    $("#mkSummary").innerHTML = `<p class="note">Tippe an, was dir aufgefallen ist. Schon ein Merkmal reicht; jedes weitere grenzt ein. Gesucht wird im Umkreis auf der Karte.</p>`;
    return;
  }
  bs.abort = new AbortController();
  const signal = bs.abort.signal, m = bs.matches = matches(bs.sel);
  const names = m.slice(0, 12).map(e => `<span>${esc(e.label)}</span>`).join("") + (m.length > 12 ? `<span>+ ${m.length - 12} weitere</span>` : "");
  $("#mkSummary").innerHTML = m.length
    ? `<p class="note">Passt zu ${plural(m.length, "Gruppe", "Gruppen")}:</p><div class="matchlist">${names}</div>` +
      `<p class="note">${m.length > DIRECT ? "Noch sehr allgemein – ein, zwei weitere Merkmale machen das Ergebnis genauer." : "Oben stehen die Arten, die hier am häufigsten gemeldet werden, also am wahrscheinlichsten sind."} <a href="quellen.html#merkmale" target="_blank" rel="noopener">Woher die Merkmale kommen</a></p>`
    : `<p class="note">Keine Gruppe hat diese Merkmale zusammen. Nimm ein Merkmal zurück.</p>`;
  if (!m.length){ bs.list.clear(); return; }
  bs.list.clear(`<section class="tier"><div class="grid"></div></section>`);
  try{
    const p = new URLSearchParams({ ...whereParams(), quality_grade:"research" });
    if (m.length <= DIRECT){
      const ids = await taxonIdsOf(m.map(e => e.sci), { signal, prio:PRIO.high });
      if (signal.aborted) return;
      if (!ids.length){ bs.list.clear(`<div class="state">Die passenden Gruppen sind bei iNaturalist gerade nicht erreichbar.</div>`); bs.lastKey = null; return; }
      p.set("taxon_id", ids.join(","));
    } else p.set("iconic_taxa", [...new Set(m.map(e => e.icon))].join(","));
    if (bs.now) p.set("month", NOW_M);
    if (bs.bloom){ p.set("term_id", 12); p.set("term_value_id", 13); }
    bs.params = p;
    await bs.list.load(p, signal);
  }catch(err){ if (!isAbort(err)) bs.lastKey = null; }
}
