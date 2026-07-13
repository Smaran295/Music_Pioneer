export type WebAudioEngine = {
  load: (url: string) => Promise<void>
  play: () => void
  pause: () => void
  stop: () => void
  seek: (seconds: number) => void
  setVolume: (v: number) => void
  getCurrentTime: () => number
  getDuration: () => number
  isReady: () => boolean
  dispose: () => void
}

export function createWebAudioEngine(): WebAudioEngine {
  const AudioCtx = typeof window !== "undefined" ? window.AudioContext || (window as any).webkitAudioContext : null
  let ctx: AudioContext | null = AudioCtx ? new AudioCtx() : null
  let gain: GainNode | null = ctx ? ctx.createGain() : null
  let buffer: AudioBuffer | null = null
  let source: AudioBufferSourceNode | null = null

  // tracking state for currentTime calculations
  let startedAt = 0 // ctx.currentTime when started
  let pausedAt = 0 // seconds into buffer when paused
  let playing = false

  if (ctx && gain) {
    gain.connect(ctx.destination)
  }

  const ensureCtx = () => {
    if (!ctx || !gain) {
      const CtxAny = (window as any).AudioContext || (window as any).webkitAudioContext
      ctx = new CtxAny()
      gain = ctx.createGain()
      gain.connect(ctx.destination)
    }
  }

  const stopSource = () => {
    if (source) {
      try {
        source.onended = null
        source.stop(0)
      } catch {}
      source.disconnect()
      source = null
    }
  }

  const getCurrentTime = () => {
    if (!ctx) return 0
    if (!playing) return pausedAt
    return pausedAt + (ctx.currentTime - startedAt)
  }

  const getDuration = () => {
    return buffer?.duration ?? 0
  }

  const playInternal = (offset: number) => {
    if (!ctx || !buffer || !gain) return
    stopSource()
    source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(gain)
    startedAt = ctx.currentTime
    pausedAt = offset
    playing = true
    source.onended = () => {
      // when track ends, mark not playing but keep pausedAt at duration
      playing = false
      pausedAt = buffer ? buffer.duration : 0
    }
    try {
      source.start(0, offset)
    } catch {
      // ignore start errors (e.g. out-of-range offsets)
    }
  }

  return {
    async load(url: string) {
      if (typeof window === "undefined") return
      ensureCtx()
      playing = false
      pausedAt = 0
      startedAt = 0
      stopSource()
      buffer = null

      const res = await fetch(url, { cache: "no-store" })
      const arr = await res.arrayBuffer()

      if (!ctx) ensureCtx()
      if (!ctx) throw new Error("AudioContext unavailable")

      buffer = await ctx.decodeAudioData(arr.slice(0))
    },
    play() {
      if (!buffer) return
      // Some browsers require resume() before audio plays after user gesture
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {})
      }
      playInternal(pausedAt)
    },
    pause() {
      if (!buffer) return
      // compute where we are and stop
      const t = getCurrentTime()
      pausedAt = Math.min(t, buffer.duration)
      playing = false
      stopSource()
    },
    stop() {
      pausedAt = 0
      playing = false
      stopSource()
    },
    seek(seconds: number) {
      if (!buffer) return
      const clamped = Math.max(0, Math.min(seconds, buffer.duration))
      if (!playing) {
        pausedAt = clamped
      } else {
        playInternal(clamped)
      }
    },
    setVolume(v: number) {
      if (gain) {
        gain.gain.value = Math.max(0, Math.min(v, 1))
      }
    },
    getCurrentTime,
    getDuration,
    isReady() {
      return !!buffer
    },
    dispose() {
      stopSource()
      buffer = null
      if (ctx) {
        try {
          ctx.close()
        } catch {}
      }
      ctx = null
      gain = null
    },
  }
}
