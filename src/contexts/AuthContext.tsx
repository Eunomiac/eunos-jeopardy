import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../services/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  readonly children: ReactNode
}

/**
 * Ensure a profile record exists for the authenticated user
 */
async function ensureProfileExists(user: User): Promise<void> {
  try {
    // Check if profile already exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = "not found", which is expected for new users
      console.error('Error checking profile:', fetchError)
      return
    }

    if (existingProfile) {
      // Profile already exists
      return
    }

    // Create new profile
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        username: user.email?.split('@')[0] || null,
        display_name: user.user_metadata?.full_name || null
      })

    if (insertError) {
      console.error('Error creating profile:', insertError)
    }
  } catch (error) {
    console.error('Error in ensureProfileExists:', error)
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: thisSession } }) => {
      setSession(thisSession)
      setUser(thisSession?.user ?? null)
      setLoading(false)

      // Create profile in background (non-blocking)
      if (thisSession?.user) {
        ensureProfileExists(thisSession.user)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, thisSession) => {
      setSession(thisSession)
      setUser(thisSession?.user ?? null)
      setLoading(false)

      // Create profile in background (non-blocking)
      if (thisSession?.user) {
        ensureProfileExists(thisSession.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) { throw error }
  }, [])

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) { throw error }

    // Clear local state immediately after successful logout
    setUser(null)
    setSession(null)
  }, [])

  const value = useMemo(() => ({
    user,
    session,
    loading,
    login,
    logout,
  }), [user, session, loading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
