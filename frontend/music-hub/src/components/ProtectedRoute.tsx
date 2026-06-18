import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { ReactNode } from 'react'
import { Box, CircularProgress } from '@mui/material'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth()
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }
  return <>{children}</>
}
