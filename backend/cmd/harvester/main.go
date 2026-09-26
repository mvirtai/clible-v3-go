package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"html"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

// --- Kirkkovuosikalenteri WordPress API Models ---

// WPDayResponse represents the root JSON returned by kirkkovuosikalenteri.fi API.
type WPDayResponse struct {
	Color          any               `json:"color"`
	Candles        any               `json:"candles"`
	DayTitle       string            `json:"day_title"`
	DayVolume      string            `json:"day_volume"`
	DayURL         string            `json:"day_url"`
	LiturgicalDays []WPLiturgicalDay `json:"liturgical_days"`
}

// WPLiturgicalDay represents one liturgical celebration in the API response.
type WPLiturgicalDay struct {
	Title                  string        `json:"title"`
	Subtitle               string        `json:"subtitle"`
	Period                 string        `json:"period"`
	Description            string        `json:"description"`
	Candles                any           `json:"candles"`
	Color                  any           `json:"color"`
	URL                    string        `json:"url"`
	FirstLiturgicalVolume  WPVolume      `json:"first_liturgical_volume"`
	SecondLiturgicalVolume WPVolume      `json:"second_liturgical_volume"`
	ThirdLiturgicalVolume  WPVolume      `json:"third_liturgical_volume"`
	Lectionary             WPLectionary  `json:"lectionary"`
	DailyPrayers           WPPrayers     `json:"daily_prayers"`
	Hymns                  WPHymnGroups  `json:"hymns"`
	AltarImage             *WPImage      `json:"altar_image"`
	PostThumbnail          *WPImage      `json:"post_thumbnail"`
}

// WPVolume contains the Scripture lections for liturgical cycles (I, II, III).
type WPVolume struct {
	Passages1 []WPPassage `json:"passages-1"`
	Passages2 []WPPassage `json:"passages-2"`
	Gospels   []WPPassage `json:"gospels"`
}

func (w *WPVolume) UnmarshalJSON(data []byte) error {
	s := strings.TrimSpace(string(data))
	if s == "false" || s == "null" || s == `""` {
		return nil
	}
	type alias WPVolume
	var a alias
	if err := json.Unmarshal(data, &a); err != nil {
		return nil
	}
	*w = WPVolume(a)
	return nil
}

// WPPassage holds verse references and optional text.
type WPPassage struct {
	Verse1 string `json:"passage_1_verse"`
	Verse2 string `json:"passage_2_verse"`
	Verse3 string `json:"passage_3_verse"`
}

// WPLectionary contains the prayer offices (hetkipalvelukset) and psalms.
type WPLectionary struct {
	Psalms    WPLectionaryItems `json:"psalms"`    // Päivän psalmi
	Week      WPLectionaryItems `json:"week"`      // Viikon psalmi
	Morning   WPLectionaryItems `json:"morning"`   // Aamurukous (Laudes)
	Noon      WPLectionaryItems `json:"noon"`      // Päivärukous (Seksti)
	Evening   WPLectionaryItems `json:"evening"`   // Iltarukous (Vesper)
	Eve       WPLectionaryItems `json:"eve"`       // Aattorukous (Vigilia)
	Apocrypha WPLectionaryItems `json:"apocrypha"` // Apokryfitekstit
}

// WPLectionaryItems tolerates PHP false when a field is empty.
type WPLectionaryItems []WPLectionaryItem

func (w *WPLectionaryItems) UnmarshalJSON(data []byte) error {
	s := strings.TrimSpace(string(data))
	if s == "false" || s == "null" || s == `""` {
		*w = nil
		return nil
	}
	var items []WPLectionaryItem
	if err := json.Unmarshal(data, &items); err != nil {
		*w = nil
		return nil
	}
	*w = items
	return nil
}

// WPLectionaryItem holds a verse reference and full HTML text.
type WPLectionaryItem struct {
	Verse string `json:"verse"`
	Text  string `json:"text"`
}

// WPPrayers tolerates PHP false when prayers array is empty.
type WPPrayers []WPPrayer

func (w *WPPrayers) UnmarshalJSON(data []byte) error {
	s := strings.TrimSpace(string(data))
	if s == "false" || s == "null" || s == `""` {
		*w = nil
		return nil
	}
	var prayers []WPPrayer
	if err := json.Unmarshal(data, &prayers); err != nil {
		*w = nil
		return nil
	}
	*w = prayers
	return nil
}

