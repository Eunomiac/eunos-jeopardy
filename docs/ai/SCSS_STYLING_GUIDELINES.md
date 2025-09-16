# SCSS Styling Guidelines

## Core Principles

### 1. **Thorough SCSS Nesting**
- Make full use of SCSS nesting capabilities
- Follow the nesting patterns established in `GameHostDashboard.scss` as the gold standard
- Nest selectors logically to mirror the component hierarchy
- Use parent selector (`&`) for pseudo-classes, modifiers, and state variations

### 2. **Avoid Inline Styles**
- Favor CSS classes over inline style attributes in all circumstances
- Only use inline styles for very narrow cases such as:
  - Unique component needing a small style adjustment
  - Dynamic values that must be calculated at runtime
  - One-off positioning or sizing that doesn't warrant a class

### 3. **Leverage Existing Styling Infrastructure**
- Always check existing styling files before creating new styles
- Reuse existing classes, variables, and mixins whenever possible
- Maintain consistency with the established Jeopardy theme

## Required File Structure

### Import Order
All component SCSS files should import in this order:
```scss
@import "../../styles/variables";
@import "../../styles/mixins";
@import "../../styles/jeopardy-theme";
```

## Key Reference Files

### Core Styling Files
- **`src/styles/_variables.scss`** - All color, spacing, typography, and layout variables
- **`src/styles/_mixins.scss`** - Reusable mixins for responsive design, flexbox, buttons, cards, etc.
- **`src/styles/_jeopardy-theme.scss`** - Jeopardy-specific mixins, button styles, and utility classes
- **`src/styles/_globals.scss`** - Global styles, font loading, typography classes, utility classes

### Example Implementation
- **`src/components/games/GameHostDashboard.scss`** - Gold standard for thorough SCSS nesting patterns

## Available Resources

### Color Variables
```scss
// Jeopardy Theme Colors
$jeopardy-blue: #061276;
$jeopardy-clue-blue: #0f1c8e;
$jeopardy-gold: #d69f4c;
$jeopardy-white: #ffffff;
$jeopardy-black: #000000;
$jeopardy-background-blue: #0b002a;

// Status Colors
$success-color: #28a745;
$warning-color: #ffc107;
$error-color: #dc3545;
$info-color: #17a2b8;

// Text Colors
$text-color: $jeopardy-white;
$text-secondary: $jeopardy-light-grey;
$text-muted: $jeopardy-grey;
```

### Spacing Variables
```scss
$spacing-xs: 0.125rem;
$spacing-sm: 0.25rem;
$spacing-md: 0.375rem;
$spacing-lg: 0.5rem;
$spacing-xl: 0.625rem;
$spacing-xxl: 0.75rem;
```

### Typography Variables
```scss
// Jeopardy Fonts
$font-family-title: 'Annual Normal', serif;
$font-family-daily-double: 'Steile Futura Bold', sans-serif;
$font-family-clue: 'Korinna ITC Bold', serif;
$font-family-category: 'Swiss 921', sans-serif;
$font-family-money: 'Swiss 911 Extra Condensed', sans-serif;
$font-family-ui: 'Swiss 921', sans-serif;

// Font Sizes
$font-size-xs: 0.75rem;
$font-size-sm: 0.875rem;
$font-size-md: 1rem;
$font-size-lg: 1.125rem;
$font-size-xl: 1.25rem;
$font-size-2xl: 1.5rem;
// ... up to 8xl
```

### Useful Mixins
```scss
// Layout
@include flex-center;
@include flex-between;
@include flex-column;

// Responsive
@include respond-to(md);
@include respond-to(lg);

// Components
@include jeopardy-card;
@include jeopardy-button-base;
@include jeopardy-button-small;
@include jeopardy-button-medium;
@include jeopardy-button-large;
```

### Pre-built Jeopardy Classes
```scss
// Typography
.jeopardy-title
.jeopardy-category
.jeopardy-clue
.jeopardy-money
.jeopardy-board-money

// Buttons
.jeopardy-button-small
.jeopardy-button
.jeopardy-button-large

// Alerts
.jeopardy-alert
.alert-success
.alert-error
.alert-warning
.alert-info

// Utilities
.text-center
.text-uppercase
.font-bold
.full-width
```

## Best Practices

### Component Structure
```scss
.component-name {
  @include jeopardy-card; // Use existing mixins

  .component-header {
    @extend .jeopardy-category; // Extend existing classes
    color: $jeopardy-gold; // Use variables

    .header-title {
      font-size: $font-size-xl;

      &.active {
        color: $jeopardy-bright-gold;
      }
    }
  }

  .component-content {
    padding: $spacing-lg;

    .content-item {
      margin-bottom: $spacing-md;

      &:last-child {
        margin-bottom: 0;
      }

      &:hover {
        background-color: rgba($jeopardy-gold, 0.1);
      }
    }
  }

  // Responsive design
  @include respond-to(md) {
    .component-content {
      padding: $spacing-sm;
    }
  }
}
```

### Nesting Guidelines
- Nest selectors to match HTML structure
- Use `&` for pseudo-classes (`:hover`, `:active`, `:disabled`)
- Use `&` for modifier classes (`&.active`, `&.error`)
- Limit nesting to 4-5 levels deep for readability
- Group related selectors together

### Variable Usage
- **Colors**: Always use color variables (`$jeopardy-blue`, `$error-color`) instead of hardcoded hex values
- **Typography**: Use font variables (`$font-family-ui`, `$font-size-lg`) for consistency
- **Flexible spacing**: Use spacing variables (`$spacing-lg`) for padding/margins that should be configurable
- **Specific positioning**: Hardcoded pixel values are acceptable for precise positioning (top: 40px, width: 20px)
- **Layout dimensions**: Specific heights/widths can remain hardcoded when they define critical layout structure
- **Z-index**: Always use z-index variables (`$z-fixed`, `$z-modal`) for layering consistency

### Responsive Design
- Use existing breakpoint mixins (`@include respond-to(md)`)
- Mobile-first approach when needed
- Test responsive behavior across breakpoints

## Common Patterns

### Interactive Elements
```scss
.interactive-element {
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    filter: brightness(1.1);
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
```

### Card Components
```scss
.card-component {
  @include jeopardy-card;

  .card-header {
    background: linear-gradient(135deg, darken($jeopardy-blue, 5%), darken($jeopardy-blue, 30%));
    margin: (-$spacing-lg) (-$spacing-lg) 0 (-$spacing-lg);
    width: calc(100% + 2 * #{$spacing-lg});
    border-bottom: 2px solid $jeopardy-gold;
  }
}
```

### Grid Layouts
```scss
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: $spacing-sm;

  .grid-item {
    @include jeopardy-card;
  }
}
```

This document should be referenced whenever creating or modifying SCSS files to ensure consistency with the established Jeopardy theme and coding standards.
