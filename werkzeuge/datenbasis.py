#!/usr/bin/env python3
"""Erzeugt datenbasis.html (Seite) und bauplan.md (Datei für einen neuen Claude-Chat) aus EINER Quellenliste.
Aufruf im Repo-Hauptordner:  python3 werkzeuge/datenbasis.py
Änderungen an Quellen also nur hier eintragen, dann neu erzeugen."""
import html, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
STAND = "25. Oktober 2026"
SITE = "https://bunwichtig.github.io/naturewissen"
REPO = "https://github.com/bunwichtig/naturewissen"

# art: live = wird beim Benutzen abgefragt · fest = einmal aufbereitet, liegt als Datei im Repo · technik = Bausteine der Seite
QUELLEN = [
  dict(id="inat", name="iNaturalist", art="live", lizenz="CC0 · CC BY · CC BY-NC (je Foto/Beobachtung)",
    liefert="Vorschläge bei der Artsuche, Arten in der Umgebung nach Häufigkeit, Fotos, deutsche Namen, Fundzahlen, Jahreszeit, Verwechslungsarten, Blüte/Lebensstadium, Verbreitungskarte (Raster-Kacheln).",
    regeln=["Kein Schlüssel nötig, kostenlos.", "Höchstens etwa 1 Anfrage pro Sekunde (Seite: 1 gleichzeitig, mind. 0,6 s Abstand).",
            "Nur Fotos mit license_code zeigen (CC), immer mit Urheber und Lizenz.", "Deutsche Namen: locale=de, preferred_place_id=7207 (Deutschland)."],
    endpunkte=[
      ("GET https://api.inaturalist.org/v1/taxa/autocomplete", "q, per_page=12, is_active=true, locale, preferred_place_id", "Vorschlagsliste der Artsuche"),
      ("GET …/v1/observations/species_counts", "iconic_taxa | taxon_id, lat, lng, radius (km), quality_grade=research, per_page (≤500), page, month, term_id=12&term_value_id=13 (blüht)", "Arten am Ort nach Zahl der Beobachtungen"),
      ("GET …/v1/observations/iconic_taxa_species_counts", "lat, lng, radius", "Artenzahl je Großgruppe (Gruppen ohne Funde ausgrauen)"),
      ("GET …/v1/observations", "taxon_id, lat, lng, radius, per_page=0", "Zahl der Funde einer Art am Ort"),
      ("GET …/v1/observations/histogram", "taxon_id, date_field=observed, interval=month_of_year, verifiable=true (+ Ort)", "Funde je Monat"),
      ("GET …/v1/identifications/similar_species", "taxon_id, locale", "Verwechslungsarten"),
      ("GET …/v1/taxa/{id}", "locale, preferred_place_id", "Steckbrief: Fotos, Namen, Gefährdung, Systematik"),
      ("GET …/v1/taxa", "q (wissenschaftlicher Name), is_active=true", "Name → iNaturalist-Nummer"),
      ("Kacheln …/v1/grid/{z}/{x}/{y}.png", "taxon_id, color=#d9622b, quality_grade", "Verbreitungskarte"),
    ],
    links=[("Nutzungsbedingungen", "https://www.inaturalist.org/pages/terms"), ("API-Regeln", "https://www.inaturalist.org/pages/api+recommended+practices"), ("API-Dokumentation", "https://api.inaturalist.org/v1/docs/")]),
  dict(id="gbif", name="GBIF", art="live", lizenz="CC0 · CC BY · CC BY-NC (je Datensatz)",
    liefert="Fundmeldungen aus Museen, Herbarien, Kartierungen und Zählungen: „genauer rechnen“, Hinweis „GBIF kennt hier mehr Arten“, Bäume/Sträucher, Fundzahl im Steckbrief.",
    regeln=["Kein Schlüssel nötig.", "Quelle GBIF mit Link nennen.",
            "Fische und Reptilien sind im GBIF-Backbone keine eigene Klasse: Fische über ihre Ordnungen (548,1313,1153,587,550,590,495,588,549,708,773,538,498,547,1103,772,1068,537,496,1069,1165,1167,1067,499,1162,1311,1305,889), Reptilien über Squamata 11592253 + Testudines 11418114.",
            "Gruppen-Schlüssel: Pflanzen 6, Pilze 5, Vögel 212, Insekten 216, Säugetiere 359, Amphibien 131, Spinnentiere 367, Weichtiere 52."],
    endpunkte=[
      ("GET https://api.gbif.org/v1/occurrence/search", "geoDistance=lat,lng,KMkm, taxonKey (mehrfach möglich), limit=0, facet=speciesKey|scientificName, facetLimit, occurrenceStatus=PRESENT, hasGeospatialIssue=false", "Arten am Ort mit Fundzahl (Facetten)"),
      ("GET …/v1/species/{key}", "–", "Schlüssel → Name und Gruppe"),
      ("GET …/v1/species/match", "name, strict=true, kingdom", "Name → GBIF-Schlüssel"),
    ],
    links=[("Nutzungsbedingungen", "https://www.gbif.org/terms"), ("Vereinbarung für Datennutzer", "https://www.gbif.org/terms/data-user"), ("API-Dokumentation", "https://www.gbif.org/developer/summary")]),
  dict(id="wiki", name="Wikipedia (deutsch)", art="live", lizenz="CC BY-SA 4.0",
    liefert="Die ersten Sätze des Artikels im Steckbrief; Belege für die Merkmalstabelle.",
    regeln=["Artikel über den wissenschaftlichen Namen suchen (Weiterleitungen folgen).", "Unter dem Text: „Text: Wikipedia, Artikel …, CC BY-SA 4.0“ mit Link."],
    endpunkte=[("GET https://de.wikipedia.org/w/api.php", "action=query, format=json, origin=*, redirects=1, titles=NAME, prop=extracts|info|pageprops, exsentences=5, explaintext=1, inprop=url, ppprop=disambiguation", "Artikelanfang")],
    links=[("Lizenzbestimmungen", "https://de.wikipedia.org/wiki/Wikipedia:Lizenzbestimmungen"), ("CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/deed.de")]),
  dict(id="nominatim", name="Nominatim & OpenStreetMap", art="live", lizenz="ODbL",
    liefert="Ortssuche und Ortsname zum eigenen Standort.",
    regeln=["Höchstens 1 Anfrage pro Sekunde.", "Keine Suche beim Tippen – erst nach dem Absenden.", "Ergebnisse merken, nicht doppelt fragen."],
    endpunkte=[("GET https://nominatim.openstreetmap.org/search", "format=jsonv2, limit=6, accept-language=de, q", "Ortssuche"),
               ("GET …/reverse", "format=jsonv2, lat, lon, zoom=12, accept-language=de", "Name zum Standort")],
    links=[("Nutzungsregeln", "https://operations.osmfoundation.org/policies/nominatim/"), ("OSM-Urheberrecht", "https://www.openstreetmap.org/copyright")]),
  dict(id="plantnet", name="Pl@ntNet", art="live", lizenz="kostenlos mit eigenem Schlüssel (500 Bestimmungen/Tag)",
    liefert="Pflanzen per Foto bestimmen.",
    regeln=["Jede Person trägt ihren eigenen Schlüssel ein (nur auf dem Gerät gespeichert).", "Auf my.plantnet.org: „expose my API key“ und die Domain freigeben.", "Fotos gehen nur zur Bestimmung an Pl@ntNet."],
    endpunkte=[("POST https://my-api.plantnet.org/v2/identify/all", "api-key, lang=de, nb-results=5, include-related-images=true; Formular: images, organs", "Bestimmung"),
               ("GET …/v2/quota/daily", "api-key", "Schlüssel prüfen, Rest-Kontingent")],
    links=[("Nutzungsbedingungen", "https://my.plantnet.org/terms_of_use"), ("Schlüssel holen", "https://my.plantnet.org/")]),
  dict(id="ofm", name="OpenFreeMap", art="live", lizenz="kostenlos · Daten OpenStreetMap / OpenMapTiles",
    liefert="Kartenbild der Verbreitungskarte.",
    regeln=["Ohne Schlüssel, ohne Aufruf-Grenze.", "Namensnennung OpenMapTiles und OpenStreetMap bleibt in der Karte sichtbar."],
    endpunkte=[("Stil https://tiles.openfreemap.org/styles/liberty", "–", "Kartenstil für MapLibre")],
    links=[("openfreemap.org", "https://openfreemap.org"), ("OSM-Urheberrecht", "https://www.openstreetmap.org/copyright")]),

  dict(id="eive", name="EIVE 1.0 – Zeigerwerte für Europa", art="fest", lizenz="CC BY 4.0",
    liefert="Ort bei Pflanzen in der Merkmalstabelle aus Feuchte, Licht und Nährstoffen (14.835 Arten).",
    zitat="Dengler, J., Jansen, F. et al. (2023): Ecological Indicator Values for Europe (EIVE) 1.0. Vegetation Classification and Survey.",
    regeln=["Feuchte ab 8,5 = im Wasser, ab 6,5 = Ufer. Licht bis 4,5 = Wald. Licht ab 6,5 bei mittlerer Feuchte = Wiese/Feld. Nährstoffe ab 7,5 bei Licht und mittlerer Feuchte = Garten/Siedlung."],
    links=[("Datensatz bei Zenodo", "https://zenodo.org/records/7534792")]),
  dict(id="avonet", name="AVONET – Merkmale aller Vögel", art="fest", lizenz="CC BY 4.0",
    liefert="Größe und Ort bei Vögeln (10.661 Arten).",
    zitat="Tobias, J. A. et al. (2022): AVONET: morphological, ecological and geographical data for all birds. Ecology Letters 25: 581–597.",
    regeln=["Länge in cm ≈ 5,3 × Kubikwurzel(Gewicht in g).", "Hauptlebensraum → Wald / Wiese / Ufer / Wasser / Siedlung."],
    links=[("Datensatz bei Figshare", "https://figshare.com/s/b990722d72a26b5bfead"), ("Artikel", "https://doi.org/10.1111/ele.13898")]),
  dict(id="fishmorph", name="FISHMORPH – Süßwasserfische", art="fest", lizenz="CC BY 4.0",
    liefert="Größe bei Süßwasserfischen (9.456 Arten).",
    zitat="Brosse, S. et al. (2021): FISHMORPH: A global database on morphological traits of freshwater fishes. Global Ecology and Biogeography 30: 2330–2336.",
    regeln=["Übliche Größe = 60 % der Höchstlänge. Meeresfische fehlen."],
    links=[("Datensatz bei RODARE", "https://rodare.hzdr.de/record/1316"), ("Artikel", "https://doi.org/10.1111/geb.13395")]),
  dict(id="amniote", name="Amniote Life-History Database", art="fest", lizenz="ohne Urheberrechtsbeschränkung (Nennung erbeten)",
    liefert="Größe bei Säugetieren und Eidechsen (Kopf-Rumpf-Länge).",
    zitat="Myhrvold, N. P. et al. (2015): An amniote life-history database to perform comparative analyses with birds, mammals, and reptiles. Ecology 96: 3109.",
    links=[("Datenarchiv mit Nutzungsangabe", "https://esapubs.org/archive/ecol/E096/269/metadata.php")]),
  dict(id="elton", name="EltonTraits 1.0", art="fest", lizenz="ohne Urheberrechtsbeschränkung (Nennung erbeten)",
    liefert="Bei Säugetieren: lebt im Meer / in Bäumen.",
    zitat="Wilman, H. et al. (2014): EltonTraits 1.0: Species-level foraging attributes of the world's birds and mammals. Ecology 95: 2027.",
    links=[("Datenarchiv mit Nutzungsangabe", "https://esapubs.org/archive/ecol/E095/178/metadata.php")]),
  dict(id="trochet", name="Europäische Amphibien", art="fest", lizenz="CC BY 4.0",
    liefert="Größe und Lebensraum bei Fröschen, Kröten, Unken, Molchen.",
    zitat="Trochet, A. et al. (2014): A database of life-history traits of European amphibians. Biodiversity Data Journal 2: e4123.",
    links=[("Artikel mit Daten", "https://doi.org/10.3897/BDJ.2.e4123")]),
  dict(id="butterflies", name="Tagfalter Europas", art="fest", lizenz="CC0",
    liefert="Größe (Spannweite) und Ort (Eiablage Licht/Schatten, Rast an Bauwerken) bei Tagfaltern.",
    zitat="Middleton-Welling, J. et al. (2020): A new comprehensive trait database of European and Maghreb butterflies, Papilionoidea. Scientific Data 7: 351.",
    links=[("Datensatz bei Dryad", "https://datadryad.org/dataset/doi:10.5061/dryad.6m905qfx6"), ("Artikel", "https://doi.org/10.1038/s41597-020-00697-7")]),
  dict(id="combine", name="COMBINE – Säugetiere", art="fest", lizenz="CC0",
    liefert="Bei Säugetieren: lebt im Wasser / in Bäumen.",
    zitat="Soria, C. D. et al. (2021): COMBINE: a coalesced mammal database of intrinsic and extrinsic traits. Ecology 102: e03344.",
    regeln=["In der verwendeten Dryad-Kopie fehlen bei vielen Zahlen die Dezimaltrennzeichen – nur die Lebensraum-Angaben verwenden, keine Längen."],
    links=[("Datensatz bei Dryad", "https://datadryad.org/dataset/doi:10.5061/dryad.05qfttfdq")]),
  dict(id="fungal", name="FungalTraits 1.2", art="fest", lizenz="zur öffentlichen Nutzung freigegeben (keine CC-Lizenz genannt)",
    liefert="Fruchtkörperform und Ort bei Pilzen, über 10.000 Gattungen.",
    zitat="Põlme, S. et al. (2020): FungalTraits: a user-friendly traits database of fungi and fungus-like stramenopiles. Fungal Diversity 105: 1–16.",
    links=[("Artikel", "https://doi.org/10.1007/s13225-020-00466-2"), ("verwendete Kopie", "https://github.com/bokulich-lab/q2-fungal-traits")]),
  dict(id="wcvp", name="World Checklist of Vascular Plants (WCVP)", art="fest", lizenz="CC BY 4.0",
    liefert="Wuchsform: Baum- und Straucharten Europas für die Gruppen „Bäume“ und „Sträucher“ (1.083 Bäume, 5.529 Sträucher).",
    zitat="Govaerts, R., Nic Lughadha, E., Black, N., Turner, R. & Paton, A. (2021): The World Checklist of Vascular Plants, a continuously updated resource for exploring global plant diversity. Scientific Data 8: 215. Royal Botanic Gardens, Kew.",
    regeln=["Anerkannte Arten mit Vorkommen in Europa (heimisch oder eingeführt, nicht ausgestorben).", "Baum: lifeform enthält „tree“; Strauch: enthält „shrub“ (auch Halb-/Zwergsträucher). „shrub or tree“ in beiden.",
            "Arten am Ort aus iNaturalist UND GBIF prüfen – häufige Bäume (Fichte, Kiefer) fehlen bei iNaturalist oft."],
    links=[("Artikel", "https://doi.org/10.1038/s41597-021-00997-6"), ("Datensatz bei GBIF", "https://www.gbif.org/dataset/f382f0ce-323a-4091-bb9f-add557f3a9a2"), ("verwendete Kopie (rWCVPdata)", "https://github.com/matildabrown/rWCVPdata")]),

  dict(id="maplibre", name="MapLibre GL JS 5.6.0", art="technik", lizenz="BSD-3-Clause",
    liefert="Globus-Karte für die Verbreitung. Liegt als Datei im Repo (vendor/), kein CDN.",
    links=[("Lizenz", "https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt"), ("maplibre.org", "https://maplibre.org")]),
  dict(id="fonts", name="Schriften", art="technik", lizenz="SIL Open Font License",
    liefert="Bricolage Grotesque, Figtree, Newsreader, JetBrains Mono – als Dateien im Repo (fonts/), nichts von Google.",
    links=[("Open Font License", "https://openfontlicense.org")]),
]

