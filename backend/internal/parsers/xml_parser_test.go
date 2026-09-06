package parsers_test

import (
	"fmt"
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

	t.Run("successfully streams valid USFX format self-closing tags with footnotes", func(t *testing.T) {
		usfxMock := `
		<usfx>
			<book id="GEN">
				<c id="1">
					<v id="1"/>In the beginning, God<f caller="+">Footnote text here</f> created the heavens and the earth.<ve/>
					<v id="2"/>And the earth was formless.<ve/>
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

		if results[0].Text != "In the beginning, God created the heavens and the earth." {
			t.Errorf("verse text extracted incorrectly (possibly failed to strip footnote): %q", results[0].Text)
		}

		if results[1].Text != "And the earth was formless." {
			t.Errorf("verse text extracted incorrectly: %q", results[1].Text)
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

	t.Run("successfully streams valid OSIS milestone-style elements", func(t *testing.T) {
		osisMock := `
		<osis xmlns="http://www.bibletechnologies.net/2003/OSIS/namespace">
			<osisText osisIDWork="KJV">
				<div>
					<verse osisID="Luke.3.5" sID="Luke.3.5" />Every valley shall be filled...<verse eID="Luke.3.5" />
				</div>
			</osisText>
		</osis>`

		var results []models.Verse
		err := parser.ParseStream(strings.NewReader(osisMock), func(v models.Verse) error {
			results = append(results, v)
			return nil
		})

		if err != nil {
			t.Fatalf("unexpected osis milestone parsing error: %v", err)
		}

		if len(results) != 1 {
			t.Fatalf("expected 1 verse, got %d", len(results))
		}

		if results[0].BookID != "Luke" || results[0].Chapter != 3 || results[0].Verse != 5 {
			t.Errorf("unexpected OSIS coordinates: %v", results[0])
		}

		if results[0].Text != "Every valley shall be filled..." {
			t.Errorf("unexpected verse text: %q", results[0].Text)
		}
	})

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

		// Book number 1 is GEN
		if results[0].BookID != "GEN" || results[0].Chapter != 1 || results[0].Verse != 1 {
			t.Errorf("beblia coordinates unpacked incorrectly: %v", results[0])
		}

		if results[0].Text != "Alussa Jumala loi taivaan ja maan." {
			t.Errorf("beblia verse text extracted incorrectly: %q", results[0].Text)
		}
	})

	t.Run("returns error when XML tokenization fails due to malformed XML", func(t *testing.T) {
		malformedXML := `<bible><book id="GEN"><c id="1"><v id="1">Unfinished tag`
		err := parser.ParseStream(strings.NewReader(malformedXML), func(v models.Verse) error {
			return nil
		})
		if err == nil {
			t.Fatal("expected parsing error for malformed XML, got nil")
		}
		if !strings.Contains(err.Error(), "xml streaming tokenization failed") {
			t.Errorf("unexpected error message: %v", err)
		}
	})

	t.Run("aborts and returns callback error", func(t *testing.T) {
		xmlMock := `<bible><book id="GEN"><c id="1"><v id="1">Test</v></c></book></bible>`
		callbackErr := fmt.Errorf("database constraint failure")
		err := parser.ParseStream(strings.NewReader(xmlMock), func(v models.Verse) error {
			return callbackErr
		})
		if err == nil {
			t.Fatal("expected error from parser when callback fails, got nil")
		}
		if !strings.Contains(err.Error(), "parser streaming callback execution aborted") {
			t.Errorf("unexpected error wrapping: %v", err)
		}
	})

	t.Run("ignores invalid Beblia book numbers and values", func(t *testing.T) {
		invalidBebliaMock := `
		<bible translation="Test">
			<book number="99">
				<chapter number="1">
					<verse number="1">This should be skipped because 99 is invalid.</verse>
				</chapter>
			</book>
			<book number="0">
				<chapter number="1">
					<verse number="1">This should also be skipped.</verse>
				</chapter>
			</book>
			<book number="invalid">
				<chapter number="1">
					<verse number="1">This should also be skipped.</verse>
				</chapter>
			</book>
			<book number="1">
				<chapter number="invalid">
					<verse number="1">This should also be skipped.</verse>
				</chapter>
				<chapter number="1">
					<verse number="invalid">This should also be skipped.</verse>
					<verse number="1">Valid verse.</verse>
				</chapter>
			</book>
		</bible>`

		var results []models.Verse
		err := parser.ParseStream(strings.NewReader(invalidBebliaMock), func(v models.Verse) error {
			results = append(results, v)
			return nil
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(results) != 1 {
			t.Fatalf("expected 1 valid verse to be parsed, got %d: %v", len(results), results)
		}
		if results[0].Text != "Valid verse." {
			t.Errorf("unexpected verse text: %q", results[0].Text)
		}
	})
}
