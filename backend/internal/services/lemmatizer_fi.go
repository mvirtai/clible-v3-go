package services

import (
	"strings"
	"unicode/utf8"
)

// finnishIrregularLemmas maps inflected forms of frequent biblical, theological,
// and grammatical terms directly to their canonical nominative dictionary lemma.
// This handles irregular stems, consonant gradation, and historical changes.
var finnishIrregularLemmas = map[string]string{
	// Jeesus / Kristus / Jumala / Herra
	"jeesus":       "Jeesus",
	"jeesuksen":    "Jeesus",
	"jeesusta":     "Jeesus",
	"jeesukseen":   "Jeesus",
	"jeesuksessa":  "Jeesus",
	"jeesuksesta":  "Jeesus",
	"jeesukselle":  "Jeesus",
	"jeesuksella":  "Jeesus",
	"jeesukselta":  "Jeesus",
	"jeesukseksi":  "Jeesus",
	"jeesuksena":   "Jeesus",
	"kristus":      "Kristus",
	"kristuksen":   "Kristus",
	"kristusta":    "Kristus",
	"kristukseen":  "Kristus",
	"kristuksessa": "Kristus",
	"kristuksesta": "Kristus",
	"kristukselle": "Kristus",
	"kristuksella": "Kristus",
	"kristukselta": "Kristus",
	"kristukseksi": "Kristus",
	"kristuksena":  "Kristus",
	"kristukset":   "Kristus",
	"kristusten":   "Kristus",
	"herra":        "Herra",
	"herran":       "Herra",
	"herraa":       "Herra",
	"herraan":      "Herra",
	"herrassa":     "Herra",
	"herrasta":     "Herra",
	"herralle":     "Herra",
	"herralla":     "Herra",
	"herralta":     "Herra",
	"herraksi":     "Herra",
	"herrana":      "Herra",
	"herrat":       "Herra",
	"herrojen":     "Herra",
	"herroille":    "Herra",
	"herroissa":    "Herra",
	"jumala":       "Jumala",
	"jumalan":      "Jumala",
	"jumalaa":      "Jumala",
	"jumalaan":     "Jumala",
	"jumalassa":    "Jumala",
	"jumalasta":    "Jumala",
	"jumalalle":    "Jumala",
	"jumalalla":    "Jumala",
	"jumalalta":    "Jumala",
	"jumalaksi":    "Jumala",
	"jumalana":     "Jumala",
	"jumalat":      "Jumala",
	"jumalien":     "Jumala",
	"jumalain":     "Jumala",
	"jumalille":    "Jumala",
	"israel":       "Israel",
	"israelin":     "Israel",
	"israelia":     "Israel",
	"israeliin":    "Israel",
	"israelissa":   "Israel",
	"israelista":   "Israel",
	"israelille":   "Israel",

	// Kuningas / Ruhtinas / Messias
	"kuningas":      "kuningas",
	"kuninkaan":     "kuningas",
	"kuningasta":    "kuningas",
	"kuninkaaseen":  "kuningas",
	"kuninkaassa":   "kuningas",
	"kuninkaasta":   "kuningas",
	"kuninkaalle":   "kuningas",
	"kuninkaalla":   "kuningas",
	"kuninkaat":     "kuningas",
	"kuninkaiden":   "kuningas",
	"kuninkaille":   "kuningas",
	"kuninkaissa":   "kuningas",
	"ruhtinas":      "ruhtinas",
	"ruhtinaan":     "ruhtinas",
	"ruhtinasta":    "ruhtinas",
	"ruhtinaat":     "ruhtinas",
	"ruhtinaiden":   "ruhtinas",
	"ruhtinaille":   "ruhtinas",
	"messias":       "Messias",
	"messiaan":      "Messias",
	"messiasta":     "Messias",
	"messiaalle":    "Messias",

	// Lapsi / Opetuslapsi / Veljet
	"lapsi":          "lapsi",
	"lapsen":         "lapsi",
	"lasta":          "lapsi",
	"lapseen":        "lapsi",
	"lapsessa":       "lapsi",
	"lapsesta":       "lapsi",
	"lapselle":       "lapsi",
	"lapsella":       "lapsi",
	"lapset":         "lapsi",
	"lasten":         "lapsi",
	"lapsia":         "lapsi",
	"lapsille":       "lapsi",
	"lapsissa":       "lapsi",
	"opetuslapsi":    "opetuslapsi",
	"opetuslapsen":   "opetuslapsi",
	"opetuslasta":    "opetuslapsi",
	"opetuslapset":   "opetuslapsi",
	"opetuslasten":   "opetuslapsi",
	"opetuslapsille": "opetuslapsi",
	"opetuslapsia":   "opetuslapsi",
	"opetuslapsissa": "opetuslapsi",
	"veli":           "veli",
	"veljen":         "veli",
	"veljeä":         "veli",
	"veljelle":       "veli",
	"veljet":         "veli",
	"veljien":        "veli",
	"veljiä":         "veli",
	"veljille":       "veli",
	"sisar":          "sisar",
	"sisaren":        "sisar",
	"sisarta":        "sisar",
	"sisaret":        "sisar",
	"sisarten":       "sisar",

	// Henki / Pyhä Henki / Sielu / Ruumis
	"henki":    "henki",
	"hengen":   "henki",
	"henkeä":   "henki",
	"henkeen":  "henki",
	"hengessä": "henki",
	"hengestä": "henki",
	"hengelle": "henki",
	"henget":   "henki",
	"henkien":  "henki",
	"henkiä":   "henki",
	"hengille": "henki",
	"ruumis":   "ruumis",
	"ruumiin":  "ruumis",
	"ruumista": "ruumis",
	"ruumiissa": "ruumis",
	"ruumiista": "ruumis",
	"ruumiille": "ruumis",
	"ruumiit":  "ruumis",
	"ruumiiden": "ruumis",
	"sielu":    "sielu",
	"sielun":   "sielu",
	"sielua":   "sielu",
	"sieluun":  "sielu",
	"sielussa": "sielu",
	"sielusta": "sielu",
	"sielulle": "sielu",
	"sielut":   "sielu",
	"sielujen": "sielu",

	// Sydän / Taivas / Maa / Valo
	"sydän":       "sydän",
	"sydämen":     "sydän",
	"sydäntä":     "sydän",
	"sydämeen":    "sydän",
	"sydämessä":   "sydän",
	"sydämestä":   "sydän",
	"sydämelle":   "sydän",
	"sydämet":     "sydän",
	"sydänten":    "sydän",
	"sydämiin":    "sydän",
	"sydämissä":   "sydän",
	"sydämistään": "sydän",
	"taivas":      "taivas",
	"taivaan":     "taivas",
	"taivasta":    "taivas",
	"taivaaseen":  "taivas",
	"taivaassa":   "taivas",
	"taivaasta":   "taivas",
	"taivaalle":   "taivas",
	"taivaat":     "taivas",
	"taivasten":   "taivas",
	"taivaissa":   "taivas",
	"taivaisiin":  "taivas",
	"maa":         "maa",
	"maan":        "maa",
	"maata":       "maa",
	"maahan":      "maa",
	"maassa":      "maa",
	"maasta":      "maa",
	"maalle":      "maa",
	"maat":        "maa",
	"maiden":      "maa",
	"maissa":      "maa",
	"valkeus":     "valkeus",
	"valkeuden":   "valkeus",
	"valkeutta":   "valkeus",
	"valkeudessa": "valkeus",
	"valkeudesta": "valkeus",
	"valkeuteen":  "valkeus",
	"pimeys":      "pimeys",
	"pimeyden":    "pimeys",
	"pimeyttä":    "pimeys",
	"pimeydessä":  "pimeys",
	"pimeydestä":  "pimeys",
	"pimeyteen":   "pimeys",

	// Armo / Totuus / Rakkaus / Usko / Toivo / Elämä / Kuolema / Veri
	"armo":        "armo",
	"armon":       "armo",
	"armoa":       "armo",
	"armoon":      "armo",
	"armossa":     "armo",
	"armosta":     "armo",
	"armolle":     "armo",
	"totuus":      "totuus",
	"totuuden":    "totuus",
	"totuutta":    "totuus",
	"totuuteen":   "totuus",
	"totuudessa":  "totuus",
	"totuudesta":  "totuus",
	"rakkaus":     "rakkaus",
	"rakkauden":   "rakkaus",
	"rakkaudessa": "rakkaus",
	"rakkaudesta": "rakkaus",
	"rakkauteen":  "rakkaus",
	"rakkaudella": "rakkaus",
	"rakkauteensa": "rakkaus",
	"usko":        "usko",
	"uskon":       "usko",
	"uskoa":       "usko",
	"uskoon":      "usko",
	"uskossa":     "usko",
	"uskosta":     "usko",
	"uskolle":     "usko",
	"toivo":       "toivo",
	"toivon":      "toivo",
	"toivoa":      "toivo",
	"toivoon":     "toivo",
	"toivossa":    "toivo",
	"toivosta":    "toivo",
	"elämä":       "elämä",
	"elämän":      "elämä",
	"elämää":      "elämä",
	"elämään":     "elämä",
	"elämässä":    "elämä",
	"elämästä":    "elämä",
	"elämälle":    "elämä",
	"kuolema":     "kuolema",
	"kuoleman":    "kuolema",
	"kuolemaa":    "kuolema",
	"kuolemaan":   "kuolema",
	"kuolemassa":  "kuolema",
	"kuolemasta":  "kuolema",
	"kuolemalle":  "kuolema",
	"veri":        "veri",
	"veren":       "veri",
	"verta":       "veri",
	"vereen":      "veri",
	"veressä":     "veri",
	"verestä":     "veri",
	"verellä":     "veri",
	"verensä":     "veri",

	// Sana / Laki / Liitto / Rauha
	"sana":       "sana",
	"sanan":      "sana",
	"sanaa":      "sana",
	"sanaan":     "sana",
	"sanassa":    "sana",
	"sanasta":    "sana",
	"sanalle":    "sana",
	"sanat":      "sana",
	"sanojen":    "sana",
	"sanoja":     "sana",
	"sanoissa":   "sana",
	"laki":       "laki",
	"lain":       "laki",
	"lakia":      "laki",
	"lakiin":     "laki",
	"laissa":     "laki",
	"laista":     "laki",
	"laille":     "laki",
	"liitto":     "liitto",
	"liiton":     "liitto",
	"liittoa":    "liitto",
	"liittoon":   "liitto",
	"liitossa":   "liitto",
	"liitosta":   "liitto",
	"liitolle":   "liitto",
	"liitot":     "liitto",
	"rauha":      "rauha",
	"rauhan":     "rauha",
	"rauhaa":     "rauha",
	"rauhaan":    "rauha",
	"rauhassa":   "rauha",
	"rauhasta":   "rauha",
	"rauhalle":   "rauha",

	// Ihminen / Synti / Vanhurskaus
	"ihminen":       "ihminen",
	"ihmisen":       "ihminen",
	"ihmistä":       "ihminen",
	"ihmiseen":      "ihminen",
	"ihmisessä":     "ihminen",
	"ihmisestä":     "ihminen",
	"ihmiselle":     "ihminen",
	"ihmisellä":     "ihminen",
	"ihmiset":       "ihminen",
	"ihmisten":      "ihminen",
	"ihmisiä":       "ihminen",
	"ihmisille":     "ihminen",
	"ihmisissä":     "ihminen",
	"synti":         "synti",
	"synnin":        "synti",
	"syntiä":        "synti",
	"syntiin":       "synti",
	"synnissä":      "synti",
	"synnistä":      "synti",
	"synnille":      "synti",
	"synnit":        "synti",
	"syntien":       "synti",
	"syntejä":       "synti",
	"synneistä":     "synti",
	"synneille":     "synti",
	"vanhurskaus":   "vanhurskaus",
	"vanhurskauden": "vanhurskaus",
	"vanhurskautta": "vanhurskaus",
	"vanhurskaudessa": "vanhurskaus",
	"vanhurskaudesta": "vanhurskaus",
	"vanhurskauteen":  "vanhurskaus",
}

