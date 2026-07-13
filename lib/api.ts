// Music API service layer
const API_BASE_URL = "https://annonymous-sage.vercel.app"

export interface Song {
  id: string
  name: string
  artist: string
  album: string
  duration: number
  image: string
  url: string
  year?: string
  language?: string
  primaryArtists?: string
  downloadUrl?: Array<{ quality: string; link: string }>
}

export interface Album {
  id: string
  name: string
  artist: string
  image: string
  year?: string
  songCount?: number
  songs?: Song[]
}

export interface Artist {
  id: string
  name: string
  image: string
  followerCount?: string
  isVerified?: boolean
  dominantLanguage?: string
  dominantType?: string
  topSongs?: Song[]
}

export interface SearchResults {
  songs: Song[]
  albums: Album[]
  artists: Artist[]
  playlists: any[]
}

// Search for songs, albums, artists
export async function searchMusic(query: string): Promise<SearchResults> {
  try {
    console.log("Searching for:", query)

    const maxPages = 8 // increased to 8 pages to collect more results (aim for 50+ songs)
    const desiredSongs = 50 // aim for exactly 50 songs
    const desiredAlbums = 50
    const desiredArtists = 50

    const allSongs: any[] = []
    const allAlbums: any[] = []
    const allArtists: any[] = []

    // helper to dedupe by id
    const pushUnique = (arr: any[], items: any[]) => {
      const seen = new Set(arr.map((i) => i.id))
      for (const it of items) {
        if (!seen.has(it.id)) {
          arr.push(it)
          seen.add(it.id)
        }
      }
    }

    for (let page = 1; page <= maxPages; page++) {
      const params = new URLSearchParams()
      // Removed 'q' - backend expects only 'query' to avoid validation error
      params.set("query", query)
      params.set("limit", "50") // ask backend nicely (even if ignored)
      params.set("page", String(page))
      // some backends honor extra hints; harmless if ignored
      params.set("numResults", "50")

      const response = await fetch(`${API_BASE_URL}/api/search?${params.toString()}`)
      if (!response.ok) {
        const errorText = await response.text().catch(() => "")
        console.error("Search API error:", {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorText: errorText?.slice(0, 200),
        })
        // try next page, but if first page fails, break early
        if (page === 1) throw new Error(`Search failed: ${response.status} ${response.statusText}`)
        continue
      }

      const data = await response.json()
      const songsPage = data.data?.songs?.results || []
      const albumsPage = data.data?.albums?.results || []
      const artistsPage = data.data?.artists?.results || []

      pushUnique(allSongs, songsPage)
      pushUnique(allAlbums, albumsPage)
      pushUnique(allArtists, artistsPage)

      console.log("Page", page, "totals so far:", {
        songs: allSongs.length,
        albums: allAlbums.length,
        artists: allArtists.length,
      })

      if (allSongs.length >= desiredSongs && allAlbums.length >= desiredAlbums && allArtists.length >= desiredArtists) {
        break
      }
    }

    // Enrich songs if needed (resolve perma URLs to real audio)
    const enrichedSongs = await Promise.all(
      allSongs.map(async (song: any) => {
        if (!song.downloadUrl || song.downloadUrl.length === 0) {
          const songUrl = song.perma_url || song.url
          if (songUrl && songUrl.includes("jiosaavn.com")) {
            const fullDetails = await getSongDetails(songUrl)
            if (fullDetails && fullDetails.url && !fullDetails.url.includes("jiosaavn.com/song")) {
              return fullDetails
            }
          }
        }
        return formatSong(song)
      }),
    )

    console.log("Final song count:", enrichedSongs.length) // Debug log to check in console

    return {
      songs: enrichedSongs,
      albums: allAlbums.map(formatAlbum),
      artists: allArtists.map(formatArtist),
      playlists: [],
    }
  } catch (error) {
    console.error("Search error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      query,
      error,
    })
    return { songs: [], albums: [], artists: [], playlists: [] }
  }
}

// Search only songs (convenience wrapper)
export async function searchSongs(query: string): Promise<Song[]> {
  const results = await searchMusic(query)
  return results.songs
}

