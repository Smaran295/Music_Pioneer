"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Library, Plus, Heart, User, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useLibraryStore, useAuthStore } from "@/lib/store"
import ModeToggle from "@/components/mode-toggle"
import Image from "next/image"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function Sidebar() {
  const pathname = usePathname()
  const playlists = useLibraryStore((state) => state.playlists)
  const { activeUser, signOut } = useAuthStore()
  const createPlaylist = useLibraryStore((s) => s.createPlaylist)
  const [open, setOpen] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("")

  const routes = [
    {
      label: "Home",
      icon: Home,
      href: "/",
      active: pathname === "/",
    },
    {
      label: "Browse",
      icon: Search,
      href: "/browse",
      active: pathname === "/browse",
    },
    {
      label: "Library",
      icon: Library,
      href: "/library",
      active: pathname === "/library",
    },
    {
      label: "Profile",
      icon: User,
      href: "/profile",
      active: pathname === "/profile",
    },
  ]

  return (
    <div className="flex h-full flex-col gap-y-4 bg-sidebar p-3 md:p-4">
      <div className="sticky top-0 z-10 flex flex-col items-center gap-2 bg-sidebar/80 px-2 pb-2 backdrop-blur">
        <div className="relative mx-auto h-12 w-32 md:w-40">
          <Image src="/logo.png" alt="Music Pioneer logo" fill className="object-contain object-center" priority />
        </div>
        <span className="font-brand text-3xl md:text-2xl leading-none text-center">Music Pioneer</span>
        <div className="mt-1">
          <ModeToggle />
        </div>
      </div>

      <nav className="flex flex-col gap-y-1">
        {routes.map((route) => (
          <Link key={route.href} href={route.href}>
            <Button
              variant={route.active ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-x-3 h-10 md:h-9",
                route.active && "bg-secondary text-secondary-foreground",
              )}
              aria-current={route.active ? "page" : undefined}
            >
              <route.icon className="h-5 w-5" aria-hidden="true" />
              {route.label}
            </Button>
          </Link>
        ))}
      </nav>

      <div className="mt-4 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-2 pb-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Your Library</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:h-6 md:w-6"
            onClick={() => setOpen(true)}
            aria-label="Create playlist"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-col gap-y-1">
          {activeUser && (
            <Link href="/recently-played">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start truncate text-muted-foreground hover:text-foreground h-10 md:h-9",
                  pathname === "/recently-played" && "bg-secondary text-secondary-foreground",
                )}
              >
                <Clock className="h-4 w-4" />
                Recently Played
              </Button>
            </Link>
          )}

          <Link href="/library?tab=favorites">
            <Button
              variant="ghost"
              className="w-full justify-start truncate text-muted-foreground hover:text-foreground h-10 md:h-9"
            >
              <Heart className="h-4 w-4" />
              Liked Songs
            </Button>
          </Link>

          <a
            href="https://github.com/Smaran295"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 text-xs text-muted-foreground hover:underline w-fit"
            aria-label="Contact via GitHub"
          >
            Contact
          </a>

          {playlists.map((playlist) => (
            <Link key={playlist.id} href={`/playlist/${playlist.id}`}>
              <Button
                variant="ghost"
                className="w-full justify-start truncate text-muted-foreground hover:text-foreground h-10 md:h-9"
              >
                {playlist.name}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {activeUser && (
        <div className="mt-2">
          <Button variant="ghost" className="w-full" onClick={signOut}>
            Sign out
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label htmlFor="playlist-name">Name</Label>
              <Input
                id="playlist-name"
                placeholder="My Awesome Playlist"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="playlist-desc">Description</Label>
              <Input
                id="playlist-desc"
                placeholder="Optional description"
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                const name = newPlaylistName.trim()
                if (!name) return
                createPlaylist(name, newPlaylistDescription.trim())
                setNewPlaylistName("")
                setNewPlaylistDescription("")
                setOpen(false)
              }}
              disabled={!newPlaylistName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
