# Euno's Jeopardy - Project Management

## Project Overview
Online platform for hosting custom Jeopardy games with friends. Features real-time gameplay, buzzer system, host controls, and clue set management.

**Repository**: https://github.com/Eunomiac/eunos-jeopardy
**Status**: Phase 2 Complete - Ready for Development
**Current Phase**: Phase 3 - Core Development

## Issue Management
- this document summarizes the current state of the project and the issues that need to be addressed
- for more detailed plans to resolve each issue, refer to the numbered documents in the `docs/ai/issues/` folder

---

## Development Phases

### ✅ Phase 1: Project Setup (COMPLETE)
- [x] Project charter and requirements gathering
- [x] Template customization and placeholder replacement
- [x] Initial project structure established

### ✅ Phase 2: Infrastructure & Integrations (COMPLETE)
- [x] Supabase database schema (11 tables)
- [x] GitHub repository setup
- [x] SonarQube code quality integration
- [x] CI/CD pipeline with GitHub Actions
- [x] Development environment configuration

### 🔄 Phase 3: Core Development (IN PROGRESS)
**Current Focus**: Simplified authentication and CSV-based clue loading

**Approach**: Private-use-first development strategy
- Implement minimal viable features for friend games
- Defer complex security and UI features to Phase 4
- Focus on core gameplay functionality
- Maintain extensibility for future public release

---

## Current Sprint: Simplified Foundation

### 🔴 High Priority Issues

#### Issue #1: Simplified User Management System (For In-Dev Use)
**Status**: ✅ COMPLETE
**Assignee**: Development Team
**Epic**: User Management
**Priority**: 🔴 High (Foundation)

**Description**: Implement extremely simplified functionality to track users and logins.

**Acceptance Criteria**:
- [x] Simple login/logout functionality
- [x] User registration can be handled manually by creating valid host/player accounts directly in Supabase

**Technical Notes**:
- Focus on getting users to connect quickly to continue development
- Ignore authentication and security concerns
- Skip email verification, password reset, user profiles initially
- **Deferred to Phase 3**: user authentication, user registration, email verification, password reset, user profiles, advanced security

**Phase 3 Enhancements**
__near-future__
- user registration with email/password
- user login with session persistence
- protected routes for authenticated users
- basic auth context/provider pattern
- simple error handling for auth failures

__for public release__
- Email verification flow
- Password reset functionality
- User profile creation and management
- Advanced RLS policies and security headers

---

#### Issue #2: CSV Question Set Loader (Simplified)
**Status**: � IN PROGRESS
**Assignee**: Development Team
**Epic**: Content Management
**Priority**: 🔴 High (Foundation)

**Description**: Build CSV file upload and parser for clue sets. Hosts create clues in CSV format externally, then upload to the game. Much faster to implement than complex in-app editor.

**Acceptance Criteria**:
- [ ] Define simplified CSV format specification (round, category, value, clue, answer)
- [ ] Create example CSV files for testing
- [ ] Build file upload component with drag-and-drop
- [ ] Implement CSV parser with basic validation
- [ ] **Implement automatic Daily Double placement algorithm**
- [ ] Save parsed clues to database (`clue_sets`, `boards`, `categories`, `clues` tables)
- [ ] Error handling for malformed CSV files
- [ ] Simple preview of loaded clues with Daily Double positions

**Technical Notes**:
- **Simplified CSV format**: `round,category,value,clue,answer` (no daily_double column)
- Support for Jeopardy, Double Jeopardy, and Final Jeopardy rounds
- **Automatic Daily Double placement** using authentic probability distribution
  - **Category Selection**: Random for Jeopardy (1 DD), different categories for Double Jeopardy (2 DDs)
  - **Row Selection**: Weighted random based on authentic Jeopardy! data
    - Row 1 (lowest values): 0% chance
    - Row 2: 9% chance
    - Row 3: 26% chance
    - Row 4: 39% chance
    - Row 5 (highest values): 26% chance
