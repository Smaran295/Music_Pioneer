"use client"

import type React from "react"
import { useState, useRef } from "react"
import Image from "next/image"
import { Play, Heart, Download, MoreVertical, Plus, ListMusic, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Song } from "@/lib/data"
import { usePlayerStore, useLibraryStore } from "@/lib/store"
import { cn, getImageSrc } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface SongCardProps {
  song: Song
  songs?: Song[]
}

const handleAddToPlaylist = (playlistId: string, e: React.MouseEvent) => {
  // Local helper function to handle adding song to playlist
  // Implementation details here
}

export function SongCard({ song, songs = [] }: SongCardProps) {
  const { setCurrentSong, setQueue, currentSong, isPlaying, setIsExpanded, addToQueue, setShowQueue } = usePlayerStore()
  const { isFavorite, addFavorite, removeFavorite, playlists, addToPlaylist } = useLibraryStore()
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<number>(0)
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null)
  const downloadAbortRef = useRef<AbortController | null>(null)
  const downloadReaderRef = useRef<ReadableStreamDefaultReader | null>(null)

  const isCurrentSong = currentSong?.id === song.id

  const handlePlay = () => {
    setCurrentSong(song)
    setQueue([song])
  }

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isFavorite(song.id)) {
      removeFavorite(song.id)
    } else {
      addFavorite(song)
    }
  }

  const handleDownload = async () => {
    if (!song.url || song.url.includes("jiosaavn.com/song/")) {
      console.error("Cannot download: Invalid audio URL")
      toast({
        title: "Download unavailable",
        description: "This song does not have a valid audio file link.",
      })
      return
    }
    if (isDownloading) return

    toast({ title: "Starting download", description: `${song.name} — ${song.artist}` })
    setIsDownloading(true)
    setDownloadProgress(0)
    setDownloadStatus("Starting...")

    try {
      const controller = new AbortController()
      downloadAbortRef.current = controller

      const proxyUrl = `/api/download?url=${encodeURIComponent(song.url)}&filename=${encodeURIComponent(
        `${song.name} - ${song.artist}.mp3`,
      )}`

      const response = await fetch(proxyUrl, { cache: "no-store", signal: controller.signal })
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`)
      }

      const contentLengthHeader = response.headers.get("Content-Length") || response.headers.get("content-length")
      const total = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : Number.NaN
      const reader = response.body?.getReader()
      const chunks: Uint8Array[] = []
      let received = 0

      // Store reader
      downloadReaderRef.current = reader || null

      if (!reader) {
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = blobUrl
        link.download = `${song.name} - ${song.artist}.mp3`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(blobUrl)
      } else {
        while (true) {
          // Guard for abort signal
          if (controller.signal.aborted) break
          const { done, value } = await reader.read()
          if (done) break
          if (value) {
            chunks.push(value)
            received += value.length
            if (!Number.isNaN(total) && total > 0) {
              const pct = Math.max(0, Math.min(100, Math.round((received / total) * 100)))
              setDownloadProgress(pct)
              setDownloadStatus(`${pct}%`)
            } else {
              const pct = Math.max(0, Math.min(99, Math.round(received / 100000)))
              setDownloadProgress(pct)
              setDownloadStatus("Downloading...")
            }
          }
        }
        // Clear reader before finalizing
        downloadReaderRef.current = null
        const blob = new Blob(chunks, { type: "audio/mpeg" })
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = blobUrl
        link.download = `${song.name} - ${song.artist}.mp3`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(blobUrl)
      }

      setDownloadProgress(100)
      setDownloadStatus("Completed")
      toast({ title: "Download complete", description: `${song.name} — ${song.artist}` })
      setTimeout(() => {
        setIsDownloading(false)
        setDownloadStatus(null)
        setDownloadProgress(0)
        downloadAbortRef.current = null
        downloadReaderRef.current = null
      }, 1500)
    } catch (error: any) {
      if (error?.name === "AbortError") {
        console.log("Download canceled by user")
        // Keep popup visible and show Cancelled status
        setDownloadStatus("Cancelled")
        toast({ title: "Download cancelled", description: `${song.name} — ${song.artist}` })
        downloadAbortRef.current = null
        // Keep isDownloading true until user dismisses
      } else {
        console.error("Download error:", error)
        toast({ title: "Download failed", description: error instanceof Error ? error.message : "Unknown error" })
        setIsDownloading(false)
        setDownloadStatus(null)
        setDownloadProgress(0)
        downloadAbortRef.current = null
        downloadReaderRef.current = null
      }
    }
  }

  // Call both abort and reader.cancel
  const handleCancelDownload = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (downloadAbortRef.current) {
      setDownloadStatus("Cancelling...")
      downloadAbortRef.current.abort()
    }
    downloadReaderRef.current?.cancel().catch(() => {})
  }

  // Manual dismiss after cancel
  const handleDismissDownload = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setIsDownloading(false)
    setDownloadStatus(null)
    setDownloadProgress(0)
    downloadAbortRef.current = null
    downloadReaderRef.current = null
  }

  const handleAddToQueue = (e?: React.MouseEvent) => {
    e?.stopPropagation?.()
    const added = addToQueue(song)
    toast({
      title: added ? "Added to queue" : "Already in queue",
      description: `${song.name} — ${song.artist}`,
    })
  }

  return (
    <Card
      className="group relative cursor-pointer overflow-hidden transition-colors hover:bg-accent/50"
      onClick={handlePlay}
    >
      {/* Replaced Lyrics badge */}
      {/* Maximize sign so new users discover the lyrics/expanded player */}
      {/* Removed the absolute-positioned maximize button that was on the artwork */}

      {/* Mobile: compact row list item */}
      <div className="flex items-center gap-3 p-3 md:hidden">
        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md">
          <Image src={getImageSrc(song.image) || "/placeholder.svg"} alt={song.name} fill className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={cn("truncate font-semibold", isCurrentSong && isPlaying && "text-primary")}>{song.name}</h3>
          <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
        </div>
        <Button
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={(e) => {
            e.stopPropagation()
            handlePlay()
          }}
          aria-label="Play"
        >
          <Play className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite()
          }}
          aria-label={isFavorite(song.id) ? "Remove from Favorites" : "Add to Favorites"}
        >
          <Heart className={cn("h-4 w-4", isFavorite(song.id) && "fill-accent text-accent")} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation()
            setCurrentSong(song)
            setQueue([song])
            setIsExpanded(true)
          }}
          aria-label="Expand mini player"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" aria-label="More options">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={toggleFavorite}>
              <Heart className={cn("mr-2 h-4 w-4", isFavorite(song.id) && "fill-accent text-accent")} />
              {isFavorite(song.id) ? "Remove from Favorites" : "Add to Favorites"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                handleAddToQueue()
              }}
            >
              <ListMusic className="mr-2 h-4 w-4" />
              Add to Queue
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Plus className="mr-2 h-4 w-4" />
                Add to Playlist
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {playlists.length === 0 ? (
                  <DropdownMenuItem disabled>No playlists available</DropdownMenuItem>
                ) : (
                  playlists.map((playlist) => (
                    <DropdownMenuItem key={playlist.id} onClick={(e) => handleAddToPlaylist(playlist.id, e)}>
                      <ListMusic className="mr-2 h-4 w-4" />
                      {playlist.name}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                handleDownload()
              }}
              disabled={!song.url || song.url.includes("jiosaavn.com/song/") || isDownloading}
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? "Downloading..." : "Download"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop: original tile/card */}
      <div className="hidden md:block">
        <div className="p-4">
          <div className="relative mb-4 aspect-square overflow-hidden rounded-md">
            <Image
              src={getImageSrc(song.image) || "/placeholder.svg"}
              alt={song.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />
            <Button
              size="icon"
              className="absolute bottom-2 right-2 h-12 w-12 rounded-full opacity-0 shadow-lg transition-all group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                handlePlay()
              }}
            >
              <Play className="h-5 w-5" />
            </Button>
          </div>
          <div className="space-y-1">
            <h3 className={cn("truncate font-semibold", isCurrentSong && isPlaying && "text-primary")}>{song.name}</h3>
            <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
          </div>
          <div className="mt-2 flex items-center gap-x-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFavorite} aria-label="Favorite">
              <Heart className={cn("h-4 w-4", isFavorite(song.id) && "fill-accent text-accent")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation()
                setCurrentSong(song)
                setQueue([song])
                setIsExpanded(true)
              }}
              aria-label="Expand mini player"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" aria-label="More options">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    handleAddToQueue()
                  }}
                >
                  <ListMusic className="mr-2 h-4 w-4" />
                  Add to Queue
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Plus className="mr-2 h-4 w-4" />
                    Add to Playlist
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {playlists.length === 0 ? (
                      <DropdownMenuItem disabled>No playlists available</DropdownMenuItem>
                    ) : (
                      playlists.map((playlist) => (
                        <DropdownMenuItem key={playlist.id} onClick={(e) => handleAddToPlaylist(playlist.id, e)}>
                          <ListMusic className="mr-2 h-4 w-4" />
                          {playlist.name}
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    handleDownload()
                  }}
                  disabled={!song.url || song.url.includes("jiosaavn.com/song/") || isDownloading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isDownloading ? "Downloading..." : "Download"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {isDownloading && (
        <div
          className="pointer-events-auto absolute right-2 top-2 z-[5] w-64 rounded-md border bg-background p-3 shadow-lg"
          role="status"
          aria-live="polite"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-1 truncate text-xs font-medium">Downloading “{song.name}”</div>
          <Progress value={downloadProgress} />
          <div className="mt-1 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">{downloadStatus || "Starting..."}</div>
            {downloadStatus === "Cancelled" ? (
              <Button variant="secondary" size="sm" onClick={handleDismissDownload}>
                Dismiss
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={handleCancelDownload}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
