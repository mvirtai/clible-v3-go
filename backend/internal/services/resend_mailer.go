package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// ResendMailer sends transactional emails via the Resend HTTPS REST API.
type ResendMailer struct {
	apiKey     string
	from       string
	baseURL    string
	httpClient *http.Client
}

type resendEmailRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
	Text    string   `json:"text"`
}

type resendErrorResponse struct {
	StatusCode int    `json:"statusCode"`
	Message    string `json:"message"`
	Name       string `json:"name"`
}

// NewResendMailer creates an instance of ResendMailer using the default Resend API endpoint.
func NewResendMailer(apiKey, from string) *ResendMailer {
	return NewResendMailerWithClient(apiKey, from, "https://api.resend.com", &http.Client{
		Timeout: 10 * time.Second,
	})
}

// NewResendMailerWithClient allows injecting a custom baseURL and HTTP client, useful for testing.
func NewResendMailerWithClient(apiKey, from, baseURL string, client *http.Client) *ResendMailer {
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
	if baseURL == "" {
		baseURL = "https://api.resend.com"
	}
	from = strings.TrimSpace(from)
	if from == "" {
		from = "Clible <onboarding@resend.dev>"
	}

	return &ResendMailer{
		apiKey:     strings.TrimSpace(apiKey),
		from:       from,
		baseURL:    strings.TrimRight(baseURL, "/"),
		httpClient: client,
	}
}

// SendVerificationEmail compiles the verification email templates and delivers it via Resend.
func (r *ResendMailer) SendVerificationEmail(ctx context.Context, toEmail, code, token, lang, baseURL string) error {
	verifyURL := fmt.Sprintf("%s/verify-email?token=%s", strings.TrimRight(baseURL, "/"), token)
	content := RenderVerificationEmail(lang, code, verifyURL)
	return r.SendEmail(ctx, toEmail, content.Subject, content.BodyHTML, content.BodyText)
}

// SendEmail delivers an HTML/plain text email to the specified recipient using Resend REST API.
func (r *ResendMailer) SendEmail(ctx context.Context, toEmail, subject, bodyHTML, bodyText string) error {
	if r.apiKey == "" {
		return errors.New("resend API key is empty")
	}
	toEmail = strings.TrimSpace(toEmail)
	if toEmail == "" {
		return errors.New("recipient email address cannot be empty")
	}

	payload := resendEmailRequest{
		From:    r.from,
		To:      []string{toEmail},
		Subject: subject,
		HTML:    bodyHTML,
		Text:    bodyText,
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal resend email payload: %w", err)
	}

	url := fmt.Sprintf("%s/emails", r.baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(jsonBytes))
	if err != nil {
		return fmt.Errorf("failed to create resend HTTP request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+r.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request to resend API: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read resend API response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var apiErr resendErrorResponse
		if unmarshalErr := json.Unmarshal(bodyBytes, &apiErr); unmarshalErr == nil && apiErr.Message != "" {
			return fmt.Errorf("resend API error (%d %s): %s", resp.StatusCode, apiErr.Name, apiErr.Message)
		}
		return fmt.Errorf("resend API returned unexpected status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}
