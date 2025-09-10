# Remote Agent Mission: Game Host Dashboard Implementation

## Mission Overview
Your task is to implement **Issue #3: Game Host Dashboard** for Euno's Jeopardy - a complete host interface for game control, buzzer management, and answer adjudication.

## Project Context

### What Euno's Jeopardy Is
Online platform for hosting custom Jeopardy games with friends. Features real-time gameplay, buzzer system, host controls, and clue set management. Players coordinate via Discord voice chat while using the web app for game mechanics.

### Current State
- **Phase 3: Core Development** - Foundation complete, building core features
- **Issues #1 & #2 Complete**: Authentication system and CSV clue loading working
- **Test Coverage**: 94% with all tests passing
- **Database**: Supabase with 11 tables, RLS policies, proper relationships
- **Authentication**: Supabase Auth with automatic profile creation

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Testing**: Jest + React Testing Library (maintain 90%+ coverage)
- **Styling**: SCSS with component-scoped styles
- **Code Quality**: ESLint + SonarQube integration

## Authentication & Environment

### Supabase Credentials
The Supabase credentials were provided in your initial prompt. You should have received them when you were assigned this task.

### Test User Accounts
For testing, you can create test accounts directly in Supabase or use the existing authentication system. The app automatically creates profiles for authenticated users.

## Critical Missing Files (Not in Git)

The following file is excluded by `.gitignore` but is essential for the application to function:

### Environment Configuration
Create `.env.local` in the project root using the Supabase credentials provided in your initial prompt:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=[PROVIDED_IN_INITIAL_PROMPT]
VITE_SUPABASE_ANON_KEY=[PROVIDED_IN_INITIAL_PROMPT]
SUPABASE_DB_PASSWORD=[PROVIDED_IN_INITIAL_PROMPT]  # for local tooling only; app does not use this
```

### Test Data Files
The test clue set file `public/clue-sets/test-game-1.csv` is already included in the repository and contains a complete Jeopardy game with 61 clues (30 Jeopardy + 30 Double Jeopardy + 1 Final Jeopardy).

## Issue Specification

**📋 COMPLETE ISSUE DETAILS**: See `docs/ai/issues/3. Game Host Dashboard.md` for the full specification including:
- Detailed acceptance criteria and technical requirements
- Component architecture and implementation strategy
- Database schema and real-time requirements
- Testing strategy and success metrics
- File structure and integration points

## Development Workflow

### Initial Setup & Verification
**CRITICAL**: Complete these steps before starting development:

1. **Create `.env.local` file** using the Supabase credentials from your initial prompt
2. **Install dependencies**: `npm install`
3. **Verify environment**: `npm run dev` should start without errors
4. **Test authentication**: Login should work in the browser
5. **Test clue loading**: ClueSetSelector should load "Test Game 1" successfully (test data already in repo)
6. **Run tests**: `npm test` should pass with 94%+ coverage
7. **Verify database**: Authentication should create user profiles automatically

### Development Commands
```bash
# Install dependencies
npm install

# Start development server (keep running during development)
npm run dev

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode (recommended during development)
npm test -- --watch

# Run linting
npm run lint

