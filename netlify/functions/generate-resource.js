// Netlify Function: generate-resource
// Put this file at: netlify/functions/generate-resource.js
// Store your OpenAI key in Netlify as OPENAI_API_KEY.

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

function safeSchemaName(name) {
  return String(name || "teacher_ai_hub_resource").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "teacher_ai_hub_resource";
}

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed. Use POST from the utility page." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return jsonResponse(500, { ok: false, error: "OPENAI_API_KEY is not set in Netlify environment variables." });
  }

  try {
    const requestBody = JSON.parse(event.body || "{}");
    const prompt = String(requestBody.prompt || "").trim();
    const schema = requestBody.schema;
    const schemaName = safeSchemaName(requestBody.schemaName);
    const systemMessage = String(requestBody.systemMessage || "You generate classroom-ready UK secondary school teaching resources. Return only JSON that matches the supplied schema.").trim();

    if (!prompt) {
      return jsonResponse(400, { ok: false, error: "Missing prompt." });
    }
    if (!schema || typeof schema !== "object") {
      return jsonResponse(400, { ok: false, error: "Missing JSON schema." });
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
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema
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
