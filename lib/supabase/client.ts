"use client"
import { createBrowserClient } from "@supabase/ssr"

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowser() {
  if (typeof window === "undefined") {
    // During SSR/build, return a dummy object to prevent errors
    return {
      auth: {
        signUp: async () => ({ error: new Error("Auth not available during build") }),
        signIn: async () => ({ error: new Error("Auth not available during build") }),
        signOut: async () => ({ error: new Error("Auth not available during build") }),
        getUser: async () => ({ data: null, error: new Error("Auth not available during build") }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithOAuth: async () => ({ error: new Error("Auth not available during build") }),
        exchangeCodeForSession: async () => ({ error: new Error("Auth not available during build") }),
      },
    } as any
  }

  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    console.warn("Supabase environment variables not configured")
    return {
      auth: {
        signUp: async () => ({ error: new Error("Supabase not configured") }),
        signIn: async () => ({ error: new Error("Supabase not configured") }),
        signOut: async () => ({ error: new Error("Supabase not configured") }),
        getUser: async () => ({ data: null, error: new Error("Supabase not configured") }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithOAuth: async () => ({ error: new Error("Supabase not configured") }),
        exchangeCodeForSession: async () => ({ error: new Error("Supabase not configured") }),
      },
    } as any
  }

  browserClient = createBrowserClient(url, anon)
  return browserClient
}
