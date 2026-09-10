package api

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/services"
	newdsl "github.com/mvirtai/clible-v3-go/new_dsl"
)

type DSLHandler struct {
	cliService *services.CLIService
}

// NewDSLHandler creates a new instance of DSLHandler.
func NewDSLHandler(cliService *services.CLIService) *DSLHandler {
	return &DSLHandler{
		cliService: cliService,
	}
}

type DSLEvalRequest struct {
	Query         string                        `json:"query"`
	TranslationID string                        `json:"translationId,omitempty"`
	ContextText   string                        `json:"contextText,omitempty"`
	Variables     map[string]*models.CLIResult `json:"variables,omitempty"`
}

// EvalDSL handles POST /api/dsl/eval
func (h *DSLHandler) EvalDSL(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Limit request body to 1 MB to prevent resource exhaustion attacks (CWE-400, CWE-770)
	if r.Body != nil {
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	}

	var req DSLEvalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid request body"})
		return
	}

	if req.Query == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "empty query"})
		return
	}

	effectiveTrans := req.TranslationID
	if effectiveTrans == "" {
		acceptLang := r.Header.Get("Accept-Language")
		if strings.HasPrefix(strings.ToLower(acceptLang), "en") {
			effectiveTrans = "web"
		} else {
			effectiveTrans = "fin-1992"
		}
	}

	slog.Info("⚡ [ISLA Command]", "query", req.Query, "translationId", effectiveTrans)

	var varResolver newdsl.VariableResolver
	if len(req.Variables) > 0 {
		varResolver = func(name string) (*models.CLIResult, error) {
			clean := strings.TrimPrefix(name, "#")
			if res, ok := req.Variables[clean]; ok {
				return res, nil
			}
			if res, ok := req.Variables["#"+clean]; ok {
				return res, nil
			}
			return nil, fmt.Errorf("variable '#%s' not found in request context", clean)
		}
	}

	result, err := h.cliService.ExecuteDSLWithResolver(r.Context(), req.Query, effectiveTrans, req.ContextText, varResolver)
	if err != nil {
		slog.Warn("DSL evaluation error", "query", req.Query, "error", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(result)
}
