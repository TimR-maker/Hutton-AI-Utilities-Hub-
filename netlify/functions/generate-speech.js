// Teacher AI Hub Premium voice service.
// Uses distinct, high-quality voices for the five colleagues.

const SPEAKERS = {
  Sarah: {
    voice: "marin",
    direction: "Speak with a natural Northern England accent from Lancashire. You are an experienced English teacher and SENDCO. Warm, calm and reassuring with a friendly smile in your voice. Speak conversationally as though chatting with trusted colleagues in a school staff room. Use authentic Northern British pronunciation and intonation. Never sound American, theatrical or exaggerated."
  },
  Mark: {
    voice: "ash",
    direction: "Speak with a mature Lancashire accent. You are a highly experienced history teacher and former head of department. Calm, reflective and quietly humorous. Steady, confident and unhurried. Use natural Northern English pronunciation throughout. Never drift into American pronunciation."
  },
  Rachel: {
    voice: "coral",
    direction: "Speak with a confident Northern England accent. You are an enthusiastic assessment lead. Clear, articulate and energetic without rushing. Sound intelligent and curious rather than dramatic. Use authentic Northern British pronunciation throughout and never American."
  },
  Imran: {
    voice: "echo",
    direction: "Speak with a friendly Manchester or Lancashire accent. Warm, approachable and optimistic. Natural conversational rhythm as though talking in a real school staff room. Use British pronunciation throughout. Never sound like an American presenter."
  },
  Aisha: {
    voice: "nova",
    direction: "Speak with a clear Northern English female voice. Professional, organised and thoughtful. Confident without sounding formal. Natural Lancashire pronunciation with relaxed pacing. Never use American pronunciation or exaggerated regional speech."
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
        speed: 1.06,
        instructions: profile.direction,
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
