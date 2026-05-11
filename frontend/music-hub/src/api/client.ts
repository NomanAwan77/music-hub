import type { ApiErrorPayload } from '../types/music'

const apiBase = ''

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers ?? {}),
    },
  })

  const data = (await response.json().catch(() => ({}))) as ApiErrorPayload

  if (!response.ok) {
    throw new Error(data.message ?? 'Request failed')
  }

  return data as T
}
