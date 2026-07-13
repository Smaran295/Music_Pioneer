"use client"

import { useSearchParams } from "next/navigation"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { MusicPlayer } from "@/components/music-player"
import { SongCard } from "@/components/song-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLibraryStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { getImageSrc } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function LibraryPage() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "playlists"

  const { favorites, playlists, createPlaylist, deletePlaylist } = useLibraryStore()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("")

  const favoriteSongs = favorites

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName, newPlaylistDescription)
      setNewPlaylistName("")
      setNewPlaylistDescription("")
      setIsCreateDialogOpen(false)
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
            <div className="mb-8 flex items-center justify-between">
              <h1 className="text-4xl font-bold">Your Library</h1>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-x-2">
                <Plus className="h-4 w-4" />
                Create Playlist
              </Button>
            </div>

            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="playlists">Playlists</TabsTrigger>
                <TabsTrigger value="favorites">Favorites</TabsTrigger>
              </TabsList>

              {/* Playlists Tab */}
              <TabsContent value="playlists">
                {playlists.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <p className="mb-4 text-lg text-muted-foreground">No playlists yet</p>
                    <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-x-2">
                      <Plus className="h-4 w-4" />
                      Create Your First Playlist
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                    {playlists.map((playlist) => (
                      <div key={playlist.id} className="group relative">
                        <Link href={`/playlist/${playlist.id}`}>
                          <div className="cursor-pointer overflow-hidden transition-colors hover:bg-accent/50">
                            <div className="p-4">
                              <div className="relative mb-4 aspect-square overflow-hidden rounded-md bg-gradient-to-br from-primary/20 to-accent/20">
                                {playlist.songs.length > 0 ? (
                                  <Image
                                    src={getImageSrc(playlist.songs[0].image) || "/placeholder.svg"}
                                    alt={playlist.name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <Plus className="h-12 w-12 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <h3 className="truncate font-semibold">{playlist.name}</h3>
                              <p className="truncate text-sm text-muted-foreground">{playlist.songs.length} songs</p>
                            </div>
                          </div>
                        </Link>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => deletePlaylist(playlist.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Favorites (Liked songs) Tab */}
              <TabsContent value="favorites">
                {favoriteSongs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <p className="mb-4 text-lg text-muted-foreground">No favorite songs yet</p>
                    <Link href="/browse">
                      <Button>Browse Music</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-6 md:gap-4">
                    {favoriteSongs.map((song) => (
                      <SongCard key={song.id} song={song} songs={favoriteSongs} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      <MusicPlayer />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
            <DialogDescription>Give your playlist a name and description to get started.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="My Awesome Playlist"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreatePlaylist()
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="A collection of my favorite songs..."
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePlaylist} disabled={!newPlaylistName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
