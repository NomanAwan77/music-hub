import { Alert, Stack } from '@mui/material'

type NoticeAlertProps = {
  message: string
  error: string
}

export function NoticeAlert({ message, error }: NoticeAlertProps) {
  if (!message && !error) {
    return null
  }

  return (
    <Stack spacing={2} sx={{ mb: 2 }}>
      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  )
}