GEPRUEFT = [
  ("TRY Plant Trait Database", "Wuchsformen und weitere Pflanzenmerkmale; Download nur nach Registrierung, die gerade in Wartung war. Ersetzt durch WCVP.", "https://www.try-db.org"),
  ("SquamBase", "Schlangen-Längen; es lag nur Tabelle S2 (Literaturliste) vor, gebraucht wird S1.", ""),
  ("GBIF-Wabenkarte (v2/map)", "Nimmt nur einen Gruppen-Schlüssel – für Fische/Reptilien ungeeignet. Die große Karte ist im neuen Konzept ohnehin entfallen.", "https://www.gbif.org/developer/maps"),
]

DATEIEN = [
  ("dev/daten/merkmale.js", "Merkmalstabelle: MERKMALE (Fragen und Antworten), GRUPPEN (263 Gruppen mit Merkmalen), BELEG (Wikipedia-Artikel je Gruppe), DATEN (aus Datensätzen berechnete Werte)."),
  ("dev/daten/wuchsform.js", "BAEUME und STRAEUCHER als Mengen wissenschaftlicher Namen (WCVP)."),
  ("dev/js/api.js", "Warteschlangen je Dienst, Zwischenspeicher, Abbruch, Name → Nummer."),
  ("dev/js/state.js", "Gruppen mit iNaturalist- und GBIF-Schlüsseln, Umkreise, gemeinsamer Zustand."),
]

