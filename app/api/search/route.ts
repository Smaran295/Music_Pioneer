import { NextResponse } from "next/server"
import { formatSong } from "@/lib/api"

const API_BASE_URL = "https://annonymous-sage.vercel.app"

// Deduplicate items by a stable key
function pushUnique(target: any[], items: any[]) {
  const seen = new Set(target.map((i) => i?.id || i?.perma_url || i?.url).filter(Boolean))
  for (const it of items || []) {
    const key = it?.id || it?.perma_url || it?.url
    if (key && !seen.has(key)) {
      target.push(it)
      seen.add(key)
    }
  }
}

// Heuristic: detect if a song already has a playable audio URL
function hasPlayableAudio(song: any): boolean {
  const directUrl =
    typeof song?.url === "string" &&
    (song.url.includes(".mp3") || song.url.includes(".mp4") || song.url.includes("aac.saavncdn.com"))

  const downloadArray =
    Array.isArray(song?.downloadUrl) &&
    song.downloadUrl.some((d: any) => {
      const link = d?.link || d?.url || ""
      return link.includes("aac.saavncdn.com") || link.endsWith(".mp3") || link.endsWith(".mp4")
    })

  const permaLooksAudio =
    typeof song?.perma_url === "string" &&
    (song.perma_url.endsWith(".mp3") || song.perma_url.endsWith(".mp4") || song.perma_url.includes("aac.saavncdn.com"))

  return directUrl || downloadArray || permaLooksAudio
}

export async function GET(req: Request) {
  const started = Date.now()
  try {
    const { searchParams } = new URL(req.url)
    const raw = (searchParams.get("query") || searchParams.get("q") || "").trim()
    const limitNum = Math.max(1, Math.min(Number(searchParams.get("limit") || "20"), 100))
    const pageNum = Math.max(1, Number(searchParams.get("page") || "1"))

    if (!raw) {
      console.log("/api/search: empty query")
      return NextResponse.json({ songs: [], hasMore: false, page: pageNum })
    }

    const url = `${API_BASE_URL}/api/search/songs?query=${encodeURIComponent(raw)}&page=${pageNum}&limit=${limitNum}`
    console.log("/api/search fetch:", url)

    const res = await fetch(url, {
      cache: "no-store",
      next: { revalidate: 0 },
      headers: { accept: "application/json" },
    })

    if (!res.ok) {
      const t = await res.text().catch(() => "")
      console.log("upstream non-OK:", res.status, res.statusText, t?.slice(0, 200))
      return NextResponse.json({ songs: [], hasMore: false, page: pageNum }, { status: res.status })
    }

    const json = await res.json().catch(() => null)

    let items: any[] = []
    if (Array.isArray(json)) items = json
    else if (Array.isArray((json as any)?.results)) items = (json as any).results
    else if (Array.isArray((json as any)?.songs)) items = (json as any).songs
    else if (Array.isArray((json as any)?.data?.results)) items = (json as any).data.results
    else if (Array.isArray((json as any)?.data?.songs)) items = (json as any).data.songs

    const normalized = (items || []).map((s: any) => formatSong(s))
    const hasMore = Array.isArray(items) && items.length === limitNum

    console.log("/api/search returning:", normalized.length, "elapsed:", Date.now() - started, "ms")
    return NextResponse.json({ songs: normalized, page: pageNum, hasMore })
  } catch (err: any) {
    console.log("/api/search error:", err?.message || err)
    return NextResponse.json({ songs: [], hasMore: false, error: "Search failed" }, { status: 500 })
  }
}
