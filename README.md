# Pure Nature

Zeigt auf einem Globus, welche Tiere, Pflanzen und Pilze an einem Ort leben, und hilft beim Bestimmen. Die Seite speichert selbst **keine Funddaten**: Alles kommt live aus freien, legalen Quellen.

**Seite:** <https://bunwichtig.github.io/naturewissen/> · **Quellen & Lizenzen:** [quellen.html](https://bunwichtig.github.io/naturewissen/quellen.html) · Alte Version (bis Oktober 2026): [alt/](https://bunwichtig.github.io/naturewissen/alt/)

## Aufbau

Zwei Bereiche, die auf denselben Ort, dieselbe Artenliste und denselben Steckbrief bauen:

- **Entdecken – Was lebt hier?** Arten im Umkreis nach Häufigkeit (iNaturalist), filterbar nach Gruppe. Schalter „genauer rechnen“ nimmt die Fundmeldungen von GBIF dazu.
- **Bestimmen – Was habe ich gesehen?**
  - *Mit Foto:* Pflanzen automatisch über Pl@ntNet. Für Tiere und Pilze gibt es keinen frei nutzbaren Foto-Erkenner; das eigene Foto bleibt dann als Vergleich stehen.
  - *Nach Merkmalen:* Oberfläche, Beine, Flügel, Größe, Wuchs, Blätter, Pilzform, Ort und Zeit. Grundlage ist die Merkmalstabelle mit 241 Gruppen; jede Zeile hat einen Beleg (Wikipedia-Artikel), nachzulesen auf der Quellen-Seite. Größe, Ort und Pilzform kommen zusätzlich aus Messdaten (EIVE, AVONET, FISHMORPH, Amniote, EltonTraits, europäische Amphibien nach Trochet et al., FungalTraits), berechnet für die in Deutschland beobachteten Arten. Herkunft und Lizenz jedes Datensatzes stehen auf der Quellen-Seite.
- **Steckbrief:** Fotos mit Urheber und Lizenz, Gefährdung, Zahlen, Jahreszeit (Funde je Monat), Beschreibung aus Wikipedia, Verwechslungsarten, Systematik, Verbreitung auf der Karte.
- **Karte:** Globus (MapLibre, OpenFreeMap), Satellitenbild (EOX), Waben mit der Funddichte (GBIF), Umkreis.

Der **Umkreis folgt dem Zoom** und gilt für alle Bereiche gleich (5 bis 250 km). Start: Pinnow bei Schwerin, 30 km.

## Regeln, die die Seite einhält

- Nur **frei lizenzierte Fotos** (Creative Commons oder CC0) werden gezeigt, jeweils mit Urheber und Lizenz.
- **iNaturalist:** eine Anfrage nach der anderen mit Abstand; die Artenliste kommt vor den Fotos. Gleiche Anfragen werden nicht wiederholt.
- **Nominatim:** höchstens eine Anfrage pro Sekunde, Suche erst nach dem Absenden (keine Suche beim Tippen).
- **Schriften und MapLibre** liegen im Repo; beim Öffnen wird nichts von Google oder einem CDN geladen.
- Einige Inhalte sind nur **nicht-kommerziell** frei (Satellitenbild, viele Naturfotos). Pure Nature ist ein privates, nicht-kommerzielles Projekt.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Gerüst der Seite |
| `quellen.html` | Quellen, Lizenzen, Merkmalstabelle mit Belegen |
| `css/app.css`, `css/fonts.css` | Gestaltung, Schriften |
| `js/main.js` | Einstieg, Panel, Handy-Blatt |
| `js/state.js` | gemeinsamer Zustand (Ort, Umkreis, Gruppe …) |
| `js/api.js` | alle Abfragen mit Warteschlangen und Zwischenspeicher |
| `js/karte.js` | Globus, Ebenen, Ortssuche |
| `js/liste.js` | Artenliste in Häufigkeitsstufen |
| `js/entdecken.js` | Bereich Entdecken inkl. „genauer rechnen“ |
| `js/bestimmen.js` | Bereich Bestimmen: Foto und Merkmale |
| `js/steckbrief.js` | Steckbrief einer Art |
| `daten/merkmale.js` | Merkmalstabelle mit Belegen |
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