ART = {"live": ("Live-Abfrage", "wird beim Benutzen abgefragt"), "fest": ("Fester Datensatz", "einmal aufbereitet, liegt als Datei im Repo"), "technik": ("Technik", "Bausteine der Seite")}

FUNKTIONEN = """
1. **Startseite:** zwei Suchfelder. Oben ein Ort (Nominatim, Suche erst nach Absenden, „Meinen Standort verwenden“, die letzten 5 Orte merken). Darunter ein Lebewesen (iNaturalist-Autovervollständigung, Vorschläge beim Tippen mit 300 ms Pause, Arten vor höheren Gruppen, Treffer am Namensanfang zuerst). „Baum“/„Strauch“ ergibt den Vorschlag „Alle Bäume um <Ort>“.
2. **Ort gewählt:** Umkreis 5 / 10 / 30 / 50 / 100 / 250 km. Zwei Bereiche: *Entdecken* und *Bestimmen*.
3. **Entdecken – Was lebt hier?** Gruppen: Alle, Pflanzen, Bäume, Sträucher, Pilze, Vögel, Insekten, Säugetiere, Amphibien, Reptilien, Fische, Spinnentiere, Weichtiere (Gruppen ohne Funde ausgegraut). Liste nach Häufigkeit (species_counts), in fünf Stufen geteilt: oberste 5 % der Rangfolge = Häufig, bis 20 % Mittelhäufig, bis 45 % Weniger häufig, bis 75 % Selten, Rest Sehr selten; je Stufe erst 2 Arten, dann „4 weitere“. Schalter „nur bestätigte Funde“ (quality_grade=research).
4. **Genauer rechnen (iNaturalist + GBIF):** je Quelle Anteil einer Art an ihrer Gruppe; kleine Gruppen zählen mindestens mit 5 % aller Funde der Quelle; Wert = Wurzel(Anteil iNat × Anteil GBIF); fehlt eine Quelle, zählt die Hälfte des kleinsten Anteils dieser Gruppe. Umkreis höchstens 250 km. Kennt GBIF mindestens 1,5-mal so viele Arten (und 5 mehr), bietet die Seite „Alle zusammen zeigen“ an.
5. **Bäume / Sträucher:** Pflanzenarten am Ort aus iNaturalist (bis 4 Seiten à 500) und GBIF (facet=scientificName) → nur Namen aus der WCVP-Liste behalten → Arten nur bei GBIF bekommen Foto/deutschen Namen aus iNaturalist im 250-km-Umkreis.
6. **Bestimmen mit Foto:** nur Pflanzen, Pl@ntNet, bis 5 Fotos mit Organ (Blatt, Blüte, Frucht, Rinde …).
7. **Bestimmen nach Merkmalen:** Fragen aus MERKMALE; passende Gruppen aus GRUPPEN; bis 25 Gruppen direkt über taxon_id, sonst über iconic_taxa; optional „jetzt im Monat“ (month) und „blüht gerade“ (term_id=12, term_value_id=13). Ergebnis: Arten am Ort nach Häufigkeit.
8. **Steckbrief** (Seitenleiste, Handy ganze Fläche): freie Fotos mit Urheber/Lizenz, deutscher und wissenschaftlicher Name, Gefährdung, Funde hier / bei iNaturalist / bei GBIF, Jahreszeit (Funde je Monat, im Umkreis oder weltweit bei < 12 Funden), Wikipedia-Anfang, Verwechslungsarten, Systematik. Knopf „Verbreitungsgebiet zeigen“: MapLibre-Globus mit iNaturalist-Rasterkacheln, gesuchter Ort markiert, zwei Finger zum Bewegen am Handy.
"""

REGELN = """
- **Alles frei und legal.** Nur Dienste ohne Kosten und Daten mit freier Lizenz; Lizenz und Herkunft stehen auf einer Quellen-Seite, die von überall verlinkt ist.
- **Keine eigene Datenhaltung:** Funde werden live abgefragt. Feste Datensätze nur als aufbereitete Tabellen im Repo, mit Quelle.
- **Fotos nur mit Creative-Commons-Lizenz** (license_code vorhanden), immer mit Urheber und Lizenz.
- **Abfrage-Regeln einhalten:** iNaturalist ~1/s, Nominatim 1/s und keine Suche beim Tippen, gleiche Anfragen merken, Wichtiges vor Unwichtigem.
- **Nichts von Google oder CDNs:** Schriften und MapLibre liegen im Repo.
- **Statische Seite ohne Build-Schritt** (ES-Module), läuft auf GitHub Pages.
- **Handy zuerst**, Deutsch, einfache Sprache.
- Privates, nicht-kommerzielles Projekt (manche Fotos sind nur nicht-kommerziell frei).
"""

