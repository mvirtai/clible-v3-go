//go:build ignore
// +build ignore

package main

import (
	"fmt"
	"strings"
)

// Minimal inline repro of the tokenize + lemmatize pipeline

var finnishIrregularLemmas = map[string]string{
	"jeesus":    "Jeesus",
	"jeesuksen": "Jeesus",
	"jeesusta":  "Jeesus",
	"kristus":   "Kristus",
	"kristuksen": "Kristus",
	"herra":     "Herra",
	"herran":    "Herra",
}

func lemmatizeFI(word string) string {
	lower := strings.ToLower(strings.TrimSpace(word))
	if lemma, found := finnishIrregularLemmas[lower]; found {
		return lemma
	}
	return lower
}

func main() {
	// Simulate what AnalyzeVersesClustered does
	text := "E: Kiittäkäämme Herraa. S: Jumalalle kiitos. E: Herran Jeesuksen Kristuksen armo, Jumalan rakkaus ja Pyhän Hengen osallisuus olkoon meidän kaikkien kanssa. S: Aamen."

	words := strings.Fields(text)
	uniqueTokens := make(map[string]int)
	for _, w := range words {
		token := strings.ToLower(w)
		// Strip punctuation (simplified)
		token = strings.Trim(token, ".,?!;:\"'()[]{}«»—–- \t\n\r")
		if token == "" {
			continue
		}
		lemma := lemmatizeFI(token)
		uniqueTokens[lemma]++
		fmt.Printf("token=%q → lemma=%q\n", token, lemma)
	}

	fmt.Println("\n--- Unique token map ---")
	for k, v := range uniqueTokens {
		fmt.Printf("  %q: %d\n", k, v)
	}
}
