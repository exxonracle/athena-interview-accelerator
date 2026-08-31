import { openAIClient } from '@/lib/ai/client';
import { AppError, errorResponse } from '@/lib/server/errors';

export async function POST(request: Request) {
  try {
    const { text } = await request.json() as { text?: string };
    if (!text?.trim()) throw new AppError(400, 'Question text is required.');
    const speech = await openAIClient().audio.speech.create({ model: 'gpt-4o-mini-tts', voice: 'cedar', input: text.slice(0, 2000), instructions: 'Speak as a calm, attentive, professional interviewer. Use a measured pace and natural emphasis.' });
    return new Response(await speech.arrayBuffer(), { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=3600' } });
  } catch (error) {
    return errorResponse(error);
  }
}