// WPPrayer contains a prayer in HTML.
type WPPrayer struct {
	Verse string `json:"verse"`
}

// WPHymnGroups tolerates PHP false when hymns are empty.
type WPHymnGroups []WPHymnGroup

func (w *WPHymnGroups) UnmarshalJSON(data []byte) error {
	s := strings.TrimSpace(string(data))
	if s == "false" || s == "null" || s == `""` {
		*w = nil
		return nil
	}
	var groups []WPHymnGroup
	if err := json.Unmarshal(data, &groups); err != nil {
		*w = nil
		return nil
	}
	*w = groups
	return nil
}

// WPHymnGroup contains a category of hymns (e.g. Alkuvirsiä, Päivän virsiä).
type WPHymnGroup struct {
	GroupName string   `json:"group_name"`
	Hymns     []WPHymn `json:"hymns"`
}

// WPHymn represents a single recommended hymn.
type WPHymn struct {
	Name   string `json:"name"`
	Number string `json:"number"`
	URL    string `json:"url"`
}

// WPImage contains image metadata.
type WPImage struct {
	FullSizeURL string `json:"full_size_url"`
}

func (w *WPImage) UnmarshalJSON(data []byte) error {
	s := strings.TrimSpace(string(data))
	if s == "false" || s == "null" || s == `""` {
		return nil
	}
	type alias WPImage
	var a alias
	if err := json.Unmarshal(data, &a); err != nil {
		return nil
	}
	*w = WPImage(a)
	return nil
}

// --- Clible Clean Target Models ---

// CleanLiturgicalDay is Clible's consolidated day model with all requested liturgical content.
type CleanLiturgicalDay struct {
	Date          string             `json:"date"`                   // e.g. "20.9.2026"
	ISODate       string             `json:"iso_date"`               // e.g. "2026-09-20"
	DayOfWeek     string             `json:"day_of_week"`            // e.g. "sunnuntai"
	DayTitle      string             `json:"day_title"`              // e.g. "17. sunnuntai helluntaista"
	Title         string             `json:"title"`                  // Primary celebration title
	Subtitle      string             `json:"subtitle"`               // Primary celebration subtitle
	Period        string             `json:"period,omitempty"`      // e.g. "Helluntain jälkeinen aika"
	Color         string             `json:"color"`                  // Liturgical color: "vihreä", "valkoinen", "punainen", "violetti", "musta"
	Candles       string             `json:"candles"`                // Candle instructions
	CurrentVolume string             `json:"current_volume"`         // e.g. "volume-2" or "II"
	Image         string             `json:"image,omitempty"`        // Päivän kuva URL
	AltarImage    string             `json:"altar_image,omitempty"`  // Alttarikuva URL
	Psalms        []string           `json:"psalms,omitempty"`       // Psalm references
	DayPsalm      *CleanTextItem     `json:"day_psalm,omitempty"`    // Päivän psalmi (viite + teksti)
	WeekPsalm     *CleanTextItem     `json:"week_psalm,omitempty"`   // Viikon psalmi (viite + teksti)
	PrayerOffices CleanPrayerOffices `json:"prayer_offices"`         // Hetkipalvelukset / rukoushetket
	Years         map[string]Cycle   `json:"years,omitempty"`        // Vuosikertatekstit (I, II, III)
	Prayers       []string           `json:"prayers,omitempty"`      // Päivän rukoukset
	Hymns         []CleanHymnGroup   `json:"hymns,omitempty"`        // Virsisuositukset ryhmittäin
	Celebrations  []CleanCelebration `json:"celebrations,omitempty"` // Kaikki päivän pyhät (jos useampia)
}

// CleanCelebration stores one celebration if a day has multiple liturgical days.
type CleanCelebration struct {
	Title         string             `json:"title"`
	Subtitle      string             `json:"subtitle"`
	Period        string             `json:"period,omitempty"`
	Color         string             `json:"color"`
	Candles       string             `json:"candles"`
	Description   string             `json:"description,omitempty"`
	Image         string             `json:"image,omitempty"`
	AltarImage    string             `json:"altar_image,omitempty"`
	DayPsalm      *CleanTextItem     `json:"day_psalm,omitempty"`
	WeekPsalm     *CleanTextItem     `json:"week_psalm,omitempty"`
	PrayerOffices CleanPrayerOffices `json:"prayer_offices"`
	Years         map[string]Cycle   `json:"years,omitempty"`
	Prayers       []string           `json:"prayers,omitempty"`
	Hymns         []CleanHymnGroup   `json:"hymns,omitempty"`
	URL           string             `json:"url,omitempty"`
}

