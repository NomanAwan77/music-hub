import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { apiRequest } from '../api/client'

type ChatMessage = {
  role: 'assistant' | 'user'
  content: string
}

const initialMessages: ChatMessage[] = [
  {
    role: 'assistant',
    content: 'Hi! Welcome. How can I help you today?',
  },
]
const maxHistoryMessages = 10

export function AIReceptionist() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, open])

  const onSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = input.trim()

    if (!text || loading) {
      return
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
    }
    const history = messages.slice(-maxHistoryMessages)

    setMessages((currentMessages) => [...currentMessages, userMessage])
    setInput('')
    setLoading(true)

    try {
      const result = await apiRequest<{ reply: string }>('/api/receptionist/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          history,
        }),
      })

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: 'assistant',
          content: result.reply,
        },
      ])
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.message
          : 'AI receptionist is unavailable right now'

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: 'assistant',
          content: errorText,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button
        variant="contained"
        startIcon={<ChatBubbleOutlineIcon />}
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          right: { xs: 16, sm: 24 },
          bottom: { xs: 16, sm: 24 },
          zIndex: 1400,
          borderRadius: 999,
          px: 2,
          py: 1.2,
          boxShadow: 4,
        }}
      >
        AI Receptionist
      </Button>
    )
  }

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        right: { xs: 16, sm: 24 },
        bottom: { xs: 16, sm: 24 },
        zIndex: 1400,
        width: { xs: 'calc(100vw - 32px)', sm: 360 },
        maxWidth: 380,
        height: { xs: 480, sm: 520 },
        maxHeight: 'calc(100vh - 32px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <ChatBubbleOutlineIcon fontSize="small" />
        <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 700 }}>
          AI Receptionist
        </Typography>
        <IconButton
          color="inherit"
          size="small"
          onClick={() => setOpen(false)}
          aria-label="Close AI Receptionist"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2,
          bgcolor: '#f4f6fb',
        }}
      >
        <Stack spacing={1.5}>
          {messages.map((message, index) => {
            const isUser = message.role === 'user'

            return (
              <Box
                key={`${message.role}-${index}`}
                sx={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                }}
              >
                <Box
                  sx={{
                    maxWidth: '82%',
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: isUser ? 'primary.main' : 'background.paper',
                    color: isUser ? 'primary.contrastText' : 'text.primary',
                    boxShadow: 1,
                    overflowWrap: 'anywhere',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <Typography variant="body2">{message.content}</Typography>
                </Box>
              </Box>
            )
          })}
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Typing...
              </Typography>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Stack>
      </Box>

      <Box component="form" onSubmit={onSendMessage} sx={{ p: 1.5, bgcolor: 'background.paper' }}>
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <TextField
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type your message..."
            size="small"
            fullWidth
            multiline
            maxRows={3}
            disabled={loading}
          />
          <IconButton
            type="submit"
            color="primary"
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            <SendIcon />
          </IconButton>
        </Stack>
      </Box>
    </Paper>
  )
}
