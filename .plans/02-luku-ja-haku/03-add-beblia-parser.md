# Toteutusohje: BEBLIA-parserin tuki ja suomenkieliset käännöspresetit

Tämä tiedosto sisältää yksityiskohtaiset ohjeet ja valmiit koodilohkot BEBLIA-XML-formaatin lisäämiseksi backend-parseriin sekä Kirkkoraamattu 1992:n ja 1933/38:n tuomiseksi frontendin asennuspaneeliin.

---

## 1. Backend: orderedBookIDs-taulukko ja Beblia-tuki

Avaa tiedosto [backend/internal/parsers/xml_parser.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/parsers/xml_parser.go).

### Vaihe A: orderedBookIDs-taulukon lisäys

Beblia-XML käyttää kirjan nimen sijasta järjestysnumeroita (1–66). Koska Raamatun kirjajärjestys on universaali vakio, luomme parserin alkuun staattisen hakutaulukon numeroiden kääntämiseksi 3-kirjaimisiksi kanonisiksi tunnuksiksi (esim. `1` -> `GEN`, `43` -> `JHN`).

Lisää seuraava taulukkomäärittely heti import-lohkon jälkeen (ennen `XMLVerseParser` structia):

```go
var orderedBookIDs = []string{
 "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA",
 "1KI", "2KI", "1CH", "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO",
 "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO",
 "OBD", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL",
 "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH",
 "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS",
 "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
}
```

### Vaihe B: ParseStream-metodin laajennus

Päivitetään XML-striimaaja tunnistamaan Beblia-formaatin tagit:

* `<book number="X">`: Käännetään `number` kanoniseksi ID:ksi `orderedBookIDs`-taulukosta.
* `<chapter number="Y">`: Parsitaan luvun numero `number`-attribuutista tagin `<c>` lisäksi.
* `<verse number="Z">`: Parsitaan jakeen numero `number`-attribuutista.

Korvaa olemassa oleva `ParseStream`-metodi seuraavalla toteutuksella:

```go
// ParseStream reads tokens sequentially from r and fires the callback for every discovered verse.
func (p *XMLVerseParser) ParseStream(r io.Reader, callback func(models.Verse) error) error {
 decoder := xml.NewDecoder(r)

 var currentBook string
 var currentChapter int
 var inVerse bool
 var verseNum int
 var textBuilder strings.Builder
 var skipDepth int

 emitVerse := func() error {
  if !inVerse {
   return nil
  }
  inVerse = false
  cleanText := strings.TrimSpace(strings.Join(strings.Fields(textBuilder.String()), " "))
  textBuilder.Reset()

  if currentBook != "" && currentChapter > 0 && verseNum > 0 && cleanText != "" {
   v := models.Verse{
    BookID:  currentBook,
    Chapter: currentChapter,
    Verse:   verseNum,
    Text:    cleanText,
   }
   if err := callback(v); err != nil {
    return fmt.Errorf("parser streaming callback execution aborted: %w", err)
   }
  }
  return nil
 }

 for {
  token, err := decoder.Token()
  if err == io.EOF {
   break
  }
  if err != nil {
   return fmt.Errorf("xml streaming tokenization failed: %w", err)
  }

  switch se := token.(type) {
  case xml.StartElement:
   tagName := se.Name.Local

   switch tagName {
   case "book":
    for _, attr := range se.Attr {
     if attr.Name.Local == "id" {
      currentBook = attr.Value
     } else if attr.Name.Local == "number" {
      var bookNum int
      if _, err := fmt.Sscanf(attr.Value, "%d", &bookNum); err == nil {
       if bookNum >= 1 && bookNum <= len(orderedBookIDs) {
        currentBook = orderedBookIDs[bookNum-1]
       }
      }
     }
    }
   case "c", "chapter":
    for _, attr := range se.Attr {
     if attr.Name.Local == "id" || attr.Name.Local == "number" {
      // Explicitly ignore returns to pass errcheck lint rules safely
      _, _ = fmt.Sscanf(attr.Value, "%d", &currentChapter)
     }
    }
   case "v", "verse":
    if err := emitVerse(); err != nil {
     return err
    }
    for _, attr := range se.Attr {
     if attr.Name.Local == "id" || attr.Name.Local == "number" {
      // Explicitly ignore returns to pass errcheck lint rules safely
      _, _ = fmt.Sscanf(strings.Split(attr.Value, "-")[0], "%d", &verseNum)
     } else if attr.Name.Local == "osisID" {
      // Parse standard OSIS format like "Gen.1.1"
      parts := strings.Split(attr.Value, ".")
      if len(parts) == 3 {
       currentBook = parts[0]
       // Explicitly ignore returns to pass errcheck lint rules safely
       _, _ = fmt.Sscanf(parts[1], "%d", &currentChapter)
       _, _ = fmt.Sscanf(parts[2], "%d", &verseNum)
      }
     }
    }
    inVerse = true
    textBuilder.Reset()
   case "ve":
    if err := emitVerse(); err != nil {
     return err
    }
   case "f", "x":
    skipDepth++
   }

  case xml.EndElement:
   tagName := se.Name.Local
   switch tagName {
   case "v", "verse":
    if inVerse && (tagName == "verse" || textBuilder.Len() > 0) {
     if err := emitVerse(); err != nil {
      return err
     }
    }
   case "f", "x":
    if skipDepth > 0 {
     skipDepth--
    }
   }

  case xml.CharData:
   if inVerse && skipDepth == 0 {
    textBuilder.Write(se)
   }
  }
 }

 return emitVerse()
}
```

