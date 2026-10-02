# 🚀 v3.12.0 - Notebook Canvas Refinements, Liturgical Integration & Performance Optimizations

## Description

Clible v3.12.0 introduces refined notebook canvas interactions, seamless liturgical hymn integration, and comprehensive performance enhancements across both backend and frontend. This release focuses on improving user experience, API efficiency, and platform reliability.

---

## ✨ What's New

### 1. **Enhanced Notebook Canvas & Liturgical Hymn Support** (PR #114)

- **Improved Canvas Scrolling:** Constrained notebook canvas scrollport height for consistent viewport management and better content visibility
- **Clickable Hymn Links Preserved:** Markdown hymn links now retain full interactivity when exporting liturgical content to notebooks with intelligent fallback URL resolution
- **Optimized Grid Layout:** Refined grid spacing in `NotebookCanvasView` component for improved visual hierarchy and content distribution
- **Internationalization Enhancements:** Fixed plural i18n count handling in component tests

### 2. **Comprehensive Performance Optimizations** (PR #113)

- **Backend Caching Layer:** Implemented thread-safe LRU verse cache with TTL to accelerate frequent passage lookups
- **Database Efficiency:** Optimized `SaveCells` operation to use single multi-row bulk insert, eliminating N+1 query patterns
- **Strategic HTTP Caching:** Added Cache-Control and Vary headers for books, translations, and liturgical datasets
- **Smart Auto-save Prevention:** Eliminated redundant notebook cell auto-save requests when content remains clean
- **Mobile UI Performance:** Optimized notebook cell and ISLA query padding for improved mobile screen rendering

### 3. **Platform Stability & Quality**

- **Dependency Security:** Resolved brace-expansion vulnerability (bump to 5.0.12)
- **Test Coverage Maintenance:** 77.4% backend statement coverage with 300+ passing frontend tests
- **Resilient Error Handling:** Sanitized logging prevents credential leakage while maintaining observability

---

## 📊 Technical Metrics

| Metric | Value |
| -------- | ------- |
| **Backend Test Coverage** | 77.4% statement coverage |
| **Frontend Tests** | 300+ unit/integration tests passing |
| **TypeScript Tests** | Zero compilation errors |
| **Primary Languages** | TypeScript (52.6%), Go (45.5%) |
| **Security Vulnerabilities** | 0 |

---

## 🏗️ Architecture Highlights

- **Modern React 19:** Leverages `useActionState`, declarative portals, and non-blocking state transitions
- **Dual-Database Support:** Seamless operation with Neon PostgreSQL (production) and SQLite (testing)
- **Full Bilingual System:** Complete Finnish (FI) and English (EN) localization
- **Type-Safe Pipeline:** 100% TypeScript + Go with strict parameterized queries

---

## 🔒 Security & Reliability

- **Zero IDOR Risk:** Strict JWT-based identity verification
- **SQL Injection Prevention:** All database operations use parameterized queries
- **Graceful Degradation:** Performance optimizations include resilient fallback mechanisms
- **Privacy First:** No PII leakage in telemetry or error logs

---

## 📦 Recent Features (v3.10.0–v3.11.3)

**Cumulative Enhancements:**

- ISLA v2 with Finnish morphological lemmatization and word clustering
- Multi-chapter Bible study templates and reading plans
- AI token telemetry with quota tracking
- User avatar system with thematic vector SVGs
- Semantic AI search with canonical reference resolution
- Liturgical calendar integration with prayer offices
- Complete notebook export functionality

---

**Release Date:** October 1, 2026  
**Base Branch:** main  
**Latest Commit:** ec55b21 (`ui: improve notebook canvas scrolling and liturgical hymn links`)
