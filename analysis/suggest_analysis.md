# Analyysi: `/suggest`-komennon toiminta ja kehityskohteet

Tässä dokumentissa käydään läpi Clible Notebooks -ominaisuuden `/suggest`-komennon nykyinen toimintalogiikka, sen suunniteltu käyttötarkoitus, syyt miksi se voi palauttaa nolla tulosta laajemmalla aineistolla, sekä ehdotukset sen hienosäätämiseksi.

---

## 1. Nykyinen toimintalogiikka (Miten se toimii nyt)

Kun käyttäjä suorittaa koodisolussa komennon `/suggest`, backend suorittaa seuraavat vaiheet:

1. **Kontekstin kerääminen (`notebook_service.go`):**
   - Hakee kaikki muistikirjan solut, joiden tyyppi on `markdown` ja joiden järjestysnumero (`Position`) on **pienempi** kuin suoritettavan koodisolun positio.
   - Yhdistää näiden solujen sisällöt yhdeksi pitkäksi tekstimerkkijonoksi (`contextText`).

2. **Avainsanojen erottelu (`cli_service.go` -> `ExtractKeywords`):**
   - Puhdistaa tekstin poistamalla kaikki muut merkit paitsi aakkoset (`a-z`, `A-Z`, `äöÄÖåÅ`) ja tyhjät välit.
   - Muuttaa tekstin pieniksi kirjaimiksi ja jakaa sen sanoiksi.
   - Suodattaa pois sanat, jotka ovat **3 merkkiä tai lyhyempiä** (tosin Go-kielessä UTF-8-merkki `ä` tai `ö` vie 2 tavua, joten esim. "hän" on 4 tavun pituinen ja pääsee läpi).
   - Suodattaa pois kovakoodatut "stop-sanat" (täytesanat). Nykyinen lista sisältää vain 12 suomenkielistä sanaa: `ja`, `se`, `on`, `että`, `kuin`, `mutta`, `he`, `ne`, `kun`, `jos`, `tai`, `vai`.
   - Laskee jäljelle jääneiden sanojen esiintymisfrekvenssit.
   - Valitsee **5 yleisintä sanaa** ja palauttaa nämä avainsanoina.

3. **Tietokantahaku (`verse_repo.go` -> `SearchByKeywords`):**
   - Rakentaa avainsanoista PostgreSQL-kokotekstihakukyselyn (FTS) käyttämällä `OR`-operaattoria (`|`) ja etuliitehakuun tarkoitettua tähteä (`:*`), esimerkiksi: `rakkaus:* | armo:* | jumala:*`.
   - Suorittaa haun tietokannan `verses`-taulukkoon rajaamalla tulokset valittuun käännökseen (`translation_id`):
     ```sql
     SELECT id, translation_id, book_id, chapter, verse, text
     FROM verses
     WHERE translation_id = $1
       AND to_tsvector('english', text) @@ to_tsquery('english', $2)
     ORDER BY ts_rank(to_tsvector('english', text), to_tsquery('english', $2)) DESC
     LIMIT 5;
     ```

---

## 2. Suunniteltu toimintalogiikka (Miten sen pitäisi toimia)

Komennon `/suggest` tarkoituksena on toimia älykkäänä tutkimusapulaisena:
- Sen tulisi havaita käyttäjän tekemistä muistiinpanoista punainen lanka eli keskeisimmät **teologiset teemat** (esim. *armo, rakkaus, kaste, usko, lupaus, henki*).
- Tämän jälkeen sen pitäisi suositella näihin teemoihin liittyviä uusia jakeita aktiivisesta käännöksestä, joita käyttäjä ei vielä ole lisännyt muistikirjaansa, tarjoten näin inspiraatiota ja lisäkontekstia tutkimukseen.

---

## 3. Ongelmat laajalla tai jäädytetyllä (Freezed) aineistolla

Kun muistikirja kasvaa tai siihen lisätään paljon jakeita "Convert to Markdown" (Freeze) -toiminnolla, hakutulokset alkavat usein palauttaa **nolla tulosta (0 osumaa)**. Tämä johtuu seuraavista tekijöistä:

### A. Kieliopillinen ja rakenteellinen kohina (Noise Dilution)
Koska stop-sanalista on erittäin suppea (vain 12 suomenkielistä sanaa), laajassa aineistossa kaikkein yleisimmiksi sanoiksi nousevat suomen kielen yleiset täytesanat, jotka ovat yli 3 merkkiä pitkiä. Esimerkiksi:
- Pronominit ja apusanat: `joka`, `minä`, `sinä`, `tämä`, `siinä`, `siitä`, `muut`, `vain`, `itse`.
- Verbit: `ovat`, `olivat`, `olisi`, `tulee`, `sanoi`.
- Myös lyhyt sana `hän` pääsee läpi, koska `ä` vie UTF-8:ssa 2 tavua, jolloin `len("hän")` on 4 tavua.
Nämä sanat täyttävät top-5 avainsanalistan, eikä teologisesti merkittäville sanoille jää tilaa.