- Basic validation: required columns, proper round structure, 6 categories × 5 clues per round
- **Reference**: See `docs/ai/DAILY_DOUBLE_ALGORITHM.md` for complete algorithm specification
- **Deferred to Phase 3**: In-app clue editor, drag-and-drop Daily Double placement, advanced validation

**Phase 3 Enhancements** (for public release):
- In-app clue set editor with rich UI
- Visual Daily Double placement interface
- Question set templates and sharing
- Advanced validation and preview features
- Import/export multiple formats

---

#### Issue #3: Game Host Dashboard
**Status**: 🟡 TODO
**Assignee**: Development Team
**Epic**: Game Control

**Description**: Create host interface for game control, buzzer management, and answer adjudication.

**Acceptance Criteria**:
- [ ] Start new game with selected clue set
- [ ] Control buzzer lock/unlock
- [ ] View player buzzer order
- [ ] Adjudicate answers (correct/incorrect)
- [ ] Manage scoring and wagers
- [ ] Control game flow (rounds, Final Jeopardy)

**Technical Notes**:
- Real-time updates using Supabase Realtime
- Use `games`, `players`, `buzzes`, `answers` tables
- Implement host-only controls with proper authorization

---

### 🟡 Medium Priority Issues

#### Issue #4: Simplified Player Interface (Voice-Chat Focused)
**Status**: 🟡 TODO
**Assignee**: Development Team
**Epic**: Player Experience
**Priority**: 🟡 Medium

**Description**: Build streamlined player interface optimized for Discord voice chat gameplay. Focus on buzzer functionality since answers are communicated verbally.

**Acceptance Criteria**:
- [ ] Join game with game code
- [ ] Large, responsive buzzer button with visual/audio feedback
- [ ] Answer submission form **only for Final Jeopardy**
- [ ] Score display and current game state
- [ ] Game state awareness (can buzz, waiting, etc.)
- [ ] Clean, minimal game-show aesthetic
- [ ] Mobile-friendly buzzer interface

**Technical Notes**:
- **Simplified**: No text input forms except Final Jeopardy
- Mobile-first responsive design for buzzer
- **Deferred to Phase 3**: Complex answer submission, player profiles, chat features

---

#### Issue #5: Real-time Buzzer System
**Status**: 🟡 TODO
**Assignee**: Development Team
**Epic**: Game Mechanics

**Description**: Implement low-latency buzzer system with proper race condition handling.

**Acceptance Criteria**:
- [ ] Real-time buzz detection
- [ ] Proper buzz ordering
- [ ] Buzzer lock/unlock states
- [ ] Visual feedback for all players
- [ ] Handle network latency fairly

---

#### Issue #6: Game Board Display
**Status**: 🟡 TODO
**Assignee**: Development Team
**Epic**: Game Interface

**Description**: Create authentic Jeopardy board interface with clue selection and reveal.

**Acceptance Criteria**:
- [ ] Category headers display
- [ ] Clue value grid
- [ ] Clue selection by host
- [ ] Clue reveal animation
- [ ] Daily Double indication
- [ ] Completed clue tracking

---

### 🟢 Low Priority Issues

#### Issue #7: Score Management
**Status**: 🟡 TODO
**Assignee**: Development Team
**Epic**: Game Mechanics

**Description**: Implement comprehensive scoring system with wagers and Final Jeopardy.

**Acceptance Criteria**:
- [ ] Basic scoring (correct/incorrect answers)
- [ ] Daily Double wager handling
- [ ] Final Jeopardy wager system
- [ ] Score history tracking
- [ ] Leaderboard display

---

#### Issue #8: Game State Management
**Status**: 🟡 TODO
**Assignee**: Development Team
**Epic**: Game Flow

**Description**: Manage game progression through rounds and states.

**Acceptance Criteria**:
- [ ] Round transitions (Jeopardy → Double → Final)
- [ ] Game state persistence
- [ ] Resume interrupted games
- [ ] End game conditions
- [ ] Winner determination

