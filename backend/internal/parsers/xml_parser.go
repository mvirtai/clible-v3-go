package parsers

import (
	"encoding/xml"
	"fmt"
	"io"
	"strings"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

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
				for _, attr := range se.Attr {
					if attr.Name.Local == "id" {
						currentBook = attr.Value
					}
				}
			case "c":
				for _, attr := range se.Attr {
					if attr.Name.Local == "id" {
						// Explicitly ignore returns to pass errcheck lint rules safely
						_, _ = fmt.Sscanf(attr.Value, "%d", &currentChapter)
					}
				}
			case "v":
				if err := emitVerse(); err != nil {
					return err
				}
				for _, attr := range se.Attr {
					if attr.Name.Local == "id" {
						// Explicitly ignore returns to pass errcheck lint rules safely
						_, _ = fmt.Sscanf(strings.Split(attr.Value, "-")[0], "%d", &verseNum)
					}
				}
				inVerse = true
				textBuilder.Reset()
			case "ve":
				if err := emitVerse(); err != nil {
					return err
				}
			case "verse":
				if err := emitVerse(); err != nil {
					return err
				}
				var osisID string
				for _, attr := range se.Attr {
					if attr.Name.Local == "osisID" {
						osisID = attr.Value
					}
				}
				// Parse standard format like "Gen.1.1"
				parts := strings.Split(osisID, ".")
				if len(parts) == 3 {
					currentBook = parts[0]
					// Explicitly ignore returns to pass errcheck lint rules safely
					_, _ = fmt.Sscanf(parts[1], "%d", &currentChapter)
					_, _ = fmt.Sscanf(parts[2], "%d", &verseNum)
					inVerse = true
					textBuilder.Reset()
				}
			case "f", "x":
				skipDepth++
			}

		case xml.EndElement:
			tagName := se.Name.Local
			switch tagName {
			case "v":
				// Only emit if we have text (meaning it was a container tag: <v>text</v>)
				// If it was self-closing (<v id="1"/>), textBuilder is empty, so we don't emit yet.
				if inVerse && textBuilder.Len() > 0 {
					if err := emitVerse(); err != nil {
						return err
					}
				}
			case "verse":
				if inVerse {
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
