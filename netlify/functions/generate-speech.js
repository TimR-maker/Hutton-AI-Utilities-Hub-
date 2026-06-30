// Teacher AI Hub Premium voice service.
// ElevenLabs version with per-colleague delivery settings.

const SPEAKERS = {
  Sarah: {
    voiceId: "bcbCvQCwSa1wTtpvM2WS",
    settings: { stability: 0.56, similarity_boost: 0.85, style: 0.10, use_speaker_boost: true }
  },
  Mark: {
    voiceId: "TockUyWWZDWGrk7QuzTF",
    settings: { stability: 0.82, similarity_boost: 0.78, style: 0.00, use_speaker_boost: true }
  },
  Rachel: {
    voiceId: "b6T2IrWoTx7ZIb3BHJSg",
    settings: { stability: 0.48, similarity_boost: 0.88, style: 0.10, use_speaker_boost: true }
  },
  Imran: {
    voiceId: "8KgifH3usc0tJtr7QzP4",
    settings: { stability: 0.40, similarity_boost: 0.82, style: 0.22, use_speaker_boost: true }
  },
  Aisha: {
    voiceId: "ZF6FPAbjXT4488VcRRnw",
    settings: { stability: 0.58, similarity_boost: 0.85, style: 0.08, use_speaker_boost: true }
  }
};
function jsonResponse(statusCode, error) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify({ ok: false, error })
  };
}


exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return jsonResponse(405, "Method not allowed.");
  if (!process.env.ELEVENLABS_API_KEY) return jsonResponse(500, "Voice service is not configured.");

  try {
    const body = JSON.parse(event.body || "{}");
    const speaker = String(body.speaker || "");
    const text = String(body.text || "").trim();
    const profile = SPEAKERS[speaker];

    if (!profile) return jsonResponse(400, "Unknown colleague voice.");
    if (!text || text.length > 1800) return jsonResponse(400, "Speech text is missing or too long.");

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${profile.voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          model_id: process.env.ELEVENLABS_TTS_MODEL || "eleven_multilingual_v2",
          voice_settings: profile.settings
        })
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      return jsonResponse(
        response.status,
        data?.detail?.message || data?.message || "Speech generation failed."
      );
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
