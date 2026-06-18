import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { apiRequest } from '../api/client'
import { NoticeAlert } from '../common/components/NoticeAlert'
import { SectionCard } from '../common/components/SectionCard'
import { useAuth } from '../hooks/useAuth'
import type { ArtistInfo, BookingInfo, BookingSlot } from '../types/music'

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function formatSlotTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

type ArtistsPageProps = {
  message: string
  setMessage: (value: string) => void
}

export function ArtistsPage({ message, setMessage }: ArtistsPageProps) {
  const { user } = useAuth()
  const [artists, setArtists] = useState<ArtistInfo[]>([])
  const [selectedArtist, setSelectedArtist] = useState<ArtistInfo | null>(null)
  const [slots, setSlots] = useState<BookingSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null)
  const [myBookings, setMyBookings] = useState<BookingInfo[]>([])
  const [date, setDate] = useState(getTodayInputValue())
  const [bookingName, setBookingName] = useState(user?.name ?? '')
  const [bookingEmail, setBookingEmail] = useState(user?.email ?? '')
  const [bookingMessage, setBookingMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)

  const calendarStatus = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('calendar')
  }, [])

  const loadArtists = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await apiRequest<{ artists: ArtistInfo[] }>('/api/artists')
      setArtists(result.artists)
      setSelectedArtist((currentArtist) => {
        if (!currentArtist) {
          return result.artists[0] ?? null
        }
        return result.artists.find((artist) => artist.id === currentArtist.id) ?? result.artists[0] ?? null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch artists')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadBookings = useCallback(async () => {
    try {
      const result = await apiRequest<{ bookings: BookingInfo[] }>('/api/bookings/my')
      setMyBookings(result.bookings)
    } catch (err) {
      console.error('Unable to fetch bookings:', err)
    }
  }, [])

  const loadSlots = useCallback(async () => {
    if (!selectedArtist) {
      return
    }

    setSlotsLoading(true)
    setSelectedSlot(null)
    setError('')
    try {
      const result = await apiRequest<{ slots: BookingSlot[] }>(
        `/api/artists/${selectedArtist.id}/slots?date=${date}`,
      )
      setSlots(result.slots)
    } catch (err) {
      setSlots([])
      setError(err instanceof Error ? err.message : 'Unable to fetch slots')
    } finally {
      setSlotsLoading(false)
    }
  }, [date, selectedArtist])

  useEffect(() => {
    void loadArtists()
    void loadBookings()
  }, [loadArtists, loadBookings])

  useEffect(() => {
    void loadSlots()
  }, [loadSlots])

  useEffect(() => {
    if (user) {
      setBookingName((currentName) => currentName || user.name)
      setBookingEmail((currentEmail) => currentEmail || user.email)
    }
  }, [user])

  const connectCalendar = () => {
    window.location.href = '/api/calendar/google/connect'
  }

  const bookSlot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedArtist || !selectedSlot) {
      setError('Please select an artist and time slot')
      return
    }

    setBookingLoading(true)
    setError('')
    try {
      const result = await apiRequest<{ message: string }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          artistId: selectedArtist.id,
          userName: bookingName,
          userEmail: bookingEmail,
          message: bookingMessage,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
        }),
      })
      setMessage(result.message)
      setBookingMessage('')
      await loadSlots()
      await loadBookings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to book this slot')
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <NoticeAlert message={message} error={error} />
      {calendarStatus === 'connected' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Google Calendar connected successfully.
        </Alert>
      )}
      {calendarStatus && calendarStatus !== 'connected' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Calendar connection status: {calendarStatus}
        </Alert>
      )}

      <Stack spacing={3}>
        <SectionCard title="Artists">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => void loadArtists()}
              disabled={loading}
            >
              Refresh
            </Button>
            {user?.role === 'artist' && (
              <Button variant="contained" startIcon={<CalendarMonthIcon />} onClick={connectCalendar}>
                Connect Google Calendar
              </Button>
            )}
          </Stack>

          {loading ? (
            <CircularProgress size={24} />
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 2,
              }}
            >
              {artists.map((artist) => (
                <Button
                  key={artist.id}
                  variant={selectedArtist?.id === artist.id ? 'contained' : 'outlined'}
                  onClick={() => setSelectedArtist(artist)}
                  sx={{
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    minHeight: 100,
                    p: 2,
                    textAlign: 'left',
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1">{artist.name}</Typography>
                    <Typography variant="body2">{artist.email}</Typography>
                    <Chip
                      label={artist.calendarConnected ? 'Calendar connected' : 'No calendar'}
                      color={artist.calendarConnected ? 'success' : 'default'}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Button>
              ))}
            </Box>
          )}
        </SectionCard>

        <SectionCard title="Book A Slot">
          {selectedArtist ? (
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1">{selectedArtist.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedArtist.calendarConnected
                      ? 'Choose an available time below.'
                      : 'This artist has not connected Google Calendar yet.'}
                  </Typography>
                </Box>
                <TextField
                  label="Date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  disabled={!selectedArtist.calendarConnected}
                />
              </Stack>

              <Divider />

              {slotsLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {slots.map((slot) => (
                    <Button
                      key={slot.startTime}
                      variant={selectedSlot?.startTime === slot.startTime ? 'contained' : 'outlined'}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {formatSlotTime(slot.startTime)}
                    </Button>
                  ))}
                  {selectedArtist.calendarConnected && slots.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No slots found for this date.
                    </Typography>
                  )}
                </Box>
              )}

              <Box component="form" onSubmit={bookSlot}>
                <Stack spacing={2}>
                  <TextField
                    label="Your Name"
                    value={bookingName}
                    onChange={(event) => setBookingName(event.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Your Email"
                    type="email"
                    value={bookingEmail}
                    onChange={(event) => setBookingEmail(event.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Message"
                    value={bookingMessage}
                    onChange={(event) => setBookingMessage(event.target.value)}
                    fullWidth
                    multiline
                    minRows={2}
                  />
                  <Button type="submit" variant="contained" disabled={!selectedSlot || bookingLoading}>
                    Book Selected Slot
                  </Button>
                </Stack>
              </Box>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Select an artist to see slots.
            </Typography>
          )}
        </SectionCard>

        <SectionCard title="My Bookings">
          {myBookings.length ? (
            <Stack spacing={1}>
              {myBookings.map((booking) => (
                <Box key={booking.id}>
                  <Typography variant="body2">
                    {booking.artist.name} - {formatSlotTime(booking.startTime)}
                  </Typography>
                  {booking.message && (
                    <Typography variant="caption" color="text.secondary">
                      {booking.message}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              You have no bookings yet.
            </Typography>
          )}
        </SectionCard>
      </Stack>
    </Container>
  )
}