---

## Phase 4: Public Release Enhancements (Future)

**When to implement**: After successful private friend games and decision to go public

### Enhanced Authentication
- [ ] Email verification flow
- [ ] Password reset functionality
- [ ] User profile creation and management
- [ ] Advanced RLS policies and security headers
- [ ] Rate limiting and abuse prevention

### Advanced Question Management
- [ ] In-app clue set editor with rich UI
- [ ] Visual Daily Double placement interface
- [ ] Question set templates and sharing
- [ ] Advanced validation and preview features
- [ ] Import/export multiple formats

### Enhanced Player Experience
- [ ] In-app text answer submission for all clues
- [ ] Player profiles and avatars
- [ ] In-game chat functionality
- [ ] Advanced buzzer customization
- [ ] Mobile app considerations

### Enterprise Features
- [ ] Advanced analytics and reporting
- [ ] Multi-tenant support
- [ ] API rate limiting
- [ ] Audit trails and logging
- [ ] Performance monitoring

---

## Technical Debt & Improvements

### Code Quality
- 🔄 **IN PROGRESS**: Increase test coverage to 90% (remote agent assigned)
- [ ] Address SCSS deprecation warnings
- [ ] Implement comprehensive error boundaries
- [ ] Add accessibility features (ARIA labels, keyboard navigation)

### Performance
- [ ] Optimize real-time subscriptions
- [ ] Implement proper loading states
- [ ] Add offline capability for clue set creation
- [ ] Optimize bundle size

### Security
- [ ] Audit RLS policies
- [ ] Implement rate limiting
- [ ] Add input sanitization
- [ ] Security headers configuration

---

## Definition of Done

For each issue to be considered complete:
- [ ] Feature implemented according to acceptance criteria
- [ ] Unit tests written with >80% coverage for new code
- [ ] Integration tests for critical paths
- [ ] Code reviewed and approved
- [ ] SonarQube quality gate passed
- [ ] Documentation updated
- [ ] Deployed to staging environment
- [ ] User acceptance testing completed

---

## Next Actions

1. **Start with Issue #1 (Authentication)** - Foundation for all other features
2. **Set up development workflow** - Feature branches, PR process
3. **Create component library** - Reusable UI components
4. **Implement basic routing** - Navigation structure
5. **Database connection testing** - Verify all tables work correctly

---

## Progress Log

### 2025-09-09
- ✅ **Issue #1 COMPLETE**: Simplified User Management System
  - Implemented basic Supabase authentication with login/logout
  - Created AuthContext with automatic profile creation
  - Added proper error handling and loading states
  - Users can now authenticate and access the application
- ✅ **Issue #2 COMPLETE**: CSV Question Set Loader
  - Built comprehensive CSV parser with validation (prompt/response terminology)
  - Implemented clue set selector with file discovery
  - Created simplified database schema with proper relationships
  - Fixed foreign key constraints (clues.category_id → categories.id)
  - Added Row Level Security policies for multi-user data protection
  - Resolved database constraint issues (boards_round_check)
  - Global type definitions for RoundType and GameStatus
- 🎯 **Next**: Achieve 90% test coverage, then Issue #3 (Game Host Dashboard)

### 2025-09-08
- ✅ Completed Phase 2 setup (infrastructure & integrations)
- ✅ Created project management document
- ✅ **Strategy Pivot**: Adopted private-use-first development approach
- ✅ Simplified authentication and clue management requirements
- ✅ Updated project issues to reflect CSV-first clue loading

---

## Quick Status Legend
- 🔴 High Priority
- 🟡 Medium Priority
- 🟢 Low Priority
- ✅ Complete
- 🔄 In Progress
- 🟡 TODO
- ❌ Blocked

---

*Last Updated: 2025-09-09*
*Phase: 3 - Core Development*
*Sprint: Test Coverage & Quality*
