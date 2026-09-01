import { getGroqConfig, groqClient } from '@/lib/ai/client';
import { AppError, errorResponse } from '@/lib/server/errors';

export async function POST(request: Request) {
  try {
    const form = await request.formData().catch(() => { throw new AppError(400, 'Submit recorded audio as form data.', 'INVALID_FORM'); });
    const audio = form.get('audio');
    if (!(audio instanceof File) || !audio.size) throw new AppError(400, 'No recorded audio was received.', 'EMPTY_RECORDING');
    if (audio.size > 10 * 1024 * 1024) throw new AppError(413, 'The recording is too large. Keep responses under three minutes.', 'AUDIO_TOO_LARGE');
    const context = form.get('context');
    const transcription = await groqClient().audio.transcriptions.create({
      file: audio,
      model: getGroqConfig().transcriptionModel,
      prompt: (typeof context === 'string' ? context : '').slice(0, 800),
      temperature: 0,
    });
    const text = transcription.text.trim();
    if (!text) throw new AppError(422, 'No speech was detected. Try recording again or type your answer.', 'NO_SPEECH');
    return Response.json({ text });
  } catch (error) {
    return errorResponse(error);
  }
}
