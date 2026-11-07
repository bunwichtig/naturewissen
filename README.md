# Pure Nature

Zeigt auf einem Globus, welche Tiere, Pflanzen und Pilze an einem Ort leben, und hilft beim Bestimmen. Die Seite speichert selbst **keine Funddaten**: Alles kommt live aus freien, legalen Quellen.

**Seite:** <https://bunwichtig.github.io/naturewissen/> – die Startseite trennt **Aktiv** und **Archiv**.

### Aktiv

- **Dev** (`dev/`): die Seite in Arbeit. Alle Änderungen kommen nur hier hinein.
- **Datenbasis** (`datenbasis/`): die aktuelle Datenbasis 2 (`datenbasis/2.html`) mit allen freien Quellen, Lizenz, Nachweis, Abfragen, Abdeckung nach Gruppen und dem Bauplan zum Neuaufbau mit Claude (`datenbasis/bauplan-2.md`). Erzeugt mit `python3 werkzeuge/datenbasis.py`; die Übersicht `datenbasis/index.html` wird von Hand gepflegt.
- **Gemeinsam** (`gemeinsam/`): Schriften (`fonts/`), MapLibre (`vendor/`) und `stand.js` („Zuletzt geändert“ live aus GitHub) für Startseite, Dev, Datenbasis und Archivübersicht – jede Datei nur einmal im Repo.
- **Quellen & Lizenzen:** [dev/quellen.html](https://bunwichtig.github.io/naturewissen/dev/quellen.html)

### Archiv

`archiv/` enthält abgeschlossene Stände. Jeder Ordner heißt `JJJJ-MM-TT-inhalt`, ist in sich vollständig und wird nicht mehr verändert. Die Übersicht ist `archiv/index.html`, der neueste Stand steht oben.

| Ordner | Inhalt |
|---|---|
| `archiv/2026-10-25-datenbank-entwurf/` | Recherche-Datenbank zur Datenherkunft (archiviert am 30. Oktober 2026) |
| `archiv/2026-10-25-v1/` | V1, die erste fertige Version, mit eigenen Schriften und MapLibre |
| `archiv/2026-10-25-datenbasis-1/` | Datenbasis 1 mit `bauplan-1.md` (nutzt die Schriften aus V1) |
| `archiv/2026-10-24-ursprung/` | die allererste Fassung in einer einzigen Datei |

Neuen Stand archivieren: Ordner nach `archiv/JJJJ-MM-TT-name/` kopieren, alle Pfade darin auf Dateien im Archiv umstellen (nicht auf `gemeinsam/`), Karte oben in `archiv/index.html` eintragen.

### Alte Adressen

`404.html` leitet die Adressen von vor dem Aufräumen (7. November 2026) weiter, z. B. `v1/` → `archiv/2026-10-25-v1/`, `alt/` → `archiv/2026-10-24-ursprung/`, `quellen.html` → `dev/quellen.html`, `datenbasis.html` → `datenbasis/`. Die Liste steht oben in `404.html`.

## Aufbau

1. **Ort suchen** (oder eigenen Standort verwenden), Umkreis wählen: 5 bis 250 km.
   Oder direkt ein **Lebewesen suchen**: Vorschläge erscheinen schon beim Tippen (iNaturalist), ein Tipp öffnet den Steckbrief.
2. **Entdecken – Was lebt hier?** Arten im Umkreis nach Häufigkeit (iNaturalist), filterbar nach Gruppe; unter Pflanzen nach **Wuchsform** (Bäume, Sträucher, Kräuter, Gräser, Kletter-, Wasserpflanzen, Zwiebel & Knolle, Farne, Moose) (Wuchsform aus der World Checklist of Vascular Plants, Kew; Arten aus iNaturalist und GBIF). Wer im Lebewesen-Suchfeld „Baum“ oder „Strauch“ tippt, bekommt das als ersten Vorschlag. „Genauer rechnen“ nimmt die Fundmeldungen von GBIF dazu; kennt GBIF deutlich mehr Arten (z. B. bei Fischen), bietet die Seite das von selbst an.
3. **Liste** (nur Dev): alle Arten am Ort als aufklappbarer Baum – Gruppe › Ordnung › Familie › Gattung › Art, mit Suche links, Vorfilter und Mini-Bildern.
4. **Bestimmen – Was habe ich gesehen?** Mit Foto (Pflanzen über Pl@ntNet) oder nach Merkmalen (Merkmalstabelle mit Belegen und Messdaten, siehe Quellen-Seite).
5. **Steckbrief** als Seitenleiste: Fotos mit Urheber und Lizenz, Gefährdung, Zahlen, Jahreszeit, Beschreibung aus Wikipedia, Verwechslungsarten, Systematik. Auf Knopfdruck die **Verbreitungskarte** (Fundorte bei iNaturalist auf einem Globus, der gesuchte Ort markiert).

Eine Karte erscheint nur im Steckbrief. Die zuletzt gesuchten Orte merkt sich die Seite auf dem Gerät.

## Regeln, die die Seite einhält

- Nur **frei lizenzierte Fotos** (Creative Commons oder CC0) werden gezeigt, jeweils mit Urheber und Lizenz.
- **iNaturalist:** eine Anfrage nach der anderen mit Abstand; die Artenliste kommt vor den Fotos. Gleiche Anfragen werden nicht wiederholt.
- **Nominatim:** höchstens eine Anfrage pro Sekunde, Suche erst nach dem Absenden (keine Suche beim Tippen).
- **Schriften und MapLibre** liegen im Repo; beim Öffnen wird nichts von Google oder einem CDN geladen.
- Einige Inhalte sind nur **nicht-kommerziell** frei (Satellitenbild, viele Naturfotos). Pure Nature ist ein privates, nicht-kommerzielles Projekt.

## Dateien

Die Dateien unten liegen in `dev/` (und gleich aufgebaut im Archiv unter `archiv/2026-10-25-v1/`). Im Hauptordner liegen nur Startseite (`index.html`), `404.html` und README.

| Datei | Inhalt |
|---|---|
| `index.html` | Gerüst der Seite |
| `quellen.html` | Quellen, Lizenzen, Merkmalstabelle mit Belegen |
| `css/app.css`, `css/fonts.css` | Gestaltung, Schriften |
| `js/main.js` | Einstieg, Startseite, Umkreis, Bereiche, Seitenleiste |
| `js/state.js` | gemeinsamer Zustand (Ort, Umkreis, Gruppe …) |
| `js/api.js` | alle Abfragen mit Warteschlangen und Zwischenspeicher |
| `js/ort.js` | Ortssuche, Standort, zuletzt gesuchte Orte |
| `js/artsuche.js` | Lebewesen suchen mit Vorschlagsliste |
| `js/karte.js` | Verbreitungskarte im Steckbrief |
| `js/liste.js` | Artenliste in Häufigkeitsstufen |
| `js/liste-baum.js` | Bereich Liste: alle Arten als Baum (nur Dev) |
| `js/entdecken.js` | Bereich Entdecken inkl. „genauer rechnen“ |
| `js/bestimmen.js` | Bereich Bestimmen: Foto und Merkmale |
| `js/steckbrief.js` | Steckbrief einer Art |
| `daten/merkmale.js` | Merkmalstabelle mit Belegen |
| `daten/wuchsform.js` | Baum- und Straucharten Europas (WCVP, CC BY 4.0) |
| `../gemeinsam/vendor/`, `../gemeinsam/fonts/` | MapLibre GL 5.6.0 und Schriften mit Lizenztexten |

Es gibt keinen Build-Schritt. Die Seite braucht eine `https://`-Adresse (GitHub Pages); als lokal geöffnete Datei laden die Module nicht.

## Pflanzen per Foto bestimmen: Pl@ntNet-Schlüssel

Die Bestimmung nutzt die kostenlose [Pl@ntNet-API](https://my.plantnet.org/) (500 Bestimmungen pro Tag).

1. Auf <https://my.plantnet.org/> ein Konto anlegen und die E-Mail bestätigen.
2. Unter **Settings** den privaten API-Schlüssel erzeugen.
3. Auf derselben Seite den Haken bei **„expose my API key“** setzen und bei **„Authorized domains“** `bunwichtig.github.io` eintragen. Speichern.
4. Auf der Seite **Bestimmen → Mit Foto** den Schlüssel einfügen und **Prüfen & speichern** tippen. Er wird nur auf diesem Gerät gespeichert.

| Meldung | Ursache | Lösung |
|---|---|---|
| „Pl@ntNet ist nicht erreichbar“ / „hat die Anfrage blockiert“ | Haken *expose my API key* fehlt oder Domain nicht freigegeben | Schritt 3 prüfen, ein paar Minuten warten |
| „Pl@ntNet lehnt den Schlüssel ab“ | Schlüssel unvollständig kopiert | neu kopieren, über „Schlüssel ändern“ eintragen |
| „Tageslimit erreicht“ | 500 Bestimmungen verbraucht | um Mitternacht UTC geht es wieder |

**Datenschutz:** Fotos gehen nur zur Bestimmung an Pl@ntNet. Für Tiere und Pilze verlässt das Vergleichsfoto das Gerät nicht. Auf dem Gerät gemerkt werden nur der Schlüssel und schon nachgeschlagene Artnummern.
