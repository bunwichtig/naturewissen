# Pure Nature

Eine Wissensdatenbank über die Arten der Welt, die selbst **keine Daten speichert**. Alles wird live aus freien APIs geladen.

Ein drehbarer 3D-Globus zeigt beim Zoomen, welche Pflanzen, Tiere und Pilze im sichtbaren Ausschnitt vorkommen. Ein Klick auf eine Art öffnet Fotos, Systematik, Gefährdungsstatus, eine Wikipedia-Beschreibung und die weltweite Verbreitung.

## Starten

`index.html` herunterladen und im Browser öffnen. Es gibt keinen Build-Schritt und keine Abhängigkeiten.

Alternativ in den Repo-Einstellungen **GitHub Pages** (Branch `main`, Ordner `/`) aktivieren.

## Funktionen

- 3D-Globus mit Zoom, Ortssuche, Satellitenbild und GBIF-Dichtekarte
- Arten im Umkreis der Kartenmitte; der Radius passt sich dem Zoom an
- Gruppen: Pflanzen, Pilze, Säugetiere, Vögel, Reptilien, Amphibien, Fische, Insekten, Spinnentiere, Weichtiere
- Detailansicht: Fotogalerie mit Lizenz, IUCN-Status, Systematik, Wikipedia-Text, Zahlen von iNaturalist und GBIF, Verbreitungskarte
- Platzhalter für spätere Felder: Lebensraum, Merkmale, Phänologie, Verwechslungsarten, Laute, Nahrung

## Datenquellen & Lizenzen

| Quelle | Wofür | Lizenz / Bedingungen |
|---|---|---|
| [iNaturalist API](https://api.inaturalist.org/v1/docs/) | Artenlisten, Fotos, Systematik, Verbreitung | API frei für nicht-kommerzielle Nutzung; Fotos mit eigener CC-Lizenz je Bild |
| [GBIF API](https://techdocs.gbif.org/en/openapi/) | Fundmeldungen, Dichtekarte | CC0 / CC BY / CC BY-NC je Datensatz |
| [Wikipedia REST API](https://de.wikipedia.org/api/rest_v1/) | Artbeschreibungen | CC BY-SA 4.0 |
| [OpenFreeMap](https://openfreemap.org) / [OpenStreetMap](https://www.openstreetmap.org/copyright) | Kartenbasis | ODbL |
| [Sentinel-2 cloudless](https://s2maps.eu) by EOX | Satellitenbild | CC BY-NC-SA 4.0 |
| [Nominatim](https://nominatim.org) | Ortssuche, Ortsnamen | ODbL, max. 1 Anfrage/Sekunde |
| [MapLibre GL JS](https://maplibre.org) | Globus-Darstellung | BSD-3-Clause |

Für eine kommerzielle Nutzung müssten iNaturalist und das Satellitenbild ersetzt oder gesondert geklärt werden.
