"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { MusicPlayer } from "@/components/music-player"
import { SongCard } from "@/components/song-card"
import type { Song } from "@/lib/data"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent } from "@/components/ui/sheet"

interface RecentlyPlayedRecord {
  id: string
  song_id: string
  song_data: Song
  played_at: string
  duration_played: number
}

export default function RecentlyPlayedPage() {
  const router = useRouter()
  const { activeUser } = useAuthStore()
  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!activeUser) {
      router.push("/sign-in")
      return
    }

    const fetchRecentlyPlayed = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/recently-played?limit=50")

        if (!response.ok) {
          console.error("Failed to fetch recently played")
          return
        }

        const data = await response.json()
        const records: RecentlyPlayedRecord[] = data.recently_played || []

        // Extract unique songs (most recent first)
        const uniqueSongs = new Map<string, Song>()
        for (const record of records) {
          if (!uniqueSongs.has(record.song_id)) {
            uniqueSongs.set(record.song_id, record.song_data)
          }
        }

        setSongs(Array.from(uniqueSongs.values()))
      } catch (error) {
        console.error("Error fetching recently played:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecentlyPlayed()
  }, [activeUser, router])

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear your recently played history?")) return

    try {
      // Delete all records by deleting each song
      for (const song of songs) {
        await fetch("/api/recently-played", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId: song.id }),
        })
      }

      setSongs([])
    } catch (error) {
      console.error("Error clearing history:", error)
    }
  }

  if (!activeUser) {
    return null
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="hidden md:hidden sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
          <span className="sr-only">Menu</span>
        </Button>
        <div className="flex min-w-0 flex-col items-center">
          <span className="font-brand text-2xl leading-none">Recently Played</span>
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
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-balance">Recently Played</h1>
                <p className="mt-2 text-muted-foreground">
                  {songs.length} song{songs.length !== 1 ? "s" : ""}
                </p>
              </div>
              {songs.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearHistory} className="gap-2 bg-transparent">
                  <Trash2 className="h-4 w-4" />
                  Clear History
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : songs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 text-6xl">🎵</div>
                <h2 className="mb-2 text-2xl font-bold">No Recently Played Songs</h2>
                <p className="text-muted-foreground">Start playing songs to see them appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
                {songs.map((song) => (
                  <SongCard key={song.id} song={song} songs={songs} />
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
