"use client"
import * as React from "react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "@/components/sidebar"
import Image from "next/image"

export function MobileHeader() {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="md:hidden sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-12 items-center justify-between px-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button aria-label="Open menu" className="rounded-md p-2 hover:bg-accent focus:outline-none">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[18rem] p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>
        <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
          <div className="relative h-6 w-6">
            <Image src="/logo.png" alt="Music Pioneer" fill className="object-contain" />
          </div>
          <span className="font-brand text-base leading-none">Music Pioneer</span>
        </div>
        <div className="w-9" aria-hidden />
      </div>
    </div>
  )
}
export default MobileHeader
