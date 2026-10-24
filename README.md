# Pure Nature

Eine Wissensdatenbank über die Arten der Welt, die selbst **keine Daten speichert**. Alles wird live aus freien APIs geladen.

Ein drehbarer 3D-Globus zeigt beim Zoomen, welche Pflanzen, Tiere und Pilze im sichtbaren Ausschnitt vorkommen. Ein Klick auf eine Art öffnet Fotos, Systematik, Gefährdungsstatus, eine Wikipedia-Beschreibung und die weltweite Verbreitung. Pflanzen lassen sich außerdem **per Handy-Foto bestimmen**.

## Starten

`index.html` herunterladen und im Browser öffnen. Es gibt keinen Build-Schritt und keine Abhängigkeiten.

Für das Handy und für die Fotobestimmung braucht die Seite eine `https://`-Adresse. Am einfachsten geht das mit GitHub Pages (siehe unten). Als lokal geöffnete Datei funktionieren Globus und Artenliste, aber nicht die Bestimmung per Foto.

## Funktionen

- 3D-Globus mit Zoom, Ortssuche, Satellitenbild und Fotos der Lebewesen an ihren Fundorten
- Arten im Umkreis der Kartenmitte; der Radius passt sich dem Zoom an
- Gruppen: Pflanzen, Pilze, Säugetiere, Vögel, Reptilien, Amphibien, Fische, Insekten, Spinnentiere, Weichtiere
- Detailansicht: Fotogalerie mit Lizenz, IUCN-Status, Systematik, Wikipedia-Text, Zahlen von iNaturalist und GBIF, Verbreitungskarte
- **Pflanze bestimmen**: Foto mit der Handykamera aufnehmen oder aus der Galerie wählen → Pl@ntNet schlägt die wahrscheinlichsten Arten vor → „Steckbrief öffnen“ zeigt die Art in der Detailansicht
- Platzhalter für spätere Felder: Lebensraum, Merkmale, Phänologie, Verwechslungsarten, Laute, Nahrung

---

## Pflanzen per Foto bestimmen

Die Bestimmung nutzt die kostenlose [Pl@ntNet-API](https://my.plantnet.org/) (500 Bestimmungen pro Tag). Dafür sind einmalig drei Dinge nötig: die Seite online stellen, einen API-Schlüssel holen und den Schlüssel in die Seite eintragen.

### Schritt 1: Seite online stellen (GitHub Pages)

1. Auf GitHub dieses Repo öffnen: <https://github.com/bunwichtig/naturewissen>
2. Oben auf **Settings** tippen, links auf **Pages**.
3. Unter **Build and deployment** bei **Source** „Deploy from a branch“ wählen.
4. Bei **Branch** `main` und Ordner `/ (root)` auswählen und **Save** drücken.
5. Ein bis zwei Minuten warten. Dann ist die Seite erreichbar unter:
   **<https://bunwichtig.github.io/naturewissen/>**

Tipp fürs Handy: Die Adresse öffnen und zum Home-Bildschirm hinzufügen. Dann startet sie wie eine App.

- **iPhone (Safari):** Teilen-Symbol (Quadrat mit Pfeil) → **Zum Home-Bildschirm**
- **Android (Chrome):** Menü ⋮ → **Zum Startbildschirm hinzufügen**

### Schritt 2: Pl@ntNet-API-Schlüssel besorgen (kostenlos)

1. **Konto anlegen:** <https://my.plantnet.org/> öffnen und registrieren (Knopf *Sign up* bzw. *Login* → *Create an account*). Name, E-Mail-Adresse und Passwort eingeben.
2. **E-Mail bestätigen:** Pl@ntNet schickt eine Mail mit einem Bestätigungslink. Den Link anklicken und danach einloggen.
3. **Schlüssel erzeugen:** Im Konto die Seite **Settings** öffnen. Dort steht der private API-Schlüssel. Falls noch keiner da ist, auf *generate your private API key* klicken.
4. **Schlüssel für Webseiten freigeben:** Auf derselben Settings-Seite
   - den Haken bei **„expose my API key“** setzen. Ohne diesen Haken blockiert Pl@ntNet alle Anfragen aus dem Browser.
   - bei **„Authorized domains“** diese Domain eintragen, eine pro Zeile:
     ```
     bunwichtig.github.io
     ```
     Nur die Domain, ohne `/naturewissen`. Falls es nicht klappt, zusätzlich eine Zeile `https://bunwichtig.github.io` eintragen.
   - **Authorized IPs** leer lassen.
   - speichern.
5. **Schlüssel kopieren.** Er ist eine lange Zeichenkette, z. B. `2b10…`.

Wichtig aus den [Nutzungsbedingungen](https://my.plantnet.org/terms_of_use): Pro Person ist nur ein kostenloses Konto erlaubt. Kostenlos sind 500 Bestimmungen pro Tag. Darüber hinaus und für kommerzielle Nutzung ist der Dienst kostenpflichtig.

### Schritt 3: Schlüssel in die Seite eintragen

Es gibt zwei Möglichkeiten:

**A) Direkt auf dem Handy (einfach, nur für dieses Gerät)**
Seite öffnen → **Pflanze bestimmen** → Schlüssel einfügen → **Schlüssel prüfen & speichern**.
Der Schlüssel wird nur im Browser dieses Geräts gespeichert. Auf jedem weiteren Gerät musst du ihn noch einmal eintragen. Über „API-Schlüssel ändern“ unten im Dialog kannst du ihn wechseln.

**B) Fest in der Seite (gilt für alle Geräte und Besucher)**
In `index.html` diese Zeile suchen und den Schlüssel zwischen die Anführungszeichen setzen:
```js
const PLANTNET_KEY = "";
```
Der Schlüssel ist dann öffentlich im Repo sichtbar. Das ist vertretbar, weil er durch Schritt 2.4 nur auf `bunwichtig.github.io` funktioniert. Bedenke aber: Alle Besucher deiner Seite teilen sich dann die 500 Bestimmungen pro Tag.