---

## 2. Backend: Unit-testin lisäys BEBLIA-formaatille

Avaa tiedosto [backend/internal/parsers/xml_parser_test.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/parsers/xml_parser_test.go).

Lisää testitiedoston loppuun (juuri ennen tiedoston viimeistä sulkevaa aaltosuljetta) seuraava testitapaus BEBLIA-suoratoistolle:

```go
 t.Run("successfully streams valid BEBLIA simple elements structure", func(t *testing.T) {
  bebliaMock := `
  <bible translation="Finnish 1992">
   <testament name="Old">
    <book number="1">
     <chapter number="1">
      <verse number="1">Alussa Jumala loi taivaan ja maan.</verse>
      <verse number="2">Maa oli autio ja tyhjä.</verse>
     </chapter>
    </book>
   </testament>
  </bible>`

  var results []models.Verse
  err := parser.ParseStream(strings.NewReader(bebliaMock), func(v models.Verse) error {
   results = append(results, v)
   return nil
  })

  if err != nil {
   t.Fatalf("unexpected beblia parsing collapse error: %v", err)
  }

  if len(results) != 2 {
   t.Fatalf("expected 2 structured verses streamed, got %d", len(results))
  }

  // Kirja numero 1 on GEN
  if results[0].BookID != "GEN" || results[0].Chapter != 1 || results[0].Verse != 1 {
   t.Errorf("beblia coordinates unpacked incorrectly: %v", results[0])
  }

  if results[0].Text != "Alussa Jumala loi taivaan ja maan." {
   t.Errorf("beblia verse text extracted incorrectly: %q", results[0].Text)
  }
 })
```

---

## 3. Frontend: Suomennosten asennusesiasetukset

Avaa tiedosto [frontend/src/components/TranslationManager.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/TranslationManager.tsx).

Jotta voimme ladata tiedostoja eri GitHub-lähteistä ( open-bibles ja Beblia ), teemme preset-rakenteesta täysin URL-riippumattoman.

### Vaihe A: PresetTranslation-rajapinnan ja PRESET_TRANSLATIONS-taulukon korvaus

Korvaa tiedoston alussa olevat määrittelyt (rivit 10–21) seuraavilla:

```typescript
interface PresetTranslation {
  id: string;
  name: string;
  lang: string;
  url: string;
}

const PRESET_TRANSLATIONS: PresetTranslation[] = [
  { 
    id: 'fin-1992', 
    name: 'Kirkkoraamattu (1992)', 
    lang: 'fi', 
    url: 'https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/Finnish1992Bible.xml' 
  },
  { 
    id: 'fin-biblia-33-38', 
    name: 'Kirkkoraamattu (1933/38)', 
    lang: 'fi', 
    url: 'https://raw.githubusercontent.com/seven1m/open-bibles/master/fin-biblia.osis.xml' 
  },
  { 
    id: 'fin-1776', 
    name: 'Biblia (1776)', 
    lang: 'fi', 
    url: 'https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/Finnish1776Bible.xml' 
  },
  { 
    id: 'web', 
    name: 'World English Bible', 
    lang: 'en', 
    url: 'https://raw.githubusercontent.com/seven1m/open-bibles/master/eng-web.usfx.xml' 
  },
  { 
    id: 'kjv', 
    name: 'King James Version', 
    lang: 'en', 
    url: 'https://raw.githubusercontent.com/seven1m/open-bibles/master/eng-kjv.osis.xml' 
  },
];
```

### Vaihe B: handleInstallPreset-funktion päivitys

Korvaa `handleInstallPreset`-funktio (rivit 67–92) tällä dynaamisella latauksella:

```typescript
  // Downloads the selected translation from the configured URL and uploads it to the backend
  const handleInstallPreset = async (preset: PresetTranslation) => {
    setLoading(true);
    setStatus(null);
    const url = preset.url;
    const filename = url.substring(url.lastIndexOf('/') + 1);

    try {
      setStatus({ type: 'success', message: `Downloading translation "${preset.name}" from GitHub...` });

      const response = await fetch(url);
      if (!response.ok) throw new Error(`File download failed (HTTP ${response.status})`);

      const blob = await response.blob();
      const xmlFile = new File([blob], filename, { type: "text/xml" });

      setStatus({ type: 'success', message: `Translation file downloaded. Installing into database "${preset.id}" (this may take 10-30 seconds)...` });
      await apiService.importTranslation(preset.id, preset.name, preset.lang, xmlFile);

      setStatus({ type: 'success', message: `Translation "${preset.name}" successfully installed!` });
      if (onTranslationInstalled) onTranslationInstalled();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus({ type: 'error', message: msg || `Installation of ${preset.name} failed.` });
    } finally {
      setLoading(false);
    }
  };
```

### Vaihe C: Tekstin päivitys käyttöliittymässä

Etsi ja korvaa otsikkoteksti (rivi 116):

```tsx
        <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          Install from Web (GitHub presets)
        </p>
```

---

## 4. Testaus ja todentaminen

1. Aja backendin testit vahvistaaksesi uuden parserin toiminta:

    ```bash
    go test -v ./backend/internal/parsers/...
    ```

2. Suorita täysi laatuportti:

    ```bash
    task check
    ```

3. Testaa manuaalisesti lataamalla Kirkkoraamattu 1992 ja Kirkkoraamattu 1933/38 käyttöliittymästä, ja testaa lukutilaa sekä hakuja.
