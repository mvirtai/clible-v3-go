package cache

import (
	"container/list"
	"sync"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

// cacheEntry holds the cached verses and expiration time in the LRU list.
type cacheEntry struct {
	key       string
	verses    []models.Verse
	expiresAt time.Time
}

// VerseLRUCache provides a thread-safe, memory-bounded LRU cache with TTL for Bible verses.
type VerseLRUCache struct {
	mu       sync.Mutex
	capacity int
	ttl      time.Duration
	items    map[string]*list.Element
	evict    *list.List
}

// NewVerseLRUCache creates an in-memory LRU cache with a max capacity and item TTL.
func NewVerseLRUCache(capacity int, ttl time.Duration) *VerseLRUCache {
	if capacity <= 0 {
		capacity = 500
	}
	if ttl <= 0 {
		ttl = 30 * time.Minute
	}
	return &VerseLRUCache{
		capacity: capacity,
		ttl:      ttl,
		items:    make(map[string]*list.Element, capacity),
		evict:    list.New(),
	}
}

// Get retrieves verses by key from the cache. Returns nil, false on cache miss or expiration.
func (c *VerseLRUCache) Get(key string) ([]models.Verse, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	elem, exists := c.items[key]
	if !exists {
		return nil, false
	}

	entry := elem.Value.(*cacheEntry)
	if time.Now().After(entry.expiresAt) {
		c.removeElement(elem)
		return nil, false
	}

	c.evict.MoveToFront(elem)
	// Return a slice copy to prevent caller mutation of cached instances
	result := make([]models.Verse, len(entry.verses))
	copy(result, entry.verses)
	return result, true
}

// Set stores verses with the configured TTL and evicts the least recently used item if full.
func (c *VerseLRUCache) Set(key string, verses []models.Verse) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// If entry already exists, update in-place and move to front
	if elem, exists := c.items[key]; exists {
		c.evict.MoveToFront(elem)
		entry := elem.Value.(*cacheEntry)
		stored := make([]models.Verse, len(verses))
		copy(stored, verses)
		entry.verses = stored
		entry.expiresAt = time.Now().Add(c.ttl)
		return
	}

	// Evict oldest if at capacity
	if c.evict.Len() >= c.capacity {
		c.removeOldest()
	}

	stored := make([]models.Verse, len(verses))
	copy(stored, verses)
	entry := &cacheEntry{
		key:       key,
		verses:    stored,
		expiresAt: time.Now().Add(c.ttl),
	}
	elem := c.evict.PushFront(entry)
	c.items[key] = elem
}

// Len returns current number of entries in the cache.
func (c *VerseLRUCache) Len() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.evict.Len()
}

// Clear removes all entries from the cache.
func (c *VerseLRUCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items = make(map[string]*list.Element, c.capacity)
	c.evict.Init()
}

func (c *VerseLRUCache) removeElement(elem *list.Element) {
	c.evict.Remove(elem)
	entry := elem.Value.(*cacheEntry)
	delete(c.items, entry.key)
}

func (c *VerseLRUCache) removeOldest() {
	elem := c.evict.Back()
	if elem != nil {
		c.removeElement(elem)
	}
}
