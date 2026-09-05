package services_test

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/config"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

type capturedResendPayload struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
	Text    string   `json:"text"`
}

func TestResendMailer_SendVerificationEmail_Success(t *testing.T) {
	var capturedAuth string
	var capturedContentType string
	var capturedBody capturedResendPayload

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST method, got %s", r.Method)
		}
		if r.URL.Path != "/emails" {
			t.Errorf("expected /emails path, got %s", r.URL.Path)
		}

		capturedAuth = r.Header.Get("Authorization")
		capturedContentType = r.Header.Get("Content-Type")

		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatalf("failed to read request body: %v", err)
		}
		defer func() { _ = r.Body.Close() }()

		if err := json.Unmarshal(bodyBytes, &capturedBody); err != nil {
			t.Fatalf("failed to unmarshal JSON payload: %v", err)
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"id": "msg_test_12345"}`))
	}))
	defer ts.Close()

	mailer := services.NewResendMailerWithClient(
		"re_test_secret_key",
		"Clible <noreply@clible.com>",
		ts.URL,
		ts.Client(),
	)

	ctx := context.Background()
	err := mailer.SendVerificationEmail(
		ctx,
		"researcher@example.com",
		"987654",
		"token_abc_123",
		"fi",
		"http://localhost:5173",
	)

	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if capturedAuth != "Bearer re_test_secret_key" {
		t.Errorf("expected Authorization header 'Bearer re_test_secret_key', got %q", capturedAuth)
	}
	if capturedContentType != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", capturedContentType)
	}
	if len(capturedBody.To) != 1 || capturedBody.To[0] != "researcher@example.com" {
		t.Errorf("expected recipient 'researcher@example.com', got %+v", capturedBody.To)
	}
	if capturedBody.From != "Clible <noreply@clible.com>" {
		t.Errorf("expected sender 'Clible <noreply@clible.com>', got %q", capturedBody.From)
	}
	if capturedBody.Subject != "Tervetuloa Clibleen" {
		t.Errorf("expected subject 'Tervetuloa Clibleen', got %q", capturedBody.Subject)
	}
	if !strings.Contains(capturedBody.HTML, "987654") {
		t.Errorf("expected HTML to contain verification code '987654'")
	}
	if !strings.Contains(capturedBody.HTML, "token=token_abc_123") {
		t.Errorf("expected HTML to contain verification link with token")
	}
	if !strings.Contains(capturedBody.Text, "987654") {
		t.Errorf("expected Plain Text to contain verification code '987654'")
	}
}

func TestResendMailer_SendVerificationEmail_English(t *testing.T) {
	var capturedSubject string

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var payload capturedResendPayload
		_ = json.NewDecoder(r.Body).Decode(&payload)
		capturedSubject = payload.Subject

		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"id": "msg_en_created"}`))
	}))
	defer ts.Close()

	mailer := services.NewResendMailerWithClient("re_key", "", ts.URL, ts.Client())

	ctx := context.Background()
	err := mailer.SendVerificationEmail(
		ctx,
		"user@example.com",
		"112233",
		"token_xyz",
		"en",
		"https://app.clible.com",
	)

	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if capturedSubject != "Verify your Clible account" {
		t.Errorf("expected English subject 'Verify your Clible account', got %q", capturedSubject)
	}
}

func TestResendMailer_ValidationErrors(t *testing.T) {
	ctx := context.Background()

	t.Run("empty API key", func(t *testing.T) {
		mailer := services.NewResendMailer("", "test@clible.com")
		err := mailer.SendEmail(ctx, "to@example.com", "Subject", "<p>hi</p>", "hi")
		if err == nil || !strings.Contains(err.Error(), "resend API key is empty") {
			t.Errorf("expected API key validation error, got: %v", err)
		}
	})

	t.Run("empty recipient", func(t *testing.T) {
		mailer := services.NewResendMailer("re_key", "test@clible.com")
		err := mailer.SendEmail(ctx, "   ", "Subject", "<p>hi</p>", "hi")
		if err == nil || !strings.Contains(err.Error(), "recipient email address cannot be empty") {
			t.Errorf("expected recipient validation error, got: %v", err)
		}
	})
}

