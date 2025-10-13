/**
 * SCSS Module Type Declarations
 *
 * Provides TypeScript type definitions for SCSS module imports.
 * This allows importing .scss files without TypeScript errors.
 *
 * **Purpose:**
 * - Enable SCSS imports in TypeScript files
 * - Provide type safety for CSS module class names
 * - Eliminate TS2307 "Cannot find module" errors for .scss files
 *
 * **Usage:**
 * This file is automatically included by TypeScript and requires no explicit imports.
 * Simply import SCSS files normally:
 *
 * @example
 * ```typescript
 * import './MyComponent.scss';
 * ```
 *
 * @since 0.1.0
 */

declare module '*.scss' {
  const content: Record<string, string>;
  export default content;
}

