// Verbreitungskarte im Steckbrief: erst auf Wunsch geladen.
// Globus mit Kartenbild (OpenFreeMap), darüber die Fundorte der Art bei iNaturalist als Raster, dazu der gesuchte Ort.
import { API } from "./api.js";
import { state } from "./state.js";

const ATTR_INAT = '<a href="https://www.inaturalist.org" target="_blank" rel="noopener">iNaturalist</a>';
let map = null;

export function closeRangeMap(){ map?.remove(); map = null; }

/** Karte in einen Kasten zeichnen. taxonId: iNaturalist-Nummer der Art. */
export function showRangeMap(box, taxonId){
  closeRangeMap();
  const c = state.center;
  map = new maplibregl.Map({
    container:box,
    style:"https://tiles.openfreemap.org/styles/liberty",
    center:[c.lng, c.lat],
    zoom:3.2,
    attributionControl:{ compact:true },
    cooperativeGestures:true,         // am Handy scrollt die Seite weiter; Karte mit zwei Fingern bewegen
    locale:{
      "CooperativeGesturesHandler.WindowsHelpText":"Strg + Mausrad zum Zoomen",
      "CooperativeGesturesHandler.MacHelpText":"⌘ + Mausrad zum Zoomen",
      "CooperativeGesturesHandler.MobileHelpText":"Mit zwei Fingern bewegen",
      "NavigationControl.ZoomIn":"Vergrößern", "NavigationControl.ZoomOut":"Verkleinern",
      "FullscreenControl.Enter":"Vollbild", "FullscreenControl.Exit":"Vollbild beenden"
    }
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass:false }), "top-right");
  map.addControl(new maplibregl.FullscreenControl(), "top-right");
  map.on("style.load", () => {
    map.setProjection({ type:"globe" });
    const q = new URLSearchParams({ taxon_id:taxonId, color:"#d9622b" });
    if (state.research) q.set("quality_grade", "research");
    map.addSource("range", { type:"raster", tileSize:256, tiles:[`${API.inat}/grid/{z}/{x}/{y}.png?${q}`], attribution:ATTR_INAT });
    map.addLayer({ id:"range", type:"raster", source:"range", paint:{ "raster-opacity":0.9 } });
  });
  const el = document.createElement("div"); el.className = "here-mark"; el.title = state.place;
  new maplibregl.Marker({ element:el }).setLngLat([c.lng, c.lat]).addTo(map);
}
