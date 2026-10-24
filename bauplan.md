# Pure Nature – Bauplan und Datenbasis

Stand: 25. Oktober 2026 · Seite: https://bunwichtig.github.io/naturewissen/ · Repo: https://github.com/bunwichtig/naturewissen

> **So benutzen:** Diese Datei in einen neuen Chat mit Claude legen und dazu schreiben, was neu werden soll – z. B. „Baue Pure Nature nach diesem Bauplan neu auf. Funktionen, Datenquellen und Regeln bleiben genau so; ich möchte nur ein neues Design: …“. Alles, was Claude für Suche, Listen und Steckbrief braucht, steht hier. Die fertig aufbereiteten Tabellen liegen im Repo (Abschnitt „Dateien zum Weiterverwenden“).

## Ziel

Eine Website, die zeigt, welche Tiere, Pflanzen und Pilze an einem Ort leben, und beim Bestimmen hilft – nur mit freien, legalen Datenquellen und ohne eigene Datenhaltung.

## Regeln, die nicht verhandelbar sind

- **Alles frei und legal.** Nur Dienste ohne Kosten und Daten mit freier Lizenz; Lizenz und Herkunft stehen auf einer Quellen-Seite, die von überall verlinkt ist.
- **Keine eigene Datenhaltung:** Funde werden live abgefragt. Feste Datensätze nur als aufbereitete Tabellen im Repo, mit Quelle.
- **Fotos nur mit Creative-Commons-Lizenz** (license_code vorhanden), immer mit Urheber und Lizenz.
- **Abfrage-Regeln einhalten:** iNaturalist ~1/s, Nominatim 1/s und keine Suche beim Tippen, gleiche Anfragen merken, Wichtiges vor Unwichtigem.
- **Nichts von Google oder CDNs:** Schriften und MapLibre liegen im Repo.
- **Statische Seite ohne Build-Schritt** (ES-Module), läuft auf GitHub Pages.
- **Handy zuerst**, Deutsch, einfache Sprache.
- Privates, nicht-kommerzielles Projekt (manche Fotos sind nur nicht-kommerziell frei).

## Funktionen und Ablauf

1. **Startseite:** zwei Suchfelder. Oben ein Ort (Nominatim, Suche erst nach Absenden, „Meinen Standort verwenden“, die letzten 5 Orte merken). Darunter ein Lebewesen (iNaturalist-Autovervollständigung, Vorschläge beim Tippen mit 300 ms Pause, Arten vor höheren Gruppen, Treffer am Namensanfang zuerst). „Baum“/„Strauch“ ergibt den Vorschlag „Alle Bäume um <Ort>“.
2. **Ort gewählt:** Umkreis 5 / 10 / 30 / 50 / 100 / 250 km. Zwei Bereiche: *Entdecken* und *Bestimmen*.
3. **Entdecken – Was lebt hier?** Gruppen: Alle, Pflanzen, Bäume, Sträucher, Pilze, Vögel, Insekten, Säugetiere, Amphibien, Reptilien, Fische, Spinnentiere, Weichtiere (Gruppen ohne Funde ausgegraut). Liste nach Häufigkeit (species_counts), in fünf Stufen geteilt: oberste 5 % der Rangfolge = Häufig, bis 20 % Mittelhäufig, bis 45 % Weniger häufig, bis 75 % Selten, Rest Sehr selten; je Stufe erst 2 Arten, dann „4 weitere“. Schalter „nur bestätigte Funde“ (quality_grade=research).
4. **Genauer rechnen (iNaturalist + GBIF):** je Quelle Anteil einer Art an ihrer Gruppe; kleine Gruppen zählen mindestens mit 5 % aller Funde der Quelle; Wert = Wurzel(Anteil iNat × Anteil GBIF); fehlt eine Quelle, zählt die Hälfte des kleinsten Anteils dieser Gruppe. Umkreis höchstens 250 km. Kennt GBIF mindestens 1,5-mal so viele Arten (und 5 mehr), bietet die Seite „Alle zusammen zeigen“ an.
5. **Bäume / Sträucher:** Pflanzenarten am Ort aus iNaturalist (bis 4 Seiten à 500) und GBIF (facet=scientificName) → nur Namen aus der WCVP-Liste behalten → Arten nur bei GBIF bekommen Foto/deutschen Namen aus iNaturalist im 250-km-Umkreis.
6. **Bestimmen mit Foto:** nur Pflanzen, Pl@ntNet, bis 5 Fotos mit Organ (Blatt, Blüte, Frucht, Rinde …).
7. **Bestimmen nach Merkmalen:** Fragen aus MERKMALE; passende Gruppen aus GRUPPEN; bis 25 Gruppen direkt über taxon_id, sonst über iconic_taxa; optional „jetzt im Monat“ (month) und „blüht gerade“ (term_id=12, term_value_id=13). Ergebnis: Arten am Ort nach Häufigkeit.
8. **Steckbrief** (Seitenleiste, Handy ganze Fläche): freie Fotos mit Urheber/Lizenz, deutscher und wissenschaftlicher Name, Gefährdung, Funde hier / bei iNaturalist / bei GBIF, Jahreszeit (Funde je Monat, im Umkreis oder weltweit bei < 12 Funden), Wikipedia-Anfang, Verwechslungsarten, Systematik. Knopf „Verbreitungsgebiet zeigen“: MapLibre-Globus mit iNaturalist-Rasterkacheln, gesuchter Ort markiert, zwei Finger zum Bewegen am Handy.

