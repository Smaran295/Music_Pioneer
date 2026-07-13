"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { MusicPlayer } from "@/components/music-player"
import { getTrendingSongs } from "@/lib/api"
import type { Song } from "@/lib/data"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Play, Loader2, Menu } from "lucide-react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { usePlayerStore, useAuthStore } from "@/lib/store"
import { SongCard } from "@/components/song-card"

interface RecentlyPlayedRecord {
  id: string
  song_id: string
  song_data: Song
  played_at: string
}

export default function HomePage() {
  const router = useRouter()
  const { setCurrentSong, setQueue } = usePlayerStore()
  const { activeUser } = useAuthStore()
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([])
  const [trendingSongsEn, setTrendingSongsEn] = useState<Song[]>([])
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [checkedVisited, setCheckedVisited] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const visited = window.localStorage.getItem("mp_has_visited")
    if (!visited) {
      router.replace("/splash")
      return
    }
    setCheckedVisited(true)
  }, [router])

  useEffect(() => {
    if (!checkedVisited) return
    let cancelled = false

    const fetchHome = async () => {
      setIsLoading(true)
      try {
        const [trending, english] = await Promise.all([
          getTrendingSongs(),
          (async () => {
            const mod = await import("@/lib/api")
            return mod.getTrendingSongsEnglish()
          })(),
        ])
        if (cancelled) return
        setTrendingSongs(trending.slice(0, 6))
        setTrendingSongsEn(english.slice(0, 6))
      } catch (error) {
        console.error("Failed to load home data:", error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchHome()
    return () => {
      cancelled = true
    }
  }, [checkedVisited])

  useEffect(() => {
    if (!activeUser) {
      console.log("No active user, skipping recently played fetch")
      setRecentlyPlayed([])
      return
    }

    console.log("Fetching recently played for user:", activeUser)
    const fetchRecentlyPlayed = async () => {
      try {
        const response = await fetch("/api/recently-played?limit=6")
        console.log("Recently played response status:", response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("Recently played fetch failed:", response.status, errorText)
          return
        }

        const data = await response.json()
        console.log("Recently played data:", data)

        const records: RecentlyPlayedRecord[] = data.recently_played || []
        console.log("Recently played records count:", records.length)

        // Extract unique songs (most recent first)
        const uniqueSongs = new Map<string, Song>()
        for (const record of records) {
          if (!uniqueSongs.has(record.song_id)) {
            uniqueSongs.set(record.song_id, record.song_data)
          }
        }

        const songsToSet = Array.from(uniqueSongs.values()).slice(0, 6)
        console.log("Setting recently played songs:", songsToSet.length)
        setRecentlyPlayed(songsToSet)
      } catch (error) {
        console.error("Error fetching recently played:", error)
      }
    }

    fetchRecentlyPlayed()
  }, [activeUser])

  const handlePlaySongs = (songs: Song[]) => {
    if (songs.length > 0) {
      setCurrentSong(songs[0])
    }
  }

  if (!checkedVisited) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="hidden md:hidden sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 flex-col items-center">
          <span className="font-brand text-2xl leading-none">Music Pioneer</span>
        </div>
        <div className="h-5 w-5" aria-hidden />
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[18rem] p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-64 flex-shrink-0 border-r border-border md:block">
          <Sidebar />
        </aside>

        <main className="flex-1 overflow-y-auto pb-24">
          <div className="px-4 py-4 md:p-8">
            <section className="mb-8 md:mb-12">
              <div className="relative h-64 md:h-80 overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-accent/10 to-background shadow-[0_10px_60px_-20px_var(--color-primary),0_10px_40px_-20px_var(--color-accent)] ring-1 ring-primary/30 transition-all duration-300 hover:shadow-[0_20px_80px_-25px_var(--color-primary),0_20px_60px_-25px_var(--color-accent)]">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center md:flex-row md:items-center md:justify-between md:p-12 md:text-left">
                  <div className="max-w-xl">
                    <div className="mb-2 font-brand text-lg md:text-xl text-foreground/90">Music Pioneer</div>
                    <h1 className="mb-3 text-3xl font-bold text-balance md:mb-4 md:text-5xl">
                      <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                        Discover Your Sound
                      </span>
                    </h1>
                    <p className="mb-5 text-base text-muted-foreground text-pretty md:mb-6 md:text-lg">
                      Stream millions of songs, create playlists, and explore new artists in cosmic style
                    </p>
                    <Button
                      size="lg"
                      className="gap-x-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                      onClick={() => handlePlaySongs(trendingSongs)}
                    >
                      <Play className="h-5 w-5" />
                      Start Listening
                    </Button>
                  </div>
                  <div className="relative hidden h-56 w-56 md:block md:h-64 md:w-64">
                    <Image
                      src="/music-headphones.jpg"
                      alt="Music"
                      fill
                      className="object-contain drop-shadow-[0_0_30px_var(--color-primary)]"
                    />
                  </div>
                </div>
              </div>
            </section>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {activeUser && recentlyPlayed.length > 0 && (
                  <section className="mb-10 md:mb-12">
                    <div className="mb-4 flex items-center justify-between md:mb-6">
                      <h2 className="text-2xl font-bold md:text-3xl">
                        <span className="mr-3 inline-block h-6 w-1 rounded bg-gradient-to-b from-accent to-primary align-middle" />
                        Recently Played
                      </h2>
                      <Button variant="ghost" size="sm" onClick={() => router.push("/recently-played")}>
                        View All
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
                      {recentlyPlayed.map((song) => (
                        <SongCard key={song.id} song={song} songs={recentlyPlayed} />
                      ))}
                    </div>
                  </section>
                )}

                {trendingSongs.length > 0 && (
                  <section className="mb-10 md:mb-12">
                    <div className="mb-4 flex items-center justify-between md:mb-6">
                      <h2 className="text-2xl font-bold md:text-3xl">
                        <span className="mr-3 inline-block h-6 w-1 rounded bg-gradient-to-b from-accent to-primary align-middle" />
                        Popular Hindi Songs
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
                      {trendingSongs.map((song) => (
                        <SongCard key={song.id} song={song} songs={trendingSongs} />
                      ))}
                    </div>
                  </section>
                )}

                {trendingSongsEn.length > 0 && (
                  <section className="mb-10 md:mb-12">
                    <div className="mb-4 flex items-center justify-between md:mb-6">
                      <h2 className="text-2xl font-bold md:text-3xl">
                        <span className="mr-3 inline-block h-6 w-1 rounded bg-gradient-to-b from-accent to-primary align-middle" />
                        Popular English Songs
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
                      {trendingSongsEn.map((song) => (
                        <SongCard key={song.id} song={song} songs={trendingSongsEn} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </main>
      </div>
      <MusicPlayer />
    </div>
  )
}
