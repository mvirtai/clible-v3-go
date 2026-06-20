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

			// Handle USFX format element boundaries
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
				for _, attr := range se.Attr {
					if attr.Name.Local == "id" {
						// Explicitly ignore returns to pass errcheck lint rules safely
						_, _ = fmt.Sscanf(strings.Split(attr.Value, "-")[0], "%d", &verseNum)
					}
				}
				inVerse = true
				textBuilder.Reset()
			}

			// Handle OSIS container verse format alternative path mapping
			if tagName == "verse" {
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
			}

		case xml.EndElement:
			tagName := se.Name.Local
			if (tagName == "v" || tagName == "verse") && inVerse {
				inVerse = false
				cleanText := strings.TrimSpace(strings.Join(strings.Fields(textBuilder.String()), " "))

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
			}

		case xml.CharData:
			if inVerse {
				textBuilder.Write(se)
			}
		}
	}

	return nil
}
