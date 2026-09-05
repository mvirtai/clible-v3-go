package services

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/mvirtai/clible-v3-go/internal/config"
)

// MailerService defines the delivery contract for transactional emails.
type MailerService interface {
	SendVerificationEmail(ctx context.Context, toEmail, code, token, lang, baseURL string) error
}

// MockMailer logs verification codes directly to the logger for local testing.
type MockMailer struct{}

func NewMockMailer() *MockMailer {
	return &MockMailer{}
}

func (m *MockMailer) SendVerificationEmail(ctx context.Context, toEmail, code, token, lang, baseURL string) error {
	verifyURL := fmt.Sprintf("%s/verify-email?token=%s", strings.TrimRight(baseURL, "/"), token)
	content := RenderVerificationEmail(lang, code, verifyURL)
	log.Printf(
		"📧 [MockMailer] Verification email to: %s | Subject: %s | Code: [%s] | Link: %s",
		toEmail,
		content.Subject,
		code,
		verifyURL,
	)
	return nil
}

// NewMailerFromConfig instantiates the appropriate MailerService based on configuration.
// If ResendAPIKey is provided, it returns an active ResendMailer. Otherwise, it defaults to MockMailer.
func NewMailerFromConfig(cfg *config.Config) MailerService {
	if cfg != nil && cfg.ResendAPIKey != "" {
		from := cfg.SMTPFrom
		if from == "" {
			from = "Clible <onboarding@resend.dev>"
		}
		log.Printf("📧 [Mailer] Initialized ResendMailer (from: %s)", from)
		return NewResendMailer(cfg.ResendAPIKey, from)
	}

	log.Println("📧 [Mailer] No email provider configured, falling back to MockMailer (stdout logs)")
	return NewMockMailer()
}