def md(V):
  o = [f"# Pure Nature – Bauplan und Datenbasis {V['nr']}\n",
       f"Stand: {V['stand']} · Seite: {SITE}/ · Repo: {REPO}\n",
       "> **So benutzen:** Diese Datei in einen neuen Chat mit Claude legen und dazu schreiben, was neu werden soll – z. B. „Baue Pure Nature nach diesem Bauplan neu auf. Funktionen, Datenquellen und Regeln bleiben genau so; ich möchte nur ein neues Design: …“. Alles, was Claude für Suche, Listen und Steckbrief braucht, steht hier. Die fertig aufbereiteten Tabellen liegen im Repo (Abschnitt „Dateien zum Weiterverwenden“).\n",
       "## Ziel\n\nEine Website, die zeigt, welche Tiere, Pflanzen und Pilze an einem Ort leben, und beim Bestimmen hilft – nur mit freien, legalen Datenquellen und ohne eigene Datenhaltung.\n",
       "## Regeln, die nicht verhandelbar sind\n" + REGELN,
       "## Funktionen und Ablauf\n" + V["funktionen"]]
  for art in ("live", "fest", "technik"):
    o.append(f"## {ART[art][0]} – {ART[art][1]}\n")
    for q in [x for x in V['quellen'] if x["art"] == art]:
      o.append(f"### {q['name']}\n\n- **Lizenz:** {q['lizenz']}\n- **Liefert:** {q['liefert']}")
      if q.get("zitat"): o.append(f"- **Zitat:** {q['zitat']}")
      for r in q.get("regeln", []): o.append(f"- {r}")
      if q.get("endpunkte"):
        o.append("\n| Abfrage | Parameter | Wofür |\n|---|---|---|")
        for e in q["endpunkte"]: o.append(f"| `{e[0]}` | {e[1]} | {e[2]} |")
      o.append("\n" + " · ".join(f"[{t}]({u})" for t, u in q["links"]) + "\n")
  if V.get("neu"):
    o.append(f"## Neu in Datenbasis {V['nr']}\n")
    for x in V["neu"]: o.append(f"- {x}")
    o.append("")
  if V.get("abdeckung"):
    o.append("## Abdeckung nach Gruppen\n\nListen am Ort und Systematik (Reich, Stamm, Klasse, Ordnung, Familie, Gattung, Art) kommen für alle Gruppen live aus iNaturalist und GBIF. Die Tabelle zeigt, woher zusätzliche Merkmale kommen.\n\n| Gruppe | Merkmale aus Datensätzen | Ebene | Lücke |\n|---|---|---|---|")
    for r in V["abdeckung"]: o.append(f"| {r[0]} | {r[1] or '–'} | {r[2]} | {r[3] or '–'} |")
    o.append("")
  o.append("## Dateien zum Weiterverwenden\n\nDiese Dateien enthalten die aufbereiteten Daten und können unverändert übernommen werden:\n")
  for p, d in V['dateien']: o.append(f"- [`{p}`]({REPO}/blob/main/{p}) – {d}")
  o.append(f"\nDie Quellen-Seite mit allen Belegen und der Merkmalstabelle: {SITE}/{V['app']}/quellen.html\n")
  o.append("## Geprüft, aber nicht verwendet\n")
  for n, d, u in V['geprueft']: o.append(f"- **{n}:** {d}" + (f" ({u})" if u else ""))
  o.append("\n## Fassungen\n\n- `dev/` – Entwicklung, hier wird weitergearbeitet\n- `v1/` – Archiv, erste fertige Version\n- `v2/` – in Vorbereitung (WIP-Seite)\n- `alt/` – ursprüngliche Ein-Datei-Version\n")
  return "\n".join(o) + "\n"

