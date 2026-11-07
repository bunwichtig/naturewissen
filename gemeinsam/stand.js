// „Zuletzt geändert“ auf den Übersichtsseiten: Datum des letzten Commits je Ordner/Datei, live von GitHub.
// Ohne Antwort (offline, Limit von 60 Abfragen pro Stunde) bleibt das beim Hochladen eingetragene Datum stehen.
(() => {
  const REPO = "bunwichtig/naturewissen", BRANCH = "main";
  const fmt = iso => new Intl.DateTimeFormat("de-DE", { day:"numeric", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit", timeZone:"Europe/Berlin" }).format(new Date(iso)) + " Uhr";
  for (const el of document.querySelectorAll(".stamp[data-path]")){
    const path = el.dataset.path, key = "pn-stand:" + path;
    try{ const c = JSON.parse(sessionStorage.getItem(key) || "null"); if (c){ el.textContent = "Zuletzt geändert: " + fmt(c); continue; } }catch{}
    fetch(`https://api.github.com/repos/${REPO}/commits?sha=${BRANCH}&per_page=1&path=${encodeURIComponent(path)}`, { headers:{ Accept:"application/vnd.github+json" } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { const iso = d?.[0]?.commit?.committer?.date; if (!iso) return;
        el.textContent = "Zuletzt geändert: " + fmt(iso); el.title = d[0].commit.message.split("\n")[0];
        try{ sessionStorage.setItem(key, JSON.stringify(iso)); }catch{} })
      .catch(() => {});
  }
})();