// LemmatizeFI returns the base or lemma form of a Finnish word.
// It combines a rich domain dictionary of theological/biblical irregular forms
// with a deterministic rule-based suffix stripper for regular Finnish morphology.
func LemmatizeFI(word string) string {
	raw := strings.TrimSpace(word)
	if raw == "" {
		return ""
	}

	lower := strings.ToLower(raw)

	// 1. Direct dictionary lookup for irregulars and frequent terms
	if lemma, found := finnishIrregularLemmas[lower]; found {
		return lemma
	}

	// 2. Rule-based morphological suffix trimming
	lemma := stemFinnishWord(lower)

	// Re-check dictionary with stemmed form if stem was altered
	if lemma != lower {
		if dictLemma, found := finnishIrregularLemmas[lemma]; found {
			return dictLemma
		}
	}

	// Preserve title case if original input was capitalized
	r, _ := utf8.DecodeRuneInString(raw)
	if strings.ToUpper(string(r)) == string(r) && len(lemma) > 0 {
		firstRune, size := utf8.DecodeRuneInString(lemma)
		return strings.ToUpper(string(firstRune)) + lemma[size:]
	}

	return lemma
}

// stemFinnishWord strips clitics, possessive suffixes, case endings, and plurals.
func stemFinnishWord(w string) string {
	// Words shorter than 4 runes usually don't have strippable suffixes without losing the root
	if utf8.RuneCountInString(w) < 4 {
		return w
	}

	orig := w

	// 1. Clitic particles (-kin, -kaan/-kään, -ko/-kö, -pa/-pä, -han/-hän, -s)
	w = stripClitics(w)

	// 2. Possessive suffixes (-nsa/-nsä, -mme, -nne, -ni, -si)
	w = stripPossessives(w)

	// 3. Case endings (-ssa/-ssä, -sta/-stä, -lla/-llä, -lta/-ltä, -lle, -ksi, -na/-nä, -tta/-ttä, -en, -in)
	w = stripCases(w)

	// 4. Plural -i- marker or genitive plural variations (-ien, -jen, -ten)
	w = stripPluralMarkers(w)

	// If stripping reduced word too much (below 3 runes), fall back to original
	if utf8.RuneCountInString(w) < 3 {
		return orig
	}

	return w
}

