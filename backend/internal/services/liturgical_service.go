package services

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

// LiturgicalService provides fast in-memory lookups for church year liturgical days and prayer offices.
type LiturgicalService struct {
	mu        sync.RWMutex
	daysByISO map[string]*models.LiturgicalDay
	daysByFI  map[string]*models.LiturgicalDay
	allDays   []*models.LiturgicalDay
}

// NewLiturgicalService loads liturgical days from a JSON file path.
func NewLiturgicalService(dataPath string) (*LiturgicalService, error) {
	data, err := os.ReadFile(dataPath)
	if err != nil {
		return nil, fmt.Errorf("reading liturgical data failed: %w", err)
	}
	return NewLiturgicalServiceFromBytes(data)
}

// NewLiturgicalServiceFromBytes loads liturgical days from raw JSON bytes.
func NewLiturgicalServiceFromBytes(data []byte) (*LiturgicalService, error) {
	var rawDays []models.LiturgicalDay
	if err := json.Unmarshal(data, &rawDays); err != nil {
		return nil, fmt.Errorf("unmarshaling liturgical data failed: %w", err)
	}

	svc := &LiturgicalService{
		daysByISO: make(map[string]*models.LiturgicalDay, len(rawDays)),
		daysByFI:  make(map[string]*models.LiturgicalDay, len(rawDays)),
		allDays:   make([]*models.LiturgicalDay, 0, len(rawDays)),
	}

	for i := range rawDays {
		d := &rawDays[i]
		svc.allDays = append(svc.allDays, d)
		if d.ISODate != "" {
			svc.daysByISO[d.ISODate] = d
		}
		if d.Date != "" {
			svc.daysByFI[d.Date] = d
			// Support normalized leading zeroes (e.g. 04.10.2026 <-> 4.10.2026)
			normalized := normalizeFIDate(d.Date)
			if normalized != "" && normalized != d.Date {
				svc.daysByFI[normalized] = d
			}
		}
	}

	svc.normalizePrayerOffices()

	return svc, nil
}

// defaultCompletorium contains standard Kirkkokäsikirja night prayer (Completorium) texts.
var defaultCompletorium = []models.CleanTextItem{
	{
		Verse: "Ps. 4:2–9",
		Text:  "Vastaa minulle, kun huudan, * sinä minun vanhurskas Jumalani.\nAhdingossa sinä avasit minulle tien. * Ole minulle armollinen ja kuule rukoukseni.\nKuinka kauan te ihmiset häpäisette minun kunniaani, * miksi rakastatte turhuutta ja etsitte valhetta?\nTietäkää: Herra tekee ihmeitä hurskaalleen. * Hän kuulee minua, kun huudan häntä avukseni.\nVaviskaa ja lakatkaa tekemästä syntiä! * Puhukaa sydämessänne vuoteellanne ja olkaa vaiti.\nUhratkaa oikeita uhreja * ja luottakaa Herraan.\nMonet sanovat: »Kuka antaisi meille onnea?» * Herra, käännä meihin kasvojesi valkeus!\nSinä olet antanut sydämeeni suuremman ilon * kuin heillä on runsaasta viljasta ja viinistä.\nRauhassa minä käyn levolle ja nukahdan, * sillä sinä, Herra, yksin annat minun asua turvassa.\nKunnia Isälle ja Pojalle * ja Pyhälle Hengelle,\nniin kuin oli alussa, nyt on ja aina, * iankaikkisesta iankaikkiseen. Aamen.",
	},
	{
		Verse: "Ps. 91:1–16",
		Text:  "Se, joka asuu Korkeimman suojassa * ja yöpyy Kaikkivaltiaan varjossa,\nsanoo näin: * »Sinä, Herra, olet minun turvani ja linnani, Jumalani, johon minä luotan.»\nHän pelastaa sinut linnustajan ansasta * ja tuhoavalta rutolta.\nHän suojaa sinua siivillään, * ja sinä löydät turvan hänen sulkiensa alla. Hänen uskollisuutensa on kilpi ja suojus.\nEt pelkää yön kauhuja * etkä päivällä lentävää nuolta,\net ruttoa, joka liikkuu pimeässä, * etkä ruttotautia, joka riehuu keskipäivällä.\nVaikka viereltäsi kaatuisi tuhat ja oikealta puoleltasi kymmenentuhatta, * sinuun se ei koske.\nOmin silmin sinä saat katsella * ja nähdä jumalattomien palkan.\nSinun turvanasi on Herra, * olet ottanut Korkeimman asuinsijaksesi.\nOnnettomuus ei sinua kohtaa, * eikä vitsaus lähesty sinun majaasi.\nHän antaa enkeleilleen käskyn varjella sinua kaikilla teilläsi. * He kantavat sinua käsillään, ettet loukkaisi jalkaasi kiveen.\nSinä astut leijonan ja kyyn päälle, * tallaat maahan nuoren leijonan ja lohikäärmeen.\n»Koska hän riippuu minussa kiinni, minä pelastan hänet. * Minä suojelen häntä, koska hän tuntee minun nimeni.\nHän huutaa minua avukseen, ja minä vastaan hänelle. * Ahdingossa minä olen hänen kanssaan, minä vapautan hänet ja saatan hänet kunniaan.\nMinä tyydytän hänet pitkällä iällä * ja annan hänen nähdä minun pelastukseni.»\nKunnia Isälle ja Pojalle * ja Pyhälle Hengelle,\nniin kuin oli alussa, nyt on ja aina, * iankaikkisesta iankaikkiseen. Aamen.",
	},
	{
		Verse: "Ps. 134",
		Text:  "Tulkaa, kiittäkää Herraa, * kaikki te Herran palvelijat,\nte jotka toimitatte palvelusta Herran temppelissä * öiseen aikaan!\nKohottakaa kätenne pyhäkköä kohti * ja kiittäkää Herraa!\nSiunatkoon sinua Siionista Herra, * hän, joka on tehnyt taivaan ja maan.\nKunnia Isälle ja Pojalle * ja Pyhälle Hengelle,\nniin kuin oli alussa, nyt on ja aina, * iankaikkisesta iankaikkiseen. Aamen.",
	},
	{
		Verse: "Luuk. 2:29–32",
		Text:  "Herra, nyt sinä sallit palvelijasi lähteä rauhassa, * sanasi mukaan.\nMinun silmäni ovat nähneet sinun pelastuksesi, * jonka olet valmistanut kaikkien kansojen nähdä:\nvalon, joka koittaa pakanakansoille, * kirkkauden, joka loistaa kansallesi Israelille.\nKunnia Isälle ja Pojalle * ja Pyhälle Hengelle,\nniin kuin oli alussa, nyt on ja aina, * iankaikkisesta iankaikkiseen. Aamen.",
	},
}

