import { createContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { UserInfo } from '../types/music'

type AuthContextValue = {
  user: UserInfo | null
  setUser: (user: UserInfo | null) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)

  const value = useMemo(() => ({ user, setUser }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