func stripClitics(w string) string {
	clitics := []string{
		"kaankaan", "käänkään", "kaan", "kään", "kin", "han", "hän", "pa", "pä", "ko", "kö",
	}
	for _, c := range clitics {
		if strings.HasSuffix(w, c) && utf8.RuneCountInString(w)-utf8.RuneCountInString(c) >= 3 {
			return strings.TrimSuffix(w, c)
		}
	}
	return w
}

func stripPossessives(w string) string {
	possessives := []string{
		"nsa", "nsä", "mme", "nne", "si", "ni", "an", "en",
	}
	for _, p := range possessives {
		if strings.HasSuffix(w, p) && utf8.RuneCountInString(w)-utf8.RuneCountInString(p) >= 3 {
			// Ensure we don't accidentally strip 'en' if it's part of a short stem
			if p == "en" || p == "an" {
				// Only strip if preceded by a vowel
				runes := []rune(w)
				idx := len(runes) - len([]rune(p))
				if idx > 0 && isVowel(runes[idx-1]) {
					return string(runes[:idx])
				}
				continue
			}
			return strings.TrimSuffix(w, p)
		}
	}
	return w
}

func stripCases(w string) string {
	cases := []string{
		"staan", "stään", "ltaan", "ltään",
		"ssa", "ssä", "sta", "stä",
		"lla", "llä", "lta", "ltä", "lle",
		"ksi", "kse", "tta", "ttä", "na", "nä",
	}

	for _, c := range cases {
		if strings.HasSuffix(w, c) && utf8.RuneCountInString(w)-utf8.RuneCountInString(c) >= 3 {
			trimmed := strings.TrimSuffix(w, c)
			// If ends in -kse (e.g. lapse-kse), change to base if applicable
			if c == "ksi" || c == "kse" {
				return restoreKseStem(trimmed)
			}
			return trimmed
		}
	}

	// Genitive -n and Partitive -a/-ä or -ta/-tä
	if strings.HasSuffix(w, "ta") || strings.HasSuffix(w, "tä") {
		if utf8.RuneCountInString(w) >= 5 {
			return w[:len(w)-2]
		}
	}

	// Illative double vowel + n (-seen, -han, -hin, etc.)
	runes := []rune(w)
	n := len(runes)
	if n >= 5 && runes[n-1] == 'n' {
		// -seen / -siin
		if strings.HasSuffix(w, "seen") || strings.HasSuffix(w, "siin") {
			return string(runes[:n-4])
		}
		// Single genitive -n
		if isVowel(runes[n-2]) {
			return string(runes[:n-1])
		}
	}

	// Partitive single -a / -ä preceded by consonant or vowel
	if n >= 4 && (runes[n-1] == 'a' || runes[n-1] == 'ä') {
		if runes[n-2] == runes[n-1] {
			// double vowel: e.g. maata -> maa
			return string(runes[:n-1])
		}
		return string(runes[:n-1])
	}

	return w
}

func stripPluralMarkers(w string) string {
	runes := []rune(w)
	n := len(runes)
	if n >= 4 {
		// Nominative plural -t at the very end
		if runes[n-1] == 't' && isVowel(runes[n-2]) {
			return string(runes[:n-1])
		}
		// Plural -i- in oblique forms e.g. -oissa, -eissa
		if runes[n-1] == 'i' && n >= 4 {
			return string(runes[:n-1])
		}
	}
	return w
}

func restoreKseStem(stem string) string {
	// e.g. valkeu- -> valkeus, lapse- -> lapsi
	if strings.HasSuffix(stem, "u") || strings.HasSuffix(stem, "y") {
		return stem + "s"
	}
	return stem
}

func isVowel(r rune) bool {
	switch r {
	case 'a', 'e', 'i', 'o', 'u', 'y', 'ä', 'ö', 'å',
		'A', 'E', 'I', 'O', 'U', 'Y', 'Ä', 'Ö', 'Å':
		return true
	default:
		return false
	}
}
