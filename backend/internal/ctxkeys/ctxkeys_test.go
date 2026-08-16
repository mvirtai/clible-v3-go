package ctxkeys_test

import (
	"context"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/ctxkeys"
)

func TestGetUserID(t *testing.T) {
	t.Run("returns user id when set in context", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), ctxkeys.UserIDKey, "user-123")
		userID, ok := ctxkeys.GetUserID(ctx)
		if !ok || userID != "user-123" {
			t.Errorf("expected user-123 and ok=true, got %q and %v", userID, ok)
		}
	})

	t.Run("returns empty string and false when not set", func(t *testing.T) {
		ctx := context.Background()
		userID, ok := ctxkeys.GetUserID(ctx)
		if ok || userID != "" {
			t.Errorf("expected empty string and ok=false, got %q and %v", userID, ok)
		}
	})
}
