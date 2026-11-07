// Kleine Helfer, die überall gebraucht werden.

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

export const esc = s => String(s ?? "").replace(/[&<>"']/g, m =>
  ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m]));

export const fmt = n => new Intl.NumberFormat("de-DE").format(n ?? 0);

export const plural = (n, one, many) => `${fmt(n)} ${n === 1 ? one : many}`;

// iNaturalist liefert Fotos in mehreren Größen; die Größe steckt im Dateinamen.
export const photoSize = (url, size) => url ? url.replace(/\/(square|small|medium|large|original)\./, `/${size}.`) : null;

// Nur Fotos mit freier Lizenz (Creative Commons oder CC0). Ohne license_code = alle Rechte vorbehalten.
export const isFree = p => !!p?.license_code;

const LIC = { "cc0":"CC0", "cc-by":"CC BY", "cc-by-sa":"CC BY-SA", "cc-by-nd":"CC BY-ND", "cc-by-nc":"CC BY-NC",
  "cc-by-nc-sa":"CC BY-NC-SA", "cc-by-nc-nd":"CC BY-NC-ND" };
export const licName = code => LIC[code] || (code || "").toUpperCase();

// Freies Foto einer Art oder null
export const freePhoto = t => isFree(t?.default_photo) ? t.default_photo : null;

// Farbe nach Reich: Pflanzen grün, Pilze violett, alles andere (Tiere) orange
export const KINGDOM_COLOR = { Plantae:"var(--plantae)", Fungi:"var(--fungi)", Protozoa:"var(--fungi)" };
export const groupColor = t => KINGDOM_COLOR[t?.iconic_taxon_name] || "var(--animalia)";

export const commonName = t => t?.preferred_common_name || t?.name || "";

export const mq = window.matchMedia("(max-width:820px)");
export const isMobile = () => mq.matches;

export const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// Kleiner Speicher auf dem Gerät – darf fehlen (privater Modus)
export const local = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }catch{ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch{ return false; } }
};

// Kreis als GeoJSON (für den Umkreis auf der Karte)
export function circle(lng, lat, km, steps = 72){
  const coords = [], R = 6371, d = km / R, la = lat * Math.PI / 180, lo = lng * Math.PI / 180;
  for (let i = 0; i <= steps; i++){
    const b = 2 * Math.PI * i / steps;
    const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
    const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
    coords.push([((lo2 * 180 / Math.PI + 540) % 360) - 180, la2 * 180 / Math.PI]);
  }
  return { type:"Feature", geometry:{ type:"Polygon", coordinates:[coords] } };
}