// CleanTextItem pairs a Scripture reference with cleaned plain text.
type CleanTextItem struct {
	Verse string `json:"verse"`
	Text  string `json:"text"`
}

// CleanPrayerOffices holds the standard Finnish Lutheran daily prayer offices (hetkipalvelukset).
type CleanPrayerOffices struct {
	Morning      []CleanTextItem `json:"morning,omitempty"`      // Aamurukous (Laudes)
	Noon         []CleanTextItem `json:"noon,omitempty"`         // Päivärukous (Ad Sextam)
	Evening      []CleanTextItem `json:"evening,omitempty"`      // Iltarukous (Vesper)
	Eve          []CleanTextItem `json:"eve,omitempty"`          // Aattorukous (Vigilia)
	Completorium []CleanTextItem `json:"completorium,omitempty"` // Yörukous (Completorium)
	Apocrypha    []CleanTextItem `json:"apocrypha,omitempty"`    // Apokryfikirjojen tekstit
}

// CleanHymnGroup holds a named collection of hymns.
type CleanHymnGroup struct {
	Group string      `json:"group"`
	Hymns []CleanHymn `json:"hymns"`
}

// CleanHymn holds hymn metadata.
type CleanHymn struct {
	Number string `json:"number"`
	Name   string `json:"name"`
	URL    string `json:"url"`
}

// Cycle holds the verse references for a liturgical volume (I, II, or III).
type Cycle struct {
	OldTestament []string `json:"old_testament"`
	Epistle      []string `json:"epistle"`
	Gospel       []string `json:"gospel"`
}

// --- Text & HTML Cleaning Utilities ---

var (
	brRegex           = regexp.MustCompile(`(?i)<br\s*/?>\s*`)
	pRegex            = regexp.MustCompile(`(?i)</p>|</div>`)
	kadenssiUnderline = regexp.MustCompile(`(?i)<span class="kadenssi-underline">([^<]*)</span>`)
	tagRegex          = regexp.MustCompile(`<[^>]*>`)
	spaceRegex        = regexp.MustCompile(`[ \t\x{00a0}\x{2003}\x{2002}]+`)
)

// cleanHTML converts HTML to clean, human-readable plain text, preserving poetic line breaks and cadence underlines.
func cleanHTML(input string) string {
	if strings.TrimSpace(input) == "" {
		return ""
	}
	s := kadenssiUnderline.ReplaceAllString(input, "__U_OPEN__${1}__U_CLOSE__")
	s = brRegex.ReplaceAllString(s, "\n")
	s = pRegex.ReplaceAllString(s, "\n\n")
	s = tagRegex.ReplaceAllString(s, "")
	s = strings.ReplaceAll(s, "__U_OPEN__", "<u>")
	s = strings.ReplaceAll(s, "__U_CLOSE__", "</u>")
	s = html.UnescapeString(s)
	s = strings.ReplaceAll(s, "\r", "")

	lines := strings.Split(s, "\n")
	var cleanedLines []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(spaceRegex.ReplaceAllString(line, " "))
		cleanedLines = append(cleanedLines, trimmed)
	}

	result := strings.Join(cleanedLines, "\n")
	for strings.Contains(result, "\n\n\n") {
		result = strings.ReplaceAll(result, "\n\n\n", "\n\n")
	}
	return strings.TrimSpace(result)
}

// extractVerses extracts clean verse references from a liturgical volume.
func extractVerses(vol WPVolume) Cycle {
	var c Cycle
	for _, p := range vol.Passages1 {
		if v := strings.TrimSpace(p.Verse1); v != "" {
			c.OldTestament = append(c.OldTestament, v)
		}
	}
	for _, p := range vol.Passages2 {
		if v := strings.TrimSpace(p.Verse2); v != "" {
			c.Epistle = append(c.Epistle, v)
		}
	}
	for _, p := range vol.Gospels {
		if v := strings.TrimSpace(p.Verse3); v != "" {
			c.Gospel = append(c.Gospel, v)
		}
	}
	return c
}

