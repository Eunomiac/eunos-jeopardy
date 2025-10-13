import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../services/supabase/client'

/**
 * Type definition for the authentication context value.
 *
 * Defines the shape of data and functions available to components that consume
 * the authentication context. This interface ensures type safety and provides
 * clear documentation of available authentication operations.
 *
 * **State Properties:**
 * - user: Current authenticated user object or null
 * - session: Current Supabase session or null
 * - loading: Boolean indicating if authentication state is being determined
 *
 * **Action Methods:**
 * - login: Authenticates user with email/password
 * - logout: Signs out current user and clears session
 *
 * @interface
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
interface AuthContextType {
  /** Current authenticated user from Supabase Auth, null if not authenticated */
  user: User | null

  /** Current Supabase session containing tokens and metadata, null if not authenticated */
  session: Session | null

  /** Loading state indicating if authentication status is being determined */
  loading: boolean

  /** Function to authenticate user with email and password */
  login: (email: string, password: string) => Promise<void>

  /** Function to sign out current user and clear authentication state */
  logout: () => Promise<void>
}

/**
 * React Context for authentication state and operations.
 *
 * Provides authentication data and functions to the entire component tree.
 * Uses undefined as default to enable proper error handling when context
 * is used outside of AuthProvider.
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Props interface for the AuthProvider component.
 *
 * @interface
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
interface AuthProviderProps {
  /** Child components that will have access to authentication context */
  readonly children: ReactNode
}

