// Teacher AI Hub Premium image generation function.

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed." });
  }
  if (!process.env.OPENAI_API_KEY) {
    return jsonResponse(500, { ok: false, error: "OPENAI_API_KEY is not set in Netlify." });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const prompt = String(body.prompt || "").trim();
    if (!prompt) return jsonResponse(400, { ok: false, error: "Missing image prompt." });
    if (prompt.length > 12000) return jsonResponse(400, { ok: false, error: "The image prompt is too long." });

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
        prompt,
        n: 1,
        size: "1536x1024",
        quality: "medium",
        output_format: "png"
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return jsonResponse(response.status, {
        ok: false,
        error: data?.error?.message || "Image generation failed. Check API access, billing and organisation verification."
      });
    }

    const imageBase64 = data?.data?.[0]?.b64_json;
    if (!imageBase64) return jsonResponse(500, { ok: false, error: "No image data was returned." });

    return jsonResponse(200, {
      ok: true,
      imageBase64,
      mimeType: "image/png",
      revisedPrompt: data?.data?.[0]?.revised_prompt || ""
    });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error.message || "Unexpected image generation error." });
  }
};
