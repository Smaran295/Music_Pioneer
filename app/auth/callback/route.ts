import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")
  const errorDescription = url.searchParams.get("error_description")
  const origin = url.origin

  if (error) {
    console.log("OAuth error from provider:", {
      error,
      errorDescription,
      code,
    })
    return NextResponse.redirect(
      new URL(
        `/sign-in?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`,
        origin,
      ),
    )
  }

  if (!code) {
    console.log("No authorization code received")
    return NextResponse.redirect(new URL("/sign-in?error=missing_code", origin))
  }

  try {
    const supabase = await createSupabaseServerClient()

    console.log("Attempting to exchange code for session")

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.log("Code exchange failed:", exchangeError.message)
      return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(exchangeError.message)}`, origin))
    }

    console.log("Code exchange successful, creating profile")

    // Upsert a profile row for the authenticated user
    try {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      if (user?.id) {
        const fullName =
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          (user.user_metadata?.fullName as string) ||
          ""
        const avatarUrl = (user.user_metadata?.avatar_url as string) || (user.user_metadata?.picture as string) || null

        await supabase.from("profiles").upsert(
          {
            id: user.id,
            email: user.email,
            full_name: fullName,
            avatar_url: avatarUrl,
          },
          { onConflict: "id" },
        )
        console.log("Profile created/updated for user:", user.id)
      }
    } catch (e) {
      console.log("Profile upsert skipped:", (e as any)?.message || e)
    }

    console.log("OAuth flow complete, redirecting to home")
    return NextResponse.redirect(new URL("/", origin))
  } catch (e: any) {
    console.log("Callback route error:", e?.message || e)
    return NextResponse.redirect(new URL("/sign-in?error=callback_failed", origin))
  }
}