E = html.escape
def page(V, bauplan):
  cards = []
  for q in V['quellen']:
    ep = "".join(f"<li><code>{E(e[0])}</code><span>{E(e[2])}</span><small>{E(e[1])}</small></li>" for e in q.get("endpunkte", []))
    rg = "".join(f"<li>{E(r)}</li>" for r in q.get("regeln", []))
    cards.append(f"""<article class="src" data-art="{q['art']}" data-text="{E((q['name']+' '+q['liefert']+' '+q['lizenz']).lower())}">
  <header><h3>{E(q['name'])}</h3><span class="lic">{E(q['lizenz'])}</span></header>
  <p class="art">{E(ART[q['art']][0])}</p>
  <p>{E(q['liefert'])}</p>
  {f'<p class="zitat">{E(q["zitat"])}</p>' if q.get('zitat') else ''}
  {f'<details><summary>Regeln</summary><ul>{rg}</ul></details>' if rg else ''}
  {f'<details><summary>Abfragen ({len(q["endpunkte"])})</summary><ul class="ep">{ep}</ul></details>' if ep else ''}
  <nav>{''.join(f'<a href="{E(u)}" target="_blank" rel="noopener">{E(t)}</a>' for t, u in q['links'])}</nav>
</article>""")
  n = {a: sum(1 for q in V['quellen'] if q["art"] == a) for a in ART}
  ger = "".join(f'<li><b>{E(a)}</b> – {E(b)}' + (f' <a href="{E(c)}" target="_blank" rel="noopener">Link</a>' if c else '') + '</li>' for a, b, c in V['geprueft'])
  dat = "".join(f'<li><a href="{REPO}/blob/main/{p}" target="_blank" rel="noopener"><code>{E(p)}</code></a> – {E(d)}</li>' for p, d in V['dateien'])
  return f"""<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Datenbasis {V["nr"]} – Pure Nature</title>
<meta name="description" content="Alle freien Datenquellen von Pure Nature mit Lizenz, Nachweis und Abfragen – und der Bauplan zum Neuaufbau.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%2386b86f'/%3E%3Cpath d='M16 6c6 4 6 16 0 20c-6-4-6-16 0-20z' fill='%230a0f0e'/%3E%3C/svg%3E">
<style>
@font-face{{font-family:"Figtree";font-weight:400;font-display:swap;src:url(../fonts/figtree-latin-400-normal.woff2) format("woff2")}}
@font-face{{font-family:"Figtree";font-weight:600;font-display:swap;src:url(../fonts/figtree-latin-600-normal.woff2) format("woff2")}}
@font-face{{font-family:"Bricolage Grotesque";font-weight:700;font-display:swap;src:url(../fonts/bricolage-grotesque-latin-700-normal.woff2) format("woff2")}}
@font-face{{font-family:"Newsreader";font-style:italic;font-weight:400;font-display:swap;src:url(../fonts/newsreader-latin-400-italic.woff2) format("woff2")}}
@font-face{{font-family:"JetBrains Mono";font-weight:400;font-display:swap;src:url(../fonts/jetbrains-mono-latin-400-normal.woff2) format("woff2")}}
:root{{--night:#0a0f0e;--panel:#101816;--panel-2:#16211e;--line:#24332e;--ink:#e6ede4;--muted:#8b9d94;--pollen:#e7ad4f;--plantae:#86b86f;--fungi:#c79ad0;
  --f-display:"Bricolage Grotesque","Segoe UI",system-ui,sans-serif;--f-body:"Figtree","Segoe UI",system-ui,sans-serif;--f-sci:"Newsreader",Georgia,serif;--f-data:"JetBrains Mono",ui-monospace,Menlo,monospace;color-scheme:dark}}
*{{box-sizing:border-box}}
html{{background:var(--night)}}
body{{margin:0;background:var(--night);color:var(--ink);font:15px/1.55 var(--f-body);padding:0 max(16px,env(safe-area-inset-left,0px)) 64px}}
.wrap{{max-width:1080px;margin:0 auto}}
a{{color:var(--ink);text-decoration-color:var(--pollen);text-underline-offset:3px}}
:focus-visible{{outline:2px solid var(--pollen);outline-offset:2px}}
.top{{display:flex;align-items:center;gap:12px;padding:18px 0;border-bottom:1px solid var(--line)}}
.brand{{font:700 22px/1 var(--f-display);text-decoration:none;letter-spacing:-.02em}}
.brand span{{color:var(--pollen)}}
.top .back{{margin-left:auto;font-size:13px;color:var(--muted)}}
h1{{font:700 clamp(32px,6vw,52px)/1.05 var(--f-display);letter-spacing:-.03em;margin:36px 0 10px}}
.lead{{color:var(--muted);max-width:60ch;margin:0 0 24px}}
.stats{{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 28px;padding:0;list-style:none}}
.stats li{{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:10px 14px;min-width:120px}}
.stats b{{display:block;font:700 26px/1 var(--f-display);color:var(--pollen)}}
.stats span{{font-size:13px;color:var(--muted)}}
.bau{{background:linear-gradient(135deg,var(--panel-2),var(--panel));border:1px solid var(--pollen);border-radius:18px;padding:22px;margin:0 0 36px}}
.bau h2{{font:700 24px/1.1 var(--f-display);margin:0 0 8px}}
.bau p{{margin:0 0 14px;color:var(--muted);max-width:68ch}}
.btns{{display:flex;flex-wrap:wrap;gap:10px}}
.btn{{font:600 14px/1 var(--f-body);border-radius:999px;padding:11px 16px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink);cursor:pointer;text-decoration:none}}
.btn.primary{{background:var(--pollen);color:var(--night);border-color:var(--pollen)}}
.btn:hover{{border-color:var(--pollen)}}
#copied{{font-size:13px;color:var(--plantae);align-self:center}}
.bau details{{margin-top:14px}}
.bau summary{{cursor:pointer;color:var(--muted);font-size:14px}}
.bau pre{{white-space:pre-wrap;font:12.5px/1.5 var(--f-data);background:var(--night);border:1px solid var(--line);border-radius:12px;padding:14px;max-height:420px;overflow:auto;margin:10px 0 0}}
h2.sec{{font:700 26px/1.1 var(--f-display);margin:40px 0 6px}}
.sec-lead{{color:var(--muted);margin:0 0 16px}}
.filter{{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}}
.filter input{{flex:1 1 220px;min-width:0;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:9px 14px;color:var(--ink);font:inherit}}
.chip{{font:500 13px/1 var(--f-body);border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:999px;padding:9px 13px;cursor:pointer}}
.chip[aria-pressed=true]{{background:var(--ink);color:var(--night);border-color:var(--ink)}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}}
.src{{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:8px}}
.src header{{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}}
.src h3{{font:700 18px/1.2 var(--f-display);margin:0}}
.lic{{font:400 11px/1.3 var(--f-data);color:var(--night);background:var(--plantae);border-radius:8px;padding:4px 7px;text-align:right;max-width:55%}}
.src[data-art=technik] .lic{{background:var(--muted)}}
.art{{margin:0;font:400 11px/1 var(--f-data);text-transform:uppercase;letter-spacing:.08em;color:var(--pollen)}}
.src p{{margin:0}}
.zitat{{font:italic 15px/1.45 var(--f-sci);color:var(--muted)}}
.src details{{border-top:1px solid var(--line);padding-top:8px}}
.src summary{{cursor:pointer;font-size:13px;color:var(--muted)}}
.src ul{{margin:8px 0 0;padding-left:18px;font-size:13.5px}}
.ep{{list-style:none;padding:0!important;display:grid;gap:8px}}
.ep li{{display:grid;gap:2px}}
.ep code{{font:12px/1.4 var(--f-data);color:var(--pollen);word-break:break-all}}
.ep small{{color:var(--muted);font-size:12px}}
.src nav{{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:auto;padding-top:6px;font-size:13.5px}}
.plain{{padding-left:18px}} .plain li{{margin:6px 0}}
.neu li::marker{{color:var(--pollen)}}
.tbl{{overflow-x:auto;border:1px solid var(--line);border-radius:14px}}
table{{border-collapse:collapse;width:100%;min-width:560px;font-size:14px}}
th,td{{text-align:left;padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}}
thead th{{font:400 11px/1.2 var(--f-data);text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:var(--panel)}}
tbody th{{font-weight:600}}
tbody tr:last-child>*{{border-bottom:0}}
.no{{color:var(--muted)}} .ok{{color:var(--plantae)}}
code{{font-family:var(--f-data);font-size:.92em}}
@media (max-width:640px){{.grid{{grid-template-columns:1fr}}.lic{{max-width:50%}}}}
</style>
</head>
<body>
<div class="wrap">
<header class="top"><a class="brand" href="../datenbasis.html">Pure <span>Nature</span></a><a class="back" href="../datenbasis.html">← Alle Datenbasen</a></header>
<h1>Datenbasis {V["nr"]}</h1>
<p class="lead">Woher Pure Nature seine Daten hat: jede Quelle mit Lizenz, Nachweis, den genauen Abfragen und Regeln. Stand {V["stand"]}.</p>
{V["intro"]}
<ul class="stats">
  <li><b>{n['live']}</b><span>Live-Abfragen</span></li>
  <li><b>{n['fest']}</b><span>feste Datensätze</span></li>
  <li><b>{n['technik']}</b><span>Technik-Bausteine</span></li>
  <li><b>0 €</b><span>Kosten</span></li>
</ul>

<section class="bau" aria-labelledby="bauH">
  <h2 id="bauH">Neu aufbauen mit Claude</h2>
  <p>Der Bauplan enthält alles, was zum Nachbauen nötig ist: Ziel, Regeln, Ablauf von Suche, Listen, Bestimmen und Steckbrief, alle Quellen mit Abfragen und Lizenzen, dazu die fertig aufbereiteten Tabellen. Datei herunterladen, in einen neuen Chat legen und dazuschreiben, wie das neue Design aussehen soll.</p>
  <div class="btns">
    <a class="btn primary" href="../bauplan-{V["nr"]}.md" download="pure-nature-bauplan-{V["nr"]}.md">Bauplan herunterladen (.md)</a>
    <button class="btn" type="button" id="copy">Bauplan kopieren</button>
    <span id="copied" role="status"></span>
  </div>
  <details><summary>Bauplan ansehen</summary><pre id="plan">{E(bauplan)}</pre></details>
</section>

{neu_html(V)}{abd_html(V)}<h2 class="sec">Alle Quellen</h2>
<p class="sec-lead">Live-Abfragen laufen beim Benutzen der Seite. Feste Datensätze wurden einmal aufbereitet und liegen als Tabelle im Repo.</p>
<div class="filter">
  <input type="search" id="q" placeholder="Quelle suchen, z. B. Vögel, CC0, Karte" aria-label="Quellen durchsuchen">
  <button class="chip" type="button" data-f="" aria-pressed="true">Alle</button>
  <button class="chip" type="button" data-f="live" aria-pressed="false">Live</button>
  <button class="chip" type="button" data-f="fest" aria-pressed="false">Datensätze</button>
  <button class="chip" type="button" data-f="technik" aria-pressed="false">Technik</button>
</div>
<div class="grid" id="list">
{chr(10).join(cards)}
</div>

<h2 class="sec">Dateien zum Weiterverwenden</h2>
<ul class="plain">{dat}</ul>
<p class="sec-lead">Alle Belege und die Merkmalstabelle: <a href="../{V["app"]}/quellen.html">Quellen &amp; Lizenzen</a>.</p>

<h2 class="sec">Geprüft, aber nicht verwendet</h2>
<ul class="plain">{ger}</ul>
</div>
<script>
const plan = document.getElementById("plan").textContent;
document.getElementById("copy").onclick = async () => {{
  const msg = document.getElementById("copied");
  try {{ await navigator.clipboard.writeText(plan); msg.textContent = "Kopiert – jetzt in den neuen Chat einfügen."; }}
  catch {{ msg.textContent = "Kopieren ging nicht – bitte herunterladen."; }}
}};
let f = "";
const apply = () => {{
  const q = document.getElementById("q").value.trim().toLowerCase();
  document.querySelectorAll("#list .src").forEach(c => {{
    c.hidden = (f && c.dataset.art !== f) || (q && !c.dataset.text.includes(q));
  }});
}};
document.querySelectorAll(".chip").forEach(b => b.onclick = () => {{
  f = b.dataset.f; document.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", x === b)); apply();
}});
document.getElementById("q").oninput = apply;
</script>
</body>
</html>
"""


