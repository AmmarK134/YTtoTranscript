import { NextRequest, NextResponse } from "next/server";

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string;
}

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

// Bracket-matching parser: finds "captionTracks":[...] reliably regardless of surrounding JSON structure
function extractCaptionTracks(html: string): CaptionTrack[] | null {
  const marker = '"captionTracks":';
  const idx = html.indexOf(marker);
  if (idx === -1) return null;

  const start = idx + marker.length;
  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;

  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }

  if (end === -1) return null;

  try {
    return JSON.parse(html.slice(start, end)) as CaptionTrack[];
  } catch {
    return null;
  }
}

function parseXmlTranscript(xml: string): string {
  return xml
    .replace(/<text[^>]*>/g, " ")
    .replace(/<\/text>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTranscript(videoId: string): Promise<string> {
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!pageRes.ok) throw new Error(`YouTube returned HTTP ${pageRes.status}`);
  const html = await pageRes.text();

  if (html.includes('class="g-recaptcha"')) {
    throw new Error("YouTube is showing a CAPTCHA — try again in a few minutes.");
  }

  const tracks = extractCaptionTracks(html);

  if (!tracks || tracks.length === 0) {
    throw new Error(
      "No captions found for this video. The video may have captions disabled, or it may be age-restricted/private."
    );
  }

  const track =
    tracks.find((t) => t.languageCode === "en") ||
    tracks.find((t) => t.languageCode.startsWith("en")) ||
    tracks[0];

  const xmlRes = await fetch(track.baseUrl);
  if (!xmlRes.ok) throw new Error("Failed to fetch caption data from YouTube.");

  return parseXmlTranscript(await xmlRes.text());
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url parameter is required" }, { status: 400 });

  const videoId = extractVideoId(url);
  if (!videoId)
    return NextResponse.json({ error: "Could not extract a video ID from that URL." }, { status: 400 });

  try {
    const transcript = await fetchTranscript(videoId);
    return NextResponse.json({ transcript });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch transcript";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
