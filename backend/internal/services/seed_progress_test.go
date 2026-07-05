// Package services (white-box) – tests for internal progress tracking helpers
// defined in seed_service.go.
//
// These tests reside in `package services` (without the _test suffix) to gain
// access to unexported types: progressBar, importProgress, canonicalBibleBookOrder,
// and bookProgressIndex. The public integration test (ParseStreamShortcut) lives
// separately in seed_service_test.go under `package services_test`.
package services

import (
	"bytes"
	"log/slog"
	"strings"
	"testing"
)

// ---------------------------------------------------------------------------
// progressBar
// ---------------------------------------------------------------------------

func TestProgressBar_EmptyAtZero(t *testing.T) {
	got := progressBar(0, totalCanonicalBooks)
	// Full empty bar: 20 × '░'
	want := "[░░░░░░░░░░░░░░░░░░░░]   0%  (book 0/66)"
	if got != want {
		t.Errorf("progressBar(0, 66)\n  got:  %q\n  want: %q", got, want)
	}
}

func TestProgressBar_HalfwayPoint(t *testing.T) {
	got := progressBar(33, totalCanonicalBooks)
	// 33/66 = 50%, 10 filled, 10 empty
	want := "[██████████░░░░░░░░░░]  50%  (book 33/66)"
	if got != want {
		t.Errorf("progressBar(33, 66)\n  got:  %q\n  want: %q", got, want)
	}
}

func TestProgressBar_FullAtComplete(t *testing.T) {
	got := progressBar(totalCanonicalBooks, totalCanonicalBooks)
	// 66/66 = 100%, 20 filled, 0 empty
	want := "[████████████████████] 100%  (book 66/66)"
	if got != want {
		t.Errorf("progressBar(66, 66)\n  got:  %q\n  want: %q", got, want)
	}
}

func TestProgressBar_AlwaysHasCorrectWidth(t *testing.T) {
	for i := 0; i <= totalCanonicalBooks; i++ {
		bar := progressBar(i, totalCanonicalBooks)
		// The bar segment is always enclosed in [ … ] and 20 chars wide.
		start := strings.Index(bar, "[")
		end := strings.Index(bar, "]")
		if start < 0 || end < 0 {
			t.Fatalf("progressBar(%d, 66) missing brackets: %q", i, bar)
		}
		inner := bar[start+1 : end]
		if len([]rune(inner)) != 20 {
			t.Errorf("progressBar(%d, 66) inner bar width = %d, want 20: %q",
				i, len([]rune(inner)), bar)
		}
	}
}

// ---------------------------------------------------------------------------
// importProgress.onVerse – milestone logging
// ---------------------------------------------------------------------------

// captureImportLogger redirects slog.Default to a buffer for the test duration.
func captureImportLogger(t *testing.T) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	orig := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelInfo})))
	t.Cleanup(func() { slog.SetDefault(orig) })
	return &buf
}

// simulateBooks calls prog.onVerse once per book for the first `n` canonical books,
// simulating a streaming XML import that processes that many distinct books.
func simulateBooks(prog *importProgress, n int) {
	for _, book := range canonicalBibleBookOrder[:n] {
		prog.onVerse(book)
	}
}

func TestImportProgress_20PctMilestoneFiresAt13thBook(t *testing.T) {
	buf := captureImportLogger(t)
	prog := &importProgress{translationID: "test-trans"}

	// threshold for 20% = 1 * 66 / 5 = 13
	simulateBooks(prog, 13)

	output := buf.String()
	// The slog text handler renders the milestone label as `percent=20` (no % sign).
	// The bar inside the msg shows the true floor percentage (13/66 = 19%), which
	// differs from the nominal milestone label – that is correct behaviour.
	if !strings.Contains(output, "percent=20") {
		t.Errorf("expected 'percent=20' in milestone log after 13 books, got:\n%s", output)
	}
	if !strings.Contains(output, "Import progress") {
		t.Errorf("expected 'Import progress' in log output, got:\n%s", output)
	}
}

func TestImportProgress_40PctMilestoneFiresAt26thBook(t *testing.T) {
	buf := captureImportLogger(t)
	prog := &importProgress{translationID: "test-trans"}

	// threshold for 40% = 2 * 66 / 5 = 26
	simulateBooks(prog, 26)

	if !strings.Contains(buf.String(), "percent=40") {
		t.Errorf("expected 'percent=40' in milestone log after 26 books, got:\n%s", buf.String())
	}
}

func TestImportProgress_AllFiveMilestonesFire(t *testing.T) {
	buf := captureImportLogger(t)
	prog := &importProgress{translationID: "test-trans"}

	// Process all 66 canonical books → all milestones must trigger.
	simulateBooks(prog, totalCanonicalBooks)

	output := buf.String()
	// Each milestone is stored as a structured slog field `percent=NN` (no % sign).
	// The bar percentage inside the msg is a floor value and may differ from the
	// nominal label (e.g. 13/66 → bar shows 19% but label is percent=20).
	for _, field := range []string{"percent=20", "percent=40", "percent=60", "percent=80", "percent=100"} {
		if !strings.Contains(output, field) {
			t.Errorf("expected %q in log output, got:\n%s", field, output)
		}
	}
}

func TestImportProgress_MilestoneDoesNotFireTwice(t *testing.T) {
	buf := captureImportLogger(t)
	prog := &importProgress{translationID: "test-trans"}

	// Process 13 books (20% threshold), then call onVerse for the same book again.
	simulateBooks(prog, 13)
	// Call onVerse multiple extra times on the last book – milestone must not repeat.
	for i := 0; i < 10; i++ {
		prog.onVerse(canonicalBibleBookOrder[12])
	}

	// Count occurrences of the structured field rather than the bar percentage string.
	count := strings.Count(buf.String(), "percent=20")
	if count != 1 {
		t.Errorf("expected 'percent=20' to appear exactly once in log, got %d occurrences:\n%s",
			count, buf.String())
	}
}

func TestImportProgress_NoMilestoneBeforeThreshold(t *testing.T) {
	buf := captureImportLogger(t)
	prog := &importProgress{translationID: "test-trans"}

	// Process only 12 books – must not yet reach the 20% threshold (13 books).
	simulateBooks(prog, 12)

	if got := buf.String(); got != "" {
		t.Errorf("expected no milestone log before 20%% threshold, got:\n%s", got)
	}
}

func TestImportProgress_TranslationIDAppearsInLog(t *testing.T) {
	buf := captureImportLogger(t)
	prog := &importProgress{translationID: "my-special-translation"}

	simulateBooks(prog, 13) // trigger first milestone

	if !strings.Contains(buf.String(), "my-special-translation") {
		t.Errorf("expected translation ID in milestone log, got:\n%s", buf.String())
	}
}
