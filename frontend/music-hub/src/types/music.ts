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
