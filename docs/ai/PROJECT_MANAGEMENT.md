# Euno's Jeopardy - Project Management

## Project Overview
Online platform to create and host custom Jeopardy!-style games for friends. The app runs one game at a time: all connected non-host users are players in the current game (no in-app chat; players coordinate via Discord voice). The host adjudicates answers manually via UI controls. Players are currently unbounded (a later UI soft limit may apply). Hosts can prepare multiple clue sets in advance and load one when a game begins. Each clue set contains two boards (Jeopardy and Double Jeopardy: 6 categories × 5 clues with constrained Daily Double locations) plus a Final Jeopardy category and clue.

**Repository**: https://github.com/Eunomiac/eunos-jeopardy
**Current Phase**: Phase 3 - Core Development

## Technical Architecture

### Frontend Stack
- Framework: React 19 with TypeScript
- Build Tool: Vite
- Styling: SCSS (component-scoped + global styles)
- UI Approach: Game-style interface with turns/states
- Component Organization: Feature-based folders

### Backend Strategy
- Approach: Client app with Supabase backend services
- Database: Supabase PostgreSQL with Row Level Security (RLS)
- Authentication: Supabase Auth (email/password; consider magic links)
- Real-time: Supabase Realtime channels for lobby/game/buzzer events
- API Integrations: None initially

### Data Management
- Data Sources: User-authored game content (boards, categories, clues)
- Processing: Simple validation and server-side checks where needed
- Storage: Relational schema in Supabase; row ownership + RLS
- Update Frequency: Real-time during games; on-demand for authoring

### Deployment & Hosting
- Platform: Vercel
- Deployment: Automatic from GitHub main branch
- Security: RLS policies, authenticated endpoints, input validation
- Backup: Supabase automatic backups

### Performance Considerations
- Scale: Small/medium sessions (up to ~20 concurrent players)
- Optimization: Batched updates, memoization, DB indexing, lean payloads

## Issue Management
This document contains the static project structure and issue definitions. For current status, progress updates, and rapidly changing information, see **[CURRENT_STATUS.md](./CURRENT_STATUS.md)**.

For detailed implementation plans for each issue, refer to the numbered documents in the `docs/ai/issues/` folder.

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
**Current Focus**: Player interface development and core buzzer system implementation

**Completed**:
- ✅ Simplified authentication and CSV-based clue loading
- ✅ Game host dashboard with full functionality
- ✅ End-to-end game creation workflow

**Approach**: Private-use-first development strategy
- Implement minimal viable features for friend games
- Defer complex security and UI features to Phase 4
- Focus on core gameplay functionality
- Maintain extensibility for future public release

---

## Current Sprint: Game Host Dashboard & Player Interface

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
- [ ] Create example CSV files for validation
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
- **Reference**: See `docs/ai/features/DAILY_DOUBLE_ALGORITHM.md` for complete algorithm specification
- **Deferred to Phase 3**: In-app clue editor, drag-and-drop Daily Double placement, advanced validation

**Phase 3 Enhancements**:
- In-app clue set editor with rich UI
- Visual Daily Double placement interface
- Question set templates and sharing
- Advanced validation and preview features
- Import/export multiple formats
- **Multimedia clue support**: Images, audio, and video clues (like real Jeopardy)
  - Image clues with proper display and scaling
  - Audio clues with playback controls
  - Video clues with embedded player
  - Mixed media clues (text + image/audio/video)
  - File upload and storage management
  - Responsive media display across devices
  - **Preloading**: Media files loaded alongside game board for instant playback on all connected clients

---

#### Issue #3: Game Host Dashboard
**Status**: 🔄 IN PROGRESS (Phase 2: Core Buzzer System)
**Assignee**: Development Team
**Epic**: Game Control
**Priority**: 🔴 High (Foundation)

**Description**: Create host interface for game control, buzzer management, and answer adjudication.

