"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { MusicPlayer } from "@/components/music-player"
import { getAlbumDetails } from "@/lib/api"
import type { Album } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { Play, Heart, MoreHorizontal, ArrowLeft, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePlayerStore, useLibraryStore } from "@/lib/store"
import { formatDuration } from "@/lib/data"
import { notFound } from "next/navigation"
import { cn, getImageSrc } from "@/lib/utils"

export default function AlbumPage({ params }: { params: { id: string } }) {
  const { id } = params
  const { setCurrentSong, setQueue } = usePlayerStore()
  const { isFavorite, addFavorite, removeFavorite } = useLibraryStore()
  const [album, setAlbum] = useState<Album | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFoundError, setNotFoundError] = useState(false)

  useEffect(() => {
    async function loadAlbum() {
      setIsLoading(true)
      try {
        const albumData = await getAlbumDetails(id)
        if (!albumData) {
          setNotFoundError(true)
        } else {
          setAlbum(albumData)
        }
      } catch (error) {
        console.error("Failed to load album:", error)
        setNotFoundError(true)
      } finally {
        setIsLoading(false)
      }
    }
    loadAlbum()
  }, [id])

  if (notFoundError) {
    notFound()
  }

  if (isLoading || !album) {
    return (
      <div className="flex h-screen flex-col">
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-64 flex-shrink-0 border-r border-border">
            <Sidebar />
          </aside>
          <main className="flex-1 overflow-y-auto pb-24">
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </main>
        </div>
        <MusicPlayer />
      </div>
    )
  }

  const handlePlayAlbum = () => {
    if (album.songs && album.songs.length > 0) {
      setCurrentSong(album.songs[0])
      setQueue(album.songs)
    }
  }

  const handlePlaySong = (index: number) => {
    if (album.songs) {
      setCurrentSong(album.songs[index])
      setQueue(album.songs)
    }
  }

  const toggleFavorite = (songId: string) => {
    if (isFavorite(songId)) {
      removeFavorite(songId)
    } else {
      addFavorite(songId)
    }
  }

  const totalDuration = album.songs?.reduce((acc, song) => acc + song.duration, 0) || 0

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 flex-shrink-0 border-r border-border">
          <Sidebar />
        </aside>
        <main className="flex-1 overflow-y-auto pb-24">
          <div className="p-8">
            <Link href="/browse?tab=albums">
              <Button variant="ghost" className="mb-6 gap-x-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Browse
              </Button>
            </Link>

            {/* Album Header */}
            <div className="mb-8 flex items-end gap-x-6">
              <div className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-lg shadow-2xl">
                <Image
                  src={getImageSrc(album.image) || "/placeholder.svg"}
                  alt={album.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Album</p>
                <h1 className="mb-4 text-5xl font-bold text-balance">{album.name}</h1>
                <div className="flex items-center gap-x-2 text-sm">
                  <span className="font-semibold">{album.artist}</span>
                  {album.year && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{album.year}</span>
                    </>
                  )}
                  {album.songs && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{album.songs.length} songs</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{formatDuration(totalDuration)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mb-6 flex items-center gap-x-4">
              <Button size="lg" className="gap-x-2" onClick={handlePlayAlbum}>
                <Play className="h-5 w-5" />
                Play
              </Button>
            </div>

            {/* Songs List */}
            {album.songs && album.songs.length > 0 && (
              <div className="space-y-2">
                {album.songs.map((song, index) => (
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
                    <p className="text-sm text-muted-foreground">{formatDuration(song.duration)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => toggleFavorite(song.id)}
                    >
                      <Heart className={cn("h-4 w-4", isFavorite(song.id) && "fill-accent text-accent")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
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
