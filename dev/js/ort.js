// Ort wählen: Suche (Nominatim, erst nach dem Absenden), eigener Standort, zuletzt gesuchte Orte.
import { $, esc, local } from "./util.js";
import { API, PRIO, getJSON } from "./api.js";
import { set } from "./state.js";

const RECENT = "pn-orte";
const recent = () => local.get(RECENT, []);

/** Ort übernehmen und merken */
export function choose(o){
  const list = [o, ...recent().filter(x => x.name !== o.name)].slice(0, 5);
  local.set(RECENT, list);
  set({ center:{ lat:o.lat, lng:o.lng }, place:o.name, placeSet:true, region:null });
  renderRecent();
}

export function initOrt(){
  // Suchfelder: oben in der Kopfleiste und groß auf der Startseite
  for (const form of document.querySelectorAll("form.search:not(.taxsearch)")){
    const input = form.querySelector("input"), box = form.querySelector("ul");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const q = input.value.trim();
      if (q.length < 2) return;
      box.hidden = false;
      box.innerHTML = `<li class="muted">Suche …</li>`;
      try{
        const d = await getJSON(`${API.nominatim}/search?format=jsonv2&limit=6&accept-language=de&q=${encodeURIComponent(q)}`, { prio:PRIO.high });
        box.innerHTML = d.length ? d.map((r, i) => `<li><button type="button" data-i="${i}"><b>${esc(r.name || r.display_name.split(",")[0])}</b><span>${esc(r.display_name)}</span></button></li>`).join("")
          : `<li class="muted">Nichts gefunden. Versuch es mit einem Ortsnamen.</li>`;
        box.onclick = ev => {
          const b = ev.target.closest("button[data-i]"); if (!b) return;
          const r = d[+b.dataset.i];
          box.hidden = true; input.value = ""; input.blur();
          choose({ name:r.name || r.display_name.split(",")[0], lat:+r.lat, lng:+r.lon });
        };
      }catch{
        box.innerHTML = `<li class="muted">Die Ortssuche ist gerade nicht erreichbar.</li>`;
      }
    });
    input.addEventListener("input", () => { if (!input.value.trim()) box.hidden = true; });
  }
  document.addEventListener("click", e => { if (!e.target.closest("form.search")) document.querySelectorAll("form.search ul").forEach(u => u.hidden = true); });

  document.querySelectorAll("[data-locate]").forEach(b => b.addEventListener("click", () => locate(b)));
  $("#recent").addEventListener("click", e => {
    const b = e.target.closest("[data-r]"); if (!b) return;
    choose(recent()[+b.dataset.r]);
  });
  renderRecent();
}

function renderRecent(){
  const r = recent();
  $("#recentBox").hidden = !r.length;
  $("#recent").innerHTML = r.map((o, i) => `<button class="chip" type="button" data-r="${i}">${esc(o.name)}</button>`).join("");
}

// Eigener Standort: Name der Gegend einmal bei Nominatim nachschlagen
function locate(btn){
  if (!navigator.geolocation){ btn.textContent = "Standort nicht verfügbar"; return; }
  const old = btn.textContent; btn.disabled = true; btn.textContent = "Suche Standort …";
  navigator.geolocation.getCurrentPosition(async p => {
    const lat = +p.coords.latitude.toFixed(3), lng = +p.coords.longitude.toFixed(3);
    let name = "Mein Standort";
    try{
      const d = await getJSON(`${API.nominatim}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=12&accept-language=de`, { prio:PRIO.high });
      const a = d.address || {};
      name = a.village || a.town || a.city || a.municipality || d.name || name;
    }catch{}
    btn.disabled = false; btn.textContent = old;
    choose({ name, lat, lng });
  }, () => { btn.disabled = false; btn.textContent = "Standort nicht erlaubt"; setTimeout(() => btn.textContent = old, 3000); },
  { enableHighAccuracy:false, timeout:10000, maximumAge:300000 });
}
