"use client"

import { usePlayerStore } from "@/lib/store"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"

export function QueueDrawer() {
  const { showQueue, setShowQueue, queue, removeFromQueue, clearQueue } = usePlayerStore()
  return (
    <Drawer open={showQueue} onOpenChange={setShowQueue}>
      <DrawerContent className="ml-auto mr-0 w-full max-w-md">
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>Queue</DrawerTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => clearQueue()}>
              Clear
            </Button>
            <DrawerClose asChild>
              <Button variant="secondary" size="sm">
                Close
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        <div className="p-4 space-y-2">
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your queue is empty. Use the ••• menu to add songs.</p>
          ) : (
            queue.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-md border p-2">
                <img
                  src={s.image || "/placeholder.svg?height=48&width=48&query=album%20cover"}
                  alt="Cover"
                  className="h-12 w-12 rounded object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.name || s.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.artist || s.subtitle}</p>
                </div>
                <Button className="ml-auto" variant="ghost" size="sm" onClick={() => removeFromQueue(s.id)}>
                  Remove
                </Button>
              </div>
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