// cleanLectionaryItems converts WPLectionaryItems to CleanTextItems with cleaned plain text.
func cleanLectionaryItems(items []WPLectionaryItem) []CleanTextItem {
	var result []CleanTextItem
	for _, it := range items {
		verse := strings.TrimSpace(it.Verse)
		text := cleanHTML(it.Text)
		if verse != "" || text != "" {
			result = append(result, CleanTextItem{
				Verse: verse,
				Text:  text,
			})
		}
	}
	return result
}

// cleanHymns converts WPHymnGroups to clean Clible hymn groups.
func cleanHymns(groups []WPHymnGroup) []CleanHymnGroup {
	var result []CleanHymnGroup
	for _, grp := range groups {
		var hymns []CleanHymn
		for _, h := range grp.Hymns {
			name := strings.TrimSpace(h.Name)
			num := strings.TrimSpace(h.Number)
			if name != "" || num != "" {
				hymns = append(hymns, CleanHymn{
					Number: num,
					Name:   name,
					URL:    strings.TrimSpace(h.URL),
				})
			}
		}
		if len(hymns) > 0 {
			result = append(result, CleanHymnGroup{
				Group: strings.TrimSpace(grp.GroupName),
				Hymns: hymns,
			})
		}
	}
	return result
}

func stringValue(v any) string {
	if v == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprintf("%v", v))
}

var finnishWeekdays = map[time.Weekday]string{
	time.Sunday:    "sunnuntai",
	time.Monday:    "maanantai",
	time.Tuesday:   "tiistai",
	time.Wednesday: "keskiviikko",
	time.Thursday:  "torstai",
	time.Friday:    "perjantai",
	time.Saturday:  "lauantai",
}

// --- Liturgical Colors Resolution (Calendar API + Altar Image Fallback) ---

var (
	monthColorsMu sync.Mutex
	monthColors   = make(map[string]string) // "2026-09-20" -> "vihreä"
)

func parseColorClassName(classes []string) string {
	for _, cl := range classes {
		switch cl {
		case "liturgical-color--green":
			return "vihreä"
		case "liturgical-color--white":
			return "valkoinen"
		case "liturgical-color--red":
			return "punainen"
		case "liturgical-color--purple":
			return "violetti"
		case "liturgical-color--black":
			return "musta"
		}
	}
	return ""
}

func parseColorFromAltarImage(url string) string {
	u := strings.ToLower(url)
	switch {
	case strings.Contains(u, "vihrea") || strings.Contains(u, "vihreä"):
		return "vihreä"
	case strings.Contains(u, "valkoinen"):
		return "valkoinen"
	case strings.Contains(u, "punainen"):
		return "punainen"
	case strings.Contains(u, "violetti"):
		return "violetti"
	case strings.Contains(u, "musta"):
		return "musta"
	}
	return ""
}

func resolveLiturgicalColor(client *http.Client, t time.Time, altarImageURL, apiColor string) string {
	if apiColor != "" {
		return apiColor
	}

	dateKey := t.Format("2006-01-02")
	monthColorsMu.Lock()
	cachedColor, ok := monthColors[dateKey]
	monthColorsMu.Unlock()
	if ok && cachedColor != "" {
		return cachedColor
	}

	// Fetch entire month colors if not yet cached
	monthKey := fmt.Sprintf("%d/%d", t.Year(), int(t.Month()))
	url := fmt.Sprintf("https://www.kirkkovuosikalenteri.fi/wp-json/liturgicalColors/v1/%s", monthKey)

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err == nil {
		req.Header.Set("User-Agent", "ClibleBot/1.0 (+https://github.com/mvirtai/clible-v3-go)")
		resp, err := client.Do(req)
		if err == nil {
			if resp.StatusCode == http.StatusOK {
				var items []struct {
					Start      string   `json:"start"`
					ClassNames []string `json:"classNames"`
				}
				if json.NewDecoder(resp.Body).Decode(&items) == nil {
					monthColorsMu.Lock()
					for _, it := range items {
						col := parseColorClassName(it.ClassNames)
						if col != "" {
							monthColors[it.Start] = col
						}
					}
					monthColorsMu.Unlock()
				}
			}
			_ = resp.Body.Close()
		}
	}

	monthColorsMu.Lock()
	color := monthColors[dateKey]
	monthColorsMu.Unlock()

	if color != "" {
		return color
	}

	return parseColorFromAltarImage(altarImageURL)
}

