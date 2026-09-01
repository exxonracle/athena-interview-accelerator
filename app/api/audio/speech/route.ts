import { getGroqConfig, groqClient } from '@/lib/ai/client';
import { AppError, errorResponse } from '@/lib/server/errors';

export async function POST(request: Request) {
  try {
    const { text } = await request.json() as { text?: string };
    if (!text?.trim()) throw new AppError(400, 'Question text is required.');
    const config = getGroqConfig();
    const speech = await groqClient().audio.speech.create({
      model: config.speechModel,
      voice: config.speechVoice,
      input: text.slice(0, 2000),
      response_format: 'wav',
    });
    return new Response(await speech.arrayBuffer(), { headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'private, max-age=3600' } });
  } catch (error) {
    return errorResponse(error);
  }
}