# ───────────────────────── Versionen der Datenbasis ─────────────────────────
import copy

def neu_html(V):
  if not V.get("neu"): return ""
  return '<h2 class="sec">Neu in dieser Version</h2><ul class="plain neu">' + "".join(f"<li>{E(x)}</li>" for x in V["neu"]) + "</ul>"

def abd_html(V):
  if not V.get("abdeckung"): return ""
  rows = "".join(f'<tr><th scope="row">{E(r[0])}</th><td>{E(r[1]) if r[1] else "<span class=no>–</span>"}</td><td>{E(r[2])}</td><td>{E(r[3]) if r[3] else "<span class=ok>–</span>"}</td></tr>' for r in V["abdeckung"])
  return f'''<h2 class="sec">Abdeckung nach Gruppen</h2>
<p class="sec-lead">Listen am Ort und die ganze Systematik – Reich, Stamm, Klasse, Ordnung, Familie, Gattung, Art – kommen für <b>alle</b> Gruppen live aus iNaturalist und GBIF. Die Tabelle zeigt, woher zusätzliche Merkmale (Größe, Ort, Wuchs- oder Pilzform) stammen und wo noch Lücken sind.</p>
<div class="tbl"><table><thead><tr><th>Gruppe</th><th>Merkmale aus Datensätzen</th><th>Ebene</th><th>Lücke</th></tr></thead><tbody>{rows}</tbody></table></div>'''

ABD_BASIS = [
  ["Bäume, Sträucher", "WCVP (Wuchsform), EIVE (Ort)", "Art", ""],
  ["Kräuter & Blumen, Gräser", "EIVE (Ort)", "Art", "Wuchsform nicht eigens gefiltert"],
  ["Farne, Schachtelhalme", "EIVE (Ort)", "Art", "Wuchsform nicht eigens gefiltert"],
  ["Moose", "", "–", "keine Merkmal- oder Wuchsform-Daten"],
  ["Pilze, Flechten", "FungalTraits (Form, Ort)", "Gattung", ""],
  ["Säugetiere", "Amniote, EltonTraits, COMBINE", "Art", ""],
  ["Vögel", "AVONET", "Art", ""],
  ["Amphibien", "Europäische Amphibien", "Art", ""],
  ["Reptilien", "Amniote (Eidechsen)", "Art", "Längen von Schlangen und Schildkröten"],
  ["Süßwasserfische", "FISHMORPH", "Art", "Meeresfische"],
  ["Tagfalter", "Tagfalter Europas", "Art", "Nachtfalter"],
  ["Käfer, Wanzen, Heuschrecken", "", "–", "nur Wikipedia-Belege"],
  ["Spinnen", "", "–", "nur Wikipedia-Belege"],
  ["Bienen, Wespen, Fliegen, Libellen", "", "–", "nur Wikipedia-Belege"],
  ["Weichtiere (Schnecken, Muscheln)", "", "–", "nur Wikipedia-Belege"],
]

V1 = dict(nr=1, app="v1", stand="25. Oktober 2026 – Stand von V1 (Archiv)",
  intro='<p class="lead">Die Datenbasis, mit der die erste Version gebaut wurde. Sie bleibt unverändert.</p>',
  quellen=QUELLEN, funktionen=FUNKTIONEN, geprueft=GEPRUEFT,
  dateien=[(p.replace("dev/", "v1/").replace("daten/wuchs/index.js", "daten/wuchsform.js"), d) for p, d in DATEIEN],
  abdeckung=ABD_BASIS)

# Datenbasis 2: Erweiterung
Q2 = copy.deepcopy(QUELLEN)
def q(id_): return next(x for x in Q2 if x["id"] == id_)
w = q("wcvp")
w["liefert"] = "Wuchsform aller europäischen Gefäßpflanzen für Entdecken → Pflanzen → Wuchsform: Bäume (1.083), Sträucher (5.529), Kräuter & Blumen (18.102), Gräser (2.213), Kletterpflanzen (217), Wasser- & Sumpfpflanzen (417), Zwiebel & Knolle (2.860), Farne (388)."
w["regeln"] = ["Anerkannte Arten mit Vorkommen in Europa (heimisch oder eingeführt, nicht ausgestorben).",
  "Aus „lifeform_description“: tree → Baum; shrub/subshrub → Strauch; climber/climbing/liana → Kletterpflanze; hydro…/helophyte → Wasser & Sumpf; geophyte → Zwiebel & Knolle; annual/biennial/perennial → Kraut (ohne Baum, Strauch, Kletter-, Wasserpflanze).",
  "Gräser nach Familie (Poaceae, Cyperaceae, Juncaceae), Farne nach Farn-, Schachtelhalm- und Bärlappfamilien. Eine Art kann in mehreren Gruppen stehen.",
  "Arten am Ort aus iNaturalist UND GBIF prüfen – häufige Bäume (Fichte, Kiefer) fehlen bei iNaturalist oft.",
  "Jede Wuchsform liegt in einer eigenen Datei (daten/wuchs/) und wird erst geladen, wenn jemand sie wählt."]
inat = q("inat")
inat["endpunkte"].insert(3, ("GET …/v1/observations/taxonomy", "lat, lng, radius | place_id, quality_grade", "Bereich Liste: alle Taxa am Ort mit parent_id und Fundzahl"))
inat["liefert"] += " Moose (Laubmoose, Lebermoose, Hornmoose) als eigene Gruppe über die iNaturalist-Taxa Bryophyta, Marchantiophyta, Anthocerotophyta. Systematik jeder Art (alle Ebenen von Reich bis Art) im Steckbrief."
i_fest = max(i for i, x in enumerate(Q2) if x["art"] == "live") + 1
Q2.insert(i_fest, dict(id="backbone", name="GBIF Backbone Taxonomy", art="live", lizenz="CC BY 4.0",
  liefert="Einheitliche Systematik über alle Gruppen (Reich, Stamm, Klasse, Ordnung, Familie, Gattung, Art), aus Catalogue of Life und weiteren Checklisten. Grundlage für Namensabgleich und die GBIF-Gruppen.",
  regeln=["Abfrage über die GBIF-Schnittstellen species/match und species/{key}; Ränge stehen in den Feldern kingdom … species."],
  endpunkte=[("GET https://api.gbif.org/v1/species/match", "name, strict=true, kingdom", "Name → Schlüssel mit allen Rängen"),
             ("GET …/v1/species/{key}/parents", "–", "alle übergeordneten Ebenen")],
  links=[("Datensatz bei GBIF", "https://www.gbif.org/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c"), ("Catalogue of Life", "https://www.catalogueoflife.org")]))