// Get song details and download URL
export async function getSongDetails(songIdOrUrl: string): Promise<Song | null> {
  try {
    console.log("Fetching full song details for:", songIdOrUrl)

    // Try with link parameter first (using full URL)
    let url = `${API_BASE_URL}/api/songs?link=${encodeURIComponent(songIdOrUrl)}`

    // If it looks like just an ID, also try the id parameter
    if (!songIdOrUrl.includes("http")) {
      url = `${API_BASE_URL}/api/songs?id=${songIdOrUrl}`
    }

    const response = await fetch(url)
    if (!response.ok) throw new Error("Failed to get song details")

    const data = await response.json()
    const songData = data.data?.[0] || data.data

    if (!songData) {
      console.error("No song data returned")
      return null
    }

    console.log("Got full song details with downloadUrl:", !!songData.downloadUrl)
    return formatSong(songData)
  } catch (error) {
    console.error("Get song details error:", error)
    return null
  }
}

// Get album details
export async function getAlbumDetails(albumId: string): Promise<Album | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/albums?id=${albumId}`)
    if (!response.ok) throw new Error("Failed to get album details")

    const data = await response.json()
    const albumData = data.data

    return {
      id: albumData.id,
      name: albumData.name || albumData.title,
      artist: albumData.primaryArtists || albumData.artist || "Unknown Artist",
      image: albumData.image?.[2]?.link || albumData.image || "/placeholder.svg",
      year: albumData.year,
      songCount: albumData.songCount,
      songs: (albumData.songs || []).map(formatSong),
    }
  } catch (error) {
    console.error("Get album details error:", error)
    return null
  }
}

// Get artist details
export async function getArtistDetails(artistId: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/artists?id=${artistId}`)
    if (!response.ok) throw new Error("Failed to get artist details")

    const data = await response.json()
    const base = data.data

    // Resolve/normalize top songs so the player receives playable audio URLs.
    const rawTopSongs = Array.isArray(base?.topSongs) ? base.topSongs : []
    const resolvedTopSongs = await Promise.all(
      rawTopSongs.map(async (s: any) => {
        // If downloadUrl points to audio already, just format.
        const hasValidDownload =
          Array.isArray(s?.downloadUrl) &&
          s.downloadUrl.some((d: any) => {
            const link = d?.link || d?.url || ""
            return link.includes("aac.saavncdn.com") || link.endsWith(".mp3") || link.endsWith(".mp4")
          })

        if (hasValidDownload) {
          return formatSong(s)
        }

        // Try to fetch full details to get a real audio URL.
        const idOrUrl = s?.id || s?.perma_url || s?.url
        if (idOrUrl) {
          const full = await getSongDetails(idOrUrl)
          if (full && full.url && !full.url.includes("jiosaavn.com/song")) {
            return full
          }
        }

        // Fallback to best-effort formatting.
        return formatSong(s)
      }),
    )

    return { ...base, topSongs: resolvedTopSongs }
  } catch (error) {
    console.error("Get artist details error:", error)
    return null
  }
}

// Get trending/top songs from a curated playlist
export async function getTrendingSongs(): Promise<Song[]> {
  // Hindi trending
  const songs = await fetchTrendingSongsByLanguage("hi", 50)
  return songs
}

// Get trending/top English songs using resilient search
export async function getTrendingSongsEnglish(): Promise<Song[]> {
  // English trending
  const songs = await fetchTrendingSongsByLanguage("en", 50)
  return songs
}

export async function getSongsByIds(songIds: string[]): Promise<Song[]> {
  try {
    const songs = await Promise.all(
      songIds.map(async (id) => {
        try {
          return await getSongDetails(id)
        } catch {
          return null
        }
      }),
    )
    return songs.filter((song): song is Song => song !== null)
  } catch (error) {
    console.error("Get songs by IDs error:", error)
    return []
  }
}

