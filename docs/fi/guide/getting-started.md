# Yleiskatsaus ja pikaopas

Tervetuloa **clible-v3**-alustalle — verkkopohjaiseen ympäristöön Raamatun tutkimista ja tekstianalyysia varten.

clible-v3 yhdistää raamatuntekstien selailun, eri käännösten vertailun, määrällisen kielentutkimuksen ja interaktiiviset **2D Canvas -tutkimusvihkot**. Vihkoihin voi upottaa **ISLA-kyselykielen** komentoja.

---

## 1. Verkkosovelluksen arkkitehtuuri

Toisin kuin perinteiset työpöytä- tai komentoriviohjelmat, clible-v3 on rakennettu alusta alkaen **pilvinatiiviksi verkkosovellukseksi**:

- **Ei asennusta käyttäjän laitteelle**: Käytä tutkimusmateriaalejasi, muistiinpanojasi ja työtilojasi selaimella tietokoneella, tabletilla tai puhelimella.
- **Turvallinen pilvitallennus**: Työtilat, kiinnitetyt haut, leksikaaliset analyysit ja 2D canvas -vihkot tallentuvat turvallisesti suorituskykyiseen PostgreSQL-tietokantaan.
- **Haku ja tekstianalyysi**: Etsi raamatunkohtia kokotekstihaulla tai säännöllisillä lausekkeilla (regex) ja vertaile käännöksiä rinnakkain.
- **Suomen- ja englanninkielinen käyttöliittymä**: Valitse käyttöliittymän kieleksi suomi (`fi`) tai englanti (`en`) ja käytä sovellusta tummassa tai vaaleassa tilassa.

```mermaid
flowchart TD
    User(["Tutkija / Käyttäjä"]) --> Browser["Verkkoselain"]
    
    subgraph Web_Platform ["clible-v3 Verkkoympäristö"]
        Browser --> Nav["Ylänavigaatio ja työtilavalitsin"]
        
        Nav --> Reader["📖 Raamatun lukutila"]
        Nav --> Search["🔎 Haku- ja suodatusmoottori"]
        Nav --> Compare["⚖️ Käännösvertailumatriisi"]
        Nav --> Analytics["📊 Tekstianalytiikka ja sanatiheydet"]
        Nav --> Notebooks["📓 2D Canvas -tutkimusvihkot ja ISLA"]
        Nav --> AI["🤖 Tekoälyavusteinen tutkimus"]
    end
    
    subgraph Cloud_Backend ["Pilvipalvelin"]
        Reader & Search & Compare & Analytics & Notebooks & AI --> API["Tilaton Go REST API"]
        API --> DB[("Neon PostgreSQL -tietokanta")]
        API --> AIService["Gemini AI -moottori"]
    end
```

---

## 2. Käyttöliittymässä liikkuminen

Näytön yläreunan navigaatiopalkki tarjoaa välittömän pääsyn kaikkiin keskeisiin tutkimustyökaluihin:

| Näkymä | Ikoni / Tunniste | Päätoiminto |
| --- | --- | --- |
| **Lukutila** | 📖 `Lukutila` | Lukunäkymä luvuittain, jakeiden valinta ja käännöksen vaihto. |
| **Haku** | 🔎 `Haku` | Kokoteksti-, lauseke- ja regex-haut kirja- tai testamenttirajauksilla. |
| **Vertailu** | ⚖️ `Vertailu` | Vertaa käännöksiä rinnakkain ja tarkastele tekstieroja. |
| **Analytiikka** | 📊 `Analytiikka` | Sanaston monimuotoisuus (TTR), sanamäärät ja frekvenssilistaukset. |
| **Tutkimusvihkot** | 📓 `Vihkot` | 2D-ruudukko, Markdown-muistiinpanot ja päivittyvät ISLA-kyselyt. |
| **Työtilat** | 🗂️ `Skoopit` | Vaihda aktiivista tutkimusprojektia ja eristä tallennetut haut ja muistiinpanot. |
| **Katalogi** | 📚 `Katalogi` | Ota käyttöön, hallitse tai lataa uusia raamatunkäännöksiä. |
| **Teema / Kieli** | ☀️/🌙 & 🇫🇮/🇬🇧 | Vaihda tummaa ja vaaleaa tilaa sekä suomen ja englannin kieltä. |