i_fung = next(i for i, x in enumerate(Q2) if x["id"] == "fungal")
Q2.insert(i_fung, dict(id="gossner", name="Insekten und Spinnen im Grünland", art="fest", lizenz="CC0 (Dryad)",
  liefert="Größe und Schicht bei Spinnen, Käfern, Wanzen und Heuschrecken – 1.230 Arten aus Grünland in Deutschland. Eingeflossen für Radnetz- und Krabbenspinnen, Weich- und Marienkäfer, Langfühlerschrecken.",
  zitat="Gossner, M. M. et al. (2015): A summary of eight traits of Coleoptera, Hemiptera, Orthoptera and Araneae, occurring in grasslands in Germany. Scientific Data 2: 150013.",
  regeln=["Größe aus der Körperlänge (unter 1 cm, 1–5 cm, über 5 cm).", "Krautschicht = Wiese und Feld, Bäume = Wald, Wasser = im Wasser.",
          "Nur Gruppen, bei denen mindestens die Hälfte der Beobachtungen in Deutschland abgedeckt ist; die Daten stammen aus Grünland."],
  links=[("Datensatz bei Dryad", "https://datadryad.org/dataset/doi:10.5061/dryad.53ds2"), ("Artikel", "https://doi.org/10.1038/sdata.2015.13"), ("verwendete Kopie (traitdata)", "https://github.com/RS-eco/traitdata")]))

F2 = FUNKTIONEN.replace("Gruppen: Alle, Pflanzen, Bäume, Sträucher, Pilze,", "Gruppen: Alle, Pflanzen, Pilze,").replace(
  "(Gruppen ohne Funde ausgegraut).", "(Gruppen ohne Funde ausgegraut). Unter „Pflanzen“ eine zweite Zeile **Wuchsform**: Alle Pflanzen, Bäume, Sträucher, Kräuter & Blumen, Gräser, Kletterpflanzen, Wasser & Sumpf, Zwiebel & Knolle, Farne, Moose.").replace(
  "5. **Bäume / Sträucher:**", "5. **Wuchsformen (außer Moose):**").replace("→ nur Namen aus der WCVP-Liste behalten", "→ nur Namen aus der WCVP-Liste der gewählten Wuchsform behalten").replace(
  "„Baum“/„Strauch“ ergibt den Vorschlag „Alle Bäume um <Ort>“.", "„Baum“, „Strauch“, „Kraut“, „Gras“, „Farn“, „Moos“, „Kletterpflanze“, „Wasserpflanze“ ergeben den Vorschlag „Alle … um <Ort>“.") + \
  "9. **Moose:** iNaturalist-Taxa Bryophyta, Marchantiophyta, Anthocerotophyta → Nummern über /taxa nachschlagen → species_counts mit taxon_id.\n" + \
  "10. **Liste – alle Arten als Baum:** dritter Bereich neben Entdecken und Bestimmen. Eine Abfrage `GET /v1/observations/taxonomy` (lat, lng, radius, quality_grade) liefert alle Taxa am Ort mit parent_id und Fundzahl. Angezeigt werden nur die Stufen Gruppe › Ordnung › Familie › Gattung › Art; Ketten mit nur einem Kind werden zusammengefasst. Deutsche Namen und Bilder kommen beim Aufklappen über `GET /v1/taxa/{bis zu 30 ids}`; Mini-Bilder nur für die ersten drei Einträge jeder Stufe und je Gruppe drei häufigste Arten. Links Suche (wissenschaftlich sofort, deutsch über /taxa/autocomplete, nur Treffer am Ort; Tipp klappt den Pfad auf), Vorfilter nach Gruppe, Sortierung häufigste zuerst oder A–Z. Je Stufe erst 60 Einträge, dann „weitere anzeigen“.\n"

V2 = dict(nr=2, app="dev", stand="25. Oktober 2026 – Erweiterung, in der Dev-Fassung",
  intro='<p class="lead">Die erweiterte Datenbasis: alle Wuchsformen der Pflanzen, Moose, Systematik über alle Ebenen, mehr Merkmale für Insekten und Spinnen. Sie steckt in der Dev-Fassung.</p>',
  quellen=Q2, funktionen=F2,
  neu=["Wuchsform für alle europäischen Gefäßpflanzen statt nur Bäume und Sträucher: dazu Kräuter & Blumen, Gräser, Kletterpflanzen, Wasser & Sumpf, Zwiebel & Knolle, Farne (WCVP).",
       "Moose als eigene Gruppe (iNaturalist: Laub-, Leber- und Hornmoose).",
       "GBIF Backbone Taxonomy als Quelle für die Systematik über alle Ebenen von Reich bis Art.",
       "Neuer Datensatz Gossner et al. 2015 (CC0): Größe und Schicht für Spinnen, Käfer, Wanzen und Heuschrecken; bestätigt die Merkmalstabelle bei fünf Gruppen.",
       "Abdeckungs-Tabelle: welche Gruppe Merkmale aus welchem Datensatz hat und wo noch Lücken sind.",
       "Neuer Bereich „Liste“: alle Arten am Ort als aufklappbarer Baum (iNaturalist /observations/taxonomy) mit Suche, Vorfilter und Mini-Bildern."],
  geprueft=GEPRUEFT + [
    ("DISPERSE (Wasserinsekten, Libellen)", "Größe und Flugfähigkeit europäischer Wasser-Wirbelloser; die Lizenz der Tabelle ist im Artikel nicht genannt – erst nach Klärung verwenden.", "https://doi.org/10.6084/m9.figshare.c.5000633"),
    ("Europäische Reptilien (Grimm et al. 2014)", "Bei Dryad unter CC0; die Merkmale liegen als Zahlencodes vor, deren Schlüssel noch fehlt – noch nicht ausgewertet.", "https://datadryad.org/dataset/doi:10.5061/dryad.hb4ht")],
  dateien=[("dev/daten/merkmale.js", DATEIEN[0][1] + " Neu: Werte aus Gossner et al. 2015."),
           ("dev/daten/wuchs/index.js", "Wuchsformen: wuchsSet(code) lädt die Liste einer Wuchsform (B Baum, S Strauch, H Kraut, G Gras, K Kletterpflanze, W Wasser & Sumpf, Z Zwiebel & Knolle, F Farn)."),
           ("werkzeuge/daten/gossner_arthropoden.json", "Körperlänge und Schicht von 1.230 Arten (Gossner et al. 2015)."),
           ] + DATEIEN[2:],
  abdeckung=[
    ["Bäume, Sträucher", "WCVP (Wuchsform), EIVE (Ort)", "Art", ""],
    ["Kräuter & Blumen, Gräser, Kletter-, Wasserpflanzen, Zwiebel & Knolle", "WCVP (Wuchsform), EIVE (Ort)", "Art", ""],
    ["Farne, Schachtelhalme, Bärlappe", "WCVP (Wuchsform), EIVE (Ort)", "Art", ""],
    ["Moose", "", "Gruppe (iNaturalist)", "keine Merkmaldaten"],
    ["Pilze, Flechten", "FungalTraits (Form, Ort)", "Gattung", ""],
    ["Säugetiere", "Amniote, EltonTraits, COMBINE", "Art", ""],
    ["Vögel", "AVONET", "Art", ""],
    ["Amphibien", "Europäische Amphibien", "Art", ""],
    ["Reptilien", "Amniote (Eidechsen)", "Art", "Längen von Schlangen und Schildkröten"],
    ["Süßwasserfische", "FISHMORPH", "Art", "Meeresfische"],
    ["Tagfalter", "Tagfalter Europas", "Art", "Nachtfalter"],
    ["Käfer, Wanzen, Heuschrecken", "Gossner et al. 2015 (Größe, Schicht)", "Art", "Wasserkäfer, Laufkäfer nur teilweise"],
    ["Spinnen", "Gossner et al. 2015 (Größe, Schicht)", "Art", "Spring- und Wolfspinnen nur teilweise"],
    ["Bienen, Wespen, Fliegen, Libellen", "", "–", "nur Wikipedia-Belege"],
    ["Weichtiere (Schnecken, Muscheln)", "", "–", "nur Wikipedia-Belege"],
  ])