// buildCelebration transforms a WPLiturgicalDay into a clean representation.
func buildCelebration(ld WPLiturgicalDay, resolvedColor, defaultCandles string) CleanCelebration {
	color := stringValue(ld.Color)
	if color == "" {
		color = resolvedColor
	}
	candles := stringValue(ld.Candles)
	if candles == "" {
		candles = defaultCandles
	}

	var dayPsalm *CleanTextItem
	if len(ld.Lectionary.Psalms) > 0 {
		cleaned := cleanLectionaryItems(ld.Lectionary.Psalms)
		if len(cleaned) > 0 {
			dayPsalm = &cleaned[0]
		}
	}

	var weekPsalm *CleanTextItem
	if len(ld.Lectionary.Week) > 0 {
		cleaned := cleanLectionaryItems(ld.Lectionary.Week)
		if len(cleaned) > 0 {
			weekPsalm = &cleaned[0]
		}
	}

	offices := CleanPrayerOffices{
		Morning:   cleanLectionaryItems(ld.Lectionary.Morning),
		Noon:      cleanLectionaryItems(ld.Lectionary.Noon),
		Evening:   cleanLectionaryItems(ld.Lectionary.Evening),
		Eve:       cleanLectionaryItems(ld.Lectionary.Eve),
		Apocrypha: cleanLectionaryItems(ld.Lectionary.Apocrypha),
	}

	var prayers []string
	for _, pr := range ld.DailyPrayers {
		if cleaned := cleanHTML(pr.Verse); cleaned != "" {
			prayers = append(prayers, cleaned)
		}
	}

	var imageURL, altarImageURL string
	if ld.PostThumbnail != nil {
		imageURL = strings.TrimSpace(ld.PostThumbnail.FullSizeURL)
	}
	if ld.AltarImage != nil {
		altarImageURL = strings.TrimSpace(ld.AltarImage.FullSizeURL)
	}

	return CleanCelebration{
		Title:         ld.Title,
		Subtitle:      ld.Subtitle,
		Period:        ld.Period,
		Color:         color,
		Candles:       candles,
		Description:   cleanHTML(ld.Description),
		Image:         imageURL,
		AltarImage:    altarImageURL,
		DayPsalm:      dayPsalm,
		WeekPsalm:     weekPsalm,
		PrayerOffices: offices,
		Years: map[string]Cycle{
			"I":   extractVerses(ld.FirstLiturgicalVolume),
			"II":  extractVerses(ld.SecondLiturgicalVolume),
			"III": extractVerses(ld.ThirdLiturgicalVolume),
		},
		Prayers: prayers,
		Hymns:   cleanHymns(ld.Hymns),
		URL:     ld.URL,
	}
}