### Schritt 4: Foto machen und Kamera erlauben

1. Auf der Seite **Pflanze bestimmen** tippen.
2. **Kamera starten** tippen. Das Handy fragt jetzt, ob die Seite die Kamera benutzen darf → **Erlauben**.
   Hast du schon einmal erlaubt, startet die Kamera beim nächsten Mal von selbst.
3. Mit dem runden Auslöser bis zu 5 Fotos **derselben Pflanze** machen, am besten Blüte und Blatt einzeln, scharf und formatfüllend.
4. Bei jedem Foto auswählen, was zu sehen ist: Blüte, Blatt, Frucht, Rinde oder „Automatisch erkennen“.
5. **Art bestimmen** tippen. Nach ein paar Sekunden erscheinen die wahrscheinlichsten Arten mit Prozentwert.
6. **Steckbrief öffnen** zeigt die Art mit Fotos, Beschreibung und Verbreitung auf dem Globus.

Ohne Live-Kamera geht es auch über **Kamera-App öffnen** (normale Foto-App des Handys) oder **Foto aus Galerie**.

#### Kamera aus Versehen verboten?

- **iPhone (Safari):** Links in der Adressleiste auf **aA** bzw. das Einstellungs-Symbol tippen → **Website-Einstellungen** → **Kamera** → **Erlauben**.
  Oder: iPhone-**Einstellungen** → **Apps** → **Safari** → **Kamera** → **Fragen** bzw. **Erlauben**.
- **Android (Chrome):** Links in der Adressleiste auf das Symbol neben der Adresse tippen → **Berechtigungen** → **Kamera** → **Zulassen**.
  Darf Chrome selbst nicht auf die Kamera: Android-**Einstellungen** → **Apps** → **Chrome** → **Berechtigungen** → **Kamera** → **Zulassen**.

Danach die Seite neu laden.

### Wenn etwas nicht klappt

| Meldung | Ursache | Lösung |
|---|---|---|
| „Pl@ntNet ist nicht erreichbar“ / „hat die Anfrage blockiert“ | Haken *expose my API key* fehlt, oder die Domain ist nicht unter *Authorized domains* eingetragen | Schritt 2.4 prüfen, speichern, ein paar Minuten warten |
| „Pl@ntNet lehnt den Schlüssel ab“ | Schlüssel falsch oder unvollständig kopiert | Schlüssel neu kopieren und über „API-Schlüssel ändern“ eintragen |
| „Tageslimit erreicht“ | 500 Bestimmungen verbraucht | Das Kontingent wird um Mitternacht UTC zurückgesetzt (1 Uhr, im Sommer 2 Uhr deutscher Zeit) |
| „Live-Kamera nicht verfügbar“ | Seite läuft nicht über `https://` | Über GitHub Pages aufrufen (Schritt 1) |
| „Keine Art erkannt“ | Foto unscharf, zu weit weg oder keine Pflanze | Näher heran, einzelne Blüte oder Blatt fotografieren |

**Datenschutz:** Die Fotos gehen nur zur Bestimmung an Pl@ntNet (Server in Europa). Die Seite selbst speichert keine Fotos. Lokal gespeichert wird nur der API-Schlüssel, falls du Variante A nutzt.

---

## Datenquellen & Lizenzen