## Live-Abfrage – wird beim Benutzen abgefragt

### iNaturalist

- **Lizenz:** CC0 · CC BY · CC BY-NC (je Foto/Beobachtung)
- **Liefert:** Vorschläge bei der Artsuche, Arten in der Umgebung nach Häufigkeit, Fotos, deutsche Namen, Fundzahlen, Jahreszeit, Verwechslungsarten, Blüte/Lebensstadium, Verbreitungskarte (Raster-Kacheln).
- Kein Schlüssel nötig, kostenlos.
- Höchstens etwa 1 Anfrage pro Sekunde (Seite: 1 gleichzeitig, mind. 0,6 s Abstand).
- Nur Fotos mit license_code zeigen (CC), immer mit Urheber und Lizenz.
- Deutsche Namen: locale=de, preferred_place_id=7207 (Deutschland).

| Abfrage | Parameter | Wofür |
|---|---|---|
| `GET https://api.inaturalist.org/v1/taxa/autocomplete` | q, per_page=12, is_active=true, locale, preferred_place_id | Vorschlagsliste der Artsuche |
| `GET …/v1/observations/species_counts` | iconic_taxa | taxon_id, lat, lng, radius (km), quality_grade=research, per_page (≤500), page, month, term_id=12&term_value_id=13 (blüht) | Arten am Ort nach Zahl der Beobachtungen |
| `GET …/v1/observations/iconic_taxa_species_counts` | lat, lng, radius | Artenzahl je Großgruppe (Gruppen ohne Funde ausgrauen) |
| `GET …/v1/observations` | taxon_id, lat, lng, radius, per_page=0 | Zahl der Funde einer Art am Ort |
| `GET …/v1/observations/histogram` | taxon_id, date_field=observed, interval=month_of_year, verifiable=true (+ Ort) | Funde je Monat |
| `GET …/v1/identifications/similar_species` | taxon_id, locale | Verwechslungsarten |
| `GET …/v1/taxa/{id}` | locale, preferred_place_id | Steckbrief: Fotos, Namen, Gefährdung, Systematik |
| `GET …/v1/taxa` | q (wissenschaftlicher Name), is_active=true | Name → iNaturalist-Nummer |
| `Kacheln …/v1/grid/{z}/{x}/{y}.png` | taxon_id, color=#d9622b, quality_grade | Verbreitungskarte |

