package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestFrontendHandlerServesSPAAndAssets(t *testing.T) {
	frontendDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(frontendDir, "index.html"), []byte("spa"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(frontendDir, "app.js"), []byte("asset"), 0600); err != nil {
		t.Fatal(err)
	}

	root, err := os.OpenRoot(frontendDir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := root.Close(); err != nil {
			t.Errorf("close frontend root: %v", err)
		}
	})

	handler := frontendHandler(root)
	for _, test := range []struct {
		path string
		want string
	}{
		{path: "/app.js", want: "asset"},
		{path: "/client/route", want: "spa"},
	} {
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, test.path, nil))
		if recorder.Code != http.StatusOK {
			t.Errorf("GET %s returned status %d, want %d", test.path, recorder.Code, http.StatusOK)
		}
		if body := strings.TrimSpace(recorder.Body.String()); body != test.want {
			t.Errorf("GET %s returned body %q, want %q", test.path, body, test.want)
		}
	}
}

func TestFrontendHandlerRejectsSymlinkEscape(t *testing.T) {
	frontendDir := t.TempDir()
	outsideDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(frontendDir, "index.html"), []byte("spa"), 0600); err != nil {
		t.Fatal(err)
	}
	const secret = "outside frontend root"
	if err := os.WriteFile(filepath.Join(outsideDir, "secret.txt"), []byte(secret), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(outsideDir, filepath.Join(frontendDir, "outside")); err != nil {
		t.Skipf("cannot create symlink: %v", err)
	}

	root, err := os.OpenRoot(frontendDir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := root.Close(); err != nil {
			t.Errorf("close frontend root: %v", err)
		}
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/outside/secret.txt", nil)
	frontendHandler(root).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusForbidden {
		t.Errorf("symlink escape returned status %d, want %d", recorder.Code, http.StatusForbidden)
	}
	if strings.Contains(recorder.Body.String(), secret) {
		t.Error("served content from outside the frontend root")
	}
}

func TestFrontendHandlerHandlesInvalidPathErrors(t *testing.T) {
	frontendDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(frontendDir, "index.html"), []byte("spa"), 0600); err != nil {
		t.Fatal(err)
	}

	root, err := os.OpenRoot(frontendDir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := root.Close(); err != nil {
			t.Errorf("close frontend root: %v", err)
		}
	})

	requestPath := "/" + strings.Repeat("x", 300)
	recorder := httptest.NewRecorder()
	frontendHandler(root).ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, requestPath, nil))

	if recorder.Code != http.StatusForbidden {
		t.Errorf("invalid path returned status %d, want %d", recorder.Code, http.StatusForbidden)
	}
}
