# Suunnitelma 05C: Clible Notebooks — Komentotulkki ja autokompletointi

Tämä dokumentti ohjaa Clible CLI -komentotulkin ja Notebook-koodisolujen älykkäiden ominaisuuksien (kuten autokompletoinnin) toteuttamista.

---

## 1. Komentotulkin rakenne (CLI Interpreter)

Kun käyttäjä suorittaa koodisolun, frontend tai backend tulkitsee syötteen. Siisteyden ja suorituskyvyn vuoksi komentotulkki toteutetaan **Go-backendissä** palveluna `internal/services/cli_service.go`, jolloin frontend lähettää raa'an komennon rajapintaan `POST /api/notebooks/{id}/cells/{cell_id}/execute`.

### Tuetut komennot ja syntaksi

* `/read <viite> [--translation=<id>]`
  * Hakee jakeet annetulla raamattuviitteellä.
  * Esimerkki: `/read John 3:16-17 --translation=biblia`
* `/search "<hakusana>" [--regex]`
  * Suorittaa hakuoperaation.
  * Esimerkki: `/search "armo" --regex`
* `/compare <viite> --translations=<id1,id2>`
  * Luo rinnakkaisvertailun kahden tai useamman käännöksen välille.
  * Esimerkki: `/compare John 3:16 --translations=KJV,biblia`
* `/analyze <viite>`
  * Suorittaa tekstianalyysin kyseisestä luvusta tai jakeesta (sanapilvitiedot, stopword-suodatus).
  * Esimerkki: `/analyze John 3`

---

## 2. Argumenttien jäsennys (Parsing)

Backend käyttää Regex-pohjaista tai yksinkertaista tokenointia parametrien ja lippujen (flags) erottamiseen.

```go
package services

import (
	"strings"
	"regexp"
)

type CLICommand struct {
	Name   string
	Args   []string
	Flags  map[string]string
}

func ParseCLICommand(input string) *CLICommand {
	input = strings.TrimSpace(input)
	if !strings.HasPrefix(input, "/") {
		return nil
	}

	parts := strings.Split(input, " ")
	cmdName := parts[0]
	
	// Liput ja argumentit erotellaan
	flags := make(map[string]string)
	var args []string

	for i := 1; i < len(parts); i++ {
		part := parts[i]
		if strings.HasPrefix(part, "--") {
			// Lipun jäsennys (esim. --translation=KJV tai --regex)
			flagParts := strings.SplitN(part, "=", 2)
			flagName := flagParts[0][2:]
			flagValue := ""
			if len(flagParts) > 1 {
				flagValue = flagParts[1]
			} else {
				flagValue = "true"
			}
			flags[flagName] = flagValue
		} else {
			args = append(args, part)
		}
	}

	return &CLICommand{
		Name:  cmdName,
		Args:  args,
		Flags: flags,
	}
}
```

---

## 3. Komennon suoritus (Execution Pipeline)

Kun `CLIService` on jäsentänyt komennon, se delegoi työn kyseiselle olemassa olevalle palvelulle:

* `/read` -> Kutsuu `VerseService.GetVerses`
* `/search` -> Kutsuu `VerseService.SearchVerses`
* `/compare` -> Kutsuu `AnalyticService.Compare`
* `/analyze` -> Kutsuu `AnalyticService.Analyze`

Palvelu palauttaa standardoidun JSON-rakenteen, joka tallennetaan `notebook_cells.result_json` -kenttään ja lähetetään frontendille:

```json
{
  "type": "read", // "read" | "search" | "compare" | "analyze"
  "data": { ... } // Komentokohtainen data (jakeet, analyysitulokset, virheet)
}
```

---

## 4. Älykäs editori ja autokompletointi (Frontend UX)

Jotta komentojen kirjoittaminen on sujuvaa, koodisolun syötekenttään rakennetaan älykkäitä aputoimintoja.

### Komento-valikko (`/`)
* Kun syötekenttä on tyhjä ja käyttäjä painaa `/`, aukeaa leijuva pikavalikko, joka ehdottaa tuettuja komentoja lyhyen kuvauksen kera (esim. `/read`, `/search`, `/compare`, `/analyze`).
* Nuolinäppäimillä ja `Enter`-painikkeella käyttäjä voi valita haluamansa komennon.

### Jae-valitsin (`[`)
* Kun käyttäjä kirjoittaa `[`-merkin mihin tahansa kohtaan komentoa, aukeaa hakuvalikko, joka listaa saatavilla olevat Raamatun kirjat ja ehdottaa viitteen automaattista täydentämistä.
* Tämä nopeuttaa huomattavasti pitkien jakeiden kirjoittamista muistiinpanoihin.
