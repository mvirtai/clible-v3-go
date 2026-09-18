package db_test

import (
	"context"
	"testing"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

func TestAiUsageRepository_RecordAndAggregate(t *testing.T) {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize in-memory test database: %v", err)
	}
	defer func() { _ = conn.Close() }()

	ctx := context.Background()

	// Seed test users
	user1 := "test-user-1"
	user2 := "test-user-2"
	_, _ = conn.ExecContext(ctx, `INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES ('test-user-1', 'user1@example.com', 'hash1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
	_, _ = conn.ExecContext(ctx, `INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES ('test-user-2', 'user2@example.com', 'hash2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)

	repo := db.NewAiUsageRepository(conn)

	baseTime := time.Now().UTC()

	t.Run("empty repository returns zero stats gracefully", func(t *testing.T) {
		stats, err := repo.GetUserStats(ctx, user1, baseTime.Add(-24*time.Hour))
		if err != nil {
			t.Fatalf("unexpected error querying empty user stats: %v", err)
		}
		if stats.TotalCalls != 0 || stats.TotalTokens != 0 {
			t.Errorf("expected 0 calls and tokens, got calls=%d, tokens=%d", stats.TotalCalls, stats.TotalTokens)
		}

		summary, err := repo.GetGlobalSummary(ctx, baseTime.Add(-24*time.Hour))
		if err != nil {
			t.Fatalf("unexpected error querying empty global summary: %v", err)
		}
		if summary.GlobalStats.TotalCalls != 0 {
			t.Errorf("expected 0 global calls, got %d", summary.GlobalStats.TotalCalls)
		}
	})

	t.Run("record usage and query user stats", func(t *testing.T) {
		// Insert usage for user1
		u1 := &models.AiTokenUsage{
			UserID:           &user1,
			Feature:          "insight",
			Model:            "gemini-2.5-flash",
			PromptTokens:     100,
			CandidatesTokens: 50,
			TotalTokens:      150,
			CachedTokens:     20,
			CreatedAt:        baseTime.Add(-1 * time.Hour),
		}
		if err := repo.RecordUsage(ctx, u1); err != nil {
			t.Fatalf("failed to record usage: %v", err)
		}

		u2 := &models.AiTokenUsage{
			UserID:           &user1,
			Feature:          "tone",
			Model:            "gemini-2.5-flash",
			PromptTokens:     200,
			CandidatesTokens: 80,
			TotalTokens:      280,
			CachedTokens:     0,
			CreatedAt:        baseTime.Add(-30 * time.Minute),
		}
		if err := repo.RecordUsage(ctx, u2); err != nil {
			t.Fatalf("failed to record usage 2: %v", err)
		}

		// Insert usage for user2
		uUser2 := &models.AiTokenUsage{
			UserID:           &user2,
			Feature:          "deep_dive",
			Model:            "gemini-2.5-flash",
			PromptTokens:     300,
			CandidatesTokens: 120,
			TotalTokens:      420,
			CachedTokens:     0,
			CreatedAt:        baseTime.Add(-15 * time.Minute),
		}
		if err := repo.RecordUsage(ctx, uUser2); err != nil {
			t.Fatalf("failed to record user2 usage: %v", err)
		}

		// Insert usage for guest
		guestID := "guest-session-123"
		uGuest := &models.AiTokenUsage{
			GuestID:          &guestID,
			Feature:          "insight",
			Model:            "gemini-2.5-flash",
			PromptTokens:     80,
			CandidatesTokens: 40,
			TotalTokens:      120,
			CachedTokens:     10,
			CreatedAt:        baseTime.Add(-10 * time.Minute),
		}
		if err := repo.RecordUsage(ctx, uGuest); err != nil {
			t.Fatalf("failed to record guest usage: %v", err)
		}

		// Query user1 stats
		statsUser1, err := repo.GetUserStats(ctx, user1, baseTime.Add(-2*time.Hour))
		if err != nil {
			t.Fatalf("failed to get user1 stats: %v", err)
		}
		if statsUser1.TotalCalls != 2 {
			t.Errorf("expected 2 calls for user1, got %d", statsUser1.TotalCalls)
		}
		if statsUser1.TotalPromptTokens != 300 {
			t.Errorf("expected 300 prompt tokens, got %d", statsUser1.TotalPromptTokens)
		}
		if statsUser1.TotalCandTokens != 130 {
			t.Errorf("expected 130 cand tokens, got %d", statsUser1.TotalCandTokens)
		}
		if statsUser1.TotalTokens != 430 {
			t.Errorf("expected 430 total tokens, got %d", statsUser1.TotalTokens)
		}
		if statsUser1.CachedTokens != 20 {
			t.Errorf("expected 20 cached tokens, got %d", statsUser1.CachedTokens)
		}

		// Query guest stats
		statsGuest, err := repo.GetGuestStats(ctx, baseTime.Add(-2*time.Hour))
		if err != nil {
			t.Fatalf("failed to get guest stats: %v", err)
		}
		if statsGuest.TotalCalls != 1 {
			t.Errorf("expected 1 guest call, got %d", statsGuest.TotalCalls)
		}
		if statsGuest.TotalTokens != 120 {
			t.Errorf("expected 120 guest tokens, got %d", statsGuest.TotalTokens)
		}

		// Query global summary
		summary, err := repo.GetGlobalSummary(ctx, baseTime.Add(-2*time.Hour))
		if err != nil {
			t.Fatalf("failed to get global summary: %v", err)
		}

		// Total calls: user1 (2) + user2 (1) + guest (1) = 4
		if summary.GlobalStats.TotalCalls != 4 {
			t.Errorf("expected 4 global calls, got %d", summary.GlobalStats.TotalCalls)
		}
		// Total tokens: 430 (user1) + 420 (user2) + 120 (guest) = 970
		if summary.GlobalStats.TotalTokens != 970 {
			t.Errorf("expected 970 global tokens, got %d", summary.GlobalStats.TotalTokens)
		}

		// UserStats: user1 + user2 = 3 calls, 850 tokens
		if summary.UserStats.TotalCalls != 3 {
			t.Errorf("expected 3 user calls, got %d", summary.UserStats.TotalCalls)
		}
		if summary.UserStats.TotalTokens != 850 {
			t.Errorf("expected 850 user tokens, got %d", summary.UserStats.TotalTokens)
		}

		// GuestStats: 1 call, 120 tokens
		if summary.GuestStats.TotalCalls != 1 {
			t.Errorf("expected 1 guest call, got %d", summary.GuestStats.TotalCalls)
		}

		// ByFeature checks
		insightStats, ok := summary.ByFeature["insight"]
		if !ok {
			t.Fatalf("expected 'insight' feature in ByFeature map")
		}
		// insight: user1 (150) + guest (120) = 2 calls, 270 tokens
		if insightStats.TotalCalls != 2 || insightStats.TotalTokens != 270 {
			t.Errorf("expected insight calls=2, tokens=270, got calls=%d, tokens=%d", insightStats.TotalCalls, insightStats.TotalTokens)
		}

		toneStats, ok := summary.ByFeature["tone"]
		if !ok || toneStats.TotalCalls != 1 || toneStats.TotalTokens != 280 {
			t.Errorf("unexpected tone stats: %+v", toneStats)
		}
	})
}
