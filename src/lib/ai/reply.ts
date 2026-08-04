import type { AiSettings } from '@/types';
import { decrypt } from '@/lib/utils/crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface AiReplyRequest {
  incomingMessage: string;
  contactName?: string;
  aiSettings: AiSettings;
}

export interface AiReplyResult {
  response: string;
  provider: string;
}

export async function generateAiReply(req: AiReplyRequest): Promise<AiReplyResult> {
  const { incomingMessage, contactName, aiSettings } = req;
  const apiKey = decrypt(aiSettings.apiKey);

  const systemPrompt = buildSystemPrompt(aiSettings.businessContext, aiSettings.language);
  const userMessage = contactName
    ? `${contactName} a répondu : "${incomingMessage}"`
    : `Un contact a répondu : "${incomingMessage}"`;

  switch (aiSettings.provider) {
    case 'gemini':
      return generateWithGemini(apiKey, systemPrompt, userMessage);
    case 'openai':
      return generateWithOpenAI(apiKey, systemPrompt, userMessage);
    case 'anthropic':
      return generateWithAnthropic(apiKey, systemPrompt, userMessage);
    case 'custom':
      return generateWithOpenAICompatible(
        apiKey,
        systemPrompt,
        userMessage,
        aiSettings.customEndpoint || ''
      );
    default:
      throw new Error(`Provider IA non supporté: ${aiSettings.provider}`);
  }
}

function buildSystemPrompt(businessContext: string, language: AiSettings['language']): string {
  const langInstruction = language === 'fr'
    ? 'Réponds toujours en français.'
    : language === 'en'
    ? 'Always reply in English.'
    : 'Réponds dans la langue du message reçu.';

  return `Tu es l'assistant email de l'entreprise suivante :

${businessContext}

${langInstruction}

Règles importantes :
- Sois professionnel, concis et utile
- Ne dévoile pas que tu es une IA sauf si explicitement demandé
- Réponds directement au sujet du message reçu
- Maximum 150 mots
- Signe simplement avec "Cordialement" (ou "Best regards" en anglais)`;
}

async function generateWithGemini(apiKey: string, system: string, message: string): Promise<AiReplyResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const result = await model.generateContent(`${system}\n\n${message}`);
  return {
    response: result.response.text(),
    provider: 'gemini-1.5-flash',
  };
}

async function generateWithOpenAI(apiKey: string, system: string, message: string): Promise<AiReplyResult> {
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: message },
    ],
    max_tokens: 300,
    temperature: 0.7,
  });

  return {
    response: completion.choices[0].message.content || '',
    provider: 'gpt-4o-mini',
  };
}

async function generateWithAnthropic(apiKey: string, system: string, message: string): Promise<AiReplyResult> {
  const anthropic = new Anthropic({ apiKey });
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-20240307',
    max_tokens: 300,
    system,
    messages: [{ role: 'user', content: message }],
  });

  const text = msg.content.find((c) => c.type === 'text');
  return {
    response: text?.type === 'text' ? text.text : '',
    provider: 'claude-haiku',
  };
}

async function generateWithOpenAICompatible(
  apiKey: string, system: string, message: string, endpoint: string
): Promise<AiReplyResult> {
  const openai = new OpenAI({ apiKey, baseURL: endpoint });
  const completion = await openai.chat.completions.create({
    model: 'default',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: message },
    ],
    max_tokens: 300,
  });
  return {
    response: completion.choices[0].message.content || '',
    provider: 'custom',
  };
}
