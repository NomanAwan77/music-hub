import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { Button, Card, CardActions, CardContent, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import type { AlbumSummary } from '../types/music'

export function AlbumCard({ album }: { album: AlbumSummary }) {
  return (
    <Card elevation={2} sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {album.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {album.artist?.userName ?? 'Unknown artist'}
        </Typography>
      </CardContent>
      <CardActions>
        <Button
          component={RouterLink}
          to={`/albums/${album._id}`}
          endIcon={<ArrowForwardIcon />}
          size="small"
        >
          Open Album
        </Button>
      </CardActions>
    </Card>
  )
}
