import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import Select from 'react-select'
import { apiRequest } from '../api/client'
import { SectionCard } from '../common/components/SectionCard'
import type { MusicItem } from '../types/music'
import './ArtistTools.css'

type MusicOption = {
  value: string
  label: string
}

type ArtistToolsProps = {
  tracks: MusicItem[]
  loading: boolean
  setLoading: (loading: boolean) => void
  onMessage: (message: string) => void
  onError: (message: string) => void
  onSuccessRefresh: () => Promise<void>
}

export function ArtistTools({
  tracks,
  loading,
  setLoading,
  onMessage,
  onError,
  onSuccessRefresh,
}: ArtistToolsProps) {
  const [musicTitle, setMusicTitle] = useState('')
  const [musicFile, setMusicFile] = useState<File | null>(null)
  const [albumTitle, setAlbumTitle] = useState('')
  const [selectedTracks, setSelectedTracks] = useState<MusicOption[]>([])

  const musicOptions = useMemo<MusicOption[]>(
    () =>
      tracks.map((track) => ({
        value: track._id,
        label: track.title,
      })),
    [tracks],
  )

  const onUploadMusic = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!musicFile) {
      onError('Please select a music file')
      return
    }
    setLoading(true)
    onError('')
    try {
      const formData = new FormData()
      formData.append('title', musicTitle)
      formData.append('music', musicFile)

      const result = await apiRequest<{ message: string }>('/music/api/upload', {
        method: 'POST',
        body: formData,
      })

      setMusicTitle('')
      setMusicFile(null)
      onMessage(result.message)
      await onSuccessRefresh()
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Music upload failed'
      onError(text)
    } finally {
      setLoading(false)
    }
  }

  const onCreateAlbum = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedTracks.length) {
      onError('Please select at least one track')
      return
    }
    setLoading(true)
    onError('')
    try {
      const selectedTrackIds = selectedTracks.map((track) => track.value)

      const result = await apiRequest<{ message: string }>('/music/api/album/create', {
        method: 'POST',
        body: JSON.stringify({
          title: albumTitle,
          music: selectedTrackIds,
        }),
      })

      setAlbumTitle('')
      setSelectedTracks([])
      onMessage(result.message)
      await onSuccessRefresh()
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Album creation failed'
      onError(text)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack spacing={2}>
      <SectionCard title="Upload Music">
        <Box component="form" onSubmit={onUploadMusic}>
          <Stack spacing={2}>
            <TextField
              label="Track Title"
              value={musicTitle}
              onChange={(e) => setMusicTitle(e.target.value)}
              required
              fullWidth
            />
            <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>
              {musicFile ? musicFile.name : 'Choose music file'}
              <input
                hidden
                type="file"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setMusicFile(event.target.files?.[0] ?? null)
                }
              />
            </Button>
            <Button variant="contained" type="submit" disabled={loading}>
              Upload
            </Button>
          </Stack>
        </Box>
      </SectionCard>

      <SectionCard title="Create Album">
        <Box component="form" onSubmit={onCreateAlbum}>
          <Stack spacing={2}>
            <TextField
              label="Album Title"
              value={albumTitle}
              onChange={(e) => setAlbumTitle(e.target.value)}
              required
              fullWidth
            />
            <Box>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                Select tracks
              </Typography>
              <Select
                isMulti
                classNamePrefix="music-select"
                options={musicOptions}
                value={selectedTracks}
                onChange={(value) => setSelectedTracks(value as MusicOption[])}
                placeholder="Choose tracks for this album..."
                noOptionsMessage={() => 'No tracks available'}
                menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                menuPosition="fixed"
              />
            </Box>
            <Button variant="contained" type="submit" disabled={loading}>
              Create Album
            </Button>
          </Stack>
        </Box>
      </SectionCard>
      <Typography variant="caption" color="text.secondary">
        Tip: upload tracks first, then select them here for album creation.
      </Typography>
    </Stack>
  )
}
