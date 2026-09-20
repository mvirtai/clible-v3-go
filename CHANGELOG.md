# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.5.0] - 2026-09-20

### Added

- End-to-end AI token telemetry recording prompt, candidate, and cached tokens across all 7 Gemini workflows
- Dual-driver database schema and repository persistence (`ai_token_usage`) on Neon PostgreSQL and test SQLite
- Authenticated endpoints `GET /api/ai/usage/me` and `GET /api/ai/usage/summary` with rolling 7, 30, and 90-day aggregation
- Interactive token telemetry modal (`AiTokenUsageModal`) with prompt/candidate progress distribution and feature breakdown
- User avatar subsystem (`UserAvatar`) with monogram generator and 10 handcrafted deterministic biblical/scholarly vector SVGs
- Centralized user menu (`UserMenuDropdown`) with zero-`useEffect` declarative backdrop, language switch, and profile controls
- Streamlined navigation header (`AppHeader`) reducing complexity by 51% (199 LOC down to 98 LOC)
- Full bilingual translation strings (`i18n.ts`) across Finnish and English for avatars and usage telemetry

---

## [Unreleased]

## [3.0.0] - 2026-08-15

### Added

- Complete Go 1.22+ backend rewrite with PostgreSQL and SQLite test support
- 2D Canvas Grid Matrix Notebook architecture with resizable card overlays
- Interactive Verse Reader with multilingual citation formatting (FI/EN)
- Advanced verse search, analytics, and comparison views
- Cloud Run & Terraform production infrastructure