func TestResendMailer_APIErrors(t *testing.T) {
	ctx := context.Background()

	t.Run("422 Unprocessable Entity structured error", func(t *testing.T) {
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusUnprocessableEntity)
			_, _ = w.Write([]byte(`{"statusCode": 422, "name": "validation_error", "message": "Invalid recipient format"}`))
		}))
		defer ts.Close()

		mailer := services.NewResendMailerWithClient("re_key", "test@clible.com", ts.URL, ts.Client())
		err := mailer.SendEmail(ctx, "bad_email", "Subject", "<p>hi</p>", "hi")

		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if !strings.Contains(err.Error(), "422") || !strings.Contains(err.Error(), "Invalid recipient format") {
			t.Errorf("expected 422 and message in error string, got: %v", err)
		}
	})

	t.Run("401 Unauthorized error", func(t *testing.T) {
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"statusCode": 401, "name": "unauthorized", "message": "API key is invalid"}`))
		}))
		defer ts.Close()

		mailer := services.NewResendMailerWithClient("bad_key", "test@clible.com", ts.URL, ts.Client())
		err := mailer.SendEmail(ctx, "test@example.com", "Subject", "<p>hi</p>", "hi")

		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if !strings.Contains(err.Error(), "401") || !strings.Contains(err.Error(), "API key is invalid") {
			t.Errorf("expected 401 and message in error string, got: %v", err)
		}
	})

	t.Run("500 Internal Server Error non-json", func(t *testing.T) {
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`Something went wrong upstream`))
		}))
		defer ts.Close()

		mailer := services.NewResendMailerWithClient("re_key", "test@clible.com", ts.URL, ts.Client())
		err := mailer.SendEmail(ctx, "test@example.com", "Subject", "<p>hi</p>", "hi")

		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if !strings.Contains(err.Error(), "500") || !strings.Contains(err.Error(), "Something went wrong upstream") {
			t.Errorf("expected status 500 in error, got: %v", err)
		}
	})
}

func TestResendMailer_ContextCancellation(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	mailer := services.NewResendMailerWithClient("re_key", "test@clible.com", ts.URL, ts.Client())

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	err := mailer.SendEmail(ctx, "test@example.com", "Subject", "<p>hi</p>", "hi")
	if err == nil {
		t.Fatal("expected context cancellation error, got nil")
	}
}

func TestNewMailerFromConfig(t *testing.T) {
	t.Run("nil config falls back to MockMailer", func(t *testing.T) {
		mailer := services.NewMailerFromConfig(nil)
		if _, ok := mailer.(*services.MockMailer); !ok {
			t.Errorf("expected *services.MockMailer, got %T", mailer)
		}
	})

	t.Run("empty ResendAPIKey falls back to MockMailer", func(t *testing.T) {
		cfg := &config.Config{
			ResendAPIKey: "",
		}
		mailer := services.NewMailerFromConfig(cfg)
		if _, ok := mailer.(*services.MockMailer); !ok {
			t.Errorf("expected *services.MockMailer, got %T", mailer)
		}
	})

	t.Run("ResendAPIKey configured returns ResendMailer", func(t *testing.T) {
		cfg := &config.Config{
			ResendAPIKey: "re_123456",
			SMTPFrom:     "Clible Pro <pro@clible.com>",
		}
		mailer := services.NewMailerFromConfig(cfg)
		if _, ok := mailer.(*services.ResendMailer); !ok {
			t.Errorf("expected *services.ResendMailer, got %T", mailer)
		}
	})

	t.Run("ResendAPIKey configured with empty SMTPFrom defaults from address", func(t *testing.T) {
		cfg := &config.Config{
			ResendAPIKey: "re_123456",
			SMTPFrom:     "",
		}
		mailer := services.NewMailerFromConfig(cfg)
		if _, ok := mailer.(*services.ResendMailer); !ok {
			t.Errorf("expected *services.ResendMailer, got %T", mailer)
		}
	})
}
