"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import useSWRInfinite from "swr/infinite"
import { Sidebar } from "@/components/sidebar"
import { MusicPlayer } from "@/components/music-player"
import { SongCard } from "@/components/song-card"
import type { Song } from "@/lib/data"
import { Input } from "@/components/ui/input"
import { Search, Loader2 } from "lucide-react"

// Simple debounce to reduce request frequency while typing
function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

const fetcher = async (url: string) => {
  console.log("Browse fetch ->", url)
  const r = await fetch(url, { cache: "no-store" })
  if (!r.ok) {
    const t = await r.text().catch(() => "")
    console.log("Browse fetch error", r.status, r.statusText, t?.slice(0, 200))
    throw new Error(`Failed: ${r.status}`)
  }
  const json = await r.json()
  console.log("Browse fetch ok, keys:", Object.keys(json || {}))
  return json
}

const MAX_PAGES = 50
const LIMIT = 20

export default function BrowsePage() {
  const [query, setQuery] = useState("")
  const debounced = useDebounced(query)

  const getKey = (index: number) => {
    const q = debounced.trim()
    if (!q) return null
    const page = index + 1
    return `/api/search?query=${encodeURIComponent(q)}&page=${page}&limit=${LIMIT}`
  }

  const { data, error, isLoading, size, setSize, isValidating } = useSWRInfinite(getKey, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  })

  // Flatten and dedupe
  const songs: Song[] = useMemo(() => {
    const pages = data || []
    const merged = pages.flatMap((p: any) => (Array.isArray(p?.songs) ? p.songs : [])) as Song[]
    const map = new Map<string, Song>()
    for (const s of merged) {
      const key = (s as any)?.id || `${s.name}|${s.artist}`
      if (!map.has(String(key))) map.set(String(key), s)
    }
    return Array.from(map.values())
  }, [data])

  const hasMore = useMemo(() => {
    const last = data?.[data.length - 1]
    return Boolean(last?.hasMore) && size < MAX_PAGES
  }, [data, size])

  const showEmpty = !debounced.trim()

  // Reset paging when query changes
  useEffect(() => {
    if (debounced.trim()) {
      // Start from first page for a new query
      setSize(1)
    }
  }, [debounced, setSize])

  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first.isIntersecting && hasMore && !isValidating) {
          // request next page
          setSize((s) => s + 1)
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, isValidating, setSize, debounced])

  const handleLoadMore = () => {
    if (!hasMore || isValidating) return
    console.log("Load more pressed, current pages:", size)
    setSize(size + 1)
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-64 flex-shrink-0 border-r border-border md:block" aria-label="Sidebar">
          <Sidebar />
        </aside>

        <main className="flex-1 overflow-y-auto pb-24">
          <div className="p-4 md:p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="mb-6 text-4xl font-bold text-balance">Browse</h1>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search for songs"
                  placeholder="Search for songs..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-12 pl-10 text-base"
                />
                {(isLoading || isValidating) && (
                  <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Empty state */}
            {showEmpty && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="mb-4 h-16 w-16 text-muted-foreground/50" />
                <h2 className="mb-2 text-2xl font-bold">Search for Songs</h2>
                <p className="text-muted-foreground">Type a song name and we'll pull all results the API provides.</p>
              </div>
            )}

            {/* Error */}
            {!showEmpty && error && (
              <div className="py-8 text-center text-sm text-destructive">
                Something went wrong while searching. Please try again.
              </div>
            )}

            {/* Results */}
            {!showEmpty && !error && (
              <>
                <div className="mb-4 text-sm text-muted-foreground">
                  {isLoading && songs.length === 0
                    ? "Loading results..."
                    : `${songs.length} result${songs.length === 1 ? "" : "s"}`}
                </div>

                {isLoading && songs.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : songs.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
                      {songs.map((song) => (
                        <SongCard key={`${song.id}-${song.name}`} song={song} songs={songs} />
                      ))}
                    </div>

                    <div ref={loadMoreRef} className="h-10" aria-hidden="true" />
                  </>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">No songs found for "{debounced}"</p>
                  </div>
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
