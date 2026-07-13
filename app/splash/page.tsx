"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function SplashPage() {
  const router = useRouter()

  const handleStart = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("mp_has_visited", "true")
    }
    router.replace("/")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-primary/40 bg-card/80 p-10 text-center shadow-[0_20px_80px_-20px_var(--color-primary),0_20px_80px_-30px_var(--color-accent)] backdrop-blur">
        <div className="relative mb-8 h-80 w-full overflow-hidden rounded-2xl border border-primary/30">
          <Image
            src="/hero-splash.png"
            alt="Music Pioneer - Explore New Sound Frontiers"
            fill
            className="object-cover"
            priority
          />
        </div>

        <h1 className="mb-3 text-5xl font-bold text-balance">
          Welcome to{" "}
          <span className="font-brand bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Music Pioneer
          </span>
        </h1>

        <Button
          size="lg"
          className="bg-gradient-to-r from-primary to-accent px-10 text-lg font-semibold hover:opacity-90"
          onClick={handleStart}
        >
          Get Started
        </Button>
      </div>
    </main>
  )
}
