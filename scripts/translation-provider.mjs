import {
  buildRequest,
  parseCompletion,
  validateTranslation,
  translationSchema,
} from "./translation-core.mjs";

export function translationConfig(env) {
  const provider =
    env.CARDOC_TRANSLATION_PROVIDER ||
    (env.GEMINI_API_KEY ? "gemini" : "openai");
  if (!["gemini", "openai"].includes(provider))
    throw new Error("CARDOC_TRANSLATION_PROVIDER must be gemini or openai.");
  const key = provider === "gemini" ? env.GEMINI_API_KEY : env.OPENAI_API_KEY;
  const model =
    env.CARDOC_TRANSLATION_MODEL ||
    env.CARDOC_AI_MODEL ||
    (provider === "gemini" ? "gemini-3.8-flash" : "");
  if (!key || !model)
    throw new Error(
      `Configure ${provider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY"} and a translation model in .env. No API call made.`,
    );
  if (
    (provider === "openai" && model.startsWith("gemini-")) ||
    (provider === "gemini" && /^(gpt-|o[134]-)/.test(model))
  )
    throw new Error(
      "Translation model belongs to a different provider; set CARDOC_TRANSLATION_MODEL explicitly.",
    );
  return { provider, key, model };
}

export function buildGeminiRequest(model, page, imageUrl) {
  const input = buildRequest(model, page, imageUrl);
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(imageUrl);
  if (!match) throw new Error("Expected a rendered PNG page.");
  return {
    systemInstruction: { parts: [{ text: input.messages[0].content }] },
    contents: [
      {
        role: "user",
        parts: [
          { text: input.messages[1].content[0].text },
          { inlineData: { mimeType: "image/png", data: match[1] } },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 12000,
      responseMimeType: "application/json",
      responseJsonSchema: translationSchema,
    },
  };
}

export function parseGeminiCompletion(data) {
  const candidate = data?.candidates?.[0];
  if (data?.promptFeedback?.blockReason || candidate?.finishReason !== "STOP")
    throw new Error("Translation blocked or truncated; no page saved.");
  const text = candidate.content?.parts
    ?.filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
  return validateTranslation(JSON.parse(text));
}

export async function translatePage(config, page, imageUrl, fetchImpl = fetch) {
  const gemini = config.provider === "gemini";
  const endpoint = gemini
    ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`
    : "https://api.openai.com/v1/chat/completions";
  const response = await fetchImpl(endpoint, {
    method: "POST",
    signal: AbortSignal.timeout(180000),
    headers: {
      "Content-Type": "application/json",
      ...(gemini
        ? { "x-goog-api-key": config.key }
        : { Authorization: `Bearer ${config.key}` }),
    },
    body: JSON.stringify(
      gemini
        ? buildGeminiRequest(config.model, page, imageUrl)
        : buildRequest(config.model, page, imageUrl),
    ),
  });
  if (!response.ok)
    throw new Error(
      `${config.provider} returned HTTP ${response.status}; completed pages are saved. Re-run to resume.`,
    );
  const data = await response.json();
  return {
    translation: gemini ? parseGeminiCompletion(data) : parseCompletion(data),
    usage: (gemini ? data.usageMetadata : data.usage) || null,
  };
}
