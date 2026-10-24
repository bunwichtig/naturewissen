# Pure Nature

Zeigt auf einem Globus, welche Tiere, Pflanzen und Pilze an einem Ort leben, und hilft beim Bestimmen. Die Seite speichert selbst **keine Funddaten**: Alles kommt live aus freien, legalen Quellen.

**Seite:** <https://bunwichtig.github.io/naturewissen/> – eine Startseite zur Wahl der Version:

- **Dev** (`dev/`): die Entwicklungsfassung. Alle Änderungen kommen nur hier hinein.
- **V1** (`v1/`): **Archiv** – die erste fertige Version vom 25. Oktober 2026. Wird nicht mehr verändert.
- **V2** (`v2/`): in Vorbereitung – zeigt vorerst nur eine „Work in progress“-Seite.

**Datenbasis:** [datenbasis.html](https://bunwichtig.github.io/naturewissen/datenbasis.html) – alle freien Quellen mit Lizenz, Nachweis und Abfragen, dazu [bauplan.md](bauplan.md) zum Neuaufbau mit Claude (erzeugt mit `python3 werkzeuge/datenbasis.py`).

**Quellen & Lizenzen:** [dev/quellen.html](https://bunwichtig.github.io/naturewissen/dev/quellen.html) · Alte Version (bis Oktober 2026): [alt/](https://bunwichtig.github.io/naturewissen/alt/)

## Aufbau

1. **Ort suchen** (oder eigenen Standort verwenden), Umkreis wählen: 5 bis 250 km.
   Oder direkt ein **Lebewesen suchen**: Vorschläge erscheinen schon beim Tippen (iNaturalist), ein Tipp öffnet den Steckbrief.
2. **Entdecken – Was lebt hier?** Arten im Umkreis nach Häufigkeit (iNaturalist), filterbar nach Gruppe, auch **Bäume** und **Sträucher** (Wuchsform aus der World Checklist of Vascular Plants, Kew; Arten aus iNaturalist und GBIF). Wer im Lebewesen-Suchfeld „Baum“ oder „Strauch“ tippt, bekommt das als ersten Vorschlag. „Genauer rechnen“ nimmt die Fundmeldungen von GBIF dazu; kennt GBIF deutlich mehr Arten (z. B. bei Fischen), bietet die Seite das von selbst an.
3. **Bestimmen – Was habe ich gesehen?** Mit Foto (Pflanzen über Pl@ntNet) oder nach Merkmalen (Merkmalstabelle mit Belegen und Messdaten, siehe Quellen-Seite).
4. **Steckbrief** als Seitenleiste: Fotos mit Urheber und Lizenz, Gefährdung, Zahlen, Jahreszeit, Beschreibung aus Wikipedia, Verwechslungsarten, Systematik. Auf Knopfdruck die **Verbreitungskarte** (Fundorte bei iNaturalist auf einem Globus, der gesuchte Ort markiert).

Eine Karte erscheint nur im Steckbrief. Die zuletzt gesuchten Orte merkt sich die Seite auf dem Gerät.

## Regeln, die die Seite einhält

- Nur **frei lizenzierte Fotos** (Creative Commons oder CC0) werden gezeigt, jeweils mit Urheber und Lizenz.
- **iNaturalist:** eine Anfrage nach der anderen mit Abstand; die Artenliste kommt vor den Fotos. Gleiche Anfragen werden nicht wiederholt.
- **Nominatim:** höchstens eine Anfrage pro Sekunde, Suche erst nach dem Absenden (keine Suche beim Tippen).
- **Schriften und MapLibre** liegen im Repo; beim Öffnen wird nichts von Google oder einem CDN geladen.
- Einige Inhalte sind nur **nicht-kommerziell** frei (Satellitenbild, viele Naturfotos). Pure Nature ist ein privates, nicht-kommerzielles Projekt.

## Dateien

Die Dateien unten liegen je Fassung in `dev/` und `v1/`. Im Hauptordner liegen nur die Startseite (`index.html`), die Schriften für die Startseite und `alt/`.

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
| `js/entdecken.js` | Bereich Entdecken inkl. „genauer rechnen“ |
| `js/bestimmen.js` | Bereich Bestimmen: Foto und Merkmale |
| `js/steckbrief.js` | Steckbrief einer Art |
| `daten/merkmale.js` | Merkmalstabelle mit Belegen |
| `daten/wuchsform.js` | Baum- und Straucharten Europas (WCVP, CC BY 4.0) |
| `vendor/`, `fonts/` | MapLibre GL 5.6.0 und Schriften mit Lizenztexten |
| `alt/index.html` | die alte Version in einer Datei |

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