# Build for production (verify before completion)
npm run build
```

### Verification Checklist
Before starting Issue #3 implementation, verify:
- [ ] `.env.local` file created with Supabase credentials from your initial prompt
- [ ] Test clue set file exists: `public/clue-sets/test-game-1.csv` (should already be in repo)
- [ ] `npm run dev` starts successfully on http://localhost:5173
- [ ] Can login with any email/password (creates account automatically)
- [ ] ClueSetSelector shows "Test Game 1" option and loads successfully
- [ ] All existing tests pass: `npm test`
- [ ] No TypeScript errors: `npm run build`

### Key Reference Files
- **Issue Details**: `docs/ai/issues/3. Game Host Dashboard.md`
- **Project Management**: `docs/ai/PROJECT_MANAGEMENT.md`
- **Database Schema**: `src/services/supabase/types.ts`
- **Existing Patterns**: `src/components/clueSets/ClueSetSelector.tsx`, `src/contexts/AuthContext.tsx`
- **Testing Patterns**: `src/contexts/AuthContext.test.tsx`, `src/components/clueSets/ClueSetSelector.test.tsx`

### Existing Code to Leverage
- **AuthContext**: User authentication and session management
- **ClueSetSelector**: Pattern for loading and selecting clue sets
- **Supabase client**: Properly configured with TypeScript types
- **Testing patterns**: Established mocking and testing conventions

## Success Criteria

### Must Complete
- [ ] All acceptance criteria from issue specification met
- [ ] 90%+ test coverage maintained
- [ ] Real-time functionality working correctly
- [ ] Host authorization and security implemented
- [ ] Integration with existing authentication and clue set systems

### Quality Standards
- [ ] SonarQube quality gate passes
- [ ] No ESLint errors or warnings
- [ ] TypeScript strict mode compliance
- [ ] Accessibility features implemented
- [ ] Performance optimized for real-time operations

## Getting Started
1. **Read the full issue specification** in `docs/ai/issues/3. Game Host Dashboard.md`
2. **Explore existing code** - Understand current patterns and architecture
3. **Set up development environment** - Ensure tests pass and server runs
4. **Follow the implementation strategy** outlined in the issue specification
5. **Test continuously** - Maintain coverage throughout development

## Troubleshooting Common Issues

### Environment Setup Issues
- **"Missing SUPABASE_URL"**: Ensure `.env.local` file exists in project root with credentials from your initial prompt
- **"Failed to fetch clue set"**: Test clue set should already be in repo at `public/clue-sets/test-game-1.csv`
- **"Network error"**: Check Supabase credentials are correct and service is accessible

### Development Issues
- **TypeScript errors**: Ensure all imports use existing patterns from `src/contexts/AuthContext.tsx`
- **Test failures**: Follow existing test patterns in `src/contexts/AuthContext.test.tsx`
- **SCSS compilation errors**: Use existing SCSS structure in `src/styles/`
- **Real-time connection issues**: Verify Supabase Realtime is enabled for the project

### Database Issues
- **RLS policy errors**: Use existing patterns that check `auth.uid()` for user permissions
- **Foreign key errors**: Ensure all referenced IDs exist before creating dependent records
- **Authentication errors**: User profiles are created automatically; don't try to create them manually

### Testing Issues
- **Coverage drops**: Mock all Supabase operations following existing patterns
- **Flaky tests**: Ensure proper cleanup in `afterEach` hooks
- **Real-time test failures**: Mock Supabase channels and subscriptions properly

## Success Indicators

### Development Milestones
1. **Environment Setup**: All verification checklist items pass
2. **Basic Game Creation**: Can create a game from existing clue set
3. **Real-time Infrastructure**: Buzzer lock/unlock works with immediate visual feedback
4. **Player Management**: Players can join games and appear in host dashboard
5. **Answer Adjudication**: Host can mark answers correct/incorrect with score updates
6. **Complete Game Flow**: Can play through entire game from start to finish

### Quality Gates
- **Test Coverage**: Maintain 90%+ coverage throughout development
- **TypeScript**: Zero compilation errors
- **ESLint**: Zero linting errors or warnings
- **SonarQube**: Quality gate passes
- **Performance**: Real-time updates feel immediate (< 100ms latency)

This is a substantial feature that will significantly advance the project. The detailed specification provides comprehensive guidance for implementation.

## Detailed Implementation Guidance

### Database Operations Examples

#### Creating a New Game
```typescript
// Example: Create new game
const { data: game, error } = await supabase
  .from('games')
  .insert({
    host_id: user.id,
    clue_set_id: selectedClueSetId,
    status: 'lobby',
    current_round: 'jeopardy',
    is_buzzer_locked: true
  })
  .select()
  .single()
