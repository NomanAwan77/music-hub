import LogoutIcon from '@mui/icons-material/Logout'
import QueueMusicIcon from '@mui/icons-material/QueueMusic'
import { AppBar, Box, Button, Chip, IconButton, Stack, Toolbar, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import type { UserInfo } from '../../types/music'

type AppShellProps = {
  user: UserInfo | null
  onLogout?: () => void
  children: ReactNode
}

export function AppShell({ user, onLogout, children }: AppShellProps) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6fb' }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <QueueMusicIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Music Hub
          </Typography>
          {user && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Button color="inherit" component={RouterLink} to="/albums" size="small">
                Albums
              </Button>
              <Button color="inherit" component={RouterLink} to="/artists" size="small">
                Artists
              </Button>
              <Chip color="secondary" label={user.role.toUpperCase()} size="small" />
              <Typography variant="body2">{user.name}</Typography>
              {onLogout && (
                <IconButton color="inherit" onClick={onLogout}>
                  <LogoutIcon />
                </IconButton>
              )}
            </Stack>
          )}
        </Toolbar>
      </AppBar>
      {children}
    </Box>
  )
}