**Acceptance Criteria**:
- [x] Start new game with selected clue set
- [x] Host authorization and security checks
- [x] Error handling and loading states
- [x] Integration with existing authentication and clue set systems
- [x] Service layer foundation (GameService with CRUD operations)
- [x] Basic dashboard layout and navigation
- [x] Control buzzer lock/unlock (working)
- [x] Game ending functionality (working)
- [x] Code quality standards met (SonarQube quality gates passing)
- [ ] View player buzzer order (deferred - no players yet)
- [ ] Adjudicate answers (correct/incorrect) (deferred - no players yet)
- [ ] Manage scoring and wagers (deferred - no players yet)
- [ ] Control game flow (rounds, Final Jeopardy) (deferred - no players yet)
- [ ] Real-time updates using Supabase Realtime (deferred - no players yet)

**Technical Notes**:
- ✅ Complete GameService with all CRUD operations implemented
- ✅ GameHostDashboard component with full functionality
- ✅ Tab-based navigation system in App.tsx
- ✅ Authentication and session management working correctly
- ✅ **RESOLVED**: RLS policies rebuilt and working correctly
- ✅ **RESOLVED**: Game creation, buzzer controls, and game ending all functional
- ✅ **RESOLVED**: Code quality standards met (SonarQube quality gates passing)
- 🔄 **NEXT**: Complete Issue #3, then implement player interface

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

> **Note**: For current project status and immediate technical issues, see [CURRENT_STATUS.md](./CURRENT_STATUS.md).

### Code Quality (Future Improvements)
- [ ] Address SCSS deprecation warnings
- [ ] Implement comprehensive error boundaries
- [ ] Add accessibility features (ARIA labels, keyboard navigation)
- [ ] Implement React Error Boundaries for better error handling
- [ ] Add comprehensive input validation for CSV parsing and user inputs
- [ ] Configure Sentry for production monitoring and error tracking
- [ ] Add JSDoc documentation for complex functions and APIs
- [ ] Implement keyboard navigation for game controls
- [ ] Add ARIA support for screen readers (game board, buzzer controls)
- [ ] Consider feature-based folder organization for better scalability

### Performance
- [ ] Optimize real-time subscriptions
- [ ] Implement proper loading states
- [ ] Add offline capability for clue set creation
- [ ] Add React.memo to expensive components to prevent unnecessary re-renders
- [ ] Optimize bundle size (review Sentry configuration for production)
- [ ] Consider virtualization for large player lists (future scaling)
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
- [ ] Code quality standards met (handled by remote agents)
- [ ] Code reviewed and approved
- [ ] SonarQube quality gate passed
- [ ] Documentation updated
- [ ] Deployed to staging environment
- [ ] User acceptance testing completed

---

## Next Actions & Progress

> **Note**: For current next actions, progress updates, and daily status changes, see [CURRENT_STATUS.md](./CURRENT_STATUS.md).

### Historical Progress Summary

#### 2025-09-13
- ✅ **Issue #3 Major Progress**: Game Host Dashboard
  - ✅ **Authentication Issues Resolved**: Fixed session management and logout state clearing
  - ✅ **RLS Policies Rebuilt**: Completely rebuilt RLS policies with clean, working syntax
  - ✅ **Game Creation Working**: End-to-end game creation workflow functional
  - ✅ **Host Controls Working**: Buzzer lock/unlock and game ending functionality complete
  - ✅ **Database Integration**: All CRUD operations working with proper authentication
  - ✅ **UI Integration**: Seamless navigation between clue set selection, game creation, and host dashboard

#### 2025-09-09
- ✅ **Issue #1 COMPLETE**: Simplified User Management System
- ✅ **Issue #2 COMPLETE**: CSV Question Set Loader

#### 2025-09-08
- ✅ Completed Phase 2 setup (infrastructure & integrations)
- ✅ **Strategy Pivot**: Adopted private-use-first development approach

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

*Phase: 3 - Core Development*
*For current sprint status and last updated information, see [CURRENT_STATUS.md](./CURRENT_STATUS.md)*
