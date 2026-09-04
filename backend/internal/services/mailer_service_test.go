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

func TestRenderVerificationEmail_Languages(t *testing.T) {
	tests := []struct {
		name            string
		lang            string
		code            string
		verifyURL       string
		expectedSubject string
	}{
		{
			name:            "Finnish template",
			lang:            "fi",
			code:            "123456",
			verifyURL:       "http://localhost:5173/verify-email?token=xyz",
			expectedSubject: "Tervetuloa Clibleen",
		},
		{
			name:            "English template",
			lang:            "en",
			code:            "654321",
			verifyURL:       "http://localhost:5173/verify-email?token=abc",
			expectedSubject: "Verify your Clible account",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			content := services.RenderVerificationEmail(tc.lang, tc.code, tc.verifyURL)
			if content.Subject != tc.expectedSubject {
				t.Errorf("expected subject %q, got %q", tc.expectedSubject, content.Subject)
			}
			if content.BodyHTML == "" || content.BodyText == "" {
				t.Errorf("expected non-empty HTML and text bodies")
			}
		})
	}
}

