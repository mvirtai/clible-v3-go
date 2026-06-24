package services

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/parsers"
)

// bookIDMap maps various alternative book abbreviations to our canonical 3-letter uppercase IDs.
var bookIDMap = map[string]string{
	// USFX alternative abbreviations
	"OBA": "OBD",

	// OSIS standard abbreviations / names to canonical 3-letter IDs
	"GEN": "GEN", "EXO": "EXO", "LEV": "LEV", "NUM": "NUM", "DEU": "DEU",
	"JOS": "JOS", "JDG": "JDG", "RUT": "RUT", "1SA": "1SA", "2SA": "2SA",
	"1KI": "1KI", "2KI": "2KI", "1CH": "1CH", "2CH": "2CH", "EZR": "EZR",
	"NEH": "NEH", "EST": "EST", "JOB": "JOB", "PSA": "PSA", "PRO": "PRO",
	"ECC": "ECC", "SNG": "SNG", "ISA": "ISA", "JER": "JER", "LAM": "LAM",
	"EZK": "EZK", "DAN": "DAN", "HOS": "HOS", "JOL": "JOL", "AMO": "AMO",
	"OBD": "OBD", "JON": "JON", "MIC": "MIC", "NAM": "NAM", "HAB": "HAB",
	"ZEP": "ZEP", "HAG": "HAG", "ZEC": "ZEC", "MAL": "MAL", "MAT": "MAT",
	"MRK": "MRK", "LUK": "LUK", "JHN": "JHN", "ACT": "ACT", "ROM": "ROM",
	"1CO": "1CO", "2CO": "2CO", "GAL": "GAL", "EPH": "EPH", "PHP": "PHP",
	"COL": "COL", "1TH": "1TH", "2TH": "2TH", "1TI": "1TI", "2TI": "2TI",
	"TIT": "TIT", "PHM": "PHM", "HEB": "HEB", "JAS": "JAS", "1PE": "1PE",
	"2PE": "2PE", "1JN": "1JN", "2JN": "2JN", "3JN": "3JN", "JUD": "JUD",
	"REV": "REV",

	"GENESIS": "GEN", "EXODUS": "EXO", "LEVITICUS": "LEV", "NUMBERS": "NUM",
	"DEUTERONOMY": "DEU", "JOSHUA": "JOS", "JUDGES": "JDG", "RUTH": "RUT",
	"1SAMUEL": "1SA", "2SAMUEL": "2SA", "1KINGS": "1KI", "2KINGS": "2KI",
	"1CHRONICLES": "1CH", "2CHRONICLES": "2CH", "EZRA": "EZR", "NEHEMIAH": "NEH",
	"ESTHER": "EST", "PSALMS": "PSA", "PROVERBS": "PRO",
	"ECCLESIASTES": "ECC", "SONGOFSOLOMON": "SNG", "ISAIAH": "ISA",
	"JEREMIAH": "JER", "LAMENTATIONS": "LAM", "EZEKIEL": "EZK", "DANIEL": "DAN",
	"HOSEA": "HOS", "JOEL": "JOL", "AMOS": "AMO", "OBADIAH": "OBD",
	"JONAH": "JON", "MICAH": "MIC", "NAHUM": "NAM", "HABAKKUK": "HAB",
	"ZEPHANIAH": "ZEP", "HAGGAI": "HAG", "ZECHARIAH": "ZEC", "MALACHI": "MAL",
	"MATTHEW": "MAT", "MARK": "MRK", "LUKE": "LUK", "JOHN": "JHN",
	"ACTS": "ACT", "ROMANS": "ROM", "1CORINTHIANS": "1CO", "2CORINTHIANS": "2CO",
	"GALATIANS": "GAL", "EPHESIANS": "EPH", "PHILIPPIANS": "PHP",
	"COLOSSIANS": "COL", "1THESSALONIANS": "1TH", "2THESSALONIANS": "2TH",
	"1TIMOTHY": "1TI", "2TIMOTHY": "2TI", "TITUS": "TIT", "PHILEMON": "PHM",
	"HEBREWS": "HEB", "JAMES": "JAS", "1PETER": "1PE", "2PETER": "2PE",
	"1JOHN": "1JN", "2JOHN": "2JN", "3JOHN": "3JN", "JUDE": "JUD",
	"REVELATION": "REV",

	"GENESIS.": "GEN", "EXODUS.": "EXO", "LEVITICUS.": "LEV", "NUMBERS.": "NUM",
	"DEUTERONOMY.": "DEU", "JOSHUA.": "JOS", "JUDGES.": "JDG", "RUTH.": "RUT",
	"1SAMUEL.": "1SA", "2SAMUEL.": "2SA", "1KINGS.": "1KI", "2KINGS.": "2KI",
	"1CHRONICLES.": "1CH", "2CHRONICLES.": "2CH", "EZRA.": "EZR", "NEHEMIAH.": "NEH",
	"ESTHER.": "EST", "JOB.": "JOB", "PSALMS.": "PSA", "PROVERBS.": "PRO",
	"ECCLESIASTES.": "ECC", "SONGOFSOLOMON.": "SNG", "ISAIAH.": "ISA",
	"JEREMIAH.": "JER", "LAMENTATIONS.": "LAM", "EZEKIEL.": "EZK", "DANIEL.": "DAN",
	"HOSEA.": "HOS", "JOEL.": "JOL", "AMOS.": "AMO", "OBADIAH.": "OBD",
	"JONAH.": "JON", "MICAH.": "MIC", "NAHUM.": "NAM", "HABAKKUK.": "HAB",
	"ZEPHANIAH.": "ZEP", "HAGGAI.": "HAG", "ZECHARIAH.": "ZEC", "MALACHI.": "MAL",
	"MATTHEW.": "MAT", "MARK.": "MRK", "LUKE.": "LUK", "JOHN.": "JHN",
	"ACTS.": "ACT", "ROMANS.": "ROM", "1CORINTHIANS.": "1CO", "2CORINTHIANS.": "2CO",
	"GALATIANS.": "GAL", "EPHESIANS.": "EPH", "PHILIPPIANS.": "PHP",
	"COLOSSIANS.": "COL", "1THESSALONIANS.": "1TH", "2THESSALONIANS.": "2TH",
	"1TIMOTHY.": "1TI", "2TIMOTHY.": "2TI", "TITUS.": "TIT", "PHILEMON.": "PHM",
	"HEBREWS.": "HEB", "JAMES.": "JAS", "1PETER.": "1PE", "2PETER.": "2PE",
	"1JOHN.": "1JN", "2JOHN.": "2JN", "3JOHN.": "3JN", "JUDE.": "JUD",
	"REVELATION.": "REV",

	"GENES": "GEN", "EXOD": "EXO", "NUMB": "NUM",
	"JOSH": "JOS", "JUDG": "JDG", "1SAM": "1SA", "2SAM": "2SA",
	"1KGS": "1KI", "2KGS": "2KI", "1CHR": "1CH", "2CHR": "2CH",
	"NEHE": "NEH", "ESTH": "EST", "PSAL": "PSA",
	"ECCL": "ECC", "SONG": "SNG", "ISAI": "ISA", "LAME": "LAM",
	"EZEK": "EZK", "DANI": "DAN", "HOSE": "HOS", "OBAD": "OBD",
	"JONA": "JON", "MICA": "MIC", "NAHU": "NAM", "HABA": "HAB",
	"ZEPH": "ZEP", "HAGG": "HAG", "ZECH": "ZEC", "MALA": "MAL",
	"MATT": "MAT", "ROMA": "ROM",
	"1COR": "1CO", "2COR": "2CO", "GALA": "GAL", "EPHE": "EPH",
	"COLO": "COL", "1THE": "1TH", "2THE": "2TH", "1TIM": "1TI", "2TIM": "2TI",
	"TITU": "TIT", "HEBR": "HEB", "JAME": "JAS", "1PET": "1PE",
	"2PET": "2PE", "1JOH": "1JN", "2JOH": "2JN", "3JOH": "3JN",
	"REVE": "REV",

	"GEN.": "GEN", "EXOD.": "EXO", "LEV.": "LEV", "NUM.": "NUM", "DEUT.": "DEU",
	"JOSH.": "JOS", "JUDG.": "JDG", "1SAM.": "1SA", "2SAM.": "2SA",
	"1KGS.": "1KI", "2KGS.": "2KI", "1CHR.": "1CH", "2CHR.": "2CH",
	"NEH.": "NEH", "ESTH.": "EST", "PS.": "PSA", "PROV.": "PRO",
	"ECCL.": "ECC", "SONG.": "SNG", "ISA.": "ISA", "JER.": "JER", "LAM.": "LAM",
	"EZEK.": "EZK", "DAN.": "DAN", "HOS.": "HOS",
	"OBAD.": "OBD", "MIC.": "MIC", "NAH.": "NAM", "HAB.": "HAB",
	"ZEPH.": "ZEP", "HAG.": "HAG", "ZECH.": "ZEC", "MAL.": "MAL", "MATT.": "MAT",
	"JN.": "JHN",
	"1COR.": "1CO", "2COR.": "2CO", "GAL.": "GAL", "EPH.": "EPH", "PHIL.": "PHP",
	"COL.": "COL", "1THESS.": "1TH", "2THESS.": "2TH", "1TIM.": "1TI", "2TIM.": "2TI",
	"TIT.": "TIT", "PHLM.": "PHM", "HEB.": "HEB", "JAS.": "JAS", "1PET.": "1PE",
	"2PET.": "2PE", "1JN.": "1JN", "2JN.": "2JN", "3JN.": "3JN",
	"REV.": "REV",
}