### B. Metadatan aiheuttama saastuminen (Metadata Pollution)
Kun jakeita jäädytetään markdowniksi, frontend tuottaa seuraavanlaista tekstiä:
> **Johannes 3:16-18 (KR92)**
> **16** Sillä niin on Jumala maailmaa rakastanut...

Kun tätä analysoidaan, usein toistuvat metadatasanat nousevat suosituimmiksi:
- Kirjojen nimet: `johannes`, `roomalaisille`, `psalmit` jne.
- Käännöstunnisteet: `kr92`, `web`.
- Rakennesanat: `luku`, `jae`, `jakeet`.
**Kriittinen ongelma:** Raamattujen jakeiden tekstikenttä (`text`-sarake tietokannassa) sisältää *ainoastaan* itse jakeen tekstin. Se **ei** sisällä kirjan nimeä tai käännöstunnusta. Jos avainsanoiksi valikoituu esim. `["johannes", "kr92", "luku", "jae", "sillä"]`, haku yrittää etsiä jakeita, joiden tekstissä lukee "johannes" tai "kr92". Koska näitä sanoja ei yleensä ole itse jakeen leipätekstissä, haku palauttaa 0 osumaa.

### C. Taivutusmuodot ja etuliitehaun yksisuuntaisuus (Inflection & Prefix Matching)
PostgreSQL-haussa on tällä hetkellä kovakoodattu englanninkielinen hakuprofiili `'english'`:
`to_tsvector('english', text) @@ to_tsquery('english', $2)`
- Se ei osaa käsitellä suomen kielen taivutusmuotoja (kuten `armosta`, `hengessä`, `maailmaan`).
- FTS-haku suorittaa etuliitehaun (`avainsana:*`). 
- Jos käyttäjän muistiinpanoissa lukee `armosta`, avainsanaksi valitaan `armosta` ja kyselyksi muodostuu `armosta:*`.
- Tietokannassa jae sisältää sanan `armo`.
- Koska sana `armo` on **lyhyempi** kuin `armosta`, se ei ala merkkijonolla `armosta`. Siksi `armosta:*` **ei täsmää** sanaan `armo`! (Etuliitehaku toimii vain juuresta johdokseen päin, ei toisinpäin).

### D. Käännösristiriidat (Translation Mismatches)
Jos muistiinpanot ovat suomeksi (esim. jäädytetty `KR92`-käännöksestä), avainsanoiksi saadaan suomenkielisiä sanoja (kuten `jumala`, `rakastanut`). 
Jos CLI-paneelissa tai muistikirjan aktiivisena käännöksenä on oletusarvoinen englanninkielinen `WEB`, backend suorittaa haun englanninkielisestä Raamatusta suomenkielisillä sanoilla, mikä palauttaa aina 0 tulosta.

---

## 4. Ehdotetut hienosäädöt (Miten tämä korjataan)

Jotta `/suggest` saadaan toimimaan luotettavasti myös laajalla suomenkielisellä materiaalilla, suositellaan seuraavia toimenpiteitä:

1. **Laajennetaan stop-sanalistaa (`cli_service.go`):**
   Lisätään kattava lista suomen kielen pronomineista, yleisistä apuverbeistä (kuten *olla* eri muodoissaan) sekä rakenteellisista sanoista (kuten *luku*, *jae*, *jakeet*, *käännös*).
   
2. **Korjataan pituustarkistus merkkitasoiseksi (Runes):**
   Käytetään Go-kielessä `utf8.RuneCountInString(w)` tavujen pituuden sijaan, jolloin "hän" (3 merkkiä) suodattuu oikein pois.

3. **Suodatetaan pois kirjojen nimet ja käännökset avainsanoista:**
   Avainsanoja eroteltaessa ohitetaan tunnetut Raamatun kirjojen nimet (sekä suomeksi että englanniksi) ja käännöstunnukset (kuten `kr92`, `web`, `kjv`, `biblia`), jotta ne eivät saastuta hakua.

4. **Käytetään `'simple'`- tai `'finnish'`-profiilia PostgreSQL-haussa:**
   Asetetaan FTS-haku käyttämään joko `'simple'`-määritystä (joka ei tee englanninkielistä taivutusta) tai valitaan sanakirja dynaamisesti käännöksen kielen mukaan.
