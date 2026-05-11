import { Button, List, ListItem, ListItemText, Typography } from '@mui/material'
import type { MusicItem } from '../types/music'

export function TrackList({ tracks }: { tracks: MusicItem[] }) {
  if (tracks.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No tracks available.
      </Typography>
    )
  }

  return (
    <List dense>
      {tracks.map((track) => (
        <ListItem key={track._id} divider>
          <ListItemText
            primary={track.title}
            secondary={track.artist?.userName ? `${track.artist.userName}` : track.uri}
          />
          {track.uri && (
            <Button href={track.uri} target="_blank" rel="noreferrer" size="small">
              Open
            </Button>
          )}
        </ListItem>
      ))}
    </List>
  )
}
