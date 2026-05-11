import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Box, Button, Container, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { TrackList } from '../components/TrackList'
import { NoticeAlert } from '../common/components/NoticeAlert'
import { SectionCard } from '../common/components/SectionCard'
import type { AlbumDetail } from '../types/music'

type AlbumDetailsPageProps = {
  message: string
}

export function AlbumDetailsPage({ message }: AlbumDetailsPageProps) {
  const { albumId } = useParams()
  const [album, setAlbum] = useState<AlbumDetail | null>(null)
  const [error, setError] = useState('')
  const hasAlbumId = Boolean(albumId)

  useEffect(() => {
    if (!hasAlbumId || !albumId) {
      return
    }

    const loadAlbum = async () => {
      setError('')
      try {
        const result = await apiRequest<{ album: AlbumDetail }>(`/music/api/albums/${albumId}`)
        setAlbum(result.album)
      } catch (err) {
        const text = err instanceof Error ? err.message : 'Failed to load album details'
        setError(text)
      }
    }

    void loadAlbum()
  }, [albumId, hasAlbumId])

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <NoticeAlert message={message} error={hasAlbumId ? error : 'Album ID is missing'} />
      <Stack spacing={2}>
        <Button component={RouterLink} to="/albums" variant="text" startIcon={<ArrowBackIcon />}>
          Back to Albums
        </Button>
        <SectionCard title={album?.title ?? 'Album Details'}>
          {album ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Artist: {album.artist?.userName ?? 'Unknown'}
              </Typography>
              <TrackList tracks={album.music ?? []} />
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Loading album details...
            </Typography>
          )}
        </SectionCard>
      </Stack>
    </Container>
  )
}