```

#### Real-time Subscriptions
```typescript
// Example: Subscribe to game changes
const subscription = supabase
  .channel(`game:${gameId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'games',
    filter: `id=eq.${gameId}`
  }, (payload) => {
    // Handle game state changes
  })
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'buzzes',
    filter: `game_id=eq.${gameId}`
  }, (payload) => {
    // Handle new buzzer events
  })
  .subscribe()
```

### Component Integration Points

#### App.tsx Integration
The GameHostDashboard should be integrated into the main App component alongside the existing ClueSetSelector. Consider adding a navigation system or tabs to switch between "Load Clue Sets" and "Host Game" modes.

#### Existing Patterns to Follow
- **Error Handling**: Follow the pattern in ClueSetSelector for user feedback
- **Loading States**: Use the same loading pattern with disabled buttons
- **Authentication**: Use the useAuth hook for user context
- **Database Operations**: Follow the pattern in clueSets/loader.ts

### Real-time Architecture

#### Subscription Management
```typescript
// Pattern for managing subscriptions
useEffect(() => {
  if (!gameId) return

  const subscription = supabase
    .channel(`game:${gameId}`)
    .on(/* ... */)
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}, [gameId])
```

#### State Synchronization
- Use React state for immediate UI updates
- Sync with database for persistence
- Handle optimistic updates with rollback on errors

### Testing Patterns

#### Mock Supabase Realtime
```typescript
// Mock pattern for Realtime subscriptions
jest.mock('../services/supabase/client', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    })),
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ data: mockData, error: null })),
      select: jest.fn(() => ({ data: mockData, error: null }))
    }))
  }
}))
```

#### Test Real-time Events
```typescript
// Pattern for testing real-time events
it('should handle buzzer events', async () => {
  let eventCallback: (payload: any) => void

  const mockChannel = {
    on: jest.fn((event, config, callback) => {
      if (config.table === 'buzzes') {
        eventCallback = callback
      }
      return mockChannel
    }),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  }

  // Trigger the component
  render(<BuzzerControl gameId="test-game" />)

  // Simulate real-time event
  act(() => {
    eventCallback({ new: { user_id: 'player1', created_at: new Date().toISOString() } })
  })

  // Assert UI updates
  expect(screen.getByText(/player1 buzzed/i)).toBeInTheDocument()
})
```

### Error Handling Patterns

#### Network Errors
```typescript
try {
  const { data, error } = await supabase.from('games').insert(gameData)
  if (error) throw error
  // Success handling
} catch (error) {
  console.error('Failed to create game:', error)
  setMessage('Failed to create game. Please try again.')
  setMessageType('error')
}
```

#### Permission Errors
```typescript
// Check if user is game host before allowing actions
const isHost = game?.host_id === user?.id
if (!isHost) {
  throw new Error('Only the game host can perform this action')
}
```

### Performance Optimizations

#### Memoization
```typescript
// Memoize expensive calculations
const sortedPlayers = useMemo(() =>
  players.sort((a, b) => b.score - a.score),
  [players]
)

// Memoize components
const PlayerList = React.memo(({ players, gameId }) => {
  // Component implementation
})
```

#### Efficient Subscriptions
- Subscribe only to necessary tables and events
- Use filters to limit data transfer
- Unsubscribe properly to prevent memory leaks

### Accessibility Requirements

#### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Implement proper tab order
- Add keyboard shortcuts for common host actions (spacebar for buzzer lock/unlock)

#### Screen Reader Support
- Proper ARIA labels for all controls
- Live regions for real-time updates
- Semantic HTML structure

#### Visual Feedback
- Clear visual states for buzzer lock/unlock
- High contrast for important information
- Loading indicators for all async operations

### Integration with Existing Features

#### Clue Set Integration
The dashboard should work with clue sets loaded via the existing ClueSetSelector. Consider:
- Sharing clue set state between components
- Validating clue set completeness before game creation
- Displaying clue set information in the dashboard

#### Authentication Integration
- Respect existing authentication patterns
- Handle authentication state changes gracefully
- Ensure proper cleanup on logout

### Deployment Considerations

#### Environment Variables
The credentials are already configured in multiple places:
- `src/config/env.ts` (hardcoded for consistency)
- `.env.local` (for local development)
- `vercel.json` (for deployment)

#### Build Process
- Ensure all new components pass TypeScript compilation
- Verify SCSS compilation works correctly
- Test production build before considering complete

Good luck! 🎯
