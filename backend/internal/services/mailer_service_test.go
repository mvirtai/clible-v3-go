package services_test

import (
	"context"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/services"
)

func TestMockMailer_SendVerificationEmail(t *testing.T) {
	mailer := services.NewMockMailer()
	ctx := context.Background()

	err := mailer.SendVerificationEmail(ctx, "test@example.com", "123456", "testtoken123", "fi", "http://localhost:5173")
	if err != nil {
		t.Fatalf("expected nil error from MockMailer, got %v", err)
	}
}
