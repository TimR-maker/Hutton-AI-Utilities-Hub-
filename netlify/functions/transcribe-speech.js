// Teacher AI Hub Premium microphone transcription service.

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body)
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Method not allowed." });
  if (!process.env.OPENAI_API_KEY) return jsonResponse(500, { ok: false, error: "Transcription is not configured." });

  try {
    const body = JSON.parse(event.body || "{}");
    const audio = String(body.audio || "");
    const mimeType = String(body.mimeType || "audio/webm").split(";")[0];
    const allowedTypes = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"]);
    if (!audio) return jsonResponse(400, { ok: false, error: "No recording was supplied." });
    if (!allowedTypes.has(mimeType)) return jsonResponse(400, { ok: false, error: "Unsupported recording format." });

    const buffer = Buffer.from(audio, "base64");
    if (!buffer.length || buffer.length > 5 * 1024 * 1024) {
      return jsonResponse(400, { ok: false, error: "The recording is empty or too large." });
    }

    const extension = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/wav": "wav" }[mimeType];
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: mimeType }), `teacher-contribution.${extension}`);
    form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
    form.append("language", "en");
    form.append("prompt", "A UK secondary teacher discussing lesson planning with colleagues. Preserve subject terminology and use British English spelling.");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) return jsonResponse(response.status, { ok: false, error: data?.error?.message || "Transcription failed." });

    const transcript = String(data?.text || "").trim();
    if (!transcript) return jsonResponse(500, { ok: false, error: "No speech was recognised." });
    return jsonResponse(200, { ok: true, transcript });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error.message || "Unexpected transcription error." });
  }
};
