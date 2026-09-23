package api_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/api"
	"github.com/mvirtai/clible-v3-go/internal/ctxkeys"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

type mockAiUsageService struct {
	userStats   *models.AiUsageStats
	guestStats  *models.AiUsageStats
	summary     *models.AiUsageSummary
	err         error
	receivedUID string
}

func (m *mockAiUsageService) GetUserStats(ctx context.Context, userID string, since time.Time) (*models.AiUsageStats, error) {
	m.receivedUID = userID
	if m.err != nil {
		return nil, m.err
	}
	return m.userStats, nil
}

func (m *mockAiUsageService) GetGuestStats(ctx context.Context, since time.Time) (*models.AiUsageStats, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.guestStats, nil
}

func (m *mockAiUsageService) GetGlobalSummary(ctx context.Context, since time.Time) (*models.AiUsageSummary, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.summary, nil
}

func TestAiUsageHandler_GetMyUsage(t *testing.T) {
	t.Run("unauthorized when user id is missing from context", func(t *testing.T) {
		svc := &mockAiUsageService{}
		handler := api.NewAiUsageHandler(svc)

		req := httptest.NewRequest("GET", "/api/ai/usage/me", nil)
		rr := httptest.NewRecorder()

		handler.GetMyUsage(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("expected status 401, got %d", rr.Code)
		}
	})

	t.Run("returns user stats when authenticated", func(t *testing.T) {
		expectedStats := &models.AiUsageStats{
			TotalCalls:        5,
			TotalPromptTokens: 500,
			TotalCandTokens:   250,
			TotalTokens:       750,
			CachedTokens:      50,
		}
		svc := &mockAiUsageService{
			userStats: expectedStats,
		}
		handler := api.NewAiUsageHandler(svc)

		req := httptest.NewRequest("GET", "/api/ai/usage/me?days=7", nil)
		ctx := context.WithValue(req.Context(), ctxkeys.UserIDKey, "user-abc-123")
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		handler.GetMyUsage(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}

		if svc.receivedUID != "user-abc-123" {
			t.Errorf("expected user ID 'user-abc-123', got %q", svc.receivedUID)
		}

		var resp models.AiUsageStats
		if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response body: %v", err)
		}

		if resp.TotalTokens != 750 {
			t.Errorf("expected 750 total tokens, got %d", resp.TotalTokens)
		}
	})
}

func TestAiUsageHandler_GetSummary(t *testing.T) {
	t.Run("unauthorized when user id is missing from context", func(t *testing.T) {
		svc := &mockAiUsageService{}
		handler := api.NewAiUsageHandler(svc)

		req := httptest.NewRequest("GET", "/api/ai/usage/summary", nil)
		rr := httptest.NewRecorder()

		handler.GetSummary(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("expected status 401, got %d", rr.Code)
		}
	})

	t.Run("returns summary when authenticated", func(t *testing.T) {
		expectedSummary := &models.AiUsageSummary{
			UserStats: models.AiUsageStats{
				TotalCalls:  10,
				TotalTokens: 2000,
			},
			GuestStats: models.AiUsageStats{
				TotalCalls:  5,
				TotalTokens: 1000,
			},
			GlobalStats: models.AiUsageStats{
				TotalCalls:  15,
				TotalTokens: 3000,
			},
			ByFeature: map[string]models.AiUsageStats{
				"insight": {TotalCalls: 10, TotalTokens: 2000},
			},
		}
		svc := &mockAiUsageService{
			summary: expectedSummary,
		}
		handler := api.NewAiUsageHandler(svc)

		req := httptest.NewRequest("GET", "/api/ai/usage/summary", nil)
		ctx := context.WithValue(req.Context(), ctxkeys.UserIDKey, "user-admin-123")
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		handler.GetSummary(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}

		var resp models.AiUsageSummary
		if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode summary: %v", err)
		}

		if resp.GlobalStats.TotalTokens != 3000 {
			t.Errorf("expected 3000 total global tokens, got %d", resp.GlobalStats.TotalTokens)
		}
	})
}
