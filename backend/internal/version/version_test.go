package version

import "testing"

func TestGetInfo(t *testing.T) {
	info := GetInfo()

	if info.Version != Version {
		t.Errorf("expected version %q, got %q", Version, info.Version)
	}

	if info.GitCommit != GitCommit {
		t.Errorf("expected gitCommit %q, got %q", GitCommit, info.GitCommit)
	}

	if info.GoVersion == "" {
		t.Errorf("expected non-empty goVersion")
	}
}
