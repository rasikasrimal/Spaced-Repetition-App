# Changelog

## [Unreleased]
### Added
- Adaptive review scheduler that recalculates next sessions whenever predicted retention drops below the user-defined trigger.
- Global revision preference slider in Settings with real-time forgetting-curve preview and mode toggle.
- Documentation for the retention model, adaptive UI, and validation strategy, including testing notes and algorithm overview.

### Changed
- Timeline, Subjects, and Reviews pages now surface the active retention trigger to explain upcoming adaptive sessions.
- Topic creation aligns new cards with the global retention threshold automatically.
