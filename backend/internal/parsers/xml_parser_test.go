package parsers_test

import (
	"strings"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/parsers"
)

func TestXMLVerseParser_StreamingFormats(t *testing.T) {
	parser := parsers.NewXMLVerseParser()

	t.Run("successfully streams valid USFX format tokens block", func(t *testing.T) {
		usfxMock := `
		<usfx>
			<book id="GEN">
				<c id="1">
					<v id="1">In the beginning God created the heavens and the earth.</v>
					<v id="2">The earth was without form, and void;</v>
				</c>
			</book>
		</usfx>`

		var results []models.Verse
		err := parser.ParseStream(strings.NewReader(usfxMock), func(v models.Verse) error {
			results = append(results, v)
			return nil
		})

		if err != nil {
			t.Fatalf("unexpected parsing collapse error: %v", err)
		}

		if len(results) != 2 {
			t.Fatalf("expected 2 structured verses streamed, got %d", len(results))
		}

		if results[0].BookID != "GEN" || results[0].Chapter != 1 || results[0].Verse != 1 {
			t.Errorf("verse coordinates unpacked incorrectly: %v", results[0])
		}

		if results[0].Text != "In the beginning God created the heavens and the earth." {
			t.Errorf("verse text extracted incorrectly: %q", results[0].Text)
		}
	})

	t.Run("successfully streams valid OSIS standard container element structures", func(t *testing.T) {
		osisMock := `
		<osis xmlns="http://www.bibletechnologies.net/2003/OSIS/namespace">
			<osisText osisIDWork="WEB">
				<div>
					<verse osisID="Gen.1.1">In the beginning...</verse>
				</div>
			</osisText>
		</osis>`

		var results []models.Verse
		err := parser.ParseStream(strings.NewReader(osisMock), func(v models.Verse) error {
			results = append(results, v)
			return nil
		})

		if err != nil {
			t.Fatalf("unexpected osis parsing collapse error: %v", err)
		}

		if len(results) != 1 {
			t.Fatalf("expected 1 verse, got %d", len(results))
		}

		if results[0].BookID != "Gen" || results[0].Chapter != 1 || results[0].Verse != 1 {
			t.Errorf("unexpected OSIS coordinates unpack parameters: %v", results[0])
		}
	})
}
