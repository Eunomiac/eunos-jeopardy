# Euno's Jeopardy

Online platform to create and host custom Jeopardy!-style games with friends. Includes host-authored boards (categories, clues, answers), buzzer system with host-controlled lock/unlock, score/money tracking, Double and Final Jeopardy rounds, and a polished, authentic game interface.

## Features

❇️LIST_KEY_FEATURES❇️

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: SCSS with component-scoped styles
- **Database**: Supabase PostgreSQL
- **Testing**: Jest + React Testing Library
- **Code Quality**: ESLint + SonarQube
- **Deployment**: Vercel

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- ❇️ADDITIONAL_PREREQUISITES❇️

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Eunomiac/eunos-jeopardy.git
   cd eunos-jeopardy
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:prod` - Build with linting and testing
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ci` - Run tests with coverage for CI
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── app/           # Main application components
├── features/      # Feature-specific components and logic
├── shared/        # Shared utilities, components, and types
├── services/      # External service integrations
├── styles/        # Global styles and SCSS utilities
└── test/          # Test configuration and utilities
```

## License

MIT License - This is a private project for personal use.