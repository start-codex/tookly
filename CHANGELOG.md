# Changelog

This file tracks notable changes to Taskcore.

The project does not use tagged releases yet. Until versioning starts, history is recorded using an `Unreleased` section for ongoing work, plus dated milestone entries for committed historical work.

Contributors should add ongoing changes to the `Unreleased` section. When a milestone or release happens, move those entries into a new dated section at the top of the history.

---

## [Unreleased]

### Added
- Added a root changelog to track notable project changes
- Added a README link to the changelog

---

## 2026-03-04

### Added
- Added workspace-scoped project loading and standardized API responses
- Added English and Spanish internationalization (i18n)

### Changed
- Changed project name from Mini Jira OSS to Taskcore

---

## 2026-02-26

### Added
- Added password authentication and member management
- Added SvelteKit frontend integration in the Docker/app flow

---

## 2026-02-25

### Added
- Added Docker app service and migration support

### Changed
- Changed database initialization to application-managed migrations at startup
- Changed architecture and documentation toward domain-per-package structure and stdlib routing

---

## 2025-12-08 / 2025-12-09

### Added
- Added the initial project structure, Docker setup, and database migrations
- Added early application modules: issues, projects, middleware, and initial auth work
- Initial platform foundation established
