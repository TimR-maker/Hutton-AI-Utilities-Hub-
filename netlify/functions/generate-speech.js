// Teacher AI Hub Premium voice service.
// Uses distinct voices with subtle Lancashire / North West English delivery.

const SPEAKERS = {
  Sarah: {
    voice: "coral",
    direction: "Warm, calm and reassuring, with attentive phrasing and gentle confidence."
  },
  Mark: {
    voice: "cedar",
    direction: "Measured, experienced and understated, with a dry warmth and unhurried authority."
  },
  Rachel: {
    voice: "marin",
    direction: "Clear, precise and curious, with purposeful energy and thoughtful emphasis on questions."
  },
  Imran: {
    voice: "echo",
    direction: "Friendly, lively and optimistic, with conversational energy that remains professional."
  },
  Aisha: {
    voice: "sage",
    direction: "Composed, organised and pragmatic, speaking clearly with concise, assured emphasis."
  }
};

function jsonResponse(statusCode, error) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ ok: false, error })
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return jsonResponse(405, "Method not allowed.");
  if (!process.env.OPENAI_API_KEY) return jsonResponse(500, "Voice service is not configured.");

  try {
    const body = JSON.parse(event.body || "{}");
    const speaker = String(body.speaker || "");
    const text = String(body.text || "").trim();
    const profile = SPEAKERS[speaker];

    if (!profile) return jsonResponse(400, "Unknown colleague voice.");
    if (!text || text.length > 1800) return jsonResponse(400, "Speech text is missing or too long.");

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
        voice: profile.voice,
        input: text,
        instructions: `Speak as a trusted UK secondary teacher from Lancashire. Use a natural contemporary Lancashire or broader North West English accent. Keep it subtle, authentic and professional: never exaggerated, comic or dialect-heavy. ${profile.direction}`,
        response_format: "mp3"
      })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      return jsonResponse(response.status, data?.error?.message || "Speech generation failed.");
    }

    const audio = Buffer.from(await response.arrayBuffer()).toString("base64");
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=3600"
      },
      body: audio
    };
  } catch (error) {
    return jsonResponse(500, error.message || "Unexpected voice service error.");
  }
};
