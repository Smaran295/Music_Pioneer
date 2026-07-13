import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get("url")
  const rawFilename = searchParams.get("filename") || "song.mp3"

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 })
  }

  // Validate URL to prevent SSRF
  let target: URL
  try {
    target = new URL(url)
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }

  // Only allow https and known hosts (saavn CDN)
  const allowedHosts = ["aac.saavncdn.com", "saavncdn.com", "c.saavncdn.com"]
  const isAllowed =
    target.protocol === "https:" &&
    (allowedHosts.includes(target.hostname) || target.hostname.endsWith(".saavncdn.com"))

  // Explicitly reject webpage links like jiosaavn.com/song
  if (!isAllowed || target.hostname.includes("jiosaavn.com")) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 400 })
  }

  // Sanitize filename: keep alphanumerics, spaces, dashes, underscores, and dot
  const safeFilename = rawFilename.replace(/[^a-zA-Z0-9._ -]/g, "").slice(0, 200) || "song.mp3"

  // Infer content type from extension if source doesn't provide it
  const inferType = (pathname: string) => {
    if (pathname.endsWith(".mp3")) return "audio/mpeg"
    if (pathname.endsWith(".m4a")) return "audio/mp4"
    if (pathname.endsWith(".mp4")) return "audio/mp4"
    if (pathname.endsWith(".aac")) return "audio/aac"
    return "application/octet-stream"
  }

  // Forward Range (for resumable downloads) and a generic UA
  const range = request.headers.get("range") || undefined
  const upstreamHeaders: HeadersInit = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  }
  if (range) upstreamHeaders["Range"] = range

  try {
    const upstream = await fetch(target.toString(), {
      method: "GET",
      headers: upstreamHeaders,
    })

    if (!upstream.ok && upstream.status !== 206) {
      // Some CDNs return 206 for partial content
      return NextResponse.json(
        { error: `Failed to fetch upstream: ${upstream.status} ${upstream.statusText}` },
        { status: 502 },
      )
    }

    // Determine content type and headers to pass through
    const contentType = upstream.headers.get("content-type") || inferType(target.pathname)
    const contentLength = upstream.headers.get("content-length") || undefined
    const acceptRanges = upstream.headers.get("accept-ranges") || "bytes"
    const cacheControl = upstream.headers.get("cache-control") || "private, max-age=0, must-revalidate"

    // Stream the body directly to avoid buffering large files in memory
    const body = upstream.body

    if (!body) {
      return NextResponse.json({ error: "No upstream body" }, { status: 502 })
    }

    const status = upstream.status // 200 or 206 etc.
    const respHeaders = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
      "Accept-Ranges": acceptRanges,
      "Cache-Control": cacheControl,
    })

    if (contentLength) respHeaders.set("Content-Length", contentLength)
    // Forward range-related headers when present
    const contentRange = upstream.headers.get("content-range")
    if (contentRange) respHeaders.set("Content-Range", contentRange)

    return new Response(body, {
      status,
      headers: respHeaders,
    })
  } catch (error) {
    console.error("Download proxy error:", error)
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 })
  }
}
