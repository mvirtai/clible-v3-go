package version

import "runtime"

var (
	// Version is the current SemVer release of the application.
	Version = "3.1.3"

	// GitCommit contains the commit SHA injected during compile time via ldflags.
	GitCommit = "dev"

	// BuildDate contains the build timestamp injected during compile time via ldflags.
	BuildDate = "unknown"

	// GoVersion is the Go compiler version used to build the binary.
	GoVersion = runtime.Version()
)

// Info encapsulates the build and runtime version metadata.
type Info struct {
	Version   string `json:"version"`
	GitCommit string `json:"gitCommit"`
	BuildDate string `json:"buildDate"`
	GoVersion string `json:"goVersion"`
}

// GetInfo returns an aggregated Info struct with current build metadata.
func GetInfo() Info {
	return Info{
		Version:   Version,
		GitCommit: GitCommit,
		BuildDate: BuildDate,
		GoVersion: GoVersion,
	}
}
