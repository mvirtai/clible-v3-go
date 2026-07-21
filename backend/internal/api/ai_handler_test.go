package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/services"
)

type mockAIService struct {
	getInsight    func(ctx context.Context, text, focus string) (*services.AIResponse, error)
	getTone       func(ctx context.Context, text, focus string) (*services.AIResponse, error)
	deepDive      func(ctx context.Context, topic, outputLanguage string, contextData map[string]interface{}) (*services.AIResponse, error)
	originalStudy func(ctx context.Context, reference, sourceText, sourceLanguage, outputLanguage string, translations []map[string]string, scope, focus string) (*services.AIResponse, error)
	aiSearch      func(ctx context.Context, query, translationID, uiLanguage string) (map[string]interface{}, error)
	getComparison func(ctx context.Context, reference, transA, textA, transB, textB, focus string) (*services.AIResponse, error)
}

func (m *mockAIService) GetInsight(ctx context.Context, text, focus string) (*services.AIResponse, error) {
	return m.getInsight(ctx, text, focus)
}
func (m *mockAIService) GetTone(ctx context.Context, text, focus string) (*services.AIResponse, error) {
	return m.getTone(ctx, text, focus)
}
func (m *mockAIService) DeepDive(ctx context.Context, topic, outputLanguage string, contextData map[string]interface{}) (*services.AIResponse, error) {
	return m.deepDive(ctx, topic, outputLanguage, contextData)
}
func (m *mockAIService) OriginalStudy(ctx context.Context, reference, sourceText, sourceLanguage, outputLanguage string, translations []map[string]string, scope, focus string) (*services.AIResponse, error) {
	return m.originalStudy(ctx, reference, sourceText, sourceLanguage, outputLanguage, translations, scope, focus)
}
func (m *mockAIService) AISearch(ctx context.Context, query, translationID, uiLanguage string) (map[string]interface{}, error) {
	return m.aiSearch(ctx, query, translationID, uiLanguage)
}
func (m *mockAIService) GetComparison(ctx context.Context, reference, transA, textA, transB, textB, focus string) (*services.AIResponse, error) {
	if m.getComparison != nil {
		return m.getComparison(ctx, reference, transA, textA, transB, textB, focus)
	}
	return &services.AIResponse{Text: "Mocked comparison"}, nil
}

