import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#5b3df5',
    },
    secondary: {
      main: '#0f8dff',
    },
    background: {
      default: '#f4f6fb',
    },
  },
  shape: {
    borderRadius: 12,
  },
})

const googleClientId = import.meta.env.GOOGLE_CLIENT_ID ?? import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <GoogleOAuthProvider clientId={googleClientId}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </GoogleOAuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
