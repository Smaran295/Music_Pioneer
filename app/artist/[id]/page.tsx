"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { MusicPlayer } from "@/components/music-player"
import { SongCard } from "@/components/song-card"
import { getArtistDetails } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Play, ArrowLeft, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePlayerStore } from "@/lib/store"
import { notFound } from "next/navigation"
import { getImageSrc } from "@/lib/utils"

export default function ArtistPage({ params }: { params: { id: string } }) {
  const { id } = params
  const { setCurrentSong, setQueue } = usePlayerStore()
  const [artist, setArtist] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFoundError, setNotFoundError] = useState(false)

  useEffect(() => {
    async function loadArtist() {
      setIsLoading(true)
      try {
        const artistData = await getArtistDetails(id)
        if (!artistData) {
          setNotFoundError(true)
        } else {
          setArtist(artistData)
        }
      } catch (error) {
        console.error("Failed to load artist:", error)
        setNotFoundError(true)
      } finally {
        setIsLoading(false)
      }
    }
    loadArtist()
  }, [id])

  if (notFoundError) {
    notFound()
  }

  if (isLoading || !artist) {
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

  const handlePlayArtist = () => {
    if (artist.songs && artist.songs.length > 0) {
      setCurrentSong(artist.songs[0])
      setQueue(artist.songs)
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-64 flex-shrink-0 border-r border-border md:block">
          <Sidebar />
        </aside>
        <main className="flex-1 overflow-y-auto pb-24">
          <div className="p-4 md:p-8">
            <Link href="/browse">
              <Button variant="ghost" className="mb-6 gap-x-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Browse
              </Button>
            </Link>

            {/* Artist Header */}
            <div className="mb-8 flex items-end gap-x-6">
              <div className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-full shadow-2xl">
                <Image
                  src={getImageSrc(artist.image) || "/placeholder.svg"}
                  alt={artist.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Artist</p>
                <h1 className="mb-4 text-5xl font-bold text-balance">{artist.name}</h1>
                {artist.songs && <p className="text-sm text-muted-foreground">{artist.songs.length} songs</p>}
              </div>
            </div>

            {/* Play Button */}
            {artist.songs && artist.songs.length > 0 && (
              <div className="mb-6">
                <Button size="lg" className="gap-x-2" onClick={handlePlayArtist}>
                  <Play className="h-5 w-5" />
                  Play All
                </Button>
              </div>
            )}

            {/* Songs Grid */}
            {artist.songs && artist.songs.length > 0 && (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
                {artist.songs.map((song: any) => (
                  <SongCard key={song.id} song={song} songs={artist.songs} />
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