func TestAIHandler_GetInsight_Success(t *testing.T) {
	mockSvc := &mockAIService{
		getInsight: func(ctx context.Context, text, focus string) (*services.AIResponse, error) {
			return &services.AIResponse{
				Text: "Mocked Insight text",
				NextFocus: []services.NextFocusItem{
					{Label: "love", Kind: "theme", Reason: "lexical context"},
				},
				GeminiUsageMetadata: services.GeminiUsageMetadata{
					PromptTokenCount:     12,
					CandidatesTokenCount: 34,
					TotalTokenCount:      46,
				},
			}, nil
		},
	}

	handler := NewAIHandler(mockSvc)
	reqBody := `{"text": "John 3:16", "focus": "love"}`
	req := httptest.NewRequest("POST", "/api/ai/insight", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	handler.GetInsight(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status OK, got %v", rr.Code)
	}

	var resp services.AIResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Text != "Mocked Insight text" {
		t.Errorf("unexpected response text: %q", resp.Text)
	}

	if resp.GeminiUsageMetadata.PromptTokenCount != 12 {
		t.Errorf("expected PromptTokenCount 12, got %d", resp.GeminiUsageMetadata.PromptTokenCount)
	}
}

func TestAIHandler_GetInsight_MissingText(t *testing.T) {
	mockSvc := &mockAIService{}
	handler := NewAIHandler(mockSvc)
	reqBody := `{"text": "   ", "focus": ""}`
	req := httptest.NewRequest("POST", "/api/ai/insight", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	handler.GetInsight(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status BadRequest, got %v", rr.Code)
	}
}

func TestAIHandler_GetInsight_Disabled(t *testing.T) {
	mockSvc := &mockAIService{
		getInsight: func(ctx context.Context, text, focus string) (*services.AIResponse, error) {
			return nil, errors.New("Gemini API key is not configured")
		},
	}

	handler := NewAIHandler(mockSvc)
	reqBody := `{"text": "John 3:16"}`
	req := httptest.NewRequest("POST", "/api/ai/insight", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	handler.GetInsight(rr, req)

	if rr.Code != http.StatusServiceUnavailable {
		t.Errorf("expected status ServiceUnavailable, got %v", rr.Code)
	}

	var errResp map[string]string
	_ = json.NewDecoder(rr.Body).Decode(&errResp)
	if errResp["error"] != "AI disabled" {
		t.Errorf("expected 'AI disabled' error block, got %v", errResp)
	}
}

func TestAIHandler_GetDeepDive_Success(t *testing.T) {
	mockSvc := &mockAIService{
		deepDive: func(ctx context.Context, topic, outputLanguage string, contextData map[string]interface{}) (*services.AIResponse, error) {
			return &services.AIResponse{
				Text:      "Mocked Deep Dive",
				NextFocus: []services.NextFocusItem{},
			}, nil
		},
	}

	handler := NewAIHandler(mockSvc)
	reqBody := `{"topic": "Grace", "outputLanguage": "fi", "context": {"reference": "Eph 2:8"}}`
	req := httptest.NewRequest("POST", "/api/ai/deep-dive", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	handler.GetDeepDive(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status OK, got %v", rr.Code)
	}
}

func TestAIHandler_AISearch_Success(t *testing.T) {
	mockSvc := &mockAIService{
		aiSearch: func(ctx context.Context, query, translationID, uiLanguage string) (map[string]interface{}, error) {
			return map[string]interface{}{
				"plan":   "Mocked Plan",
				"search": "Mocked Search",
			}, nil
		},
	}

	handler := NewAIHandler(mockSvc)
	reqBody := `{"query": "love", "translationId": "web", "uiLanguage": "en"}`
	req := httptest.NewRequest("POST", "/api/ai/search", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	handler.AISearch(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status OK, got %v", rr.Code)
	}
}

func TestAIHandler_GetComparison_Success(t *testing.T) {
	mockSvc := &mockAIService{
		getComparison: func(ctx context.Context, reference, transA, textA, transB, textB, focus string) (*services.AIResponse, error) {
			return &services.AIResponse{
				Text: "Mocked comparative analysis",
				NextFocus: []services.NextFocusItem{
					{Label: "word", Kind: "theme", Reason: "lexical comparison"},
				},
			}, nil
		},
	}

	handler := NewAIHandler(mockSvc)
	reqBody := `{"reference": "John 3:16", "translationA": "kr92", "textA": "Jumala rakasti", "translationB": "web", "textB": "God loved"}`
	req := httptest.NewRequest("POST", "/api/ai/compare", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	handler.GetComparison(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status OK, got %v", rr.Code)
	}

	var resp services.AIResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Text != "Mocked comparative analysis" {
		t.Errorf("expected text 'Mocked comparative analysis', got %q", resp.Text)
	}
}

func TestAIHandler_GetTone_Success(t *testing.T) {
	mockSvc := &mockAIService{
		getTone: func(ctx context.Context, text, focus string) (*services.AIResponse, error) {
			return &services.AIResponse{
				Text: "Mocked Tone text",
				GeminiUsageMetadata: services.GeminiUsageMetadata{
					PromptTokenCount:     10,
					CandidatesTokenCount: 20,
					TotalTokenCount:      30,
				},
			}, nil
		},
	}

	handler := NewAIHandler(mockSvc)
	reqBody := `{"text": "John 3:16", "focus": "love"}`
	req := httptest.NewRequest("POST", "/api/ai/tone", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	handler.GetTone(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status OK, got %v", rr.Code)
	}

	var resp services.AIResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Text != "Mocked Tone text" {
		t.Errorf("unexpected response text: %q", resp.Text)
	}
}

func TestAIHandler_GetOriginalStudy_Success(t *testing.T) {
	mockSvc := &mockAIService{
		originalStudy: func(ctx context.Context, reference, sourceText, sourceLanguage, outputLanguage string, translations []map[string]string, scope, focus string) (*services.AIResponse, error) {
			return &services.AIResponse{
				Text: "Mocked Original Study text",
				GeminiUsageMetadata: services.GeminiUsageMetadata{
					PromptTokenCount:     15,
					CandidatesTokenCount: 25,
					TotalTokenCount:      40,
				},
			}, nil
		},
	}

	handler := NewAIHandler(mockSvc)
	reqBody := `{"reference": "John 3:16", "sourceText": "houtos gar", "translations": [{"id": "kr92"}]}`
	req := httptest.NewRequest("POST", "/api/ai/original-study", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	handler.GetOriginalStudy(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status OK, got %v", rr.Code)
	}

	var resp services.AIResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Text != "Mocked Original Study text" {
		t.Errorf("unexpected response text: %q", resp.Text)
	}
}
