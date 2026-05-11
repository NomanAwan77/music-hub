import { Box, Button, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { UserInfo, UserRole } from '../types/music'
import { apiRequest } from '../api/client'

type AuthFormProps = {
  onAuthSuccess: (user: UserInfo, message: string) => void
  onError: (message: string) => void
  setLoading: (loading: boolean) => void
  loading: boolean
}

export function AuthForm({ onAuthSuccess, onError, setLoading, loading }: AuthFormProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registerRole, setRegisterRole] = useState<UserRole>('user')

  const intro = useMemo(
    () =>
      authMode === 'login'
        ? 'Sign in with username or email and password.'
        : 'Create a new account and choose user or artist role.',
    [authMode],
  )

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onError('')
    setLoading(true)
    try {
      if (authMode === 'login') {
        const payload = emailOrUsername.includes('@')
          ? { userEmail: emailOrUsername, password }
          : { userName: emailOrUsername, password }
        const result = await apiRequest<{ message: string; user: UserInfo }>('/auth/api/login', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        onAuthSuccess(result.user, result.message)
      } else {
        const result = await apiRequest<{ message: string; user: UserInfo }>('/auth/api/register', {
          method: 'POST',
          body: JSON.stringify({
            userName: registerName,
            userEmail: registerEmail,
            password,
            role: registerRole,
          }),
        })
        onAuthSuccess(result.user, result.message)
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Authentication failed'
      onError(text)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Welcome to Music Hub
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {intro}
      </Typography>
      <Tabs value={authMode} onChange={(_, value: 'login' | 'register') => setAuthMode(value)}>
        <Tab value="login" label="Login" />
        <Tab value="register" label="Register" />
      </Tabs>
      <Box component="form" onSubmit={onSubmit} sx={{ mt: 3 }}>
        {authMode === 'login' ? (
          <Stack spacing={2}>
            <TextField
              label="Username or Email"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
          </Stack>
        ) : (
          <Stack spacing={2}>
            <TextField
              label="Username"
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
            <Tabs value={registerRole} onChange={(_, value: UserRole) => setRegisterRole(value)}>
              <Tab value="user" label="User" />
              <Tab value="artist" label="Artist" />
            </Tabs>
          </Stack>
        )}
        <Button type="submit" variant="contained" sx={{ mt: 3 }} disabled={loading}>
          Continue
        </Button>
      </Box>
    </Box>
  )
}
