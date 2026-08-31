'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AudioLines, Camera, CameraOff, Check, CircleAlert, Clock3, Headphones, Keyboard, LoaderCircle, Mic, Pause, RotateCcw, Send, Sparkles, Volume2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

type Level = 'SCREENING' | 'COMPETENCY' | 'DEEP_DIVE';
type Question = { id: string; sequence: number; level: Level; difficulty: number; question: string; primaryTopic: string; answer?: { transcript: string; durationMs?: number } | null };
type InterviewData = { application: { roleTitle?: string }; analysis: { candidate: { candidateName?: string; keySkills: string[] } }; interview: { id: string; state: string; currentLevel: Level; questionCount: number; questions: Question[] } };
const levelLabels: Record<Level, string> = { SCREENING: 'Screening', COMPETENCY: 'Competency', DEEP_DIVE: 'Deep Dive' };

export function InterviewRoom({ applicationId }: { applicationId: string }) {
  const [data, setData] = useState<InterviewData | null>(null);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'typed'>('voice');
  const [elapsed, setElapsed] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStream = useRef<MediaStream | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/applications/${applicationId}`);
    const body = await response.json() as InterviewData & { error?: string };
    if (!response.ok) throw new Error(body.error || 'Interview could not be loaded.');
    if (!body.interview) { window.location.assign(`/applications/${applicationId}/analysis`); return; }
    if (body.interview.state === 'COMPLETED') { window.location.assign(`/applications/${applicationId}/results`); return; }
    setData(body);
  }, [applicationId]);

  useEffect(() => { load().catch((cause) => setError(cause.message)); }, [load]);
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 250);
    return () => window.clearInterval(timer);
  }, [recording]);
  useEffect(() => () => { cameraStream.current?.getTracks().forEach((track) => track.stop()); if (audioUrl.current) URL.revokeObjectURL(audioUrl.current); }, []);

  const current = data?.interview.questions.find((question) => !question.answer) ?? data?.interview.questions.at(-1);
  const speakQuestion = useCallback(async () => {
    if (!current || speaking) return;
    setError(''); setSpeaking(true);
    try {
      if (audioReady && audioRef.current) { await audioRef.current.play(); return; }
      const response = await fetch('/api/audio/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: current.question }) });
      if (!response.ok) { const body = await response.json() as { error?: string }; throw new Error(body.error || 'Question audio could not be generated.'); }
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
      audioUrl.current = URL.createObjectURL(await response.blob());
      const audio = new Audio(audioUrl.current);
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => { setSpeaking(false); setError('Question audio could not be played. You can continue with the visible question.'); };
      audioRef.current = audio; setAudioReady(true); await audio.play();
    } catch (cause) { setSpeaking(false); setError(cause instanceof Error ? cause.message : 'Question audio could not be played.'); }
  }, [audioReady, current, speaking]);

  useEffect(() => { setAnswer(''); setElapsed(0); setAudioReady(false); if (current) speakQuestion().catch(() => undefined); }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function startRecording() {
    setError(''); setInputMode('voice');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('This browser does not support microphone recording. Use the typed answer option.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const preferred = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      chunks.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      recorder.onstop = () => { stream.getTracks().forEach((track) => track.stop()); transcribe(new Blob(chunks.current, { type: recorder.mimeType || 'audio/webm' })).catch(() => undefined); };
      mediaRecorder.current = recorder; startedAt.current = Date.now(); setElapsed(0); setRecording(true); recorder.start(250);
    } catch (cause) { setError(cause instanceof DOMException && cause.name === 'NotAllowedError' ? 'Microphone permission was denied. Enable it in browser settings or use a typed answer.' : 'Athena could not access your microphone. Use a typed answer or try again.'); }
  }
  function stopRecording() { if (mediaRecorder.current?.state === 'recording') { mediaRecorder.current.stop(); setRecording(false); } }
  async function transcribe(blob: Blob) {
    if (blob.size < 500) { setError('The recording was empty. Try again and speak after the timer starts.'); return; }
    setTranscribing(true);
    try {
      const form = new FormData(); form.set('audio', new File([blob], `answer.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`, { type: blob.type })); form.set('context', `${data?.application.roleTitle || ''} ${data?.analysis.candidate.keySkills.join(', ') || ''}`);
      const response = await fetch('/api/audio/transcriptions', { method: 'POST', body: form });
      const body = await response.json() as { text?: string; error?: string };
      if (!response.ok || !body.text) throw new Error(body.error || 'Transcription failed.');
      setAnswer(body.text);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Transcription failed.'); } finally { setTranscribing(false); }
  }
  async function toggleCamera() {
    if (cameraOn) { cameraStream.current?.getTracks().forEach((track) => track.stop()); cameraStream.current = null; setCameraOn(false); return; }
    try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640 }, audio: false }); cameraStream.current = stream; if (videoRef.current) videoRef.current.srcObject = stream; setCameraOn(true); }
    catch { setError('Camera permission was denied. Video is optional and the interview can continue voice-first.'); }
  }
  async function submitAnswer() {
    if (!current || answer.trim().length < 2 || submitting) return;
    setSubmitting(true); setError('');
    try {
      const response = await fetch(`/api/interviews/${data!.interview.id}/answers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: current.id, transcript: answer, clientSubmissionId: crypto.randomUUID(), inputMode, durationMs: elapsed * 1000 }) });
      const body = await response.json() as { completed?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error || 'Your answer could not be submitted.');
      if (body.completed) window.location.assign(`/applications/${applicationId}/results`); else await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your answer could not be submitted.'); } finally { setSubmitting(false); }
  }

  if (!data || !current) return <main className="grid min-h-screen place-items-center bg-[#09142e] text-white"><div className="text-center">{error ? <CircleAlert className="mx-auto mb-4 size-8 text-rose-300" /> : <LoaderCircle className="mx-auto mb-4 size-8 animate-spin text-[#e6bd72]" />}<p>{error || 'Preparing your interview room…'}</p></div></main>;
  const levels: Level[] = ['SCREENING', 'COMPETENCY', 'DEEP_DIVE'];
  const completedQuestions = data.interview.questions.filter((question) => question.answer).length;
  return (
    <main className="min-h-screen bg-[#09142e] text-white">
      <header className="border-b border-white/10 bg-[#09142e]/90 backdrop-blur-xl"><div className="mx-auto flex h-18 max-w-[1500px] items-center justify-between px-5 lg:px-8"><Link href="/" className="flex items-center gap-3"><span className="athena-mark">A</span><span><strong className="block text-[15px] tracking-[0.17em]">ATHENA</strong><span className="hidden text-[10px] uppercase tracking-[0.15em] text-white/45 sm:block">Live interview</span></span></Link><div className="flex items-center gap-3"><Badge className="border-emerald-300/15 bg-emerald-300/10 text-emerald-200"><span className="size-1.5 animate-pulse rounded-full bg-emerald-300" /> In progress</Badge><button onClick={toggleCamera} className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10" aria-label={cameraOn ? 'Disable camera' : 'Enable camera'}>{cameraOn ? <CameraOff className="size-4" /> : <Camera className="size-4" />}</button></div></div></header>
      <div className="mx-auto max-w-[1500px] px-5 py-6 lg:px-8">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center"><div className="flex items-center gap-2">{levels.map((level, index) => { const activeIndex = levels.indexOf(data.interview.currentLevel); return <div key={level} className="flex flex-1 items-center lg:flex-none"><span className={`flex h-8 items-center gap-2 rounded-full px-3 text-xs font-semibold ${index === activeIndex ? 'bg-[#e6bd72] text-[#15203b]' : index < activeIndex ? 'bg-emerald-400/12 text-emerald-200' : 'bg-white/5 text-white/35'}`}>{index < activeIndex ? <Check className="size-3.5" /> : <span>{index + 1}</span>}<span className="hidden sm:inline">{levelLabels[level]}</span></span>{index < levels.length - 1 && <span className={`mx-2 h-px w-5 ${index < activeIndex ? 'bg-emerald-300/50' : 'bg-white/10'}`} />}</div>; })}</div><div className="flex items-center gap-3 text-xs text-white/55"><span>Question {current.sequence} · {completedQuestions} answered</span><Progress value={Math.min(100, (current.sequence / 12) * 100)} className="w-32 [&_[data-slot=progress-track]]:bg-white/10 [&_[data-slot=progress-indicator]]:bg-[#e6bd72]" /></div></div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="flex min-h-[690px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#101e3f] shadow-2xl shadow-black/20">
            <div className="flex min-h-72 flex-col items-center justify-center border-b border-white/10 bg-[radial-gradient(circle_at_50%_20%,rgba(89,77,180,0.28),transparent_60%)] px-6 py-10 text-center"><div className={`relative mb-6 grid size-24 place-items-center rounded-[30px] border border-[#e6bd72]/25 bg-gradient-to-br from-[#5d51a7] to-[#283563] shadow-[0_0_55px_rgba(140,117,221,0.2)] ${speaking ? 'athena-speaking' : ''}`}><Sparkles className="size-9 text-[#f1d69c]" />{speaking && <span className="absolute -inset-3 rounded-[36px] border border-[#e6bd72]/25" />}</div><div className="mb-4 flex items-center gap-2"><Badge className="bg-white/8 text-white/65">{levelLabels[current.level]}</Badge><Badge className="bg-white/8 text-white/65">Difficulty {current.difficulty}/5</Badge></div><h1 className="max-w-3xl text-xl leading-8 font-medium tracking-[-0.015em] sm:text-2xl sm:leading-9">“{current.question}”</h1><div className="mt-5 flex items-center gap-2"><Button variant="outline" onClick={speakQuestion} disabled={speaking} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">{speaking ? <><AudioLines className="animate-pulse" /> Speaking…</> : audioReady ? <><RotateCcw /> Replay question</> : <><Volume2 /> Hear question</>}</Button></div><p className="mt-3 text-[11px] text-white/35">Athena’s voice is AI-generated.</p></div>
            <div className="flex flex-1 flex-col p-5 sm:p-7"><div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-semibold">Your answer</p><p className="mt-1 text-xs text-white/45">Record, review the transcript, then submit.</p></div><div className="flex rounded-lg bg-white/5 p-1"><button onClick={() => setInputMode('voice')} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs ${inputMode === 'voice' ? 'bg-white/10 text-white' : 'text-white/45'}`}><Mic className="size-3.5" /> Voice</button><button onClick={() => setInputMode('typed')} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs ${inputMode === 'typed' ? 'bg-white/10 text-white' : 'text-white/45'}`}><Keyboard className="size-3.5" /> Type</button></div></div>
              <div className="relative flex-1"><Textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={inputMode === 'voice' ? 'Your transcript will appear here. You can edit it before submitting.' : 'Type your answer here…'} className="h-full min-h-48 resize-none border-white/10 bg-[#09142e]/55 p-4 text-base leading-7 text-white placeholder:text-white/25 focus-visible:border-[#e6bd72]/50 focus-visible:ring-[#e6bd72]/10" /></div>
              {error && <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-rose-300/15 bg-rose-300/[0.07] px-4 py-3 text-sm text-rose-100"><CircleAlert className="mt-0.5 size-4 shrink-0" />{error}</div>}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3">{recording ? <Button onClick={stopRecording} className="h-11 rounded-xl bg-rose-500 px-5 text-white hover:bg-rose-400"><Pause /> Stop recording</Button> : <Button onClick={startRecording} disabled={transcribing || submitting} variant="outline" className="h-11 rounded-xl border-white/15 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white">{transcribing ? <LoaderCircle className="animate-spin" /> : <Mic />} {transcribing ? 'Transcribing…' : 'Record answer'}</Button>}{recording && <span className="flex items-center gap-2 text-sm text-rose-200"><span className="size-2 animate-pulse rounded-full bg-rose-400" /> {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>}</div><Button onClick={submitAnswer} disabled={answer.trim().length < 2 || recording || transcribing || submitting} className="h-11 rounded-xl bg-[#e6bd72] px-5 text-[#15203b] shadow-lg shadow-black/15 hover:bg-[#f0cf91]">{submitting ? <LoaderCircle className="animate-spin" /> : <Send />} {submitting ? 'Evaluating answer…' : 'Submit answer'}</Button></div>
            </div>
          </section>
          <aside className="space-y-5"><Card className="border-white/10 bg-white/[0.045] text-white ring-0"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.14em] text-white/40">Interviewing for</p><p className="mt-1 font-semibold">{data.application.roleTitle || 'Your target role'}</p></div><Headphones className="size-5 text-[#e6bd72]" /></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/5 p-3"><Clock3 className="mb-2 size-4 text-white/45" /><strong className="block text-lg">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</strong><span className="text-[11px] text-white/35">response time</span></div><div className="rounded-xl bg-white/5 p-3"><AudioLines className="mb-2 size-4 text-white/45" /><strong className="block text-lg">{answer.trim() ? answer.trim().split(/\s+/).length : 0}</strong><span className="text-[11px] text-white/35">words</span></div></div></CardContent></Card>
            <Card className="overflow-hidden border-white/10 bg-white/[0.045] text-white ring-0"><CardContent className="p-0"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-sm font-semibold">Camera preview</p><p className="text-[11px] text-white/35">Optional · never analysed</p></div><button onClick={toggleCamera} className="rounded-lg p-2 text-white/55 hover:bg-white/10">{cameraOn ? <CameraOff className="size-4" /> : <Camera className="size-4" />}</button></div><div className="relative aspect-video bg-[#071025]"><video ref={videoRef} autoPlay muted playsInline className={`h-full w-full object-cover ${cameraOn ? 'block' : 'hidden'}`} />{!cameraOn && <div className="absolute inset-0 grid place-items-center text-center"><span><CameraOff className="mx-auto mb-2 size-6 text-white/20" /><span className="text-xs text-white/30">Camera is off</span></span></div>}</div></CardContent></Card>
            <Card className="border-white/10 bg-white/[0.045] text-white ring-0"><CardContent className="p-5"><p className="mb-4 text-sm font-semibold">Interview transcript</p><div className="max-h-64 space-y-4 overflow-y-auto pr-1">{data.interview.questions.filter((question) => question.answer).map((question) => <div key={question.id} className="border-l border-white/15 pl-3"><p className="line-clamp-2 text-xs leading-5 text-white/45">{question.question}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-white/75">{question.answer!.transcript}</p></div>)}{completedQuestions === 0 && <p className="text-xs leading-5 text-white/35">Your completed exchanges will appear here as the interview progresses.</p>}</div></CardContent></Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