// Format song data from API response
export function formatSong(song: any): Song {
  console.log("Formatting song:", song.name || song.title)

  // Get the highest quality download URL
  let audioUrl = ""

  if (song.downloadUrl && Array.isArray(song.downloadUrl) && song.downloadUrl.length > 0) {
    // Get the highest quality (last item in array)
    const highestQuality = song.downloadUrl[song.downloadUrl.length - 1]
    audioUrl = highestQuality?.url || highestQuality?.link || ""
    console.log("Found downloadUrl array, using:", audioUrl.substring(0, 100))
  }

  // Try other common fields
  if (!audioUrl && song.media_url) {
    audioUrl = song.media_url
    console.log("Using media_url:", audioUrl.substring(0, 100))
  }

  // Only accept perma_url if it clearly looks like an audio asset
  if (
    !audioUrl &&
    song.perma_url &&
    (song.perma_url.includes("aac.saavncdn.com") || song.perma_url.endsWith(".mp3") || song.perma_url.endsWith(".mp4"))
  ) {
    audioUrl = song.perma_url
  }

  // Last resort - only use url field if it looks like an audio file
  if (
    !audioUrl &&
    song.url &&
    (song.url.includes(".mp3") || song.url.includes(".mp4") || song.url.includes("aac.saavncdn.com"))
  ) {
    audioUrl = song.url
    console.log("Using url field:", audioUrl.substring(0, 80))
  }

  // Get the best quality image
  let imageUrl = "/placeholder.svg"
  if (song.image) {
    if (Array.isArray(song.image)) {
      const highQualityImage = song.image[2] || song.image[song.image.length - 1] || song.image[0]
      imageUrl = highQualityImage?.url || highQualityImage?.link || imageUrl
    } else if (typeof song.image === "string") {
      imageUrl = song.image
    }
  }

  console.log("Final URLs - Image:", imageUrl.substring(0, 80), "Audio:", audioUrl.substring(0, 80))

  return {
    id: song.id,
    name: song.name || song.title,
    artist: song.primaryArtists || song.artist?.name || song.artists?.primary?.[0]?.name || "Unknown Artist",
    album: song.album?.name || song.album || "Unknown Album",
    duration: Number.parseInt(song.duration) || 0,
    image: imageUrl,
    url: audioUrl,
    year: song.year,
    language: song.language,
    primaryArtists: song.primaryArtists,
    downloadUrl: song.downloadUrl,
  }
}

// Format album data from API response
function formatAlbum(album: any): Album {
  return {
    id: album.id,
    name: album.name || album.title,
    artist: album.primaryArtists || album.artist || "Unknown Artist",
    image: album.image?.[2]?.link || album.image?.[1]?.link || album.image || "/placeholder.svg",
    year: album.year,
    songCount: album.songCount,
  }
}

// Format artist data from API response
function formatArtist(artist: any): Artist {
  return {
    id: artist.id,
    name: artist.name || artist.title,
    image: artist.image?.[2]?.link || artist.image?.[1]?.link || artist.image || "/placeholder.svg",
    followerCount: artist.followerCount,
    isVerified: artist.isVerified,
    dominantLanguage: artist.dominantLanguage,
    dominantType: artist.dominantType,
  }
}

// Get popular artists using searchMusic with resilient fallbacks
export async function getPopularArtists(): Promise<Artist[]> {
  try {
    // Try broad queries that usually surface top artists
    const primary = await searchMusic("top artists")
    if (primary.artists?.length) return primary.artists.slice(0, 48)

    const alt = await searchMusic("arijit")
    if (alt.artists?.length) return alt.artists.slice(0, 48)

    const alt2 = await searchMusic("bollywood artists")
    return (alt2.artists || []).slice(0, 48)
  } catch {
    return []
  }
}

// Robust helper to fetch trending songs from the upstream /trending endpoint
async function fetchTrendingSongsByLanguage(language: "en" | "hi", limit = 50): Promise<Song[]> {
  try {
    const fallbackQueries =
      language === "hi"
        ? ["top hindi songs", "bollywood hits", "new hindi songs", "popular hindi songs"]
        : ["top english songs", "english hits", "global top songs", "popular english songs"]

    const dedup = new Map<string, Song>()
    for (const q of fallbackQueries) {
      const results = await searchSongs(q)
      for (const s of results) {
        if (!dedup.has(s.id)) dedup.set(s.id, s)
        if (dedup.size >= limit) break
      }
      if (dedup.size >= limit) break
    }

    return Array.from(dedup.values()).slice(0, limit)
  } catch {
    // Return empty array on failure; callers already handle gracefully
    return []
  }
}
