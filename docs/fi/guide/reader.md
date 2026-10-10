# Raamatun lukunäkymä ja tutkiminen

**Raamatun lukunäkymä** (`Reader`) on clible-v3:n keskeinen lukutila. Se tukee keskittynyttä lukemista, nopeaa siirtymistä Raamatun kirjojen välillä ja käännöksen vaihtamista.

---

## 1. Käyttöliittymä ja typografia

Lukunäkymän typografia tukee pitkääkin lukutuokiota ja mukautuu erikokoisille näytöille:

- **Serif-kirjasimet**: Jakeet esitetään Georgia- tai Lora-kirjasimella, jossa riviväli ja merkkiväli tukevat luettavuutta.
- **Hienovaraiset jaenumerot**: Jaenumerot on tyylitelty hillityillä neutraaleilla/kultaisilla tunnisteilla, jotka eivät riko lukemisen soljuvuutta.
- **Mukautuvat teemat**: Tumma ja vaalea tila tarjoavat pitkään lukemiseen sopivan kontrastin.
- **Mukautuva asettelu**: Sisältö mukautuu työpöydän, tabletin ja puhelimen näytölle.

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
- **Lukuruudukko**: Valitse kirja, niin sen luvut tulevat näkyviin.
- **Seuraava / Edellinen luku -painikkeet**: Lukunäkymän alareunassa olevat painikkeet mahdollistavat jatkuvan lukemisen eteen- ja taaksepäin ilman palaamista päävalikkoon.
- **Suora viitehaku**: Kirjoita viite, kuten `Joh 3`, `Room 8` tai `Ps 23`, pikaviitepalkkiin hypätäksesi suoraan kyseiseen lukuun.

---

## 3. Dynaaminen käännöksen vaihto

Valitse lukunäkymän oikeasta yläkulmasta **Käännösvalitsin**:

- Vaihda välittömästi asennettujen käännösten välillä (esim. *KR92*, *KR38*, *World English Bible*, *King James Version*).
- Käännöstä vaihdettaessa kirja, luku ja sijainti pysyvät samoina.
- Jos haluat käyttää muita käännöksiä, avaa [Käännöskatalogi](/fi/guide/import-and-seeding) ja ota ne käyttöön.

---

## 4. Jakeen valinta ja toiminnot

Valitse jae napsauttamalla tai napauttamalla sitä. Näkyviin avautuu **Jae-toimintopalkki**:

- **Kopioi viite**: Kopioi jakeen viitteen ja tekstin suoraan leikepöydälle vakiomuotoisena sitaattina (esim. `Joh 3:16 (KR92)`).
- **Avaa vertailussa**: Avaa valitun jakeen suoraan [Käännösvertailumatriisiin](/fi/guide/compare-and-diff) rinnakkaista erittelyä varten.
- **Tutki alkukielellä**: Avaa [Alkukielet ja morfologia](/fi/guide/original-languages) ja tarkastele kreikan tai heprean sanojen perusmuotoja ja kieliopillisia muotoja.
- **Pyydä tekoälyanalyysi**: Avaa [teologiset tekoälytyökalut](/fi/guide/ai-study-tools) ja pyydä raamatunkohdasta tulkintaa tai historiallista taustoitusta.
- **Tallenna vihkoon**: Liittää jakeen suoraan aktiiviseen 2D canvas -tutkimusvihkoon.

---

## 5. Navigaatio ja työtilaintegraatio

Raamatun lukutila toimii keskusrunkona lukemiselle ja eri tutkimusnäkymien ristiinlinkitykselle:

- **Yläpalkin navigaatio**: Siirry sulavasti tutkimustilojen välillä (Lukutila, Haku, Käännösvertailu, Tekstianalytiikka, Alkukielet, Tutkimusvihkot ja Kirkkovuosikalenteri).
- **Siirtyminen viitteestä lukutilaan**: Kirkkovuosikalenterin tai hakutuloksen raamatunviitettä napsauttamalla voit avata kyseisen kohdan lukutilassa.
- **Mobiilin kelluva työtilapainike (FAB)**: Kosketusnäytöillä oikeassa alakulmassa sijaitseva kelluva painike tarjoaa nopean pääsyn Työtila-vetolaatikkoon (Workspace Drawer) peittämättä lukutekstiä.
- **Työpöydän sivupalkki**: Näyttää tutkimustyötilat, tallennetut haut ja viimeisimmät haut raamatuntekstin rinnalla.

Kirkkovuoden pyhäpäivien, hetkipalvelusten ja lukukappaleiden osalta tutustu oppaaseen [Kirkkovuosikalenteri ja hetkipalvelukset](/fi/guide/liturgical-calendar).
