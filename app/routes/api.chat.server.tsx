import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Route } from "./+types/api.chat.server";
import { getSession } from '~/sessions.server';
import { getTemplate, validateParams } from '~/lib/chat/query-templates';
import {
  INTENT_CLASSIFIER_PROMPT,
  RESPONSE_FORMATTER_PROMPT,
  GENERAL_CHAT_PROMPT,
} from '~/lib/chat/prompts';

// Lazy-load the AI client to avoid module-level errors
let genAI: GoogleGenerativeAI | null = null;
function getGenAI() {
  if (!genAI) {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is required');
    }
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  }
  return genAI;
}

export async function action({ request }: Route.ActionArgs) {
  // ── 1. Auth ──────────────────────────────────────────────────────────
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId') as number;

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const userMessage = String(formData.get('message') ?? '').trim();

  if (!userMessage) {
    return Response.json({ error: 'Message required' }, { status: 400 });
  }

  try {
    const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });

    // ── 2. Classify intent ─────────────────────────────────────────────
    console.log('[Chat API] Classifying intent for:', userMessage);
    const classifyResult = await model.generateContent(
      INTENT_CLASSIFIER_PROMPT + userMessage
    );
    const classifyText = classifyResult.response.text().trim();
    console.log('[Chat API] Classification result:', classifyText);

    let parsed: { templateId: string; params: Record<string, unknown> };
    try {
      // Strip markdown code fences if present
      const jsonStr = classifyText.replace(/^```json?\n?|\n?```$/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.warn('[Chat API] Failed to parse classification, falling back to general_chat');
      parsed = { templateId: 'general_chat', params: {} };
    }

    const { templateId } = parsed;
    console.log('[Chat API] Template:', templateId, 'Params:', parsed.params);

    // ── 3. Handle general chat ─────────────────────────────────────────
    if (templateId === 'general_chat') {
      const chatResult = await model.generateContent(
        GENERAL_CHAT_PROMPT + userMessage
      );
      return Response.json({
        response: chatResult.response.text(),
        timestamp: new Date().toISOString(),
      });
    }

    // ── 4. Validate params ─────────────────────────────────────────────
    const params = validateParams(parsed.params ?? {});

    // ── 5. Look up and execute template ────────────────────────────────
    const template = getTemplate(templateId);
    if (!template) {
      console.warn('[Chat API] Unknown template:', templateId);
      const chatResult = await model.generateContent(
        GENERAL_CHAT_PROMPT + userMessage
      );
      return Response.json({
        response: chatResult.response.text(),
        timestamp: new Date().toISOString(),
      });
    }

    console.log('[Chat API] Executing template:', templateId);
    const queryResults = await template.execute(userId, params);
    console.log('[Chat API] Query returned results');

    // ── 6. Format results with AI ──────────────────────────────────────
    const formatterPrompt = RESPONSE_FORMATTER_PROMPT
      .replace('{userQuestion}', userMessage)
      .replace('{templateId}', templateId)
      .replace('{queryResults}', JSON.stringify(queryResults, null, 2));

    const formatResult = await model.generateContent(formatterPrompt);
    console.log('[Chat API] Response formatted');

    return Response.json({
      response: formatResult.response.text(),
      timestamp: new Date().toISOString(),
      templateId,
    });

  } catch (error) {
    console.error('[Chat API] Error:', error);
    return Response.json({
      response: "I'm sorry, I had trouble processing that. Could you try rephrasing your question? 💭",
    });
  }
}
