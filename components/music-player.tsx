"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Volume2,
  VolumeX,
  Heart,
  Download,
  Maximize2,
  ListMusic,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { usePlayerStore, useLibraryStore } from "@/lib/store"
import { formatDuration } from "@/lib/data"
import { cn, getImageSrc } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { getSongDetails } from "@/lib/api"
import { Progress } from "@/components/ui/progress"
import { createWebAudioEngine } from "@/lib/webaudio"
import { QueueDrawer } from "@/components/queue-drawer"

const USE_WEB_AUDIO = true // toggle to force Web Audio playback

export function MusicPlayer() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    volume,
    repeat,
    shuffle,
    setIsPlaying,
    setCurrentTime,
    setVolume,
    setRepeat,
    setShuffle,
    playNext,
    playPrevious,
    setCurrentSong,
    isExpanded,
    setIsExpanded,
    setShowQueue,
    trackSongPlay,
  } = usePlayerStore()

  const { isFavorite, addFavorite, removeFavorite } = useLibraryStore()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const webAudioRef = useRef<ReturnType<typeof createWebAudioEngine> | null>(null)
  const timeTickerRef = useRef<number | null>(null)
  const lastSentTsRef = useRef<number>(0)
  const lastSentTimeRef = useRef<number>(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null)
  const downloadAbortRef = useRef<AbortController | null>(null)
  const downloadReaderRef = useRef<ReadableStreamDefaultReader | null>(null)
  const [lyrics, setLyrics] = useState<string>("")
  const [lyricsLoading, setLyricsLoading] = useState(false)
  const [lyricsError, setLyricsError] = useState<string | null>(null)
  const lastLyricsKeyRef = useRef<string>("")
  const [activeTab, setActiveTab] = useState<"now" | "lyrics">("now")
  const isPlayingRef = useRef(isPlaying)
  const endFiredRef = useRef(false)

  useEffect(() => {
    isPlayingRef.current = isPlaying
    // reset end flag when play toggles; avoids stuck state
    endFiredRef.current = false
  }, [isPlaying])

  useEffect(() => {
    if (!USE_WEB_AUDIO) {
      // existing HTMLAudioElement setup
      if (typeof window !== "undefined") {
        audioRef.current = new Audio()
        audioRef.current.volume = volume

        // Update current time as audio plays
        const handleTimeUpdate = () => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime)
          }
        }

        // Handle song end
        const handleEnded = () => {
          if (currentSong) {
            trackSongPlay(currentSong, audioRef.current?.currentTime || 0)
          }

          if (repeat === "one") {
            audioRef.current?.play()
          } else if (repeat === "all") {
            playNext()
          } else {
            setIsPlaying(false)
            playNext()
          }
        }

        const handleError = (e: Event) => {
          console.error("Audio playback error:", e)
          if (audioRef.current?.error) {
            console.error("Playback failed:", audioRef.current.error.message)
          }
          setIsPlaying(false)
        }

        audioRef.current.addEventListener("timeupdate", handleTimeUpdate)
        audioRef.current.addEventListener("ended", handleEnded)
        audioRef.current.addEventListener("error", handleError)

        return () => {
          if (audioRef.current) {
            audioRef.current.removeEventListener("timeupdate", handleTimeUpdate)
            audioRef.current.removeEventListener("ended", handleEnded)
            audioRef.current.removeEventListener("error", handleError)
            audioRef.current.pause()
            audioRef.current = null
          }
        }
      }
      return
    }

    webAudioRef.current = createWebAudioEngine()
    webAudioRef.current.setVolume(volume)

    const tick = () => {
      const engine = webAudioRef.current
      if (engine) {
        const t = engine.getCurrentTime()
        const now = typeof performance !== "undefined" ? performance.now() : Date.now()
        // 10fps cadence with a small meaningful-change threshold for smoother UI
        if (now - lastSentTsRef.current > 100 && Math.abs(t - lastSentTimeRef.current) >= 0.02) {
          setCurrentTime(t)
          lastSentTsRef.current = now
          lastSentTimeRef.current = t
        }
        const dur = engine.getDuration()
        if (isPlayingRef.current && dur > 0 && t >= dur - 0.05 && !endFiredRef.current) {
          endFiredRef.current = true
          if (currentSong) {
            trackSongPlay(currentSong, t)
          }

          if (repeat === "one") {
            engine.seek(0)
            engine.play()
            endFiredRef.current = false
          } else {
            if (repeat === "all") {
              playNext()
            } else {
              setIsPlaying(false)
            }
            // allow re-trigger on the next track
            setTimeout(() => {
              endFiredRef.current = false
            }, 300)
          }
        }
      }
      timeTickerRef.current = window.requestAnimationFrame(tick)
    }
    timeTickerRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (timeTickerRef.current) cancelAnimationFrame(timeTickerRef.current)
      timeTickerRef.current = null
      webAudioRef.current?.dispose()
      webAudioRef.current = null
    }
  }, [volume, setCurrentTime, currentSong, trackSongPlay, repeat, playNext, setIsPlaying])

  useEffect(() => {
    if (!currentSong) return
    endFiredRef.current = false
    const looksLikeWebpage =
      !currentSong.url ||
      currentSong.url.includes("jiosaavn.com/song/") ||
      (!currentSong.url.endsWith(".mp3") &&
        !currentSong.url.endsWith(".mp4") &&
        !currentSong.url.includes("aac.saavncdn.com"))

    if (looksLikeWebpage) {
      ;(async () => {
        try {
          console.log("Resolving playable URL for current song...")
          const idOrUrl = (currentSong as any).id || (currentSong as any).perma_url || (currentSong as any).url

          const detailed = await getSongDetails(idOrUrl)
          const resolvedUrl = detailed?.url

          if (
            resolvedUrl &&
            !resolvedUrl.includes("jiosaavn.com/song/") &&
            (resolvedUrl.endsWith(".mp3") || resolvedUrl.endsWith(".mp4") || resolvedUrl.includes("aac.saavncdn.com"))
          ) {
            console.log("Resolved playable URL, updating current song")
            setCurrentSong({
              ...currentSong,
              url: resolvedUrl,
              downloadUrl: detailed?.downloadUrl ?? (currentSong as any).downloadUrl,
            } as any)
          } else {
            console.error("Could not resolve a playable audio URL")
            setIsPlaying(false)
            toast({
              title: "Playback unavailable",
              description: "This track doesn't provide a direct audio stream.",
            })
          }
        } catch (err: any) {
          console.error("Error resolving playable URL:", err?.message || err)
          setIsPlaying(false)
          toast({
            title: "Playback failed",
            description: "We couldn't load a valid audio stream for this track.",
          })
        }
      })()
      return
    }

    if (USE_WEB_AUDIO) {
      ;(async () => {
        try {
          await webAudioRef.current?.load(currentSong.url)
          if (isPlayingRef.current) {
            webAudioRef.current?.play()
          } else {
            setCurrentTime(0)
          }
        } catch (e: any) {
          console.error("WebAudio load failed:", e?.message || e)
          setIsPlaying(false)
        }
      })()
    } else {
      if (!audioRef.current) return
      audioRef.current.src = currentSong.url
      audioRef.current.load()
      if (isPlayingRef.current) {
        audioRef.current.play().catch((error) => {
          console.error("Playback failed:", error.message)
          setIsPlaying(false)
        })
      } else {
        setCurrentTime(0)
      }
    }
  }, [currentSong])

  useEffect(() => {
    if (USE_WEB_AUDIO) {
      if (isPlaying) {
        webAudioRef.current?.play()
      } else {
        webAudioRef.current?.pause()
      }
      return
    }
    // HTMLAudioElement path
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.play().catch((error) => {
        console.error("Playback failed:", error.message)
        setIsPlaying(false)
      })
    } else {
      audioRef.current.pause()
    }
  }, [isPlaying, setIsPlaying])

  useEffect(() => {
    if (USE_WEB_AUDIO) {
      webAudioRef.current?.setVolume(volume)
      return
    }
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  useEffect(() => {
    const title = (currentSong?.name || (currentSong as any)?.title || "").trim()
    const artist = (currentSong?.artist || (currentSong as any)?.artist || "").trim()
    const key = `${title}__${artist}`

    // fetch only when in lyrics tab and song present
    if (activeTab !== "lyrics" || !title) return
    if (lastLyricsKeyRef.current === key && lyrics) return

    async function loadLyrics() {
      setLyrics("")
      setLyricsError(null)
      setLyricsLoading(true)
      lastLyricsKeyRef.current = key

      const qs = new URLSearchParams()
      qs.set("title", title)
      if (artist) qs.set("artist", artist)

      try {
        const res = await fetch(`/api/lyrics?${qs.toString()}`, { cache: "no-store" })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j?.error || `Lyrics HTTP ${res.status}`)
        }
        const j = await res.json()
        const text = j?.lyrics as string
        if (text && text.trim().length) {
          setLyrics(text)
        } else {
          setLyricsError("Lyrics not found.")
        }
      } catch (err) {
        setLyricsError(err instanceof Error ? err.message : "Failed to load lyrics.")
      } finally {
        setLyricsLoading(false)
      }
    }

    loadLyrics()
  }, [activeTab, currentSong])

  const handleSeek = (value: number[]) => {
    if (!currentSong) return
    if (USE_WEB_AUDIO) {
      webAudioRef.current?.seek(value[0])
      setCurrentTime(value[0])
      return
    }
    if (audioRef.current) {
      audioRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
  }

  const toggleRepeat = () => {
    const modes: Array<"off" | "one" | "all"> = ["off", "one", "all"]
    const currentIndex = modes.indexOf(repeat)
    const nextIndex = (currentIndex + 1) % modes.length
    setRepeat(modes[nextIndex])
  }

  const toggleFavorite = () => {
    if (!currentSong) return
    if (isFavorite(currentSong.id)) {
      removeFavorite(currentSong.id)
    } else {
      addFavorite(currentSong)
    }
  }

  const handleDownload = async () => {
    if (!currentSong) return
    if (!currentSong.url || currentSong.url.includes("jiosaavn.com/song/")) {
      console.error("Cannot download: Invalid audio URL")
      toast({ title: "Download unavailable", description: "This song does not have a valid audio file link." })
      return
    }
    if (isDownloading) return

    try {
      setIsDownloading(true)
      setDownloadProgress(0)
      setDownloadStatus("Starting...")

      toast({ title: "Starting download", description: `${currentSong.name} — ${currentSong.artist}` })

      const controller = new AbortController()
      downloadAbortRef.current = controller

      const proxyUrl = `/api/download?url=${encodeURIComponent(
        currentSong.url,
      )}&filename=${encodeURIComponent(`${currentSong.name} - ${currentSong.artist}.mp3`)}`

      const response = await fetch(proxyUrl, { cache: "no-store", signal: controller.signal })
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`)
      }

      const contentLengthHeader = response.headers.get("Content-Length") || response.headers.get("content-length")
      const total = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : Number.NaN
      const reader = response.body?.getReader()
      const chunks: Uint8Array[] = []
      let received = 0

      downloadReaderRef.current = reader || null

      if (!reader) {
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = blobUrl
        a.download = `${currentSong.name} - ${currentSong.artist}.mp3`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(blobUrl)
      } else {
        while (true) {
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
        downloadReaderRef.current = null
        const blob = new Blob(chunks, { type: "audio/mpeg" })
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = blobUrl
        a.download = `${currentSong.name} - ${currentSong.artist}.mp3`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(blobUrl)
      }

      setDownloadProgress(100)
      setDownloadStatus("Completed")
      toast({ title: "Download complete", description: `${currentSong.name} — ${currentSong.artist}` })

      setTimeout(() => {
        setIsDownloading(false)
        setDownloadProgress(0)
        setDownloadStatus(null)
        downloadAbortRef.current = null
        downloadReaderRef.current = null
      }, 1500)
    } catch (error: any) {
      if (error?.name === "AbortError") {
        console.log("Download canceled by user")
        setDownloadStatus("Cancelled")
        toast({ title: "Download cancelled", description: `${currentSong.name} — ${currentSong.artist}` })
        downloadAbortRef.current = null
        // keep isDownloading true so the popup stays, user can dismiss manually
      } else {
        console.error("Download failed:", error)
        toast({ title: "Download failed", description: error instanceof Error ? error.message : "Unknown error" })
        setIsDownloading(false)
        setDownloadProgress(0)
        setDownloadStatus(null)
        downloadAbortRef.current = null
        downloadReaderRef.current = null
      }
    }
  }

  const handleCancelDownload = () => {
    if (downloadAbortRef.current) {
      setDownloadStatus("Cancelling...")
      downloadAbortRef.current.abort()
    }
    downloadReaderRef.current?.cancel().catch(() => {})
  }

  const handleDismissDownload = () => {
    setIsDownloading(false)
    setDownloadProgress(0)
    setDownloadStatus(null)
    downloadAbortRef.current = null
    downloadReaderRef.current = null
  }

  if (!currentSong) {
    return (
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex h-24 items-center justify-center">
          <p className="text-sm text-muted-foreground">No song playing</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {isDownloading && (
        <div
          className="fixed right-4 top-4 z-[60] w-80 rounded-md border bg-background p-4 shadow-lg"
          role="status"
          aria-live="polite"
        >
          <div className="mb-1 text-sm font-medium">Downloading “{currentSong.name}”</div>
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

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="pointer-events-none relative h-0.5 w-full overflow-hidden md:hidden" aria-hidden="true">
          <div
            className="bg-primary h-full transition-[width] duration-200 ease-linear"
            style={{
              width: `${Math.min(100, Math.max(0, (currentTime / (currentSong?.duration || 1)) * 100))}%`,
            }}
          />
        </div>
        <div className="flex h-24 items-center gap-x-4 px-4">
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="flex min-w-0 flex-1 items-center gap-x-3 text-left focus:outline-none"
            aria-label="Expand player"
          >
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md">
              <Image
                src={getImageSrc(currentSong.image) || "/placeholder.svg"}
                alt={currentSong.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{currentSong.name}</p>
              <p className="truncate text-sm text-muted-foreground">{currentSong.artist}</p>
            </div>
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            onClick={() => setIsExpanded(true)}
            aria-label="Maximize player"
          >
            <Maximize2 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={toggleFavorite}>
            <Heart className={cn("h-5 w-5", isFavorite(currentSong.id) && "fill-accent text-accent")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            onClick={handleDownload}
            disabled={!currentSong.url || currentSong.url.includes("jiosaavn.com/song/")}
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            onClick={() => setShowQueue(true)}
            aria-label="Open queue"
          >
            <ListMusic className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-x-3 md:hidden">
            <Button variant="ghost" size="icon" onClick={playPrevious} aria-label="Previous">
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={playNext} aria-label="Next">
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          <div className="hidden flex-1 flex-col items-center gap-y-2 md:flex">
            <div className="flex items-center gap-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShuffle(!shuffle)}
                className={cn(shuffle && "text-primary")}
              >
                <Shuffle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={playPrevious}>
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button
                variant="default"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={playNext}>
                <SkipForward className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleRepeat}
                className={cn(repeat !== "off" && "text-primary")}
              >
                <Repeat className="h-4 w-4" />
                {repeat === "one" && <span className="absolute text-[10px] font-bold">1</span>}
              </Button>
            </div>
            <div className="flex w-full max-w-md items-center gap-x-2">
              <span className="text-xs text-muted-foreground">{formatDuration(Math.floor(currentTime))}</span>
              <Slider
                value={[currentTime]}
                max={currentSong.duration}
                step={1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground">{formatDuration(currentSong.duration)}</span>
            </div>
          </div>

          <div className="hidden min-w-0 flex-1 items-center justify-end gap-x-2 md:flex">
            <Button variant="ghost" size="icon" onClick={() => setVolume(volume === 0 ? 0.7 : 0)}>
              {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
            <Slider value={[volume]} max={1} step={0.01} onValueChange={handleVolumeChange} className="w-24" />
          </div>
        </div>
      </div>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-4xl md:max-w-5xl gap-6 bg-background/95 backdrop-blur">
          <DialogHeader>
            <DialogTitle className="text-2xl">{currentSong.name}</DialogTitle>
            <DialogDescription className="text-muted-foreground">{currentSong.artist}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-4">
              <div
                className={cn(
                  "relative h-64 w-64 overflow-hidden rounded-full border-4 border-primary/40 shadow-xl motion-reduce:animate-none",
                  isPlaying ? "animate-spin" : "",
                )}
                style={
                  isPlaying
                    ? {
                        animationDuration: "180s",
                        animationTimingFunction: "linear",
                        animationIterationCount: "infinite",
                      }
                    : {}
                }
                aria-label="Album art spinning like a CD"
              >
                <Image
                  src={getImageSrc(currentSong.image) || "/placeholder.svg"}
                  alt={currentSong.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 m-auto h-8 w-8 rounded-full border-4 border-background/90 bg-background/80" />
              </div>

              <div className="flex w-full items-center justify-center gap-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShuffle(!shuffle)}
                  className={cn(shuffle && "text-primary")}
                  aria-label="Shuffle"
                >
                  <Shuffle className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={playPrevious} aria-label="Previous">
                  <SkipBack className="h-6 w-6" />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={() => setIsPlaying(!isPlaying)}
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={playNext} aria-label="Next">
                  <SkipForward className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleRepeat}
                  className={cn(repeat !== "off" && "text-primary")}
                  aria-label="Repeat"
                >
                  <Repeat className="h-5 w-5" />
                  {repeat === "one" && <span className="absolute text-[10px] font-bold">1</span>}
                </Button>
              </div>

              <div className="flex w-full items-center gap-x-2">
                <span className="text-xs text-muted-foreground">{formatDuration(Math.floor(currentTime))}</span>
                <Slider value={[currentTime]} max={currentSong.duration} step={1} onValueChange={handleSeek} />
                <span className="text-xs text-muted-foreground">{formatDuration(currentSong.duration)}</span>
              </div>

              <div className="flex w-full items-center justify-center gap-x-2">
                <Button variant="ghost" size="icon" onClick={() => setVolume(volume === 0 ? 0.7 : 0)}>
                  {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
                <Slider value={[volume]} max={1} step={0.01} onValueChange={handleVolumeChange} className="max-w-sm" />
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={toggleFavorite} aria-label="Toggle favorite">
                  <Heart className={cn("h-5 w-5", isFavorite(currentSong.id) && "fill-accent text-accent")} />
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleDownload}
                  disabled={!currentSong.url || currentSong.url.includes("jiosaavn.com/song/")}
                  aria-label="Download"
                >
                  <Download className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="w-full">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "now" | "lyrics")} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="now">Now Playing</TabsTrigger>
                  <TabsTrigger value="lyrics">Lyrics</TabsTrigger>
                </TabsList>

                <TabsContent value="now" className="pt-4">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="mb-2 text-sm text-muted-foreground">Album</p>
                    <p className="mb-4 font-semibold">{currentSong.album || "Unknown Album"}</p>
                    <p className="text-sm text-muted-foreground">Artist</p>
                    <p className="font-medium">{currentSong.artist}</p>
                  </div>
                </TabsContent>

                <TabsContent value="lyrics" className="pt-4">
                  <div className="h-64 overflow-y-auto rounded-lg border border-border bg-card p-4">
                    <p className="mb-2 text-sm text-muted-foreground">
                      Lyrics for:{" "}
                      <span className="font-medium text-foreground">
                        {currentSong.name || (currentSong as any)?.title}
                      </span>{" "}
                      —{" "}
                      <span className="font-medium text-foreground">
                        {currentSong.artist || (currentSong as any)?.artist}
                      </span>
                    </p>

                    {lyricsLoading && <p className="text-sm text-muted-foreground">Loading lyrics...</p>}
                    {!lyricsLoading && lyricsError && (
                      <p className="text-sm text-destructive">Unable to load lyrics: {lyricsError}</p>
                    )}
                    {!lyricsLoading && !lyricsError && lyrics && (
                      <pre className="whitespace-pre-wrap break-words text-sm leading-6">{lyrics}</pre>
                    )}
                    {!lyricsLoading && !lyricsError && !lyrics && (
                      <p className="text-sm text-muted-foreground">No lyrics available.</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <QueueDrawer />
    </>
  )
}
