package parsers

import (
	_ "embed"
)

// Kirkkovuosi2026JSON contains the embedded static dataset for the 2026 church year.
// This ensures the backend binary is 100% self-contained across Docker, Cloud Run, and test runs.
//
//go:embed data/kirkkovuosi_2026.json
var Kirkkovuosi2026JSON []byte
