import { manuals, type Citation } from "./manuals";
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  source?: "built-in" | "openai";
  citations?: Citation[];
};
export type Conversation = {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};
export const CHAT_KEY = "cardoc-conversation-v1";
export function newConversation(): Conversation {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}
export function message(
  role: ChatMessage["role"],
  text: string,
  extra: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    ...extra,
    id: crypto.randomUUID(),
    role,
    text,
    createdAt: new Date().toISOString(),
  };
}
export function validCitations(value: unknown): Citation[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((c): c is Citation => {
      if (!c || typeof c !== "object") return false;
      const m = manuals.find((m) => m.id === c.manualId);
      return (
        !!m &&
        typeof c.id === "string" &&
        typeof c.title === "string" &&
        c.title.length < 300 &&
        Number.isInteger(c.page) &&
        c.page > 0 &&
        c.page <= m.pages &&
        c.url === `${m.url}#page=${c.page}`
      );
    })
    .slice(0, 6);
}
export function parseConversation(input: unknown): Conversation {
  if (!input || typeof input !== "object")
    throw new Error("Not a CarDoc conversation");
  const c = input as Conversation;
  if (
    c.schemaVersion !== 1 ||
    typeof c.id !== "string" ||
    c.id.length > 100 ||
    !Array.isArray(c.messages) ||
    c.messages.length > 200 ||
    !validDate(c.createdAt) ||
    !validDate(c.updatedAt)
  )
    throw new Error("Unsupported or invalid conversation JSON");
  const messages = c.messages.map((m) => {
    if (
      !m ||
      typeof m.id !== "string" ||
      m.id.length > 100 ||
      !["user", "assistant"].includes(m.role) ||
      typeof m.text !== "string" ||
      m.text.length > 12000 ||
      !validDate(m.createdAt)
    )
      throw new Error("Invalid conversation message");
    return {
      id: m.id,
      role: m.role,
      text: m.text,
      createdAt: m.createdAt,
      source:
        m.source === "openai" ? ("openai" as const) : ("built-in" as const),
      citations: validCitations(m.citations),
    };
  });
  return {
    schemaVersion: 1,
    id: c.id,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    messages,
  };
}
function validDate(value: unknown) {
  return (
    typeof value === "string" &&
    value.length < 40 &&
    Number.isFinite(Date.parse(value))
  );
}
export function loadConversation(): Conversation {
  try {
    return parseConversation(
      JSON.parse(window.localStorage.getItem(CHAT_KEY) || "null"),
    );
  } catch {
    return newConversation();
  }
}
export function historyForAI(messages: ChatMessage[]) {
  let budget = 24000;
  const result: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of messages.slice(-12).reverse()) {
    const content = m.text.slice(0, 6000);
    if (content.length > budget) break;
    budget -= content.length;
    result.unshift({ role: m.role, content });
  }
  return result;
}
export function followupQuery(question: string, messages: ChatMessage[]) {
  const previous = messages.filter((m) => m.role === "user").at(-1)?.text;
  return previous && /\b(it|that|this|those|they|same)\b/i.test(question)
    ? `${previous}\nFollow-up: ${question}`
    : question;
}
