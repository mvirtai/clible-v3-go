# PR: feat: implement high-performance text analytics and translation comparison engine

## Summary

This PR introduces the business-logic analytics layer for `clible-v3-go` by implementing the `AnalyticService`. Moving away from the legacy `clible-v2` architecture—which invoked a heavy Python subprocess wrapper via an API proxy—this component delivers fully in-memory, zero-dependency, and high-performance text processing. It handles localized tokenization, language-specific stopword filtering, linguistic diversity metrics (Type-Token Ratio), and parallel translation cross-examination utilizing dynamic programming.

## Purpose

- Eliminate process-forking overhead by migrating core Python analytical capabilities into the native Go runtime memory space, substantially minimizing CPU and memory footprints inside Cloud Run containers.
- Implement a compile-time asset optimization model using Go's `//go:embed` directive to bake `stopwords.json` directly into the binary, mitigating runtime path resolution faults.
- Provide the React frontend with predictable, strongly typed JSON endpoints capable of performing sub-millisecond comparative audits between distinct translation corpora.
- Master explicit Go patterns including pre-allocated slice capacities, anonymous struct parsing, pointer receivers, and manual multi-dimensional slices.

## Changes in This PR

### 1. Zero-I/O Compile-Time Asset Baking (`internal/services/`)

- Integrated the multi-language `stopwords.json` dictionary matrix directly into the service layer.
- Configured a `//go:embed` compiler directive mapping the raw asset straight into a fixed byte slice (`[]byte`), bypassing the overhead of virtual file systems (`embed.FS`).
- Utilized an inline, anonymous structural layout (`var schema map[string]struct{ Words []string }`) inside the initialization loop to unpack target language arrays safely while discarding metadata.

### 2. Memory-Optimized Tokenizer & Structural Metrics Analyzer

- Authored `Tokenize` leveraging `strings.Fields` and custom regular expressions (`regexp.MustCompile`) to strip terminal and leading punctuation marks while checking frequencies against a fast boolean map lookup (`map[string]bool`).
- Pre-allocated internal slice memories (`make([]string, 0, len(words))`) to guarantee the underlying array never triggers expensive runtime expansion allocations inside hot text loops.
- Engineered `AnalyzeVerses` delivering text character lengths, whitespace-aware word bounds, and explicit float64 type-casted Type-Token Ratios (TTR) along with sorted n-gram (bigram/trigram) frequency matrices.

### 3. Dual-Translation Cross-Examination Matrix Engine

- Implemented `CompareTranslations` which maps disparate source arrays into a unified parallel view using localized key structs (`type key struct`) and custom multi-indexed slice sorting routines (`sort.Slice`).
- Replaced the legacy Python `difflib.SequenceMatcher` dependency with a native, pure-Go Longest Common Subsequence (LCS) solver. The solver computes a two-dimensional dynamic programming allocation matrix (`make([][]int, m+1)`) to evaluate exact string alignment shifts deterministically.

## Files added

- `internal/services/analytics_service.go` — Core analytics and translation alignment service framework.
- `internal/services/analytics_service_test.go` — Validation suite for tokenizer normalization and similarity indexes.
- `internal/services/stopwords.json` — Static language-specific stopword arrays matching 'en', 'fi', 'grc', and 'el'.

## Files modified

- None (Independent service encapsulation layer).

## Tests

Executed unified validation pipelines to confirm exact token boundaries, mathematical ratio correctness, and matrix evaluation limits:

```bash
go test -v ./...
```

## Usage

### Service Initialization

```go
// Initialize the analytics service with specific language parameters
analyticsSvc, err := services.NewAnalyticService(verseRepo, true, "fi")
if err != nil {
    log.Fatalf("failed to boot analytics processor: %v", err)
}
```

### Performing Parallel Text Audits

```go
// Direct in-memory calculation feeding into high-speed HTTP handlers
result := analyticsSvc.CompareTranslations("John 3:16", versesFromKR38, versesFromKR92)
fmt.Printf("Average Translation Similarity: %.2f%%\n", result.Summary.AverageSimilarity * 100)
```
