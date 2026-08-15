package api

import (
	"encoding/json"
	"net/http"

	"github.com/mvirtai/clible-v3-go/internal/version"
)

// VersionHandler serves version and build metadata.
type VersionHandler struct{}

// NewVersionHandler creates a new VersionHandler instance.
func NewVersionHandler() *VersionHandler {
	return &VersionHandler{}
}

// GetVersion returns application version information in JSON format.
func (h *VersionHandler) GetVersion(w http.ResponseWriter, r *http.Request) {
	info := version.GetInfo()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(info)
}
