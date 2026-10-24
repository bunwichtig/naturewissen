// Alle Abfragen an freie Dienste laufen hier durch.
// Jede Quelle hat eine eigene Warteschlange, die ihre Regeln einhält:
//   iNaturalist  höchstens 1 Anfrage gleichzeitig, mindestens 0,6 s Abstand (Empfehlung: etwa 1 pro Sekunde)
//   Nominatim    höchstens 1 Anfrage pro Sekunde, Ergebnisse werden gemerkt
//   GBIF, Wikipedia  bis zu 4 gleichzeitig
// Wichtiges (die Artenliste) kommt vor Unwichtigem (Fotos auf der Karte).
// Gleiche Anfragen werden für die Sitzung gemerkt und nicht wiederholt.

export const API = {
  inat: "https://api.inaturalist.org/v1",
  gbif: "https://api.gbif.org/v1",
  gbifMap: "https://api.gbif.org/v2/map/occurrence/density",
  wikiApi: "https://de.wikipedia.org/w/api.php",
  nominatim: "https://nominatim.openstreetmap.org",
  plantnet: "https://my-api.plantnet.org/v2"
};

// Gemeinsame Zusätze für iNaturalist: deutsche Namen, bevorzugt wie in Deutschland gebräuchlich
export const INAT_DE = { locale:"de", preferred_place_id:"7207" };

export const PRIO = { high:0, normal:1, low:2 };

class Queue {
  constructor(name, { parallel = 1, gap = 0 } = {}){
    Object.assign(this, { name, parallel, gap, running:0, last:0, jobs:[] });
  }
  add(job){
    this.jobs.push(job);
    this.jobs.sort((a, b) => a.prio - b.prio || a.seq - b.seq);
    this.pump();
  }
  pump(){
    while (this.running < this.parallel && this.jobs.length){
      const wait = this.last + this.gap - Date.now();
      if (wait > 0){ clearTimeout(this.timer); this.timer = setTimeout(() => this.pump(), wait); return; }
      const job = this.jobs.shift();
      if (job.signal?.aborted){ job.reject(new DOMException("abgebrochen", "AbortError")); continue; }
      this.running++; this.last = Date.now();
      job.run().then(job.resolve, job.reject).finally(() => { this.running--; this.pump(); });
    }
  }
}

const queues = {
  "api.inaturalist.org": new Queue("iNaturalist", { parallel:1, gap:600 }),
  "nominatim.openstreetmap.org": new Queue("Nominatim", { parallel:1, gap:1100 }),
  default: new Queue("andere", { parallel:4, gap:0 })
};

const cache = new Map();
const CACHE_MAX = 400;
let seq = 0;

/** JSON von einer freien Quelle holen – über die passende Warteschlange, mit Zwischenspeicher. */
export function getJSON(url, { signal, prio = PRIO.normal, cache:useCache = true } = {}){
  if (useCache && cache.has(url)) return cache.get(url);
  const q = queues[new URL(url).host] || queues.default;
  const p = new Promise((resolve, reject) => {
    q.add({ prio, seq:seq++, signal, resolve, reject, run: async () => {
      let r;
      try{ r = await fetch(url, { signal, headers:{ Accept:"application/json" } }); }
      catch(err){ if (isAbort(err)) throw err; throw new Error(`Keine Verbindung zu ${q.name}`); }
      if (r.status === 429) throw new Error(`${q.name} bittet um eine Pause (zu viele Anfragen)`);
      if (!r.ok) throw new Error(`${q.name} antwortet mit Fehler ${r.status}`);
      return r.json();
    }});
  });
  if (useCache){
    cache.set(url, p);
    p.catch(() => cache.delete(url));
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  }
  return p;
}

export const inat = (path, params, opts) => {
  const p = new URLSearchParams(params);
  return getJSON(`${API.inat}${path}?${p}`, opts);
};

export const isAbort = err => err?.name === "AbortError";

/* ---------- Namen ↔ iNaturalist-Nummern (ändern sich nie, werden auf dem Gerät gemerkt) ---------- */
const ID_STORE = "pn-taxon-ids";
const taxonIds = new Map(Object.entries((() => { try{ return JSON.parse(localStorage.getItem(ID_STORE) || "{}"); }catch{ return {}; } })()));

export async function taxonIdOf(sci, opts = {}){
  if (taxonIds.has(sci)) return taxonIds.get(sci);
  const d = await inat("/taxa", { q:sci, is_active:"true", per_page:"10" }, opts);
  const norm = s => (s || "").toLowerCase().trim();
  const hit = (d.results || []).find(t => norm(t.name) === norm(sci));
  const id = hit?.id ?? null;
  if (id){
    taxonIds.set(sci, id);
    try{ localStorage.setItem(ID_STORE, JSON.stringify(Object.fromEntries(taxonIds))); }catch{}
  }
  return id;
}
export async function taxonIdsOf(names, opts){
  const out = [];
  for (const n of names){ try{ const id = await taxonIdOf(n, opts); if (id) out.push(id); }catch(e){ if (isAbort(e)) throw e; } }
  return out;
}

/** Art aus Pl@ntNet- oder GBIF-Namen bei iNaturalist finden (auch über Synonyme). */
export async function findInatTaxon(sci, kingdom){
  const d = await inat("/taxa", { q:sci, is_active:"true", per_page:"10", ...INAT_DE }, { prio:PRIO.high });
  const norm = s => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
  const res = d.results || [];
  const exact = res.find(t => norm(t.name) === norm(sci));
  if (exact) return exact.id;
  const sp = res.find(t => (!kingdom || t.iconic_taxon_name === kingdom) && ["species","subspecies","variety","hybrid"].includes(t.rank));
  return sp?.id || null;
}
