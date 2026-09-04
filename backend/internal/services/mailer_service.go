package services

import (
	"context"
	"fmt"
	"log"
	"strings"
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

