// Netlify Function: generate-glossary
// Put this file at: netlify/functions/generate-glossary.js
// Store your OpenAI key in Netlify as OPENAI_API_KEY.

const GLOSSARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["glossary"],
  properties: {
    glossary: {
      type: "object",
      additionalProperties: false,
      required: ["title", "subject", "topic", "keyStage", "level", "outputFormat", "terms"],
      properties: {
        title: { type: "string" },
        subject: { type: "string" },
        topic: { type: "string" },
        keyStage: { type: "string" },
        level: { type: "string" },
        outputFormat: { type: "string" },
        terms: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["term", "definition"],
            properties: {
              term: { type: "string" },
              definition: { type: "string" }
            }
          }
        }
      }
    }
  }
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

function extractOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed. Use POST from the glossary page." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return jsonResponse(500, { ok: false, error: "OPENAI_API_KEY is not set in Netlify environment variables." });
  }

  try {
    const requestBody = JSON.parse(event.body || "{}");
    const prompt = String(requestBody.prompt || "").trim();

    if (!prompt) {
      return jsonResponse(400, { ok: false, error: "Missing prompt." });
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: "You generate classroom-ready UK secondary school glossary content. Return only JSON that matches the supplied schema."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "teacher_ai_hub_glossary",
            strict: true,
            schema: GLOSSARY_SCHEMA
          }
        }
      })
    });

    const data = await openaiResponse.json().catch(() => null);

    if (!openaiResponse.ok) {
      return jsonResponse(openaiResponse.status, {
        ok: false,
        error: data?.error?.message || "OpenAI API request failed. Check API key, billing and model access."
      });
    }

    const outputText = extractOutputText(data || {});
    if (!outputText) {
      return jsonResponse(500, { ok: false, error: "No output text returned from OpenAI." });
    }

    let parsed;
    try {
      parsed = JSON.parse(outputText);
    } catch (error) {
      return jsonResponse(500, {
        ok: false,
        error: "OpenAI returned text that could not be parsed as JSON.",
        raw: outputText
      });
    }

    return jsonResponse(200, { ok: true, result: parsed, jsonText: JSON.stringify(parsed, null, 2) });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error.message || "Unexpected server error." });
  }
};