---

## 3. Viiden minuutin pikaopas

Seuraa tätä lyhyttä esittelyä tutustuaksesi verkkosovelluksen ydintoimintoihin:

### Vaihe 1: Avaa lukunäkymä ja valitse käännös

1. Valitse yläpalkista **Lukutila** (`Reader`).
2. Valitse kirja (esim. *Johannes*) ja luku (*Luku 3*).
3. Valitse käännösvalitsimesta haluamasi käännös (esim. *KR92*, *KR38*, *World English Bible* tai *King James Version*).
4. Jakeet esitetään selkeällä ja miellyttävällä serif-typografialla, joka on optimoitu häiriöttömään lukemiseen.

### Vaihe 2: Vertaile käännöksiä rinnakkain

1. Avaa **Vertailu**-näkymä (`Compare`).
2. Syötä raamattuviite, kuten `Joh 3:16` tai `Room 5:1`.
3. Valitse kaksi vertailtavaa käännöstä (esim. `KR92` ja `KR38`).
4. Järjestelmä asettaa jakeet rinnakkaisiin sarakkeisiin ja korostaa sanastoerot ja tekstuaaliset poikkeamat väreillä.

### Vaihe 3: Suorita rajattu kokotekstihaku

1. Avaa **Haku**-näkymä (`Search`).
2. Kirjoita hakusana (esim. `armo`).
3. Aseta **Skooppi** arvoon *Uusi testamentti* tai tiettyyn kirjaan, kuten *Roomalaiskirje*.
4. Tarkastele hakusanojen korostuksia ja avaa tulos nähdäksesi jakeen laajemmassa asiayhteydessään.

### Vaihe 4: Luo oma tutkimustyötila

1. Avaa yläpalkin **Skooppivalitsin** ja valitse **Luo uusi skooppi**.
2. Anna työtilalle nimi (esim. `Roomalaiskirjeen tutkimus`).
3. Tästä eteenpäin kaikki tallentamasi haut ja analyysit järjestyvät siististi tämän projektin alle.

### Vaihe 5: Laadi interaktiivinen 2D Canvas -tutkimusvihko

1. Avaa **Tutkimusvihkot** ja valitse **Uusi vihko**.
2. Lisää **Markdown-solu** ja kirjoita omat havaintosi ja kommentaarisi.
3. Upota elävä ISLA-kysely suoraan muistiinpanojesi lomaan:

   ```markdown
   Keskeinen vertailukohta:
   ! @(Joh 3:16).vs(KR92, KJV) =>
   ```

4. Lisää **CLI-luonnoslehtiösolu** (`$ clible`) testataksesi hakuja dynaamisesti:

   ```bash
   clible search "armo" --scope=ROM
   ```

5. Valitse haluamasi jakeet valintaruuduilla ja napsauta **Jäädytä**. Jakeet tallentuvat pysyväksi Markdown-soluksi.
6. Asettele ja skaalaa vihkon kortteja vapaasti 24 sarakkeen ruudukkokankaalla luodaksesi juuri sinulle sopivan visuaalisen tutkimusnäkymän.

---

## 4. Käyttäjätilit ja tietoturva

- **Käyttäjätilit**: Luo tili sähköpostilla ja salasanalla (**Rekisteröidy** tai **Kirjaudu**).
- **Istunnon suojaus**: Istunnot todennetaan turvallisilla HTTP-only JWT -evästeillä, mikä suojaa muistiinpanosi luvattomalta pääsyltä.
- **Tietojen eristys**: Kaikki työtilat, henkilökohtaiset muistiinpanot, hakuhistoriat ja omat käännökset on suojattu ja eristetty tiukasti omalle käyttäjätilillesi.

---

## 5. Itseisännöinti ja kehittäjäasetukset

Oletko ohjelmistokehittäjä tai järjestelmäylläpitäjä, joka haluaa ajaa clible-v3-alustaa omalla palvelimellaan tai osallistua kehitystyöhön?

Tutustu kattavaan [Itseisännöinti ja asennus](/fi/guide/self-hosting) -oppaaseemme, josta löydät vaiheittaiset ohjeet Docker-konttien pystytykseen, Go-backendin konfigurointiin, PostgreSQL-asetuksiin ja Taskfile-automaatioon.
