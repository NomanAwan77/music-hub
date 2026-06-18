export type UserRole = 'user' | 'artist'

export type UserInfo = {
  name: string
  email: string
  role: UserRole
}

export type ApiErrorPayload = {
  message?: string
}

export type MusicItem = {
  _id: string
  title: string
  uri: string
  artist?: {
    _id: string
    userName?: string
    userEmail?: string
  }
}

export type AlbumSummary = {
  _id: string
  title: string
  artist?: {
    _id: string
    userName?: string
    userEmail?: string
  }
}

export type AlbumDetail = {
  _id: string
  title: string
  artist?: {
    _id: string
    userName?: string
    userEmail?: string
  }
  music: MusicItem[]
}

export type ArtistInfo = {
  id: string
  name: string
  email: string
  calendarConnected: boolean
  calendarEmail?: string
}

export type BookingSlot = {
  startTime: string
  endTime: string
}

export type BookingInfo = {
  id: string
  artist: {
    id: string
    name: string
    email: string
  }
  startTime: string
  endTime: string
  message?: string
  status: 'confirmed' | 'cancelled'
}
