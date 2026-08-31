'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, CheckCircle2, FileText, LoaderCircle, ShieldCheck, Sparkles, UploadCloud, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

type DocKind = 'jd' | 'resume';
const steps = ['Analyse', 'Job fit', 'Interview', 'Readiness'];
const loadingStages = ['Understanding the role…', 'Mapping your evidence…', 'Calculating transparent job fit…', 'Building your interview strategy…'];

function DocumentInput({ kind, text, setText, file, setFile }: {
  kind: DocKind; text: string; setText: (value: string) => void; file: File | null; setFile: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const isJob = kind === 'jd';
  const acceptFile = (next?: File) => {
    if (!next) return;
    setFile(next);
    setText('');
  };
  return (
    <Card className="athena-card min-h-[390px] gap-0 py-0">
      <CardHeader className="border-b border-border/70 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/8 text-primary">{isJob ? <BriefcaseBusiness /> : <FileText />}</span>
          <div><CardTitle className="text-[17px]">{isJob ? 'Job description' : 'Your resume'}</CardTitle><CardDescription>{isJob ? 'What the role needs' : 'What you bring to the role'}</CardDescription></div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-6">
        <Textarea
          value={text}
          onChange={(event) => { setText(event.target.value); if (event.target.value) setFile(null); }}
          aria-label={isJob ? 'Paste job description' : 'Paste resume'}
          className="min-h-44 resize-none border-border/80 bg-background/65 p-4 leading-6 shadow-inner shadow-primary/[0.02]"
          placeholder={isJob ? 'Paste the complete role description here…' : 'Paste your resume text here…'}
        />
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.12em] text-muted-foreground"><span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" /></div>
        <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(event) => acceptFile(event.target.files?.[0])} />
        {file ? (
          <div className="flex min-h-24 items-center gap-3 rounded-xl border border-emerald-600/20 bg-emerald-600/[0.04] px-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-600/15"><CheckCircle2 className="size-4" /></span>
            <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{file.name}</strong><span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · ready to extract</span></span>
            <button aria-label={`Remove ${file.name}`} onClick={() => setFile(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" /></button>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files[0]); }}
            className={`group flex min-h-24 items-center justify-center gap-3 rounded-xl border border-dashed px-4 text-left transition ${dragging ? 'border-primary bg-primary/[0.08]' : 'border-primary/25 bg-primary/[0.025] hover:border-primary/50 hover:bg-primary/[0.05]'}`}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-white text-primary shadow-sm ring-1 ring-border"><UploadCloud className="size-4" /></span>
            <span><strong className="block text-sm font-semibold text-foreground">Drop a PDF, DOCX or TXT</strong><span className="text-xs text-muted-foreground">or click to choose · up to 5 MB</span></span>
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const [jdText, setJdText] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState<{ id: string; roleTitle?: string; status: string } | null>(null);
  const ready = (jdText.trim().length >= 80 || jdFile) && (resumeText.trim().length >= 80 || resumeFile);

  useEffect(() => { fetch('/api/applications').then((res) => res.ok ? res.json() as Promise<{ application: { id: string; roleTitle?: string; status: string } | null }> : null).then((data) => { const application = data?.application; setRecent(application && ['READY', 'SCREENING', 'COMPETENCY', 'DEEP_DIVE', 'COMPLETED'].includes(application.status) ? application : null); }).catch(() => undefined); }, []);
  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => setStage((value) => Math.min(value + 1, loadingStages.length - 1)), 4500);
    return () => window.clearInterval(timer);
  }, [loading]);

  async function submit() {
    if (!ready || loading) return;
    setLoading(true); setError(''); setStage(0);
    const form = new FormData();
    form.set('jdText', jdText); form.set('resumeText', resumeText);
    if (jdFile) form.set('jdFile', jdFile);
    if (resumeFile) form.set('resumeFile', resumeFile);
    try {
      const response = await fetch('/api/applications', { method: 'POST', body: form });
      const body = await response.json() as { applicationId?: string; error?: string };
      if (!response.ok || !body.applicationId) throw new Error(body.error || 'Analysis could not be completed.');
      window.location.assign(`/applications/${body.applicationId}/analysis`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Analysis could not be completed.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {loading && <div className="fixed inset-0 z-50 grid place-items-center bg-[#0a1530]/75 p-6 backdrop-blur-md"><div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0f1c3d] p-8 text-center text-white shadow-2xl"><span className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-white/10"><LoaderCircle className="size-7 animate-spin text-[#e6bd72]" /></span><h2 className="text-xl font-semibold">Athena is reading the evidence</h2><p className="mt-2 text-sm text-white/65">{loadingStages[stage]}</p><div className="mt-7 flex gap-2">{loadingStages.map((_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= stage ? 'bg-[#e6bd72]' : 'bg-white/10'}`} />)}</div><p className="mt-5 text-xs text-white/45">Keep this page open. Your documents are processed privately.</p></div></div>}
      <header className="border-b border-border/70 bg-background/90 backdrop-blur-xl"><div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8"><Link href="/" className="flex items-center gap-3" aria-label="Athena home"><span className="athena-mark">A</span><span><strong className="block font-heading text-[15px] tracking-[0.17em]">ATHENA</strong><span className="hidden text-[10px] uppercase tracking-[0.15em] text-muted-foreground sm:block">Interview accelerator</span></span></Link><div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-emerald-600" /><span className="hidden sm:inline">Your documents stay private</span></div></div></header>
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        {recent && <button onClick={() => window.location.assign(`/applications/${recent.id}/${recent.status === 'COMPLETED' ? 'results' : recent.status === 'READY' ? 'analysis' : 'interview'}`)} className="mb-6 flex w-full items-center justify-between rounded-xl border border-primary/15 bg-card/70 px-4 py-3 text-left text-sm shadow-sm"><span><strong>Continue your latest preparation</strong><span className="ml-2 text-muted-foreground">{recent.roleTitle || 'Interview application'}</span></span><ArrowRight className="size-4 text-primary" /></button>}
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]"><div className="max-w-3xl"><Badge variant="outline" className="mb-5 h-7 gap-2 border-primary/15 bg-primary/[0.04] px-3 text-primary"><Sparkles className="size-3.5" /> Personalised interview intelligence</Badge><h1 className="font-heading text-4xl leading-[1.05] font-semibold tracking-[-0.045em] sm:text-5xl lg:text-[58px]">Prepare for the interview you’re <span className="text-primary">actually facing.</span></h1><p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Athena studies the role and your experience, then conducts a rigorous voice interview that adapts to every answer.</p></div><div className="hidden min-w-80 rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm lg:block"><p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Your path to readiness</p><div className="flex items-center">{steps.map((item, index) => <div key={item} className="flex flex-1 items-center last:flex-none"><span className="flex size-7 items-center justify-center rounded-full bg-primary/8 text-[11px] font-semibold text-primary">{index + 1}</span>{index < steps.length - 1 && <span className="mx-2 h-px flex-1 bg-border" />}</div>)}</div><div className="mt-2 flex justify-between text-[10px] text-muted-foreground">{steps.map((item) => <span key={item}>{item}</span>)}</div></div></div>
        <div className="mt-10 grid gap-5 lg:grid-cols-2"><DocumentInput kind="jd" text={jdText} setText={setJdText} file={jdFile} setFile={setJdFile} /><DocumentInput kind="resume" text={resumeText} setText={setResumeText} file={resumeFile} setFile={setResumeFile} /></div>
        {error && <div role="alert" className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-primary/12 bg-primary/[0.035] p-5 sm:flex-row sm:px-6"><div><p className="text-sm font-semibold">{ready ? 'Your evidence is ready for Athena' : 'Add both documents to begin'}</p><p className="mt-1 text-xs text-muted-foreground">Athena will extract role requirements, compare evidence, and build your interview plan.</p></div><Button size="lg" className="h-11 w-full rounded-xl px-5 shadow-lg shadow-primary/15 sm:w-auto" disabled={!ready || loading} onClick={submit}>Start analysis <ArrowRight /></Button></div>
      </section>
    </main>
  );
}