// SeedService coordinates heavy data imports cleanly respecting structural boundaries.
type SeedService struct {
	verseRepo *db.VerseRepository
	parser    *parsers.XMLVerseParser
}

// NewSeedService constructs a database streaming population asset manager.
func NewSeedService(vr *db.VerseRepository, p *parsers.XMLVerseParser) *SeedService {
	return &SeedService{
		verseRepo: vr,
		parser:    p,
	}
}

// getValidBooks retrieves all canonical book IDs from the database.
func (s *SeedService) getValidBooks(ctx context.Context) (map[string]bool, error) {
	rows, err := s.verseRepo.DB().QueryContext(ctx, "SELECT id FROM books")
	if err != nil {
		return nil, fmt.Errorf("failed to query canonical books list: %w", err)
	}
	defer func() { _ = rows.Close() }()

	books := make(map[string]bool)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		books[strings.ToUpper(id)] = true
	}
	return books, nil
}

// normalizeBookID maps custom/alternative abbreviations to our canonical ones.
func normalizeBookID(bookID string) string {
	upper := strings.ToUpper(bookID)
	if mapped, ok := bookIDMap[upper]; ok {
		return mapped
	}
	return upper
}

// SeedTranslationFromFile opens a file, streams components, and flushes chunk chunks down.
func (s *SeedService) SeedTranslationFromFile(ctx context.Context, filePath string, translationID string) error {
	validBooks, err := s.getValidBooks(ctx)
	if err != nil {
		return err
	}

	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open targeted seeding file: %w", err)
	}
	defer func() { _ = file.Close() }()

	const chunkSize = 500
	chunk := make([]models.Verse, 0, chunkSize)

	err = s.parser.ParseStream(file, func(v models.Verse) error {
		normBook := normalizeBookID(v.BookID)
		if !validBooks[normBook] {
			// Skip non-canonical books (e.g. Apocrypha, glossaries, preface)
			return nil
		}

		v.BookID = normBook
		v.TranslationID = translationID
		v.ID = fmt.Sprintf("%s:%s:%d:%d", translationID, v.BookID, v.Chapter, v.Verse)
		chunk = append(chunk, v)

		if len(chunk) >= chunkSize {
			if err := s.verseRepo.BulkInsert(ctx, chunk); err != nil {
				return fmt.Errorf("failed to flush seed chunk segment to DB: %w", err)
			}
			chunk = chunk[:0]
		}
		return nil
	})

	if err != nil {
		return fmt.Errorf("streaming seeding operation collapsed: %w", err)
	}

	if len(chunk) > 0 {
		if err := s.verseRepo.BulkInsert(ctx, chunk); err != nil {
			return fmt.Errorf("failed to flush final seed trailing chunk segment to DB: %w", err)
		}
	}

	return nil
}

// ParseStreamShortcut exposes an option to directly inject a raw stream (useful for tests)
func (s *SeedService) ParseStreamShortcut(ctx context.Context, r io.Reader, translationID string) error {
	validBooks, err := s.getValidBooks(ctx)
	if err != nil {
		return err
	}

	const chunkSize = 100
	chunk := make([]models.Verse, 0, chunkSize)

	if err := s.parser.ParseStream(r, func(v models.Verse) error {
		normBook := normalizeBookID(v.BookID)
		if !validBooks[normBook] {
			// Skip non-canonical books
			return nil
		}

		v.BookID = normBook
		v.TranslationID = translationID
		v.ID = fmt.Sprintf("%s:%s:%d:%d", translationID, v.BookID, v.Chapter, v.Verse)
		chunk = append(chunk, v)

		if len(chunk) >= chunkSize {
			if err := s.verseRepo.BulkInsert(ctx, chunk); err != nil {
				return err
			}
			chunk = chunk[:0]
		}
		return nil
	}); err != nil {
		return err
	}

	if len(chunk) > 0 {
		return s.verseRepo.BulkInsert(ctx, chunk)
	}
	return nil
}
