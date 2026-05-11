import LibraryMusicIcon from '@mui/icons-material/LibraryMusic'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../api/client'
import { AlbumCard } from '../components/AlbumCard'
import { ArtistTools } from '../components/ArtistTools'
import { TrackList } from '../components/TrackList'
import { NoticeAlert } from '../common/components/NoticeAlert'
import { SectionCard } from '../common/components/SectionCard'
import { useAuth } from '../hooks/useAuth'
import type { AlbumSummary, MusicItem } from '../types/music'

type AlbumsPageProps = {
  message: string
  setMessage: (value: string) => void
}

export function AlbumsPage({ message, setMessage }: AlbumsPageProps) {
  const { user } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [albums, setAlbums] = useState<AlbumSummary[]>([])
  const [music, setMusic] = useState<MusicItem[]>([])

  const loadMusicAndAlbums = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [musicRes, albumsRes] = await Promise.all([
        apiRequest<{ music: MusicItem[] }>('/music/api/music'),
        apiRequest<{ album: AlbumSummary[] }>('/music/api/albums'),
      ])
      setMusic(musicRes.music ?? [])
      setAlbums(albumsRes.album ?? [])
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Unable to fetch albums'
      setError(text)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMusicAndAlbums()
  }, [loadMusicAndAlbums])

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <NoticeAlert message={message} error={error} />
      <Stack spacing={3}>
        <SectionCard title="Albums">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography color="text.secondary">Browse all albums and open details.</Typography>
            <Button
              variant="outlined"
              onClick={() => void loadMusicAndAlbums()}
              startIcon={<RefreshIcon />}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          {loading ? (
            <Box sx={{ py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 2,
              }}
            >
              {albums.map((album) => (
                <AlbumCard key={album._id} album={album} />
              ))}
            </Box>
          )}
          {!loading && albums.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No albums found yet.
            </Typography>
          )}
        </SectionCard>

        <SectionCard title="All Tracks">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <LibraryMusicIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
            Global track listing from your backend.
          </Typography>
          <TrackList tracks={music} />
        </SectionCard>

        {user?.role === 'artist' && (
          <ArtistTools
            tracks={music}
            loading={loading}
            setLoading={setLoading}
            onMessage={setMessage}
            onError={setError}
            onSuccessRefresh={loadMusicAndAlbums}
          />
        )}
      </Stack>
    </Container>
  )
}
