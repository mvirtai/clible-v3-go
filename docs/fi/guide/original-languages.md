# Alkukielet ja morfologia

**Alkukielten tutkimusnäkymä** (`/original`) tarjoaa tutkijoille, teologeille ja kielistä kiinnostuneille syvällisen morfologisen ja leksikaalisen erittelyn Raamatun hepreasta (Vanha testamentti) ja koinee-kreikasta (Uusi testamentti).

---

## 1. Lähdetekstit ja kielipaketit

clible-v3 tukee standardeja tieteellisiä alkukielten tekstieditioita:

- **Koinee-kreikka**: SBL Greek New Testament (`greeksblgnt`).
- **Raamatun heprea**: Aleppo Codex ja Leningrad Codex (`hebrewaleppocodex`).

Kun valitset lukukappaleen, järjestelmä tunnistaa automaattisesti, kuuluuko viite Vanhaan testamenttiin (heprea) vai Uuteen testamenttiin (kreikka), ja aktivoi vastaavan lähdekielimoottorin.

```
┌────────────────────────────────────────────────────────────────────────┐
│  📜 Alkukielten tutkimus: Johannes 1:1 (Koinee-kreikka)                │
│  ────────────────────────────────────────────────────────────────────  │
│  Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν, καὶ θεὸς ἦν ὁ λόγος.│
│  ────────────────────────────────────────────────────────────────────  │
│  Interlineaarinen sana-analyysi:                                       │
│                                                                        │
│  [1] Ἐν (en)         — Prep (In / With)                                │
│  [2] ἀρχῇ (archē)    — Noun: Dat, Fem, Sg (Beginning / Origin)        │
│  [3] ἦν (ēn)         — Verb: Impf, Act, Ind, 3rd Sg (Was / Existed)    │
│  [4] ὁ (ho)          — Def Art: Nom, Masc, Sg (The)                    │
│  [5] λόγος (logos)   — Noun: Nom, Masc, Sg (Word / Divine Reason)      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Interlineaarinen erittely ja kieliopilliset tunnisteet

Jokaiselle alkukielen sanalle interlineaarinen analyysi tarjoaa:

1. **Alkuperäinen kirjoitusasu ja translitteraatio**: Selkeä kreikan tai heprean kirjasin foneettisella translitteraatiolla.
2. **Lemma (perusmuoto)**: Sanan taivuttamaton sanakirjamuoto.
3. **Sanaluokka ja kieliopilliset tunnisteet**:
   - **Substantiivit / Adjektiivit**: Sijamuoto (nominatiivi, genetiivi, datiivi, akkusatiivi, vokatiivi), suku (maskuliini, feminiini, neutri), luku (yksikkö, monikko).
   - **Verbit**: Aikamuoto (preesens, aoristi, imperfekti, perfekti, pluskvamperfekti, futuuri), pääluokka (aktiivi, medipassiivi, passiivi), tapaluokka (indikatiivi, konjunktiivi, imperatiivi, infinitiivi, partisiippi), persoona ja luku.
4. **Semanttinen merkityskenttä**: Kattava sanakirjamääritelmä ja käännösvastineet.

---

## 3. Kontekstuaalinen eksegetiikka ja kantasanatutkimus

Yksittäisten sanojen ohella näkymä syntetisoi laajemman kielellisen kokonaisuuden:

- **Syntaksi ja sanajärjestys**: Selittää poikkeukselliset sanajärjestykset, korostukset ja kiasmit.
- **Teologisten avainsanojen erittely**: Avaa sanoja, joilla on rikas opillinen tausta (kuten *Hesed*, *Agape*, *Dikaiosyne*, *Shalom*).
- **Tutkimusehdotukset (NextFocusChips)**: Interaktiiviset napit tarjoavat lisätutkimuspolkuja (esim. *Tutki Johanneksen Logos-käsitettä*, *Vertaile 1. Moos. 1:1 heprean Bereshit-sanaan*).
- **Syventävät eksegeettiset kortit**: Laajennettavat osiot tarjoavat historiallis-kieliopillista taustaa.
