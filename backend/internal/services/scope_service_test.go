package services_test

import (
	"context"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/services"
)

func TestCreateScope_EmptyName(t *testing.T) {
	// Alustetaan palvelu ilman repopointereita, koska tyhjän nimen pitäisi tyssätä validointiin heti
	service := services.NewScopeService(nil, nil)

	_, err := service.CreateScope(context.Background(), "")
	if err == nil {
		t.Fatal("expected error when creating a scope with an empty name, got nil")
	}
}
