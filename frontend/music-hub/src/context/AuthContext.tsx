import { createContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { apiRequest } from '../api/client'
import type { UserInfo } from '../types/music'

type AuthContextValue = {
  user: UserInfo | null
  loading: boolean
  setUser: (user: UserInfo | null) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const result = await apiRequest<{ user: UserInfo }>('/auth/api/me')
        setUser(result.user)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    void loadCurrentUser()
  }, [])

  const value = useMemo(() => ({ user, loading, setUser }), [loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
