import { NextResponse } from "next/server"

async function tryJson(url: string) {
  try {
    const res = await fetch(url, {
      // no caching to avoid stale empty responses
      cache: "no-store",
      headers: {
        Accept: "application/json, text/plain;q=0.9, */*;q=0.1"
      },
    })
    if (!res.ok) return null

    const contentType = res.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      return await res.json()
    }

    // Accept plain text lyrics (wrap as JSON-like object)
    if (contentType.includes("text/plain")) {
      const text = await res.text()
      // Some providers return an empty string when not found
      if (text && !/^<!doctype html>/i.test(text) && !/<html/i.test(text)) {
        return { lyrics: text, source: "text/plain" }
      }
      return null
    }

    // If API returned HTML (404 page), skip gracefully
    if (contentType.includes("text/html")) {
      return null
    }

    // Fallback: try to detect JSON from text without content-type
    const raw = await res.text()
    if (raw && raw.trim().startsWith("{")) {
      try {
        return JSON.parse(raw)
      } catch {
        return null
      }
    }
    if (raw && !/<html/i.test(raw)) {
      return { lyrics: raw, source: "unknown" }
    }
    return null
  } catch {
    return null
  }
}

function pickLyrics(json: any): { lyrics?: string; source?: string } {
  if (!json) return {}
  if (typeof json.lyrics === "string") return { lyrics: json.lyrics, source: json.source || undefined }
  if (json?.data?.lyrics) return { lyrics: json.data.lyrics, source: json.data.source || undefined }
  if (json?.result?.lyrics) return { lyrics: json.result.lyrics, source: json.result.source || undefined }
  if (typeof json.content === "string") return { lyrics: json.content, source: json.source || undefined }
  return {}
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const title = (searchParams.get("title") || "").trim()
  const artist = (searchParams.get("artist") || "").trim()

  if (!title && !artist) {
    return NextResponse.json({ lyrics: "", error: "Missing title/artist" }, { status: 400 })
  }

  const qTitle = encodeURIComponent(title)
  const qArtist = encodeURIComponent(artist)
  const qBoth = encodeURIComponent(`${title} ${artist}`.trim())

  // Only LRCLib endpoints
  const lrclibUrls: string[] = [
    `https://lrclib.net/api/get?track_name=${qTitle}&artist_name=${qArtist}`,
    `https://lrclib.net/api/get?track_name=${qBoth}`,
  ]

  for (const url of lrclibUrls) {
    const json = await tryJson(url)
    if (json && (json.plainLyrics || json.syncedLyrics)) {
      const lyrics: string =
        (typeof json.plainLyrics === "string" && json.plainLyrics) ||
        (typeof json.syncedLyrics === "string" && json.syncedLyrics) ||
        ""
      if (lyrics.trim()) {
        return NextResponse.json({ lyrics, source: "lrclib.net" })
      }
    }
  }

  // Explicit friendly message when not found
  return NextResponse.json({ lyrics: "", source: null, message: "lyrics not there for this song" }, { status: 404 })
}
