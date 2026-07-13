"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/lib/store"
import GoogleSignInButton from "@/components/auth/google-signin-button"

export default function SignInPage() {
  const router = useRouter()
  const { signIn, signUp, activeUser } = useAuthStore()
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeUser) {
      console.log("SignInPage: User already authenticated, redirecting to home")
      router.replace("/")
    }
  }, [activeUser, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === "signin") {
        await signIn(email, password)
        router.replace("/")
      } else {
        await signUp(email, password, displayName)
        // For email sign-up, Supabase typically requires email confirmation.
        // Inform the user instead of redirecting immediately.
        setError("Check your email inbox to confirm your account, then return to sign in.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md border-border bg-card/70 p-6 backdrop-blur">
        <h1 className="mb-1 text-2xl font-bold">{mode === "signin" ? "Sign in" : "Create account"}</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {mode === "signin" ? "Welcome back!" : "Start listening and save your playlists."}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" type="submit" disabled={loading}>
            {loading
              ? mode === "signin"
                ? "Signing in..."
                : "Creating account..."
              : mode === "signin"
                ? "Sign in"
                : "Sign up"}
          </Button>
        </form>
        <div className="my-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-muted" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-muted" />
        </div>
        <GoogleSignInButton className="w-full" />
        <div className="mt-4 flex items-center justify-between">
          <button
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create an account" : "Have an account? Sign in"}
          </button>
          <Button variant="ghost" size="sm" onClick={() => router.replace("/")}>
            Continue as guest
          </Button>
        </div>
      </Card>
    </main>
  )
}
