import { Container } from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthForm } from '../components/AuthForm'
import { NoticeAlert } from '../common/components/NoticeAlert'
import { SectionCard } from '../common/components/SectionCard'
import { useAuth } from '../hooks/useAuth'

type AuthPageProps = {
  message: string
  setMessage: (value: string) => void
}

export function AuthPage({ message, setMessage }: AuthPageProps) {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <NoticeAlert message={message} error={error} />
      <SectionCard title="Authentication">
        <AuthForm
          loading={loading}
          setLoading={setLoading}
          onError={(text) => {
            setError(text)
            setMessage('')
          }}
          onAuthSuccess={(user, successText) => {
            setUser(user)
            setMessage(successText)
            setError('')
            navigate('/albums')
          }}
        />
      </SectionCard>
    </Container>
  )
}
