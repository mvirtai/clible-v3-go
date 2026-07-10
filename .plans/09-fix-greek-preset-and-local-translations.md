# Suunnitelma: Kreikan preset-linkin korjaus ja paikalliset XML-käännökset

Tämä suunnitelma kuvaa vaiheet, joilla korjataan kreikankielisen käännöksen (SBLGNT) toimimaton presets-linkki ja ladataan yleisimmät XML-käännöstiedostot paikallisesti projektin juuren `xml_translations/`-hakemistoon.

---

## 1. Vaihe: Uuden aihealueen haaran (Topic Branch) luominen

Koska sandbox-ympäristön komentotulkki on tällä hetkellä alhaalla unix-socket-virheen vuoksi, kehittäjän tulee ajaa terminaalissaan seuraava komento uuden aihealueen haaran luomiseksi ja siihen siirtymiseksi:

```bash
git switch -c fix/greek-preset-and-local-translations
```

---

## 2. Vaihe: Yleisimpien käännösten lataaminen paikallisesti

Ladataan varmuuden vuoksi yleisimmät XML-käännökset suoraan kehittäjän terminaalissa projektin juuren `xml_translations/`-hakemistoon. Tämä varmistaa, että tiedostot ovat tallessa ja asennettavissa paikallisesti, vaikka etälinkit muuttuisivat tulevaisuudessa.

Suorita seuraavat komennot projektin juurikansiossa:

```bash
# Luodaan kansio tarvittaessa
mkdir -p xml_translations

# 1. Kreikka: SBL Greek New Testament (Beblia)
curl -L -o xml_translations/greeksblgnt.xml https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/GreekSBLGNTBible.xml

# 2. Heprea: Leningrad Codex (seven1m)
curl -L -o xml_translations/heb-leningrad.usfx.xml https://raw.githubusercontent.com/seven1m/open-bibles/master/heb-leningrad.usfx.xml

# 3. Suomi: Kirkkoraamattu 1933/38 (seven1m)
curl -L -o xml_translations/fin-biblia-33-38.osis.xml https://raw.githubusercontent.com/seven1m/open-bibles/master/fin-biblia.osis.xml

# 4. Suomi: Kirkkoraamattu 1992 (Beblia)
curl -L -o xml_translations/fin-1992.xml https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/Finnish1992Bible.xml

# 5. Suomi: Biblia 1776 (Beblia)
curl -L -o xml_translations/fin-1776.xml https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/Finnish1776Bible.xml

# 6. Korjataan heprean Leningrad Codexin tunnettu XML-syntaksivirhe (linjalla 1030 tagi <ook id="EST"> -> <book id="EST">)
sed -i 's/<ook id="EST">/<book id="EST">/g' xml_translations/heb-leningrad.usfx.xml
```

---

## 3. Vaihe: Presets-linkkien korjaaminen frontendissä

Tekoäly-agentti tekee seuraavan korjauksen tiedostoon `frontend/src/components/TranslationManager.tsx`.

### Korjattava kohde: `frontend/src/components/TranslationManager.tsx`

Päivitetään `PRESET_TRANSLATIONS` sisältämään toimiva linkki kreikankieliselle SBLGNT-versiolle Scott Fleischmanin vanhan (404) linkin sijaan.

```diff
  {
    id: 'sblgnt',
    name: 'SBL Greek New Testament',
    lang: 'grc',
-   url: 'https://raw.githubusercontent.com/scott-fleischman/sblgnt-osis/master/sblgnt.xml'
+   url: 'https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/GreekSBLGNTBible.xml'
  },
```

---

## 4. Vaihe: Laaduntarkistus ja testien ajaminen

Kun muutokset on tehty ja tiedostot ladattu:

1. Kehittäjä voi ajaa testit ja tarkistukset terminaalissa:
   ```bash
   task check
   ```
2. Kun kaikki testit menevät läpi, tehdään commit ja push:
   ```bash
   task git:stage-commit-push MESSAGE="fix: update greek preset url to Beblia and add local backup command instructions"
   ```
