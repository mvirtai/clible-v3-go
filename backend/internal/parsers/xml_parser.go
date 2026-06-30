package parsers

import (
	"encoding/xml"
	"fmt"
	"io"
	"strings"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

// orderedBookIDs is a mapping of book numbers to canonical book IDs used by Beblia-XML format.
var orderedBookIDs = []string{
	// Old Testament
	"GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA",
	"1KI", "2KI", "1CH", "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO",
	"ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO",
	"OBD", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL",
	// New Testament
	"MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH",
	"PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS",
	"1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
}

// XMLVerseParser defines the streaming core block for scripture files decoding.
type XMLVerseParser struct{}

// NewXMLVerseParser constructs a decoupled streaming token parser.
func NewXMLVerseParser() *XMLVerseParser {
	return &XMLVerseParser{}
}

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
				currentBook = ""
				for _, attr := range se.Attr {
					switch attr.Name.Local {
					case "id":
						currentBook = attr.Value
					case "number":
						var bookNum int
						if _, err := fmt.Sscanf(attr.Value, "%d", &bookNum); err == nil {
							if bookNum >= 1 && bookNum <= len(orderedBookIDs) {
								currentBook = orderedBookIDs[bookNum-1]
							}
						}
					}
				}
			case "c", "chapter":
				currentChapter = 0
				for _, attr := range se.Attr {
					if attr.Name.Local == "id" || attr.Name.Local == "number" {
						// Explicitly ignore returns to pass errcheck lint rules safely
						_, _ = fmt.Sscanf(attr.Value, "%d", &currentChapter)
					}
				}
			case "v", "verse":
				isEnd := false
				for _, attr := range se.Attr {
					if attr.Name.Local == "eID" {
						isEnd = true
						break
					}
				}
				if isEnd {
					if err := emitVerse(); err != nil {
						return err
					}
					inVerse = false
					break
				}

				if err := emitVerse(); err != nil {
					return err
				}
				verseNum = 0
				for _, attr := range se.Attr {
					switch attr.Name.Local {
					case "id", "number":
						// Explicitly ignore returns to pass errcheck lint rules safely
						_, _ = fmt.Sscanf(strings.Split(attr.Value, "-")[0], "%d", &verseNum)
					case "osisID":
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
				if inVerse && textBuilder.Len() > 0 {
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
