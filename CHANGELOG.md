# Changelog

## [0.9.5] - 2026-09-27

### Changes
- ci: activate native ad-hoc signing with electron-builder

---

## [0.9.4] - 2026-09-27

### Changes
- ci: add automated release script and npm run release command
- ci: add CHANGELOG.md and integrate changelog-based release notes into GitHub workflow

---

## [0.9.3] - 2026-09-27

### Added
- "Show Status Bar" menu option in the **View** menu (`Cmd+/`) with checkmark state synchronization.
- Monospace font style for status bar messages.
- Timestamp prefixes on debug console logs.
- Automatic tag version synchronization during CI builds.

### Changed
- Status bar idle checkmark now renders in secondary grey color.
- Removed verbose "Process completed successfully!" terminal exit output.
- Refactored shell architecture, unified task & terminal management into `tasks.js`, and centralized keyboard navigation.

### Removed
- Removed menu bar tray icon and auto-updater modules.

---

## [0.9.2] - 2026-09-27

### Added
- Live download progress extraction and progress display in status bar.
- Full Disk Access warning dialog with system settings shortcut when deleting protected app data.
- App installation size calculation and display.
- Automated Homebrew tap cask publication workflow for `yanbab/homebrew-tap`.
- Project documentation website.

### Fixed
- Fixed password prompt detection and terminal ANSI stripping.
- Fixed YAML syntax in release workflow.

---

## [0.9.1] - 2026-09-26

### Added
- GitHub Actions CI/CD release workflow for building universal macOS DMGs (`arm64` and `x64`).
- Node.js type definitions support.

---

## [0.9.0] - 2026-09-26

### Added
- Initial release of **AppFinder**, an app store interface for Homebrew casks on macOS.
- Explore / Discover view with featured categories and popular applications.
- Search and filtering across Homebrew casks.
- Install, update, and uninstall tasks.
