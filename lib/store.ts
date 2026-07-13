"use client"

import { create } from "zustand"
import { persist, type StateStorage } from "zustand/middleware"
import type { Song, Playlist } from "./data"
import { getSupabaseBrowser } from "@/lib/supabase/client"

interface AuthUser {
  email: string
  password?: string
  displayName?: string
}
interface AuthState {
  activeUser: string | null
  users: Record<string, AuthUser>
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  syncSupabaseUser: () => Promise<void>
}

let supabaseAuthUnsub: (() => void) | null = null

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      activeUser: null,
      users: {},
      signUp: async (email, password, displayName) => {
        try {
          const supabase = getSupabaseBrowser()
          if (!supabase?.auth) {
            throw new Error("Supabase auth not available")
          }
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo:
                process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`,
              data: { displayName: displayName || email.split("@")[0] },
            },
          })
          if (error) throw new Error(error.message)
          await get().syncSupabaseUser()
        } catch (error) {
          console.error("Sign up error:", error)
          throw error
        }
      },
      signIn: async (email, password) => {
        try {
          const supabase = getSupabaseBrowser()
          if (!supabase?.auth) {
            throw new Error("Supabase auth not available")
          }
          const { error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw new Error(error.message)
          await get().syncSupabaseUser()
        } catch (error) {
          console.error("Sign in error:", error)
          throw error
        }
      },
      signOut: async () => {
        try {
          const supabase = getSupabaseBrowser()
          if (!supabase?.auth) {
            throw new Error("Supabase auth not available")
          }
          await supabase.auth.signOut()
          set({ activeUser: null })
        } catch (error) {
          console.error("Sign out error:", error)
          throw error
        }
      },
      syncSupabaseUser: async () => {
        try {
          const supabase = getSupabaseBrowser()
          if (!supabase?.auth) {
            console.log("Supabase auth not available, skipping sync")
            set({ activeUser: null })
            return
          }

          const { data, error } = await supabase.auth.getUser()
          console.log("syncSupabaseUser: getUser result - error:", error?.message, "user:", data?.user?.email)

          if (!error && data?.user?.email) {
            const userEmail = data.user.email.toLowerCase()
            console.log("syncSupabaseUser: Setting activeUser to", userEmail)
            set({ activeUser: userEmail })
          } else {
            console.log("syncSupabaseUser: No user found, setting activeUser to null")
            set({ activeUser: null })
          }

          if (!supabaseAuthUnsub) {
            console.log("syncSupabaseUser: Setting up auth state listener")
            const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
              console.log("Auth state changed:", event, "session:", session?.user?.email)
              if (session?.user?.email) {
                set({ activeUser: session.user.email.toLowerCase() })
              } else {
                set({ activeUser: null })
              }
            })
            supabaseAuthUnsub = () => sub.subscription.unsubscribe()
          }
        } catch (error) {
          console.error("syncSupabaseUser error:", error)
          set({ activeUser: null })
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        activeUser: state.activeUser,
        users: state.users,
      }),
    },
  ),
)

const userScopedStorage: StateStorage = {
  getItem: (name) => {
    const user = useAuthStore.getState().activeUser || "guest"
    return typeof window === "undefined" ? null : window.localStorage.getItem(`${name}:${user}`)
  },
  setItem: (name, value) => {
    const user = useAuthStore.getState().activeUser || "guest"
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`${name}:${user}`, value)
    }
  },
  removeItem: (name) => {
    const user = useAuthStore.getState().activeUser || "guest"
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(`${name}:${user}`)
    }
  },
}

interface PlayerState {
  currentSong: Song | null
  isPlaying: boolean
  queue: Song[]
  currentTime: number
  volume: number
  repeat: "off" | "one" | "all"
  shuffle: boolean
  isExpanded: boolean
  showQueue: boolean
  setCurrentSong: (song: Song) => void
  setIsPlaying: (playing: boolean) => void
  setQueue: (queue: Song[]) => void
  setCurrentTime: (time: number) => void
  setVolume: (volume: number) => void
  setRepeat: (repeat: "off" | "one" | "all") => void
  setShuffle: (shuffle: boolean) => void
  setIsExpanded: (open: boolean) => void
  setShowQueue: (open: boolean) => void
  addToQueue: (song: Song) => boolean
  removeFromQueue: (songId: string) => void
  clearQueue: () => void
  playNext: () => void
  playPrevious: () => void
  trackSongPlay: (song: Song, durationPlayed: number) => Promise<void>
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentSong: null,
      isPlaying: false,
      queue: [],
      currentTime: 0,
      volume: 0.7,
      repeat: "off",
      shuffle: false,
      isExpanded: false,
      showQueue: false,
      setCurrentSong: (song) => set({ currentSong: song, isPlaying: true }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setQueue: (queue) =>
        set(() => {
          const map = new Map<string, Song>()
          for (const s of queue) map.set(s.id, s)
          return { queue: Array.from(map.values()) }
        }),
      setCurrentTime: (time) => set({ currentTime: time }),
      setVolume: (volume) => set({ volume }),
      setRepeat: (repeat) => set({ repeat }),
      setShuffle: (shuffle) => set({ shuffle }),
      setIsExpanded: (open) => set({ isExpanded: open }),
      setShowQueue: (open) => set({ showQueue: open }),
      addToQueue: (song) => {
        let added = false
        set((state) => {
          const exists = state.queue.some((s) => s.id === song.id)
          if (exists) {
            return state
          }
          added = true
          return { queue: [...state.queue, song] }
        })
        return added
      },
      removeFromQueue: (songId) => set((state) => ({ queue: state.queue.filter((s) => s.id !== songId) })),
      clearQueue: () => set({ queue: [] }),
      playNext: () => {
        const { queue, currentSong, repeat } = get()
        if (!currentSong || queue.length === 0) return
        const currentIndex = queue.findIndex((s) => s.id === currentSong.id)
        let nextIndex = currentIndex + 1
        if (nextIndex >= queue.length) {
          if (repeat === "all") nextIndex = 0
          else {
            set({ isPlaying: false })
            return
          }
        }
        set({ currentSong: queue[nextIndex], currentTime: 0 })
      },
      playPrevious: () => {
        const { queue, currentSong, currentTime } = get()
        if (!currentSong || queue.length === 0) return
        if (currentTime > 3) {
          set({ currentTime: 0 })
          return
        }
        const currentIndex = queue.findIndex((s) => s.id === currentSong.id)
        let prevIndex = currentIndex - 1
        if (prevIndex < 0) prevIndex = queue.length - 1
        set({ currentSong: queue[prevIndex], currentTime: 0 })
      },
      trackSongPlay: async (song: Song, durationPlayed: number) => {
        const user = useAuthStore.getState().activeUser
        if (!user) return

        try {
          const response = await fetch("/api/recently-played", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              songId: song.id,
              songData: song,
              durationPlayed,
            }),
          })

          if (!response.ok) {
            const error = await response.json()
            console.error("Failed to track play:", error)
          }
        } catch (error) {
          console.error("Track play error:", error)
        }
      },
    }),
    {
      name: "player-storage",
      storage: userScopedStorage,
      partialize: (state) => ({
        currentSong: state.currentSong,
        isPlaying: state.isPlaying,
        queue: state.queue,
        currentTime: state.currentTime,
        volume: state.volume,
        repeat: state.repeat,
        shuffle: state.shuffle,
        isExpanded: state.isExpanded,
        showQueue: state.showQueue,
      }),
    },
  ),
)

interface LibraryState {
  favorites: Song[]
  playlists: Playlist[]
  addFavorite: (song: Song) => void
  removeFavorite: (songId: string) => void
  isFavorite: (songId: string) => boolean
  createPlaylist: (name: string, description: string) => void
  addToPlaylist: (playlistId: string, song: Song) => void
  removeFromPlaylist: (playlistId: string, songId: string) => void
  deletePlaylist: (playlistId: string) => void
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      favorites: [],
      playlists: [],
      addFavorite: (song) =>
        set((state) => {
          if (state.favorites.some((s) => s.id === song.id)) return state
          return { favorites: [...state.favorites, song] }
        }),
      removeFavorite: (songId) => set((state) => ({ favorites: state.favorites.filter((s) => s.id !== songId) })),
      isFavorite: (songId) => get().favorites.some((song) => song.id === songId),
      createPlaylist: (name, description) =>
        set((state) => ({
          playlists: [
            ...state.playlists,
            {
              id: `playlist-${Date.now()}`,
              name,
              description,
              coverUrl: "/playlist-cover.png",
              songs: [],
              isPublic: false,
              createdAt: new Date(),
            },
          ],
        })),
      addToPlaylist: (playlistId, song) =>
        set((state) => ({
          playlists: state.playlists.map((p) => {
            if (p.id !== playlistId) return p
            const alreadyIn = p.songs.some((s) => s.id === song.id)
            if (alreadyIn) return p
            return { ...p, songs: [...p.songs, song] }
          }),
        })),
      removeFromPlaylist: (playlistId, songId) =>
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId ? { ...p, songs: p.songs.filter((s) => s.id !== songId) } : p,
          ),
        })),
      deletePlaylist: (playlistId) =>
        set((state) => ({
          playlists: state.playlists.filter((p) => p.id !== playlistId),
        })),
    }),
    {
      name: "library-storage",
      storage: userScopedStorage,
      partialize: (state) => ({
        favorites: state.favorites,
        playlists: state.playlists,
      }),
    },
  ),
)
