"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/lib/store"
import { useRouter } from "next/navigation"

/**
 * Client component that initializes auth state on app load.
 * This ensures that users who log in via OAuth are properly synced
 * to the Zustand store after the callback redirect.
 */
export function AuthInitializer() {
  const syncSupabaseUser = useAuthStore((state) => state.syncSupabaseUser)
  const activeUser = useAuthStore((state) => state.activeUser)
  const router = useRouter()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      console.log("AuthInitializer: Starting auth sync")

      await new Promise((resolve) => setTimeout(resolve, 500))

      try {
        await syncSupabaseUser()
        console.log("AuthInitializer: Auth sync complete, activeUser =", activeUser)
      } catch (error) {
        console.error("AuthInitializer: Error syncing user:", error)
      }

      setInitialized(true)
    }

    initAuth()
  }, [syncSupabaseUser])

  useEffect(() => {
    if (!initialized) return

    if (activeUser && typeof window !== "undefined") {
      const currentPath = window.location.pathname
      console.log("AuthInitializer: User authenticated, activeUser =", activeUser, "currentPath =", currentPath)

      if (currentPath === "/sign-in") {
        console.log("AuthInitializer: Redirecting authenticated user to home")
        router.replace("/")
      }
    }
  }, [initialized, activeUser, router])

  return null
}
