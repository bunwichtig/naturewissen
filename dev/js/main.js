// Pure Nature – Einstieg.
// Ablauf: Ort suchen → Lebewesen im Umkreis (Entdecken) oder Bestimmen → Steckbrief mit Verbreitungskarte auf Wunsch.
import { $, $$, fmt, esc } from "./util.js";
import { state, set, on, RADII } from "./state.js";
import { initOrt } from "./ort.js";
import { initArtsuche } from "./artsuche.js";
import { initEntdecken, load as loadEntdecken, setDetailOpener as exOpener } from "./entdecken.js";
import { initBestimmen, onEnter as enterBestimmen, setDetailOpener as beOpener } from "./bestimmen.js";
import { initSteckbrief, openDetail, closeDetail, setDetailHooks } from "./steckbrief.js";

[exOpener, beOpener].forEach(f => f(openDetail));

initOrt();
initEntdecken();
initBestimmen();
initSteckbrief();
initArtsuche(openDetail);

/* ---------- Startseite oder Ergebnis ---------- */
function showApp(){
  $("#start").hidden = state.placeSet;
  $("#app").hidden = !state.placeSet;
  document.body.classList.toggle("has-place", state.placeSet);
}
$("#home").addEventListener("click", e => { e.preventDefault(); closeDetail(); set({ placeSet:false }); showApp(); $("#startInput").focus(); });

/* ---------- Ort und Umkreis ---------- */
$("#radius").innerHTML = RADII.map(r => `<button class="chip" type="button" data-r="${r}">${r} km</button>`).join("");
$("#radius").onclick = e => { const b = e.target.closest("[data-r]"); if (b) set({ radius:+b.dataset.r }); };
function readout(){
  $("#place").textContent = state.place;
  $$("#radius [data-r]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.r === state.radius));
  document.title = state.placeSet ? `${state.place} – Pure Nature` : "Pure Nature – Was lebt hier?";
}

/* ---------- Zwei Bereiche: Entdecken | Bestimmen ---------- */
$("#modes").onclick = e => { const b = e.target.closest("[data-mode]"); if (b) set({ mode:b.dataset.mode }); };
function showMode(){
  $$("#modes [data-mode]").forEach(b => b.setAttribute("aria-selected", b.dataset.mode === state.mode));
  $("#paneEntdecken").hidden = state.mode !== "entdecken";
  $("#paneBestimmen").hidden = state.mode !== "bestimmen";
}

on("*", (s, changed) => {
  readout();
  if (changed.includes("placeSet") || changed.includes("place")) showApp();
  if (changed.includes("mode")) showMode();
  if (!state.placeSet) return;
  if (changed.includes("mode") || changed.includes("placeSet") || changed.includes("place")){
    if (state.mode === "entdecken") loadEntdecken(); else enterBestimmen();
  }
});

/* ---------- Steckbrief als Seitenleiste (Handy: ganze Fläche) ---------- */
setDetailHooks(
  () => { document.body.classList.add("detail-open"); },
  () => { document.body.classList.remove("detail-open"); }
);
$("#backdrop").addEventListener("click", closeDetail);

readout(); showMode(); showApp();
