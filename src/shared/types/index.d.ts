/**
 * Shared types barrel export module for Euno's Jeopardy application.
 *
 * This module serves as the central export point for all TypeScript type
 * definitions used across different features and modules. It provides
 * organized access to shared types while maintaining clear separation
 * between global and feature-specific type definitions.
 *
 * **Type Organization:**
 * - Global types: Available globally without imports (via global.d.ts)
 * - Feature types: Specific to particular application features
 * - API types: External service and API response types
 * - UI types: Component and interface-specific types
 *
 * **Current Structure:**
 * - global.d.ts: Global ambient types and utility types
 * - Future: core.d.ts, api.d.ts, ui.d.ts as needed
 *
 * **Usage Pattern:**
 * ```typescript
 * // Import specific types when needed
 * import type { SomeType } from '@/shared/types';
 *
 * // Global types are available without imports
 * const value: Maybe<string> = undefined;
 * ```
 *
 * **Benefits:**
 * - Centralized type management
 * - Clear separation of concerns
 * - Easy type discovery and maintenance
 * - Consistent import patterns
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */

/**
 * Global types export (for completeness, though types are already globally available).
 *
 * While global.d.ts makes types available globally without imports,
 * this export ensures the module is properly recognized by TypeScript
 * and provides a reference point for global type definitions.
 */
export {} from './global';

/**
 * Future type category exports will be added here as the application grows:
 *
 * Core application types:
 * export {} from './core';
 *
 * API and external service types:
 * export {} from './api';
 *
 * UI component and interface types:
 * export {} from './ui';
 *
 * Game-specific types (may be moved from types/game.ts):
 * export {} from './game';
 */