// fetchDayWithRetry requests one calendar date from the WordPress API with retries.
func fetchDayWithRetry(client *http.Client, lang, dateStr string, maxRetries int) (*CleanLiturgicalDay, error) {
	url := fmt.Sprintf("https://www.kirkkovuosikalenteri.fi/wp-json/kirkkovuosi/v1/day/%s/%s", lang, dateStr)

	var lastErr error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		req, err := http.NewRequest(http.MethodGet, url, nil)
		if err != nil {
			return nil, fmt.Errorf("request creation error: %w", err)
		}
		req.Header.Set("User-Agent", "ClibleBot/1.0 (+https://github.com/mvirtai/clible-v3-go)")

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			time.Sleep(time.Duration(attempt*250) * time.Millisecond)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			_ = resp.Body.Close()
			lastErr = fmt.Errorf("unexpected HTTP status %d", resp.StatusCode)
			time.Sleep(time.Duration(attempt*250) * time.Millisecond)
			continue
		}

		var raw WPDayResponse
		err = json.NewDecoder(resp.Body).Decode(&raw)
		_ = resp.Body.Close()
		if err != nil {
			lastErr = fmt.Errorf("json decode error: %w", err)
			time.Sleep(time.Duration(attempt*250) * time.Millisecond)
			continue
		}

		if len(raw.LiturgicalDays) == 0 {
			return nil, fmt.Errorf("no liturgical days found for %s", dateStr)
		}

		// Parse date to extract ISO format and weekday
		t, err := time.Parse("2.1.2006", dateStr)
		isoDate := ""
		weekdayStr := ""
		if err == nil {
			isoDate = t.Format("2006-01-02")
			weekdayStr = finnishWeekdays[t.Weekday()]
		}

		defaultCandles := stringValue(raw.Candles)
		rawColor := stringValue(raw.Color)

		var firstAltarURL string
		if raw.LiturgicalDays[0].AltarImage != nil {
			firstAltarURL = raw.LiturgicalDays[0].AltarImage.FullSizeURL
		}
		resolvedColor := resolveLiturgicalColor(client, t, firstAltarURL, rawColor)

		var celebrations []CleanCelebration
		for _, ld := range raw.LiturgicalDays {
			celebrations = append(celebrations, buildCelebration(ld, resolvedColor, defaultCandles))
		}

		primary := celebrations[0]

		var psalmRefs []string
		for _, ps := range raw.LiturgicalDays[0].Lectionary.Psalms {
			if v := strings.TrimSpace(ps.Verse); v != "" {
				psalmRefs = append(psalmRefs, v)
			}
		}

		dayTitle := raw.DayTitle
		if dayTitle == "" {
			dayTitle = primary.Title
		}

		return &CleanLiturgicalDay{
			Date:          dateStr,
			ISODate:       isoDate,
			DayOfWeek:     weekdayStr,
			DayTitle:      dayTitle,
			Title:         primary.Title,
			Subtitle:      primary.Subtitle,
			Period:        primary.Period,
			Color:         resolvedColor,
			Candles:       primary.Candles,
			CurrentVolume: raw.DayVolume,
			Image:         primary.Image,
			AltarImage:    primary.AltarImage,
			Psalms:        psalmRefs,
			DayPsalm:      primary.DayPsalm,
			WeekPsalm:     primary.WeekPsalm,
			PrayerOffices: primary.PrayerOffices,
			Years:         primary.Years,
			Prayers:       primary.Prayers,
			Hymns:         primary.Hymns,
			Celebrations:  celebrations,
		}, nil
	}

	return nil, fmt.Errorf("failed after %d attempts: %w", maxRetries, lastErr)
}

