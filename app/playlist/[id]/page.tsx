"use client"

import { Sidebar } from "@/components/sidebar"
import { MusicPlayer } from "@/components/music-player"
import { useLibraryStore, usePlayerStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Play, Trash2, ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { formatDuration } from "@/lib/data"
import { notFound } from "next/navigation"
import { getImageSrc } from "@/lib/utils"

export default function PlaylistPage({ params }: { params: { id: string } }) {
  const { id } = params
  const { playlists, removeFromPlaylist } = useLibraryStore()
  const { setCurrentSong, setQueue } = usePlayerStore()

  const playlist = playlists.find((p) => p.id === id)

  if (!playlist) {
    notFound()
  }

  const handlePlayPlaylist = () => {
    if (playlist.songs.length > 0) {
      setCurrentSong(playlist.songs[0])
      setQueue(playlist.songs)
    }
  }

  const handlePlaySong = (index: number) => {
    setCurrentSong(playlist.songs[index])
    setQueue(playlist.songs)
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-64 flex-shrink-0 border-r border-border md:block">
          <Sidebar />
        </aside>
        <main className="flex-1 overflow-y-auto pb-24">
          <div className="p-4 md:p-8">
            <Link href="/library">
              <Button variant="ghost" className="mb-6 gap-x-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Library
              </Button>
            </Link>

            {/* Playlist Header */}
            <div className="mb-8 flex items-end gap-x-6">
              <div className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                {playlist.songs.length > 0 ? (
                  <Image
                    src={getImageSrc(playlist.songs[0]?.image || playlist.coverUrl) || "/placeholder.svg"}
                    alt={playlist.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-6xl font-bold text-muted-foreground">♪</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Playlist</p>
                <h1 className="mb-4 text-5xl font-bold text-balance">{playlist.name}</h1>
                <p className="mb-4 text-muted-foreground">{playlist.description}</p>
                <p className="text-sm text-muted-foreground">{playlist.songs.length} songs</p>
              </div>
            </div>

            {/* Play Button */}
            {playlist.songs.length > 0 && (
              <div className="mb-6">
                <Button size="lg" className="gap-x-2" onClick={handlePlayPlaylist}>
                  <Play className="h-5 w-5" />
                  Play All
                </Button>
              </div>
            )}

            {/* Songs List */}
            {playlist.songs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="mb-4 text-lg text-muted-foreground">No songs in this playlist</p>
                <Link href="/browse">
                  <Button>Browse Music</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {playlist.songs.map((song, index) => (
                  <div
                    key={song.id}
                    className="group flex items-center gap-x-4 rounded-md p-2 transition-colors hover:bg-accent/50"
                  >
                    <button
                      className="flex w-8 items-center justify-center text-muted-foreground group-hover:text-foreground"
                      onClick={() => handlePlaySong(index)}
                    >
                      <span className="group-hover:hidden">{index + 1}</span>
                      <Play className="hidden h-4 w-4 group-hover:block" />
                    </button>
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded">
                      <Image
                        src={getImageSrc(song.image) || "/placeholder.svg"}
                        alt={song.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{song.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{song.album}</p>
                    <p className="text-sm text-muted-foreground">{formatDuration(song.duration)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => removeFromPlaylist(playlist.id, song.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      <MusicPlayer />
    </div>
  )
}
