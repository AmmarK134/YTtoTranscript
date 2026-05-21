"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTranscript = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setTranscript("");

    try {
      const res = await fetch(`/api/transcript?url=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setTranscript(data.transcript);
      }
    } catch {
      setError("Could not reach the transcript service. Make sure the Python backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
          YouTube Transcript
        </h1>
        <p className="text-center text-gray-500 text-sm mb-8">
          Paste any YouTube URL to get its transcript
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchTranscript()}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <button
            onClick={fetchTranscript}
            disabled={loading || !url.trim()}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Fetching…" : "Get Transcript"}
          </button>
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        {transcript && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 max-h-[28rem] overflow-y-auto shadow-sm">
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
          </div>
        )}
      </div>
    </main>
  );
}