VERSIONS = [V1, V2]

def hub():
  cards = "".join(f'''<a class="ver" href="datenbasis/{V['nr']}.html">
  <span class="tag{' new' if V is VERSIONS[-1] else ''}">{'aktuell · Dev' if V is VERSIONS[-1] else 'V1 · Archiv'}</span>
  <h2>Datenbasis {V['nr']}</h2>
  <p>{E(re.sub('<[^>]+>', '', V['intro']))}</p>
  <ul><li><b>{sum(1 for q in V['quellen'] if q['art']=='live')}</b> Live-Abfragen</li><li><b>{sum(1 for q in V['quellen'] if q['art']=='fest')}</b> Datensätze</li><li><b>{len(V.get('neu', []))}</b> Neuerungen</li></ul>
  <span class="stamp" data-path="datenbasis/{V['nr']}.html">Zuletzt geändert: {STAND_DATUM.get(f"datenbasis/{V['nr']}.html", "")}</span>
  <span class="go">Öffnen →</span></a>''' for V in reversed(VERSIONS))
  return f'''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Datenbasis – Pure Nature</title>
<meta name="description" content="Alle Versionen der Datenbasis von Pure Nature – freie Quellen mit Lizenz, Nachweis und Bauplan.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%2386b86f'/%3E%3Cpath d='M16 6c6 4 6 16 0 20c-6-4-6-16 0-20z' fill='%230a0f0e'/%3E%3C/svg%3E">
<style>
@font-face{{font-family:"Figtree";font-weight:400;font-display:swap;src:url(fonts/figtree-latin-400-normal.woff2) format("woff2")}}
@font-face{{font-family:"Figtree";font-weight:600;font-display:swap;src:url(fonts/figtree-latin-600-normal.woff2) format("woff2")}}
@font-face{{font-family:"Bricolage Grotesque";font-weight:700;font-display:swap;src:url(fonts/bricolage-grotesque-latin-700-normal.woff2) format("woff2")}}
@font-face{{font-family:"JetBrains Mono";font-weight:400;font-display:swap;src:url(fonts/jetbrains-mono-latin-400-normal.woff2) format("woff2")}}
:root{{--night:#0a0f0e;--panel:#101816;--panel-2:#16211e;--line:#24332e;--ink:#e6ede4;--muted:#8b9d94;--pollen:#e7ad4f;--plantae:#86b86f;color-scheme:dark}}
*{{box-sizing:border-box}}
html{{background:var(--night)}}
body{{margin:0;min-height:100vh;background:var(--night);color:var(--ink);font:16px/1.5 "Figtree","Segoe UI",system-ui,sans-serif;padding:0 max(16px,env(safe-area-inset-left,0px)) 48px}}
.wrap{{max-width:860px;margin:0 auto}}
.top{{display:flex;align-items:center;padding:18px 0;border-bottom:1px solid var(--line)}}
.brand{{font:700 22px/1 "Bricolage Grotesque",system-ui,sans-serif;text-decoration:none;color:var(--ink)}}
.brand span{{color:var(--pollen)}}
.back{{margin-left:auto;font-size:13px;color:var(--muted);text-underline-offset:3px}}
h1{{font:700 clamp(36px,7vw,56px)/1 "Bricolage Grotesque",system-ui,sans-serif;letter-spacing:-.03em;margin:36px 0 10px}}
.lead{{color:var(--muted);margin:0 0 28px;max-width:58ch}}
.list{{display:grid;gap:16px}}
.ver{{display:block;text-decoration:none;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:22px;transition:border-color .15s,transform .15s}}
.ver:hover,.ver:focus-visible{{border-color:var(--pollen);transform:translateY(-2px)}}
.ver:focus-visible{{outline:2px solid var(--pollen);outline-offset:3px}}
.tag{{font:400 12px/1 "JetBrains Mono",ui-monospace,monospace;color:var(--night);background:var(--muted);border-radius:999px;padding:5px 9px;display:inline-block}}
.tag.new{{background:var(--pollen)}}
.ver h2{{font:700 28px/1.1 "Bricolage Grotesque",system-ui,sans-serif;margin:14px 0 6px}}
.ver p{{margin:0 0 12px;color:var(--muted)}}
.ver ul{{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:0 0 12px;padding:0}}
.ver li{{font-size:13px;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:5px 10px}}
.ver li b{{color:var(--ink)}}
.go{{font-weight:600;color:var(--pollen)}}
.stamp{{display:block;font:400 12px/1.4 "JetBrains Mono",ui-monospace,monospace;color:var(--muted);margin:0 0 10px}}
</style>
</head>
<body>
<div class="wrap">
<header class="top"><a class="brand" href="./">Pure <span>Nature</span></a><a class="back" href="./">← Fassungen</a></header>
<h1>Datenbasis</h1>
<p class="lead">Jede Version der Datenbasis mit allen freien Quellen, Lizenzen, Nachweisen, Abfragen – und einem Bauplan zum Neuaufbau mit Claude. Die neueste steht oben.</p>
<div class="list">{cards}</div>
</div>
<script src="stand.js" defer></script>
</body>
</html>
'''

import subprocess
def git_datum(path):
  try: iso = subprocess.run(["git", "log", "-1", "--format=%cI", "--", path], cwd=ROOT, capture_output=True, text=True).stdout.strip()
  except Exception: iso = ""
  if not iso: return "neu"
  from datetime import datetime
  d = datetime.fromisoformat(iso)
  M = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"]
  return f"{d.day}. {M[d.month-1]} {d.year}, {d:%H:%M} Uhr"
STAND_DATUM = {f"datenbasis/{V['nr']}.html": git_datum(f"datenbasis/{V['nr']}.html") for V in VERSIONS}

(ROOT / "datenbasis").mkdir(exist_ok=True)
for V in VERSIONS:
  b = md(V)
  (ROOT / f"bauplan-{V['nr']}.md").write_text(b, encoding="utf-8")
  (ROOT / "datenbasis" / f"{V['nr']}.html").write_text(page(V, b), encoding="utf-8")
(ROOT / "bauplan.md").write_text(md(VERSIONS[-1]), encoding="utf-8")
# datenbasis.html (Übersicht mit Reitern „Versionen“ und „Datenbank“) wird inzwischen von Hand gepflegt und hier NICHT mehr überschrieben.
# Neue Versionen dort als Karte eintragen; hub() bleibt als Vorlage für eine Karte.
print("geschrieben:", [f"datenbasis/{V['nr']}.html" for V in VERSIONS], "bauplan*.md (datenbasis.html wird von Hand gepflegt)")