// normalizePrayerOffices ensures Completorium is present and places eve offices on the actual eve (D-1).
func (s *LiturgicalService) normalizePrayerOffices() {
	// 1. Populate default Completorium if not already present
	for _, d := range s.allDays {
		if len(d.PrayerOffices.Completorium) == 0 {
			d.PrayerOffices.Completorium = defaultCompletorium
		}
	}

	// 2. Shift eve prayer offices to the preceding day (actual eve D-1)
	type eveShift struct {
		targetISO string
		items     []models.CleanTextItem
	}
	var shifts []eveShift
	for _, d := range s.allDays {
		if len(d.PrayerOffices.Eve) > 0 && d.ISODate != "" {
			t, err := time.Parse("2006-01-02", d.ISODate)
			if err == nil {
				prevISO := t.AddDate(0, 0, -1).Format("2006-01-02")
				shifts = append(shifts, eveShift{
					targetISO: prevISO,
					items:     d.PrayerOffices.Eve,
				})
				d.PrayerOffices.Eve = nil
			}
		}
	}

	for _, shift := range shifts {
		if prevDay, ok := s.daysByISO[shift.targetISO]; ok {
			prevDay.PrayerOffices.Eve = shift.items
		}
	}
}

// GetToday returns the liturgical day for the current local time.
func (s *LiturgicalService) GetToday(now time.Time) (*models.LiturgicalDay, bool) {
	iso := now.Format("2006-01-02")
	return s.GetByDate(iso)
}

// GetByDate returns the liturgical day matching either ISO ("2026-09-20") or Finnish ("20.9.2026") date format.
func (s *LiturgicalService) GetByDate(dateStr string) (*models.LiturgicalDay, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	dateStr = strings.TrimSpace(dateStr)
	if d, ok := s.daysByISO[dateStr]; ok {
		return d, true
	}
	if d, ok := s.daysByFI[dateStr]; ok {
		return d, true
	}

	normalized := normalizeFIDate(dateStr)
	if normalized != "" {
		if d, ok := s.daysByFI[normalized]; ok {
			return d, true
		}
	}

	return nil, false
}

// GetMonth returns all liturgical days for a specific year and month, sorted by date.
func (s *LiturgicalService) GetMonth(year, month int) []*models.LiturgicalDay {
	s.mu.RLock()
	defer s.mu.RUnlock()

	prefix := fmt.Sprintf("%04d-%02d-", year, month)
	var result []*models.LiturgicalDay

	for iso, d := range s.daysByISO {
		if strings.HasPrefix(iso, prefix) {
			result = append(result, d)
		}
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].ISODate < result[j].ISODate
	})

	return result
}

// Count returns the total number of loaded liturgical days.
func (s *LiturgicalService) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.allDays)
}

func normalizeFIDate(dateStr string) string {
	parts := strings.Split(dateStr, ".")
	if len(parts) != 3 {
		return ""
	}
	d := strings.TrimLeft(parts[0], "0")
	m := strings.TrimLeft(parts[1], "0")
	y := parts[2]
	if d == "" {
		d = "0"
	}
	if m == "" {
		m = "0"
	}
	return fmt.Sprintf("%s.%s.%s", d, m, y)
}
