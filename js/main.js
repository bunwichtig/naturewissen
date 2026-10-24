// Pure Nature – Einstieg. Verbindet Karte, Panel, Entdecken, Bestimmen und Steckbrief.
import { $, $$, fmt, isMobile, mq } from "./util.js";
import { state, set, on } from "./state.js";
import { initMap, setMapPadding, setDetailOpener as mapOpener, clearPins, map } from "./karte.js";
import { initEntdecken, load as loadEntdecken, reset as resetEntdecken, setDetailOpener as exOpener } from "./entdecken.js";
import { initBestimmen, onEnter as enterBestimmen, setDetailOpener as beOpener } from "./bestimmen.js";
import { initSteckbrief, openDetail, setDetailHooks } from "./steckbrief.js";

[mapOpener, exOpener, beOpener].forEach(f => f(openDetail));

initMap();
initEntdecken();
initBestimmen();
initSteckbrief();

/* ---------- Ortsanzeige im Panel ---------- */
const readout = () => { $("#place").textContent = state.place; $("#where").textContent = `Umkreis ${fmt(state.radius)} km`; };
on("place", readout); on("radius", readout); readout();

/* ---------- Zwei Bereiche: Entdecken | Bestimmen ---------- */
$("#modes").onclick = e => { const b = e.target.closest("[data-mode]"); if (b) set({ mode:b.dataset.mode }); };
on("mode", () => {
  $$("#modes [data-mode]").forEach(b => b.setAttribute("aria-selected", b.dataset.mode === state.mode));
  $("#paneEntdecken").hidden = state.mode !== "entdecken";
  $("#paneBestimmen").hidden = state.mode !== "bestimmen";
  clearPins();
  if (state.mode === "entdecken"){ resetEntdecken(); loadEntdecken(); }
  else enterBestimmen();
});

/* ---------- Handy: Panel als ziehbares Blatt (klein / halb / voll) ---------- */
const SNAPS = { peek:0.22, mid:0.6, full:0.94 };
let snap = "mid", beforeDetail = "mid";
const vh = () => window.innerHeight;
function setSheet(name){
  snap = name;
  if (!isMobile()) return;
  document.documentElement.style.setProperty("--sheet-h", Math.round(SNAPS[name] * vh()) + "px");
  setMapPadding(Math.round(Math.min(SNAPS[name], SNAPS.mid) * vh()));
  $("#handle").setAttribute("aria-label", name === "full" ? "Panel verkleinern" : "Panel vergrößern");
}
function applyLayout(){
  if (isMobile()) setSheet(snap);
  else { document.documentElement.style.removeProperty("--sheet-h"); setMapPadding(0); }
  map?.resize();
}
mq.addEventListener("change", applyLayout);
window.addEventListener("resize", () => { if (isMobile()) document.documentElement.style.setProperty("--sheet-h", Math.round(SNAPS[snap] * vh()) + "px"); });

(function drag(){
  const panel = $("#panel");
  let startY = 0, startH = 0, moved = false, active = false, from = null;
  const down = e => {
    if (!isMobile() || e.target.closest("button:not(#handle), input, select, a, label")) return;
    active = true; moved = false; from = e.currentTarget; startY = e.clientY; startH = panel.getBoundingClientRect().height;
    panel.classList.add("dragging"); from.setPointerCapture?.(e.pointerId);
  };
  const move = e => {
    if (!active) return;
    const dy = startY - e.clientY;
    if (Math.abs(dy) > 4) moved = true;
    document.documentElement.style.setProperty("--sheet-h", Math.max(SNAPS.peek * vh() * 0.8, Math.min(SNAPS.full * vh(), startH + dy)) + "px");
  };
  const up = () => {
    if (!active) return;
    active = false; panel.classList.remove("dragging");
    if (!moved){ if (from.id === "handle") setSheet(snap === "full" ? "mid" : snap === "mid" ? "full" : "mid"); else setSheet(snap); return; }
    const h = panel.getBoundingClientRect().height / vh();
    setSheet(Object.entries(SNAPS).sort((a, b) => Math.abs(a[1] - h) - Math.abs(b[1] - h))[0][0]);
  };
  [$("#handle"), $("#panelHead")].forEach(t => {
    t.addEventListener("pointerdown", down); t.addEventListener("pointermove", move);
    t.addEventListener("pointerup", up); t.addEventListener("pointercancel", up);
  });
  // Beim Scrollen in einer Liste klappt das Blatt ganz auf
  $$(".pane-body").forEach(el => el.addEventListener("scroll", e => {
    if (isMobile() && snap !== "full" && e.currentTarget.scrollTop > 30) setSheet("full");
  }, { passive:true }));
  // Karte verschieben macht das Blatt wieder halb
  map.on("dragstart", () => { if (isMobile() && snap === "full" && $("#detail").hidden) setSheet("mid"); });
})();

// Steckbrief: am Handy bildschirmfüllend, danach zurück; am PC breiteres Panel
setDetailHooks(
  () => { if (isMobile()){ if (snap !== "full") beforeDetail = snap; setSheet("full"); } else { document.documentElement.classList.add("wide"); map.resize(); } },
  () => { if (isMobile()) setSheet(beforeDetail === "full" ? "mid" : beforeDetail); else { document.documentElement.classList.remove("wide"); map.resize(); } }
);

applyLayout();
loadEntdecken();
