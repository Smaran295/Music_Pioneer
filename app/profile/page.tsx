"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { MusicPlayer } from "@/components/music-player"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { User, Palette, Music } from "lucide-react"
import { useLibraryStore } from "@/lib/store"
import { getSongsByIds } from "@/lib/api"
import { useAuthStore } from "@/lib/store"
import Link from "next/link"
import type { Song } from "@/lib/data"

export default function ProfilePage() {
  const { favorites, playlists } = useLibraryStore()
  const { activeUser, users } = useAuthStore()
  const [favoriteSongs, setFavoriteSongs] = useState<Song[]>([])
  const user = activeUser ? users[activeUser] : null
  const displayName = user?.displayName || (activeUser ? activeUser.split("@")[0] : "Guest")
  const email = activeUser || "guest@musicpioneer.com"

  useEffect(() => {
    async function loadFavorites() {
      if (favorites.length === 0) {
        setFavoriteSongs([])
        return
      }
      try {
        const songs = await getSongsByIds(favorites)
        setFavoriteSongs(songs)
      } catch (error) {
        console.error("Failed to load favorites:", error)
      }
    }
    loadFavorites()
  }, [favorites])

  const totalSongs = playlists.reduce((acc, p) => acc + p.songs.length, 0) + favoriteSongs.length

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-64 flex-shrink-0 border-r border-border md:block">
          <Sidebar />
        </aside>
        <main className="flex-1 overflow-y-auto pb-24">
          <div className="p-4 md:p-8">
            <h1 className="mb-8 text-4xl font-bold">Profile & Settings</h1>

            {!activeUser ? (
              <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card/70 p-8 text-center">
                <p className="mb-4 text-lg text-muted-foreground">Please sign in to view your profile and settings.</p>
                <Link href="/sign-in">
                  <Button size="lg">Sign in</Button>
                </Link>
              </div>
            ) : (
              <Tabs defaultValue="account" className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="account" className="gap-x-2">
                    <User className="h-4 w-4" />
                    Account
                  </TabsTrigger>
                  <TabsTrigger value="library" className="gap-x-2">
                    <Music className="h-4 w-4" />
                    Library
                  </TabsTrigger>
                  <TabsTrigger value="preferences" className="gap-x-2">
                    <Palette className="h-4 w-4" />
                    Preferences
                  </TabsTrigger>
                </TabsList>

                {/* Account Tab */}
                <TabsContent value="account">
                  <Card className="p-6">
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="display-name">Display Name</Label>
                        <Input id="display-name" value={displayName} disabled className="mt-2" />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={email} disabled className="mt-2" />
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* Library Tab */}
                <TabsContent value="library">
                  <Card className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">Total Songs</p>
                          <p className="text-sm text-muted-foreground">Across all playlists and favorites</p>
                        </div>
                        <p className="text-3xl font-bold">{totalSongs}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-4">
                        <div>
                          <p className="font-semibold">Playlists</p>
                          <p className="text-sm text-muted-foreground">Created playlists</p>
                        </div>
                        <p className="text-3xl font-bold">{playlists.length}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-4">
                        <div>
                          <p className="font-semibold">Favorite Songs</p>
                          <p className="text-sm text-muted-foreground">Liked songs</p>
                        </div>
                        <p className="text-3xl font-bold">{favoriteSongs.length}</p>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* Preferences Tab */}
                <TabsContent value="preferences">
                  <Card className="p-6">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">Notifications</p>
                          <p className="text-sm text-muted-foreground">Receive updates about new releases</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-6">
                        <div>
                          <p className="font-semibold">Dark Mode</p>
                          <p className="text-sm text-muted-foreground">Always enabled for Music Pioneer</p>
                        </div>
                        <Switch defaultChecked disabled />
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
      </div>
      <MusicPlayer />
    </div>
  )
}
