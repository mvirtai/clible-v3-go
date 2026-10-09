# Tutkimustyötilat ja skoopit

clible-v3 on suunniteltu **Tutkimustyötilojen (Scope)** ympärille. Sen sijaan että kirjanmerkit, haut ja muistiinpanot pirstoutuisivat irrallisiin istuntoihin, alusta mahdollistaa eksegeettisen tutkimuksen järjestämisen fokusoituneiksi, projektikohtaisiksi kokonaisuuksiksi.

---

## Mikä on tutkimustyötila?

**Skooppi** on itsenäinen tutkimuskonteksti, joka kokoaa yhteen tiettyyn aihepiiriin, saarnasarjaan, kirja-analyysiin tai tieteelliseen artikkeliin liittyvät materiaalit.

Aktiivisessa työtilassa voit:

- **Kiinnittää tallennettuja hakuja**: Tallenna monimutkaisia kokoteksti- ja regex-hakuja tuloksineen nopeaa palauttamista varten.
- **Tallentaa tekstianalyysejä**: Säilytä leksikaaliset tilastot, sanatiheysjakaumat ja käännösvertailut.
- **Linkittää 2D Canvas -tutkimusvihkoja**: Liitä interaktiiviset muistiinpanot suoraan työtilaan.
- **Vaihtaa kontekstia lennossa**: Siirry saumattomasti tutkimusprojektista toiseen yläpalkin valitsimesta menettämättä istunnon tilaa.

```mermaid
graph TD
    User(["Kirjautunut käyttäjä"]) --> Scope["Aktiivinen työtila: Roomalaiskirje 8 Eksegetiikka"]
    
    subgraph Workspace_Scope ["Tutkimustyötila"]
        Scope --> Searches["Tallennetut haut ja Boolen kyselyt"]
        Scope --> Analyses["Tallennetut sanasto- ja frekvenssianalyysit"]
        Scope --> Notebooks["Linkitetyt 2D Canvas -tutkimusvihkot"]
    end
    
    subgraph Data_Cache ["Tietovälimuisti"]
        Searches -.-> C1["Välimuistitetut hakutulokset"]
        Analyses -.-> C2["Välimuistitetut tilastoluvut"]
        Notebooks -.-> C3["Järjestetyt hybridisolut"]
    end
```

---

## Työtilojen hallinta käyttöliittymässä

### 1. Työtilan luominen

1. Etsi ylänavigaatiopalkista **Skooppivalitsin** (Scope Selector).
2. Klikkaa **Luo uusi skooppi** (tai `+`-painiketta).
3. Anna tutkimusprojektillesi kuvaava nimi (esim. *Paavalilainen armokäsitys*, *Vuorisaarna*, *Heprealaiskirje 11 Usko*).
4. Klikkaa **Tallenna**. Uusi työtila luodaan ja asetetaan välittömästi aktiiviseksi skoopeksi.

### 2. Työtilojen välillä vaihtaminen

Skooppivalitsimen klikkaaminen avaa pudotusvalikon kaikista tutkimusprojekteistasi:

- Minkä tahansa työtilan valitseminen lataa välittömästi sen tallennetut haut, analyysit ja vihkot.
- Valitsemalla **Yleinen (Ei skooppia)** voit tehdä vapaamuotoisia hakuja ja kokeiluja liittämättä niitä mihinkään tiettyyn projektiin.

### 3. Työtilojen nimeäminen ja poistaminen

- **Nimen muokkaus**: Klikkaa aktiivisen työtilan nimen vieressä olevaa kynäikonia päivittääksesi nimen.
- **Poistaminen**: Kun työtila poistetaan, tietokanta siivoaa haku- ja analyysitiedot (`ON DELETE CASCADE`).

> [!IMPORTANT]
> **Henkilökohtaisten muistiinpanojen suoja**: Työtilaan liitettyjä tutkimusvihkoja **EI** koskaan poisteta työtilan mukana. Tietokanta suorittaa `ON DELETE SET NULL` -säännön kentälle `notebooks.scope_id`, mikä takaa, että tutkimusmuistiinpanosi, korttisi ja luonnoksesi säilyvät pysyvästi saatavilla pääkirjastossasi.

---

## Tallennetut haut

Tehdessäsi syvällistä sanastotutkimusta käännösten yli tarkennat kyselyitä usein tarkoilla rajauksilla (kuten etsimällä sanaa `"armo"` KR92-käännöksen kirjeistä tai `"grace" AND "peace"` WEB-käännöksestä).

### Haun kiinnittäminen työtilaan

1. Suorita kysely **Haku**-näkymässä.
2. Klikkaa tulospalkista **Tallenna työtilaan**.
3. Anna haulle tunnistettava nimi (esim. *Armo-sanan esiintymät Roomalaiskirjeessä*).
4. Haku tallentuu kaikkine asetuksineen:
   - Hakulauseke ja tila (fraasi, kokoteksti tai regex).
   - Hakuskooppi (koko Raamattu, VT, UT tai tietty kirjakoodi).
   - Kohdekäännös.
   - Välimuistitettu tulosdata (estää turhan palvelinkuorman uudelleenlatauksissa).

---

## Tallennetut analyysit

**Analytiikka**-näkymä laskee leksikaalisen tiheyden, sanatiheydet ja käännösten vastaavuudet.

### Analyysin tallentaminen

1. Suorita analyysi tietylle luvulle tai jaksolle (esim. *Roomalaiskirje 8 Sanastoanalyysi*).
2. Klikkaa **Tallenna analyysi työtilaan**.
3. Anna nimi ja vahvista.
4. Tarkat parametrit ja lasketut tilastolliset tulokset (kokonaissanamäärä, uniikit sanat, TTR-suhdeluku ja frekvenssitaulukot) tallentuvat työtilaasi.

---

## Suorituskykyinen yhdistetty työtilalataus

Jotta verkkosovellus toimisi salamannopeasti, backend tarjoaa yhdistetyn työtilapäätepisteen:

```http
GET /api/scopes/workspace?id={scopeId}
```

Erillisten HTTP-pyyntöjen sijaan Go REST API hakee työtilan metatiedot, sen tallennetut haut, analyysit ja linkitetyt vihkot yhdellä tietokantakyselyllä ja palauttaa yhtenäisen JSON-vastauksen:

```json
{
  "id": "7bc751d3-3b1a-4712-8df7-e62a98e82110",
  "name": "Roomalaiskirje 8 Eksegetiikka",
  "createdAt": "2026-07-09T07:00:00Z",
  "savedSearches": [
    {
      "id": "search-uuid-1",
      "name": "Haku sanalle 'armo'",
      "queryText": "armo",
      "searchScope": "book",
      "scopeValue": "ROM",
      "translationId": "kr92",
      "resultJson": "[...]"
    }
  ],
  "savedAnalyses": [
    {
      "id": "analysis-uuid-1",
      "name": "Roomalaiskirje 8 Sanastofrekvenssit",
      "reference": "Romans 8",
      "analysisType": "single_stats",
      "translationId": "kr92",
      "resultJson": "{\"totalWords\":540,\"uniqueWords\":210,...}"
    }
  ],
  "notebooks": [
    {
      "id": "nb-uuid-1",
      "title": "Roomalaiskirje 8 Kommentaari",
      "createdAt": "2026-07-09T07:12:00Z"
    }
  ]
}
```

Tämä takaa nollaviiveen ja saumattoman siirtymisen eri tutkimusprojektien välillä ilman käyttöliittymän välkkymistä.
