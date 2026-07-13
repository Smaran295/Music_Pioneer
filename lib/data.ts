import type { Song as APISong, Album as APIAlbum, Artist as APIArtist } from "./api"

// Re-export API types for backward compatibility
export type Song = APISong
export type Artist = APIArtist
export type Album = APIAlbum

export interface Playlist {
  id: string
  name: string
  description: string
  coverUrl: string
  songs: Song[]
  isPublic: boolean
  createdAt: Date
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}
