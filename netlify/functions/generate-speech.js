// Teacher AI Hub Premium voice service.
// Uses ElevenLabs voices for the colleagues.

const SPEAKERS = {
  Sarah: {
    voiceId: "bcbCvQCwSa1wTtpvM2WS"
  },
  Mark: {
    voiceId: "TockUyWWZDWGrk7QuzTF"
  },
  Rachel: {
    voiceId: "b6T2IrWoTx7ZIb3BHJSg"
  },
  Imran: {
    voiceId: "8KgifH3usc0tJtr7QzP4"
  },
  Aisha: {
    voiceId: "ZF6FPAbjXT4488VcRRnw"
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

  if (event.httpMethod !== "POST")
    return jsonResponse(405, "Method not allowed.");

  if (!process.env.ELEVENLABS_API_KEY)
    return jsonResponse(500, "Voice service is not configured.");

  try {

    const body = JSON.parse(event.body || "{}");
    const speaker = String(body.speaker || "");
    const text = String(body.text || "").trim();

    const profile = SPEAKERS[speaker];

    if (!profile)
      return jsonResponse(400, "Unknown colleague voice.");

    if (!text || text.length > 1800)
      return jsonResponse(400, "Speech text is missing or too long.");

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${profile.voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.80,
            style: 0.15,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => null);

      return jsonResponse(
        response.status,
        data?.detail?.message ||
        data?.message ||
        "Speech generation failed."
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

    return jsonResponse(
      500,
      error.message || "Unexpected voice service error."
    );

  }

};
