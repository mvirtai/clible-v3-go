package cache_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/cache"
	"github.com/mvirtai/clible-v3-go/internal/models"
)

func TestVerseLRUCache_BasicAndLRUEviction(t *testing.T) {
	c := cache.NewVerseLRUCache(3, 1*time.Minute)

	v1 := []models.Verse{{ID: "1", Text: "Verse 1"}}
	v2 := []models.Verse{{ID: "2", Text: "Verse 2"}}
	v3 := []models.Verse{{ID: "3", Text: "Verse 3"}}
	v4 := []models.Verse{{ID: "4", Text: "Verse 4"}}

	c.Set("k1", v1)
	c.Set("k2", v2)
	c.Set("k3", v3)

	if c.Len() != 3 {
		t.Fatalf("expected len 3, got %d", c.Len())
	}

	// Access k1 to make k2 least recently used
	got, ok := c.Get("k1")
	if !ok || len(got) != 1 || got[0].Text != "Verse 1" {
		t.Fatalf("expected k1 to be found with Verse 1, got %+v", got)
	}

	// Insert k4, should evict k2
	c.Set("k4", v4)

	if c.Len() != 3 {
		t.Fatalf("expected len 3 after insertion, got %d", c.Len())
	}

	// k2 should be gone
	if _, ok := c.Get("k2"); ok {
		t.Error("expected k2 to be evicted, but it was found")
	}

	// k1, k3, k4 should exist
	for _, key := range []string{"k1", "k3", "k4"} {
		if _, ok := c.Get(key); !ok {
			t.Errorf("expected %s to exist in cache", key)
		}
	}
}

func TestVerseLRUCache_TTLExpiration(t *testing.T) {
	c := cache.NewVerseLRUCache(10, 50*time.Millisecond)

	v := []models.Verse{{ID: "v1", Text: "Expiring"}}
	c.Set("short", v)

	if _, ok := c.Get("short"); !ok {
		t.Fatal("expected item to be present immediately")
	}

	time.Sleep(70 * time.Millisecond)

	if _, ok := c.Get("short"); ok {
		t.Fatal("expected item to have expired after TTL")
	}
}

func TestVerseLRUCache_SliceMutationSafety(t *testing.T) {
	c := cache.NewVerseLRUCache(10, 1*time.Minute)

	original := []models.Verse{{ID: "v1", Text: "Original"}}
	c.Set("mut", original)

	got, _ := c.Get("mut")
	got[0].Text = "Mutated"

	gotAgain, _ := c.Get("mut")
	if gotAgain[0].Text != "Original" {
		t.Errorf("expected cache to protect against slice mutation, got %s", gotAgain[0].Text)
	}
}

func TestVerseLRUCache_ConcurrentAccess(t *testing.T) {
	c := cache.NewVerseLRUCache(100, 1*time.Minute)

	done := make(chan bool)
	for i := 0; i < 10; i++ {
		go func(workerID int) {
			for j := 0; j < 50; j++ {
				key := fmt.Sprintf("worker-%d-key-%d", workerID, j%10)
				c.Set(key, []models.Verse{{ID: key, Text: "Text"}})
				_, _ = c.Get(key)
			}
			done <- true
		}(i)
	}

	for i := 0; i < 10; i++ {
		<-done
	}
}
