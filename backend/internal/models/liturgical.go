package models

// LiturgicalDay represents one day in the church year calendar.
type LiturgicalDay struct {
	Date          string             `json:"date"`
	ISODate       string             `json:"iso_date"`
	DayOfWeek     string             `json:"day_of_week"`
	DayTitle      string             `json:"day_title"`
	Title         string             `json:"title"`
	Subtitle      string             `json:"subtitle"`
	Period        string             `json:"period,omitempty"`
	Color         string             `json:"color"`
	Candles       string             `json:"candles"`
	CurrentVolume string             `json:"current_volume"`
	Image         string             `json:"image,omitempty"`
	AltarImage    string             `json:"altar_image,omitempty"`
	Psalms        []string           `json:"psalms,omitempty"`
	DayPsalm      *CleanTextItem     `json:"day_psalm,omitempty"`
	WeekPsalm     *CleanTextItem     `json:"week_psalm,omitempty"`
	PrayerOffices CleanPrayerOffices `json:"prayer_offices"`
	Years         map[string]Cycle   `json:"years,omitempty"`
	Prayers       []string           `json:"prayers,omitempty"`
	Hymns         []CleanHymnGroup   `json:"hymns,omitempty"`
	Celebrations  []CleanCelebration `json:"celebrations,omitempty"`
}

// CleanTextItem pairs a Scripture reference with cleaned plain text.
type CleanTextItem struct {
	Verse string `json:"verse"`
	Text  string `json:"text"`
}

// CleanPrayerOffices holds daily prayer offices (hetkipalvelukset).
type CleanPrayerOffices struct {
	Morning      []CleanTextItem `json:"morning,omitempty"`
	Noon         []CleanTextItem `json:"noon,omitempty"`
	Evening      []CleanTextItem `json:"evening,omitempty"`
	Eve          []CleanTextItem `json:"eve,omitempty"`
	Completorium []CleanTextItem `json:"completorium,omitempty"`
	Apocrypha    []CleanTextItem `json:"apocrypha,omitempty"`
}

// CleanHymnGroup contains a category of hymns.
type CleanHymnGroup struct {
	Group string      `json:"group"`
	Hymns []CleanHymn `json:"hymns"`
}

// CleanHymn represents a hymn recommendation.
type CleanHymn struct {
	Number string `json:"number"`
	Name   string `json:"name"`
	URL    string `json:"url"`
}

// Cycle holds the Scripture lections for liturgical cycles (I, II, III).
type Cycle struct {
	OldTestament []string `json:"old_testament"`
	Epistle      []string `json:"epistle"`
	Gospel       []string `json:"gospel"`
}

// CleanCelebration stores one celebration if multiple fall on the same date.
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