[Nutzungsbedingungen](https://www.inaturalist.org/pages/terms) · [API-Regeln](https://www.inaturalist.org/pages/api+recommended+practices) · [API-Dokumentation](https://api.inaturalist.org/v1/docs/)

### GBIF

- **Lizenz:** CC0 · CC BY · CC BY-NC (je Datensatz)
- **Liefert:** Fundmeldungen aus Museen, Herbarien, Kartierungen und Zählungen: „genauer rechnen“, Hinweis „GBIF kennt hier mehr Arten“, Bäume/Sträucher, Fundzahl im Steckbrief.
- Kein Schlüssel nötig.
- Quelle GBIF mit Link nennen.
- Fische und Reptilien sind im GBIF-Backbone keine eigene Klasse: Fische über ihre Ordnungen (548,1313,1153,587,550,590,495,588,549,708,773,538,498,547,1103,772,1068,537,496,1069,1165,1167,1067,499,1162,1311,1305,889), Reptilien über Squamata 11592253 + Testudines 11418114.
- Gruppen-Schlüssel: Pflanzen 6, Pilze 5, Vögel 212, Insekten 216, Säugetiere 359, Amphibien 131, Spinnentiere 367, Weichtiere 52.

| Abfrage | Parameter | Wofür |
|---|---|---|
| `GET https://api.gbif.org/v1/occurrence/search` | geoDistance=lat,lng,KMkm, taxonKey (mehrfach möglich), limit=0, facet=speciesKey|scientificName, facetLimit, occurrenceStatus=PRESENT, hasGeospatialIssue=false | Arten am Ort mit Fundzahl (Facetten) |
| `GET …/v1/species/{key}` | – | Schlüssel → Name und Gruppe |
| `GET …/v1/species/match` | name, strict=true, kingdom | Name → GBIF-Schlüssel |

[Nutzungsbedingungen](https://www.gbif.org/terms) · [Vereinbarung für Datennutzer](https://www.gbif.org/terms/data-user) · [API-Dokumentation](https://www.gbif.org/developer/summary)

### Wikipedia (deutsch)

- **Lizenz:** CC BY-SA 4.0
- **Liefert:** Die ersten Sätze des Artikels im Steckbrief; Belege für die Merkmalstabelle.
- Artikel über den wissenschaftlichen Namen suchen (Weiterleitungen folgen).
- Unter dem Text: „Text: Wikipedia, Artikel …, CC BY-SA 4.0“ mit Link.

| Abfrage | Parameter | Wofür |
|---|---|---|
| `GET https://de.wikipedia.org/w/api.php` | action=query, format=json, origin=*, redirects=1, titles=NAME, prop=extracts|info|pageprops, exsentences=5, explaintext=1, inprop=url, ppprop=disambiguation | Artikelanfang |

[Lizenzbestimmungen](https://de.wikipedia.org/wiki/Wikipedia:Lizenzbestimmungen) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.de)

### Nominatim & OpenStreetMap

- **Lizenz:** ODbL
- **Liefert:** Ortssuche und Ortsname zum eigenen Standort.
- Höchstens 1 Anfrage pro Sekunde.
- Keine Suche beim Tippen – erst nach dem Absenden.
- Ergebnisse merken, nicht doppelt fragen.

| Abfrage | Parameter | Wofür |
|---|---|---|
| `GET https://nominatim.openstreetmap.org/search` | format=jsonv2, limit=6, accept-language=de, q | Ortssuche |
| `GET …/reverse` | format=jsonv2, lat, lon, zoom=12, accept-language=de | Name zum Standort |

[Nutzungsregeln](https://operations.osmfoundation.org/policies/nominatim/) · [OSM-Urheberrecht](https://www.openstreetmap.org/copyright)

### Pl@ntNet

- **Lizenz:** kostenlos mit eigenem Schlüssel (500 Bestimmungen/Tag)
- **Liefert:** Pflanzen per Foto bestimmen.
- Jede Person trägt ihren eigenen Schlüssel ein (nur auf dem Gerät gespeichert).
- Auf my.plantnet.org: „expose my API key“ und die Domain freigeben.
- Fotos gehen nur zur Bestimmung an Pl@ntNet.

| Abfrage | Parameter | Wofür |
|---|---|---|
| `POST https://my-api.plantnet.org/v2/identify/all` | api-key, lang=de, nb-results=5, include-related-images=true; Formular: images, organs | Bestimmung |
| `GET …/v2/quota/daily` | api-key | Schlüssel prüfen, Rest-Kontingent |

[Nutzungsbedingungen](https://my.plantnet.org/terms_of_use) · [Schlüssel holen](https://my.plantnet.org/)

### OpenFreeMap

- **Lizenz:** kostenlos · Daten OpenStreetMap / OpenMapTiles
- **Liefert:** Kartenbild der Verbreitungskarte.
- Ohne Schlüssel, ohne Aufruf-Grenze.
- Namensnennung OpenMapTiles und OpenStreetMap bleibt in der Karte sichtbar.

| Abfrage | Parameter | Wofür |
|---|---|---|
| `Stil https://tiles.openfreemap.org/styles/liberty` | – | Kartenstil für MapLibre |

[openfreemap.org](https://openfreemap.org) · [OSM-Urheberrecht](https://www.openstreetmap.org/copyright)

## Fester Datensatz – einmal aufbereitet, liegt als Datei im Repo

### EIVE 1.0 – Zeigerwerte für Europa

- **Lizenz:** CC BY 4.0
- **Liefert:** Ort bei Pflanzen in der Merkmalstabelle aus Feuchte, Licht und Nährstoffen (14.835 Arten).
- **Zitat:** Dengler, J., Jansen, F. et al. (2023): Ecological Indicator Values for Europe (EIVE) 1.0. Vegetation Classification and Survey.
- Feuchte ab 8,5 = im Wasser, ab 6,5 = Ufer. Licht bis 4,5 = Wald. Licht ab 6,5 bei mittlerer Feuchte = Wiese/Feld. Nährstoffe ab 7,5 bei Licht und mittlerer Feuchte = Garten/Siedlung.

[Datensatz bei Zenodo](https://zenodo.org/records/7534792)

### AVONET – Merkmale aller Vögel

- **Lizenz:** CC BY 4.0
- **Liefert:** Größe und Ort bei Vögeln (10.661 Arten).
- **Zitat:** Tobias, J. A. et al. (2022): AVONET: morphological, ecological and geographical data for all birds. Ecology Letters 25: 581–597.
- Länge in cm ≈ 5,3 × Kubikwurzel(Gewicht in g).
- Hauptlebensraum → Wald / Wiese / Ufer / Wasser / Siedlung.

[Datensatz bei Figshare](https://figshare.com/s/b990722d72a26b5bfead) · [Artikel](https://doi.org/10.1111/ele.13898)

### FISHMORPH – Süßwasserfische

- **Lizenz:** CC BY 4.0
- **Liefert:** Größe bei Süßwasserfischen (9.456 Arten).
- **Zitat:** Brosse, S. et al. (2021): FISHMORPH: A global database on morphological traits of freshwater fishes. Global Ecology and Biogeography 30: 2330–2336.
- Übliche Größe = 60 % der Höchstlänge. Meeresfische fehlen.

[Datensatz bei RODARE](https://rodare.hzdr.de/record/1316) · [Artikel](https://doi.org/10.1111/geb.13395)

### Amniote Life-History Database

- **Lizenz:** ohne Urheberrechtsbeschränkung (Nennung erbeten)
- **Liefert:** Größe bei Säugetieren und Eidechsen (Kopf-Rumpf-Länge).
- **Zitat:** Myhrvold, N. P. et al. (2015): An amniote life-history database to perform comparative analyses with birds, mammals, and reptiles. Ecology 96: 3109.

[Datenarchiv mit Nutzungsangabe](https://esapubs.org/archive/ecol/E096/269/metadata.php)

### EltonTraits 1.0

- **Lizenz:** ohne Urheberrechtsbeschränkung (Nennung erbeten)
- **Liefert:** Bei Säugetieren: lebt im Meer / in Bäumen.
- **Zitat:** Wilman, H. et al. (2014): EltonTraits 1.0: Species-level foraging attributes of the world's birds and mammals. Ecology 95: 2027.

[Datenarchiv mit Nutzungsangabe](https://esapubs.org/archive/ecol/E095/178/metadata.php)

### Europäische Amphibien

- **Lizenz:** CC BY 4.0
- **Liefert:** Größe und Lebensraum bei Fröschen, Kröten, Unken, Molchen.
- **Zitat:** Trochet, A. et al. (2014): A database of life-history traits of European amphibians. Biodiversity Data Journal 2: e4123.

[Artikel mit Daten](https://doi.org/10.3897/BDJ.2.e4123)

### Tagfalter Europas

- **Lizenz:** CC0
- **Liefert:** Größe (Spannweite) und Ort (Eiablage Licht/Schatten, Rast an Bauwerken) bei Tagfaltern.
- **Zitat:** Middleton-Welling, J. et al. (2020): A new comprehensive trait database of European and Maghreb butterflies, Papilionoidea. Scientific Data 7: 351.

[Datensatz bei Dryad](https://datadryad.org/dataset/doi:10.5061/dryad.6m905qfx6) · [Artikel](https://doi.org/10.1038/s41597-020-00697-7)

### COMBINE – Säugetiere

- **Lizenz:** CC0
- **Liefert:** Bei Säugetieren: lebt im Wasser / in Bäumen.
- **Zitat:** Soria, C. D. et al. (2021): COMBINE: a coalesced mammal database of intrinsic and extrinsic traits. Ecology 102: e03344.
- In der verwendeten Dryad-Kopie fehlen bei vielen Zahlen die Dezimaltrennzeichen – nur die Lebensraum-Angaben verwenden, keine Längen.

[Datensatz bei Dryad](https://datadryad.org/dataset/doi:10.5061/dryad.05qfttfdq)

### FungalTraits 1.2

- **Lizenz:** zur öffentlichen Nutzung freigegeben (keine CC-Lizenz genannt)
- **Liefert:** Fruchtkörperform und Ort bei Pilzen, über 10.000 Gattungen.
- **Zitat:** Põlme, S. et al. (2020): FungalTraits: a user-friendly traits database of fungi and fungus-like stramenopiles. Fungal Diversity 105: 1–16.

[Artikel](https://doi.org/10.1007/s13225-020-00466-2) · [verwendete Kopie](https://github.com/bokulich-lab/q2-fungal-traits)

### World Checklist of Vascular Plants (WCVP)

- **Lizenz:** CC BY 4.0
- **Liefert:** Wuchsform: Baum- und Straucharten Europas für die Gruppen „Bäume“ und „Sträucher“ (1.083 Bäume, 5.529 Sträucher).
- **Zitat:** Govaerts, R., Nic Lughadha, E., Black, N., Turner, R. & Paton, A. (2021): The World Checklist of Vascular Plants, a continuously updated resource for exploring global plant diversity. Scientific Data 8: 215. Royal Botanic Gardens, Kew.
- Anerkannte Arten mit Vorkommen in Europa (heimisch oder eingeführt, nicht ausgestorben).
- Baum: lifeform enthält „tree“; Strauch: enthält „shrub“ (auch Halb-/Zwergsträucher). „shrub or tree“ in beiden.
- Arten am Ort aus iNaturalist UND GBIF prüfen – häufige Bäume (Fichte, Kiefer) fehlen bei iNaturalist oft.

[Artikel](https://doi.org/10.1038/s41597-021-00997-6) · [Datensatz bei GBIF](https://www.gbif.org/dataset/f382f0ce-323a-4091-bb9f-add557f3a9a2) · [verwendete Kopie (rWCVPdata)](https://github.com/matildabrown/rWCVPdata)

## Technik – Bausteine der Seite

### MapLibre GL JS 5.6.0

- **Lizenz:** BSD-3-Clause
- **Liefert:** Globus-Karte für die Verbreitung. Liegt als Datei im Repo (vendor/), kein CDN.

[Lizenz](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt) · [maplibre.org](https://maplibre.org)

### Schriften

- **Lizenz:** SIL Open Font License
- **Liefert:** Bricolage Grotesque, Figtree, Newsreader, JetBrains Mono – als Dateien im Repo (fonts/), nichts von Google.

[Open Font License](https://openfontlicense.org)

## Dateien zum Weiterverwenden

Diese Dateien enthalten die aufbereiteten Daten und können unverändert übernommen werden:

- [`dev/daten/merkmale.js`](https://github.com/bunwichtig/naturewissen/blob/main/dev/daten/merkmale.js) – Merkmalstabelle: MERKMALE (Fragen und Antworten), GRUPPEN (263 Gruppen mit Merkmalen), BELEG (Wikipedia-Artikel je Gruppe), DATEN (aus Datensätzen berechnete Werte).
- [`dev/daten/wuchsform.js`](https://github.com/bunwichtig/naturewissen/blob/main/dev/daten/wuchsform.js) – BAEUME und STRAEUCHER als Mengen wissenschaftlicher Namen (WCVP).
- [`dev/js/api.js`](https://github.com/bunwichtig/naturewissen/blob/main/dev/js/api.js) – Warteschlangen je Dienst, Zwischenspeicher, Abbruch, Name → Nummer.
- [`dev/js/state.js`](https://github.com/bunwichtig/naturewissen/blob/main/dev/js/state.js) – Gruppen mit iNaturalist- und GBIF-Schlüsseln, Umkreise, gemeinsamer Zustand.

Die Quellen-Seite mit allen Belegen und der Merkmalstabelle: https://bunwichtig.github.io/naturewissen/dev/quellen.html

## Geprüft, aber nicht verwendet

- **TRY Plant Trait Database:** Wuchsformen und weitere Pflanzenmerkmale; Download nur nach Registrierung, die gerade in Wartung war. Ersetzt durch WCVP. (https://www.try-db.org)
- **SquamBase:** Schlangen-Längen; es lag nur Tabelle S2 (Literaturliste) vor, gebraucht wird S1.
- **GBIF-Wabenkarte (v2/map):** Nimmt nur einen Gruppen-Schlüssel – für Fische/Reptilien ungeeignet. Die große Karte ist im neuen Konzept ohnehin entfallen. (https://www.gbif.org/developer/maps)

## Fassungen

- `dev/` – Entwicklung, hier wird weitergearbeitet
- `v1/` – Archiv, erste fertige Version
- `v2/` – ruht
- `alt/` – ursprüngliche Ein-Datei-Version

