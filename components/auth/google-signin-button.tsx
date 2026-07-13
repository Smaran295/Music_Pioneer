"use client"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowser } from "@/lib/supabase/client"
import { useAuthStore } from "@/lib/store"
import { Mail } from "lucide-react"
import { useState } from "react"

export function GoogleSignInButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { syncSupabaseUser } = useAuthStore()

  const onSignIn = async () => {
    try {
      setError(null)
      setLoading(true)
      const supabase = getSupabaseBrowser()

      const redirectTo = `${window.location.origin}/auth/callback`

      console.log("========== GOOGLE OAUTH DEBUG INFO ==========")
      console.log("Redirect URI:", redirectTo)
      console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log("Timestamp:", new Date().toISOString())
      console.log("=============================================")

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            prompt: "select_account",
          },
        },
      })

      if (error) {
        console.error("Google OAuth error:", error.message)
        setError(`OAuth Error: ${error.message}`)
        return
      }

      if (data?.url) {
        console.log("Redirecting to Google OAuth URL")
        window.location.href = data.url
      } else {
        console.error("No OAuth URL returned from Supabase")
        setError("Failed to initiate OAuth flow")
      }
    } catch (error: any) {
      console.error("Google OAuth exception:", error?.message || error)
      setError(`Error: ${error?.message || "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" className={className} onClick={onSignIn} disabled={loading} aria-busy={loading}>
        <Mail className="mr-2 h-4 w-4" />
        {loading ? "Signing in..." : "Continue with Google"}
      </Button>
      {error && (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer underline">Troubleshooting steps</summary>
            <div className="mt-2 space-y-1 bg-muted p-2 rounded">
              <p>1. Try using Email/Password authentication instead</p>
              <p>2. Check browser console (F12) for detailed error logs</p>
              <p>3. If error persists, contact support</p>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

export default GoogleSignInButton