func main() {
	yearFlag := flag.Int("year", 2026, "Year to harvest (1.1 - 31.12)")
	startFlag := flag.String("start", "", "Optional start date (e.g. 1.1.2026 or 2026-01-01)")
	endFlag := flag.String("end", "", "Optional end date (e.g. 31.12.2026 or 2026-12-31)")
	sampleFlag := flag.Bool("sample", false, "Harvest only a 4-Sunday sample for quick testing")
	outFlag := flag.String("out", "", "Output JSON path (defaults to backend/internal/parsers/data/kirkkovuosi_<year>.json)")
	delayFlag := flag.Duration("delay", 150*time.Millisecond, "Polite delay between HTTP requests")
	timeoutFlag := flag.Duration("timeout", 15*time.Second, "HTTP request timeout")
	retryFlag := flag.Int("retry", 3, "Number of retries per day on network errors")
	langFlag := flag.String("lang", "fi", "Language code (fi or sv)")

	flag.Parse()

	client := &http.Client{Timeout: *timeoutFlag}

	var dates []string

	if *sampleFlag {
		dates = []string{
			"20.9.2026",
			"27.9.2026",
			"4.10.2026",
			"11.10.2026",
		}
	} else if *startFlag != "" && *endFlag != "" {
		startDate, err := parseDateInput(*startFlag)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Virheellinen alkupäivämäärä: %v\n", err)
			os.Exit(1)
		}
		endDate, err := parseDateInput(*endFlag)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Virheellinen loppupäivämäärä: %v\n", err)
			os.Exit(1)
		}
		if endDate.Before(startDate) {
			fmt.Fprintf(os.Stderr, "Loppupäivämäärä ei voi olla ennen alkupäivämäärää\n")
			os.Exit(1)
		}

		for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
			dates = append(dates, d.Format("2.1.2006"))
		}
	} else {
		// Default to harvesting the entire calendar year
		startDate := time.Date(*yearFlag, time.January, 1, 0, 0, 0, 0, time.UTC)
		endDate := time.Date(*yearFlag, time.December, 31, 0, 0, 0, 0, time.UTC)
		for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
			dates = append(dates, d.Format("2.1.2006"))
		}
	}

	targetFile := *outFlag
	if targetFile == "" {
		targetDir := "backend/internal/parsers/data"
		if _, err := os.Stat("internal/parsers/data"); err == nil {
			targetDir = "internal/parsers/data"
		}
		if *sampleFlag {
			targetFile = filepath.Join(targetDir, "kirkkovuosi_sample.json")
		} else {
			targetFile = filepath.Join(targetDir, fmt.Sprintf("kirkkovuosi_%d.json", *yearFlag))
		}
	}

	if err := os.MkdirAll(filepath.Dir(targetFile), 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Virhe kohdehakemiston luonnissa: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("=====================================================\n")
	fmt.Printf("  Clible Kirkkovuosi Harvester\n")
	fmt.Printf("  Päiviä haettavana: %d\n", len(dates))
	fmt.Printf("  Viive pyyntöjen välillä: %v\n", *delayFlag)
	fmt.Printf("  Kohdetiedosto: %s\n", targetFile)
	fmt.Printf("=====================================================\n\n")

	var collected []CleanLiturgicalDay
	var failedDates []string

	startTime := time.Now()

	for i, date := range dates {
		fmt.Printf("[%3d/%3d] Haetaan: %-10s ... ", i+1, len(dates), date)
		day, err := fetchDayWithRetry(client, *langFlag, date, *retryFlag)
		if err != nil {
			fmt.Printf("VIRHE: %v\n", err)
			failedDates = append(failedDates, date)
			continue
		}

		officesSummary := fmt.Sprintf("hetket: aamu(%d) päivä(%d) ilta(%d) aatto(%d)",
			len(day.PrayerOffices.Morning),
			len(day.PrayerOffices.Noon),
			len(day.PrayerOffices.Evening),
			len(day.PrayerOffices.Eve))

		psalmSummary := "-"
		if day.DayPsalm != nil {
			psalmSummary = day.DayPsalm.Verse
		}

		hymnsCount := 0
		for _, g := range day.Hymns {
			hymnsCount += len(g.Hymns)
		}

		fmt.Printf("OK | väri: %-9s | %-28s | psalmi: %-15s | virsiä: %2d | %s\n",
			day.Color,
			truncate(day.Title, 28),
			truncate(psalmSummary, 15),
			hymnsCount,
			officesSummary,
		)

		collected = append(collected, *day)

		if i < len(dates)-1 && *delayFlag > 0 {
			time.Sleep(*delayFlag)
		}
	}

	data, err := json.MarshalIndent(collected, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Virhe JSON-sarjallistamisessa: %v\n", err)
		os.Exit(1)
	}

	if err := os.WriteFile(targetFile, data, 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Virhe tiedoston tallentamisessa: %v\n", err)
		os.Exit(1)
	}

	duration := time.Since(startTime).Round(time.Second)

	fmt.Printf("\n=====================================================\n")
	fmt.Printf("  KERUU VALMIS!\n")
	fmt.Printf("  Onnistuneet päivät: %d / %d\n", len(collected), len(dates))
	if len(failedDates) > 0 {
		fmt.Printf("  Epäonnistuneet päivät (%d kpl): %v\n", len(failedDates), failedDates)
	}
	fmt.Printf("  Kesto: %v\n", duration)
	fmt.Printf("  Tiedostokoko: %.2f MB\n", float64(len(data))/(1024*1024))
	fmt.Printf("  Tallennettu: %s\n", targetFile)
	fmt.Printf("=====================================================\n")
}

func parseDateInput(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	formats := []string{
		"2.1.2006",
		"02.01.2006",
		"2006-01-02",
		"2006-1-2",
	}
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("tuntematon päivämäärämuoto: %s (käytä d.m.YYYY tai YYYY-MM-DD)", s)
}

func truncate(s string, max int) string {
	if len([]rune(s)) <= max {
		return s
	}
	return string([]rune(s)[:max-1]) + "…"
}
