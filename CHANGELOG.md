# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2025-09-20

### Added
- Complete Daily Double flow system with current player tracking
- Database-driven current player system using `current_player_id`
- Wager management system with separate `wagers` table
- Daily Double button state machine for game flow control
- Visual indicators: golden glow and crown emoji for current player
- GameService methods for current player and wager operations
- Comprehensive Daily Double documentation

### Changed
- Enhanced game flow to support Daily Double mechanics
- Updated player podiums with current player highlighting

## [0.5.0] - 2025-10-06

### Added
- Real-time buzzer system with client-side timing
- BuzzerQueueManager for automatic player focusing based on reaction times
- BroadcastService for real-time event broadcasting
- Comprehensive tests for BuzzerQueueManager and BroadcastService
- Late buzz correction handling
- Manual host override for player selection

### Changed
- Buzzer lock/unlock mechanism prioritizes broadcasting before database updates
- Removed deprecated auto-selection timeout logic

## [0.4.0] - 2025-09-19

### Added
- Complete Player Dashboard with real-time game flow integration
- Player buzzer interface with visual feedback
- Player podiums with dynamic layout and text scaling
- Font assignment service for handwritten player fonts
- Four-state buzzer system (Locked, Unlocked, Buzzed, Frozen)
- Real-time connection debugging components
- Player lobby interface with game code display and nickname system

### Changed
- Integrated PlayerDashboard with GameHostDashboard real-time flow
- Enhanced player role detection and automatic interface routing

## [0.3.0] - 2025-09-16

### Added
- Game Host Dashboard foundation with 6-panel layout
- Interactive game board with clickable clue cells
- Buzzer queue management and player selection
- Score adjustment system with validation
- Buzzer auto-selection with configurable timeout
- Real-time progress tracking with completed clue counts
- Daily Double visual indicators (red dot)
- Category introduction system with animations
- Round transition controls

### Changed
- Enhanced GameService with focused clue/player management
- Added database schema updates for game state tracking
- Improved clue management with automatic state initialization

## [0.2.0] - 2025-09-09

### Added
- CSV clue set loader with comprehensive validation
- CSV parser supporting Jeopardy, Double Jeopardy, and Final Jeopardy rounds
- Automatic Daily Double placement algorithm with authentic probability distribution
- Database integration for clue sets with full relationships
- ClueSetSelector component for choosing clue sets
- Drag-and-drop CSV upload interface
- Clue set management (upload, naming, user's clue set list)
- Database-driven clue set selection
- Comprehensive test coverage for CSV parsing and Daily Double algorithm

### Changed
- Renamed "question/answer" terminology to "prompt/response"
- Added global type definitions for `RoundType` and `GameStatus`
- Updated database schema with foreign key relationships and RLS policies

## [0.1.0] - 2025-09-08

### Added
- Initial project setup and infrastructure
- Supabase database schema (11 tables)
- GitHub repository and CI/CD pipeline
- SonarQube code quality integration
- Development environment configuration
- Simplified authentication system
- Basic user management with login/logout
- Project documentation structure

[0.6.0]: https://github.com/Eunomiac/eunos-jeopardy/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/Eunomiac/eunos-jeopardy/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/Eunomiac/eunos-jeopardy/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Eunomiac/eunos-jeopardy/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Eunomiac/eunos-jeopardy/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Eunomiac/eunos-jeopardy/releases/tag/v0.1.0

