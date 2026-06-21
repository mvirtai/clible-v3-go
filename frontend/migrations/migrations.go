package migrations

import "embed"

// Files contains all embedded SQL migration scripts at the root level
//
//go:embed *.sql
var Files embed.FS
