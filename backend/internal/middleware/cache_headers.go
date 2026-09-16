package middleware

import (
	"crypto/md5"
	"fmt"
	"net/http"
	"time"
)

// CacheStrategy defines caching behavior for different endpoint categories
type CacheStrategy int

const (
	// NoCache: Private, no-cache, no-store (auth tokens, user-specific data)
	NoCache CacheStrategy = iota

	// ShortCache: 5 minutes, private, revalidation allowed (user history, workspace data)
	ShortCache

	// MediumCache: 1 hour, public with revalidation (search results, translations)
	MediumCache

	// LongCache: 24 hours, public (books metadata, static content)
	LongCache

	// ImmutableCache: 1 year, immutable (versioned resources)
	ImmutableCache
)

// CacheControl generates a Cache-Control header value based on the strategy
func (cs CacheStrategy) String() string {
	switch cs {
	case NoCache:
		return "private, no-cache, no-store, must-revalidate"
	case ShortCache:
		return "private, max-age=300, must-revalidate"
	case MediumCache:
		return "public, max-age=3600, must-revalidate"
	case LongCache:
		return "public, max-age=86400"
	case ImmutableCache:
		return "public, max-age=31536000, immutable"
	default:
		return "no-cache"
	}
}

// CacheHeadersMiddleware wraps an HTTP handler and applies Cache-Control headers
// based on the endpoint strategy.
//
// Strategy mapping:
//  - NoCache: Auth endpoints, user-specific scopes/searches, notebooks
//  - ShortCache: History, workspace, personalized data
//  - MediumCache: Search results, analytics, comparisons
//  - LongCache: Translations, books metadata
//  - ImmutableCache: Version endpoint
func CacheHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Determine cache strategy based on path and method
		strategy := determineCacheStrategy(path, r.Method)

		// Apply Cache-Control header
		w.Header().Set("Cache-Control", strategy.String())

		// Add ETag support for cacheable responses
		// ETag will be computed in individual handlers if needed
		if strategy != NoCache {
			w.Header().Set("Vary", "Accept-Encoding, Accept-Language")
		}

		// Add Pragma header for HTTP/1.0 compatibility
		if strategy == NoCache {
			w.Header().Set("Pragma", "no-cache")
		}

		// Add Expires header for HTTP/1.0 compatibility
		if strategy != NoCache {
			expiryTime := time.Now().Add(getMaxAge(strategy))
			w.Header().Set("Expires", expiryTime.Format(http.TimeFormat))
		}

		next.ServeHTTP(w, r)
	})
}

// determineCacheStrategy returns the appropriate caching strategy for a given endpoint
func determineCacheStrategy(path string, method string) CacheStrategy {
	// POST, PUT, DELETE requests are never cached
	if method != http.MethodGet && method != http.MethodHead {
		return NoCache
	}

	// Version endpoint: immutable
	if path == "/api/version" || path == "/api/health" {
		return ImmutableCache
	}

	// Books metadata: long cache
	if path == "/api/books" || (len(path) > 10 && path[:11] == "/api/books/") {
		return LongCache
	}

	// Translations: long cache (rarely change)
	if path == "/api/translations" {
		return LongCache
	}

	// Search results: medium cache (user may want fresh results but can tolerate brief staleness)
	if path == "/api/search" || path == "/api/verses" {
		return MediumCache
	}

	// Analytics: medium cache
	if path == "/api/analytics/analyze" || path == "/api/analytics/compare" {
		return MediumCache
	}

	// DSL evaluation: medium cache
	if path == "/api/dsl/eval" {
		return MediumCache
	}

	// History: short cache (recent user data, needs fresher than workspace)
	if path == "/api/history" {
		return ShortCache
	}

	// Scopes and workspace: short cache (user-specific, mutable)
	if len(path) > 7 && path[:8] == "/api/scopes" {
		return ShortCache
	}

	// Notebooks: short cache (user-specific content, mutable)
	if len(path) > 11 && path[:12] == "/api/notebooks" {
		return ShortCache
	}

	// Auth endpoints: never cache
	if len(path) > 9 && path[:10] == "/api/auth/" {
		return NoCache
	}

	// AI endpoints: never cache (authenticated, rate-limited, personalized)
	if len(path) > 6 && path[:7] == "/api/ai/" {
		return NoCache
	}

	// Default: no cache for unknown endpoints
	return NoCache
}

// getMaxAge returns the max-age duration for a given cache strategy
func getMaxAge(strategy CacheStrategy) time.Duration {
	switch strategy {
	case ShortCache:
		return 5 * time.Minute
	case MediumCache:
		return 1 * time.Hour
	case LongCache:
		return 24 * time.Hour
	case ImmutableCache:
		return 365 * 24 * time.Hour
	default:
		return 0
	}
}

// GenerateETag creates an ETag based on content hash
// This should be called by individual handlers to compute ETags
func GenerateETag(content []byte) string {
	hash := md5.Sum(content)
	return fmt.Sprintf(`"%x"`, hash)
}

// SetETagHeader sets the ETag header if content is provided
func SetETagHeader(w http.ResponseWriter, content []byte) {
	etag := GenerateETag(content)
	w.Header().Set("ETag", etag)
}

// IsETagMatch checks if the request's If-None-Match header matches the provided ETag
// Returns true if a 304 Not Modified should be returned
func IsETagMatch(r *http.Request, etag string) bool {
	if match := r.Header.Get("If-None-Match"); match != "" {
		// Simple comparison; in production, could support multiple ETags
		return match == etag
	}
	return false
}

// HandleConditionalRequest checks ETag and If-None-Match headers
// Returns true if a 304 Not Modified should be sent
func HandleConditionalRequest(w http.ResponseWriter, r *http.Request, etag string) bool {
	w.Header().Set("ETag", etag)

	if IsETagMatch(r, etag) {
		w.WriteHeader(http.StatusNotModified)
		return true
	}

	return false
}