| Quelle | Wofür | Lizenz / Bedingungen |
|---|---|---|
| [iNaturalist API](https://api.inaturalist.org/v1/docs/) | Artenlisten, Fotos, Systematik, Verbreitung | API frei für nicht-kommerzielle Nutzung; Fotos mit eigener CC-Lizenz je Bild |
| [GBIF API](https://techdocs.gbif.org/en/openapi/) | Fundmeldungen | CC0 / CC BY / CC BY-NC je Datensatz |
| [Wikipedia REST API](https://de.wikipedia.org/api/rest_v1/) | Artbeschreibungen | CC BY-SA 4.0 |
| [Pl@ntNet API](https://my.plantnet.org/) | Pflanzenbestimmung per Foto | Kostenlos bis 500 Bestimmungen/Tag, Quellenangabe auf der Seite, [Nutzungsbedingungen](https://my.plantnet.org/terms_of_use) |
| [OpenFreeMap](https://openfreemap.org) / [OpenStreetMap](https://www.openstreetmap.org/copyright) | Kartenbasis | ODbL |
| [Sentinel-2 cloudless](https://s2maps.eu) by EOX | Satellitenbild | CC BY-NC-SA 4.0 |
| [Nominatim](https://nominatim.org) | Ortssuche, Ortsnamen | ODbL, max. 1 Anfrage/Sekunde |
| [MapLibre GL JS](https://maplibre.org) | Globus-Darstellung | BSD-3-Clause |

*The image-based plant species identification service used, is based on the Pl@ntNet recognition API, regularly updated and accessible through the site https://my.plantnet.org/*

Für eine kommerzielle Nutzung müssten iNaturalist, Pl@ntNet und das Satellitenbild ersetzt oder gesondert geklärt werden.

## Registerkarte „Bestimmen“

Ein Bestimmungsschlüssel in sechs Schritten, alles live aus iNaturalist:

1. **Was ist es?** – Pflanze, Pilz, Säugetier, Vogel, Amphibie, Reptil, Fisch, Insekt, Spinnentier, Weichtier oder anderes Tier (mit Artenzahl im Umkreis)
2. **Welche Gruppe?** – z. B. Frösche & Kröten, Korbblütler, Greifvögel (Name wird zur Laufzeit in eine iNaturalist-ID übersetzt)
3. **Was fällt auf?** – Merkmale aus `/controlled_terms/for_taxon`: Lebensstadium, Blüte & Frucht, Geschlecht, Spuren …
4. **Wann im Jahr?** – Monat der Beobachtungen
5. **Tageszeit** – Uhrzeit der Beobachtungen
6. **Wo?** – Umkreis 5–100 km um die Kartenmitte, optional nur gefährdete Arten

Das Ergebnis sind die passenden Arten, sortiert nach Anzahl passender Beobachtungen; die Karte zeigt, wo diese Beobachtungen liegen. Startansicht ist Pinnow (Mecklenburg) mit 30 km Umkreis.

## Registerkarte „Bestimmen nach Aussehen“

Alle Merkmale auf einer Seite: Oberfläche (Fell, Federn, Schuppen, glatte Haut, Panzer, Schale, schleimig, Blätter, Pilz), bei Tieren Beine, Flügel und Größe, bei Pflanzen Wuchs, Blätter und Blüte/Frucht, bei Pilzen die Form, dazu Lebensraum, „gerade eben“ und Umkreis.

Die Zuordnung „Merkmal → Tier-/Pflanzengruppe“ steht als Tabelle `LOOK_DB` in `index.html` (leicht erweiterbar). Welche Arten dieser Gruppen im Umkreis vorkommen, kommt live aus iNaturalist; „blüht gerade“, „trägt Früchte“ und „gerade eben“ sind echte API-Filter. Auswahlen, die zu nichts mehr passen würden, sind ausgegraut.

## Fotos auf der Karte

Statt einer Dichtekarte stehen runde Fotos der Lebewesen an echten Fundorten (jüngste Beobachtung mit Foto aus iNaturalist). Bis 100 km Umkreis sind es die 5 häufigsten Arten (3 Tiere, 2 Pflanzen), bei größerem Umkreis je 2 pro Gruppe. Der kleine Knopf „+ Fotos“ ergänzt je Gruppe 2 weitere. Antippen öffnet den Steckbrief. Die Fotos folgen dem aktiven Reiter und seinen Filtern.

## Registerkarte „Arten entdecken · Kombi“

Kombiniert zwei unabhängige Quellen konservativ: iNaturalist (bestätigte Beobachtungen) und GBIF (Fundmeldungen aus vielen Datenbanken). Je Quelle zählt der Anteil einer Art an ihrer Gruppe (Vögel unter Vögeln …), damit große Vogelzähl-Datensätze nicht alles überlagern. Die Rangfolge ergibt das geometrische Mittel beider Anteile; Arten, die nur eine Quelle kennt, werden nicht gewertet.

Auf der Karte stehen zusätzlich gestrichelte Zonen-Fotos: Arten, die an einer Stelle (z. B. an einem See) deutlich häufiger sind als im ganzen Umkreis. Fotos rücken zur Seite, damit sie sich nicht überdecken.
