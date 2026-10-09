# Raamatun lukunäkymä ja tutkiminen

**Raamatun lukunäkymä** (`Reader`) on clible-v3:n keskeinen lukutila, joka on suunniteltu häiriöttömään lukemiseen, nopeaan liikkumiseen koko raamatunkaanonissa sekä vaivattomaan käännöksen vaihtamiseen.

---

## 1. Käyttöliittymä ja typografia

Lukunäkymä on viimeistelty toimituksellisella typografialla, jotta pitkäaikainenkin lukeminen ja tutkiminen tuntuisi miellyttävältä kaikilla näyttökokoluokilla:

- **Klassinen serif-typografia**: Jakeet esitetään luettavalla Georgia/Lora-kirjasimella tasapainotetulla rivivälillä ja optimoidulla merkkivälityksellä.
- **Hienovaraiset jaenumerot**: Jaenumerot on tyylitelty hillityillä neutraaleilla/kultaisilla tunnisteilla, jotka eivät riko lukemisen soljuvuutta.
- **Mukautuvat teemat**: Automaattiset tummat ja vaaleat tilat pehmeällä kontrastilla ehkäisevät silmien rasittumista pitkien tutkimussessioiden aikana.
- **Responsiivinen asettelu**: Sarakkeiden leveys skaalautuu sulavasti työpöydän laajakuvanäytöiltä tableteille ja mobiililaitteille.

```
┌────────────────────────────────────────────────────────────────────────┐
│  📖 Johannes 3 (Pyhä Raamattu 1992)                 [ ⚙️ Käännös ]     │
│  ────────────────────────────────────────────────────────────────────  │
│  1  Fariseusten joukossa oli Nikodemos-niminen mies, juutalaisten...   │
│  2  Hän tuli yöllä Jeesuksen luo ja sanoi: "Rabbi, me tiedämme...     │
│  ...                                                                   │
│  16 Sillä niin on Jumala maailmaa rakastanut, että hän antoi ainoan    │
│     Poikansa, ettei yksikään, joka häneen uskoo, hukkuisi...          │
│  ...                                                                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Kaanonin kirjojen ja lukujen selaus

Liikkuminen Raamatun 66 kanonisen kirjan välillä on välitöntä:

- **Testamenttiryhmittely**: Nopea valitsin jakautuu **Vanhaan testamenttiin** (39 kirjaa, 1. Mooseksen kirjasta Malakiaan) ja **Uuteen testamenttiin** (27 kirjaa, Matteuksesta Ilmestyskirjaan).
- **Lukuruudukko**: Klikkaamalla kirjaa avautuu sen täysi lukuruudukko.
- **Seuraava / Edellinen luku -painikkeet**: Lukunäkymän alareunassa olevat painikkeet mahdollistavat jatkuvan lukemisen eteen- ja taaksepäin ilman palaamista päävalikkoon.
- **Suora viitehaku**: Kirjoita viite, kuten `Joh 3`, `Room 8` tai `Ps 23`, pikaviitepalkkiin hypätäksesi suoraan kyseiseen lukuun.

---

## 3. Dynaaminen käännöksen vaihto

Klikkaa lukunäkymän oikeasta yläkulmasta **Käännösvalitsinta**:

- Vaihda välittömästi asennettujen käännösten välillä (esim. *KR92*, *KR38*, *World English Bible*, *King James Version*).
- Käännöstä vaihdettaessa tarkka kirja, luku ja lukukohdan sijainti säilytetään häiriöttä.
- Mikäli haluat ottaa käyttöön uusia käännöksiä, avaa [Käännöskatalogi](/fi/guide/import-and-seeding) aktivoidaksesi muita kielipaketteja.

---

## 4. Jakeen valinta ja toiminnot

Klikkaamalla tai napauttamalla mitä tahansa yksittäistä jaetta lukutilassa avautuu **Jae-toimintopalkki**:

- **Kopioi viite**: Kopioi jakeen viitteen ja tekstin suoraan leikepöydälle vakiomuotoisena sitaattina (esim. `Joh 3:16 (KR92)`).
- **Avaa vertailussa**: Avaa valitun jakeen suoraan [Käännösvertailumatriisiin](/fi/guide/compare-and-diff) rinnakkaista erittelyä varten.
- **Tutki alkukielellä**: Avaa [Alkukielet ja morfologia](/fi/guide/original-languages) -näkymän tarkastellaksesi kreikan tai heprean kantasanoja, lemmoja ja kieliopillisia muotoja.
- **Pyydä AI-selitys**: Käynnistää [Teologisen AI-moottorin](/fi/guide/ai-study-tools) ja tarjoaa eksegeettisen kommentaarin sekä historiallisen kontekstin.
- **Tallenna vihkoon**: Liittää jakeen suoraan aktiiviseen 2D canvas -tutkimusvihkoon.

---

## 5. Navigaatio ja työtilaintegraatio

Raamatun lukutila toimii keskusrunkona lukemiselle ja eri tutkimusnäkymien ristiinlinkitykselle:

- **Yläpalkin navigaatio**: Siirry sulavasti tutkimustilojen välillä (Lukutila, Haku, Käännösvertailu, Tekstianalytiikka, Alkukielet, Tutkimusvihkot ja Kirkkovuosikalenteri).
- **Ristiviittaukset suoraan lukutilaan**: Raamattuviitteen klikkaaminen Kirkkovuosikalenterissa, Haku-näkymässä tai Lukusuunnitelmissa avaa välittömästi kyseisen kohdan lukutilassa.
- **Mobiilin kelluva työtilapainike (FAB)**: Kosketusnäytöillä oikeassa alakulmassa sijaitseva kelluva painike tarjoaa nopean pääsyn Työtila-vetolaatikkoon (Workspace Drawer) peittämättä lukutekstiä.
- **Työpöydän sivupalkki**: Pitää tutkimusskoopit, tallennetut haut ja viimeisimmät haut jatkuvasti saatavilla raamatuntekstin rinnalla.

Kirkkovuoden pyhäpäivien, hetkipalvelusten ja lukukappaleiden osalta tutustu oppaaseen [Kirkkovuosikalenteri ja hetkipalvelukset](/fi/guide/liturgical-calendar).