/**
 * Ensures a profile record exists for the authenticated user in the database.
 *
 * This function automatically creates user profile records when users authenticate
 * for the first time. It handles the integration between Supabase Auth and the
 * application's user profile system, ensuring data consistency.
 *
 * **Profile Creation Strategy:**
 * - Checks if profile already exists to avoid duplicates
 * - Creates profile with sensible defaults from auth metadata
 * - Handles errors gracefully without blocking authentication
 * - Runs asynchronously to avoid blocking UI
 *
 * **Data Mapping:**
 * - id: Maps directly from Supabase Auth user ID
 * - username: Derived from email prefix (before @)
 * - display_name: Uses full_name from user metadata if available
 *
 * **Error Handling:**
 * - Distinguishes between "not found" and actual errors
 * - Logs errors for debugging without throwing
 * - Continues authentication flow even if profile creation fails
 *
 * @param user - Authenticated Supabase user object
 * @returns Promise that resolves when profile check/creation is complete
 *
 * @example
 * ```typescript
 * // Called automatically during authentication flow
 * if (session?.user) {
 *   ensureProfileExists(session.user); // Non-blocking profile creation
 * }
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
async function ensureProfileExists(user: User): Promise<void> {
  try {
    console.log('🔍 ensureProfileExists called for user:', user.id, user.email);

    // Check if profile already exists to avoid duplicate creation
    // Only select 'id' field for efficiency since we just need existence check
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    console.log('📋 Profile check result:', { existingProfile, fetchError });

    // Handle fetch errors - distinguish between "not found" and actual errors
    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = "not found" error code, which is expected for new users
      // Any other error indicates a real problem that should be logged
      console.error('❌ Error checking profile:', fetchError)
      return
    }

    // If profile exists, no action needed
    if (existingProfile) {
      console.log('✅ Profile already exists, no action needed');
      return
    }

    // Validate that authenticated user has required email
    if (!user.email) {
      throw new Error('Authenticated user missing required email address')
    }

    console.log('🆕 Creating new profile for:', user.email);

    // Extract display name from metadata or use email prefix
    const fullName = user.user_metadata['full_name'] as Maybe<string>;
    const emailPrefix = user.email.split('@')[0];
    if (!emailPrefix) {
      throw new Error('Invalid email format - cannot extract prefix');
    }
    const displayName: string = fullName ?? emailPrefix;

    // Create new profile with sensible defaults from auth metadata
    const { data: insertData, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id, // Use Supabase Auth user ID as primary key
        username: user.email, // Use full email as username for guaranteed uniqueness
        display_name: displayName, // Use full name if provided, otherwise email prefix
        email: user.email, // Store email for display purposes (required field)
        role: 'player' // Default new users to player role
      })
      .select()
      .single()

    // Log profile creation errors but don't throw - authentication should continue
    if (insertError) {
      console.error('❌ Error creating profile:', insertError)
    } else {
      console.log('✅ Profile created successfully:', insertData);
    }
  } catch (error) {
    // Catch any unexpected errors and log them without blocking authentication
    console.error('❌ Error in ensureProfileExists:', error)
  }
}

/**
 * Authentication Provider component that manages auth state for the entire application.
 *
 * This component wraps the application and provides authentication context to all
 * child components. It handles Supabase Auth integration, session management,
 * and automatic profile creation for new users.
 *
 * **Key Features:**
 * - Automatic session restoration on app load
 * - Real-time authentication state updates
 * - Automatic profile creation for new users
 * - Optimized re-renders with useMemo and useCallback
 * - Comprehensive error handling
 *
 * **State Management:**
 * - Manages user, session, and loading states
 * - Provides login and logout functions
 * - Handles authentication state changes automatically
 * - Clears state properly on logout
 *
 * **Performance Optimizations:**
 * - Uses useMemo for context value to prevent unnecessary re-renders
 * - Uses useCallback for login/logout functions for stable references
 * - Minimal state updates to reduce component re-renders
 *
 * **Integration Points:**
 * - Integrates with Supabase Auth for authentication
 * - Creates user profiles in application database
 * - Provides context for all authentication-dependent components
 *
 * @param props - Component props containing children to wrap
 * @returns JSX element providing authentication context to children
 *
 * @example
 * ```typescript
 * // Wrap your app with AuthProvider
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <YourAppComponents />
 *     </AuthProvider>
 *   );
 * }
 *
 * // Use authentication in child components
 * function SomeComponent() {
 *   const { user, login, logout } = useAuth();
 *   // ... use authentication state and functions
 * }
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // Authentication state management
  const [user, setUser] = useState<User | null>(null) // Current authenticated user
  const [session, setSession] = useState<Session | null>(null) // Current session with tokens
  const [loading, setLoading] = useState(true) // Loading state during auth initialization

  useEffect(() => {
    // Initialize authentication state on component mount
    // Get any existing session from Supabase (handles page refreshes)
    void supabase.auth.getSession().then(async ({ data: { session: thisSession } }) => {
      // Update state with current session data
      setSession(thisSession)
      setUser(thisSession?.user ?? null)

      // Ensure user profile exists in database BEFORE marking auth as complete
      // This prevents race conditions where users try to join games before profile exists
      if (thisSession?.user) {
        await ensureProfileExists(thisSession.user)
      }

      setLoading(false) // Authentication state is now determined (after profile creation)
    })

    // Set up real-time authentication state listener
    // This handles login, logout, token refresh, and other auth events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, thisSession) => {
      // Update state whenever authentication changes
      setSession(thisSession)
      setUser(thisSession?.user ?? null)

      // Ensure user profile exists for newly authenticated users BEFORE marking auth as complete
      // This prevents race conditions where users try to join games before profile exists
      if (thisSession?.user) {
        await ensureProfileExists(thisSession.user)
      }

      setLoading(false) // Ensure loading is false after any auth change (after profile creation)
    })

    // Cleanup: unsubscribe from auth changes when component unmounts
    return () => { subscription.unsubscribe(); }
  }, []) // Empty dependency array - only run on mount/unmount

  // Login function with useCallback for stable reference and performance
  const login = useCallback(async (email: string, password: string) => {
    // Attempt authentication with Supabase Auth
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // Throw error to be handled by calling component
    // State updates will be handled automatically by onAuthStateChange listener
    if (error) { throw error }
  }, []) // No dependencies - function is stable

  // Logout function with useCallback for stable reference and performance
  const logout = useCallback(async () => {
    // Sign out from Supabase Auth
    const { error } = await supabase.auth.signOut()
    if (error) { throw error }

    // Clear local state immediately after successful logout
    // This ensures UI updates immediately without waiting for auth state change
    setUser(null)
    setSession(null)
  }, []) // No dependencies - function is stable

  // Memoize context value to prevent unnecessary re-renders of consuming components
  // Only re-creates value when dependencies change
  const value = useMemo(() => ({
    user,
    session,
    loading,
    login,
    logout,
  }), [user, session, loading, login, logout])

  // Provide authentication context to all child components
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Custom hook for accessing authentication context in components.
 *
 * This hook provides a convenient way to access authentication state and functions
 * from any component within the AuthProvider tree. It includes proper error handling
 * to ensure the hook is used correctly.
 *
 * **Usage Requirements:**
 * - Must be used within an AuthProvider component
 * - Provides type-safe access to authentication context
 * - Throws descriptive error if used outside provider
 *
 * **Available Properties:**
 * - user: Current authenticated user or null
 * - session: Current Supabase session or null
 * - loading: Boolean indicating if auth state is being determined
 * - login: Function to authenticate with email/password
 * - logout: Function to sign out current user
 *
 * **Performance Considerations:**
 * - Hook result is memoized to prevent unnecessary re-renders
 * - Login/logout functions have stable references via useCallback
 * - Only re-renders when authentication state actually changes
 *
 * @returns Authentication context with state and functions
 * @throws {Error} When used outside of AuthProvider
 *
 * @example
 * ```typescript
 * function LoginComponent() {
 *   const { user, login, logout, loading } = useAuth();
 *
 *   if (loading) return <div>Loading...</div>;
 *
 *   if (user) {
 *     return (
 *       <div>
 *         Welcome, {user.email}!
 *         <button onClick={logout}>Logout</button>
 *       </div>
 *     );
 *   }
 *
 *   return (
 *     <form onSubmit={(e) => {
 *       e.preventDefault();
 *       login(email, password);
 *     }}>
 *       // ... login form
 *     </form>
 *   );
 * }
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */

export function useAuth() {
  // Get authentication context
  const context = useContext(AuthContext)

  // Ensure hook is used within AuthProvider
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
