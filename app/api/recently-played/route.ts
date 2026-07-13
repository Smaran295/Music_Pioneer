import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log("POST /api/recently-played - Auth check:", { hasUser: !!user, authError: authError?.message })

    if (authError || !user) {
      console.error("POST /api/recently-played - Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { songId, songData, durationPlayed } = body

    console.log("POST /api/recently-played - Tracking play:", { songId, userId: user.id, durationPlayed })

    if (!songId || !songData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { error } = await supabase.from("recently_played").insert({
      user_id: user.id,
      song_id: songId,
      song_data: songData,
      duration_played: durationPlayed || 0,
    })

    if (error) {
      console.error("Failed to track play:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("Successfully tracked play for song:", songId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Track play error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log("GET /api/recently-played - Auth check:", { hasUser: !!user, authError: authError?.message })

    if (authError || !user) {
      console.error("GET /api/recently-played - Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || "50"), 100)
    const offset = Number(request.nextUrl.searchParams.get("offset") || "0")

    console.log("GET /api/recently-played - Fetching for user:", { userId: user.id, limit, offset })

    const { data, error } = await supabase
      .from("recently_played")
      .select("*")
      .eq("user_id", user.id)
      .order("played_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Failed to fetch recently played:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("Successfully fetched recently played:", { count: data?.length || 0 })
    return NextResponse.json({ recently_played: data || [] })
  } catch (error) {
    console.error("Fetch recently played error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { songId } = body

    if (!songId) {
      return NextResponse.json({ error: "Missing songId" }, { status: 400 })
    }

    const { error } = await supabase.from("recently_played").delete().eq("user_id", user.id).eq("song_id", songId)

    if (error) {
      console.error("Failed to delete from recently played:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete recently played error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
