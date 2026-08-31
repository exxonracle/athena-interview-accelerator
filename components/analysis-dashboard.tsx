'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BrainCircuit, BriefcaseBusiness, Check, CheckCircle2, ChevronRight, CircleAlert, FileSearch, LoaderCircle, Sparkles, Target, UserRoundSearch, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { CandidateAnalysis, JobFit, RoleAnalysis } from '@/lib/ai/schemas';

type Data = { application: { roleTitle?: string; candidateName?: string }; analysis: { role: RoleAnalysis; candidate: CandidateAnalysis; jobFit: JobFit } };

function PillList({ items, tone = 'default' }: { items: string[]; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const tones = { default: 'border-primary/15 bg-primary/[0.05] text-primary', good: 'border-emerald-600/15 bg-emerald-600/[0.06] text-emerald-800', warn: 'border-amber-600/20 bg-amber-500/[0.08] text-amber-900', bad: 'border-rose-600/15 bg-rose-600/[0.06] text-rose-800' };
  return <div className="flex flex-wrap gap-2">{items.map((item) => <span key={item} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${tones[tone]}`}>{item}</span>)}</div>;
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <Card className="athena-card"><CardHeader><CardTitle className="flex items-center gap-2.5"><span className="text-primary">{icon}</span>{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>;
}

export function AnalysisDashboard({ applicationId }: { applicationId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  useEffect(() => { fetch(`/api/applications/${applicationId}`).then(async (res) => { const body = await res.json() as Data & { error?: string }; if (!res.ok) throw new Error(body.error); setData(body); }).catch((cause) => setError(cause.message)); }, [applicationId]);
  async function startInterview() {
    setStarting(true); setError('');
    try {
      const response = await fetch('/api/interviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId }) });
      const body = await response.json() as { sessionId?: string; error?: string };
      if (!response.ok) throw new Error(body.error || 'Could not start the interview.');
      window.location.assign(`/applications/${applicationId}/interview`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not start the interview.'); setStarting(false); }
  }
  if (error && !data) return <CenteredState error={error} />;
  if (!data) return <CenteredState />;
  const { role, candidate, jobFit } = data.analysis;
  return (
    <main className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/88 backdrop-blur-xl"><div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8"><Link href="/" className="flex items-center gap-3"><span className="athena-mark">A</span><span><strong className="block text-[15px] tracking-[0.17em]">ATHENA</strong><span className="hidden text-[10px] uppercase tracking-[0.15em] text-muted-foreground sm:block">Evidence review</span></span></Link><div className="hidden items-center gap-2 sm:flex"><Badge variant="secondary">Analysis complete</Badge><ChevronRight className="size-4 text-muted-foreground" /><Badge variant="outline">Interview next</Badge></div></div></header>
      <div className="mx-auto max-w-7xl px-5 pt-9 sm:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Evidence brief</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{role.roleTitle}</h1><p className="mt-3 max-w-3xl leading-7 text-muted-foreground">{role.summary}</p></div><Button onClick={startInterview} disabled={starting} size="lg" className="h-11 rounded-xl px-5">{starting ? <LoaderCircle className="animate-spin" /> : <Sparkles />} Start AI interview <ArrowRight /></Button></div>
        {error && <div role="alert" className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
        <div className="mt-8 grid gap-5 lg:grid-cols-[340px_1fr]">
          <Card className="athena-card relative overflow-hidden"><div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-[#be8c3d] to-primary" /><CardHeader><CardDescription>Weighted job fit</CardDescription><CardTitle className="text-xl">{jobFit.label}</CardTitle></CardHeader><CardContent><div className="mx-auto grid size-48 place-items-center rounded-full" style={{ background: `conic-gradient(var(--primary) ${jobFit.overallScore}%, color-mix(in oklch, var(--primary) 10%, transparent) 0)` }}><div className="grid size-38 place-items-center rounded-full bg-card text-center"><span><strong className="block text-5xl tracking-[-0.05em]">{jobFit.overallScore}<small className="text-xl">%</small></strong><span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">overall match</span></span></div></div><div className="mt-7 space-y-4">{jobFit.categories.map((category) => <div key={category.key}><div className="mb-1.5 flex justify-between text-xs"><span>{category.label}</span><span className="font-semibold">{category.score}%</span></div><Progress value={category.score} /></div>)}</div></CardContent></Card>
          <div className="grid gap-5 md:grid-cols-3"><SectionCard title="Strong match" icon={<CheckCircle2 />}><PillList items={jobFit.strongMatches} tone="good" /></SectionCard><SectionCard title="Partial match" icon={<CircleAlert />}><PillList items={jobFit.partialMatches} tone="warn" /></SectionCard><SectionCard title="Missing / weak" icon={<X />}><PillList items={jobFit.missingAreas} tone="bad" /></SectionCard><Card className="athena-card md:col-span-3"><CardContent className="flex items-start gap-3 p-5"><Target className="mt-0.5 size-5 shrink-0 text-primary" /><div><strong className="text-sm">How this score was calculated</strong><p className="mt-1 text-sm leading-6 text-muted-foreground">{jobFit.explanation} Required skills carry 30%, technical competencies and relevant experience 20% each, and preferred skills, behavioural competencies, and qualifications 10% each.</p></div></CardContent></Card></div>
        </div>
        <section className="mt-12"><div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/8 text-primary"><BriefcaseBusiness /></span><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Role analysis</p><h2 className="text-2xl font-semibold">What success requires</h2></div></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"><SectionCard title="Responsibilities" icon={<FileSearch className="size-5" />}><ul className="space-y-3">{role.responsibilities.map((item) => <li key={item} className="flex gap-2 text-sm leading-6"><Check className="mt-1 size-4 shrink-0 text-primary" />{item}</li>)}</ul></SectionCard><SectionCard title="Required skills" icon={<BrainCircuit className="size-5" />}><PillList items={role.requiredSkills.map((item) => item.name)} /></SectionCard><SectionCard title="Preferred skills" icon={<Sparkles className="size-5" />}><PillList items={role.preferredSkills.map((item) => item.name)} /></SectionCard><SectionCard title="Technical competencies" icon={<Target className="size-5" />}><PillList items={role.technicalCompetencies} /></SectionCard><SectionCard title="Behavioural competencies" icon={<UserRoundSearch className="size-5" />}><PillList items={role.behavioralCompetencies} /></SectionCard><SectionCard title="Qualifications & experience" icon={<BriefcaseBusiness className="size-5" />}><ul className="space-y-2 text-sm leading-6">{[...role.experienceExpectations, ...role.qualifications].map((item) => <li key={item}>• {item}</li>)}</ul></SectionCard></div></section>
        <section className="mt-12"><div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#be8c3d]/10 text-[#99681f]"><UserRoundSearch /></span><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Candidate analysis</p><h2 className="text-2xl font-semibold">Your evidence against the role</h2></div></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"><SectionCard title="Relevant strengths" icon={<CheckCircle2 className="size-5" />}><ul className="space-y-3">{candidate.strengths.map((item) => <li key={item} className="flex gap-2 text-sm leading-6"><Check className="mt-1 size-4 shrink-0 text-emerald-700" />{item}</li>)}</ul></SectionCard><SectionCard title="Experience & projects" icon={<BriefcaseBusiness className="size-5" />}><ul className="space-y-4">{[...candidate.relevantExperience.map((item) => `${item.title}: ${item.relevance}`), ...candidate.projects.map((item) => `${item.name}: ${item.relevance}`)].slice(0, 6).map((item) => <li key={item} className="text-sm leading-6">{item}</li>)}</ul></SectionCard><SectionCard title="Claims Athena will probe" icon={<FileSearch className="size-5" />}><ul className="space-y-3">{candidate.claimsToVerify.map((item) => <li key={item} className="text-sm leading-6">• {item}</li>)}</ul></SectionCard><SectionCard title="Key skills" icon={<BrainCircuit className="size-5" />}><PillList items={candidate.keySkills} /></SectionCard><SectionCard title="Weak or missing areas" icon={<CircleAlert className="size-5" />}><PillList items={[...candidate.missingSkills, ...candidate.weakAreas]} tone="bad" /></SectionCard><SectionCard title="Preparation focus" icon={<Target className="size-5" />}><ul className="space-y-3">{candidate.preparationAreas.map((item) => <li key={item} className="flex gap-2 text-sm leading-6"><ArrowRight className="mt-1 size-4 shrink-0 text-primary" />{item}</li>)}</ul></SectionCard></div></section>
      </div>
    </main>
  );
}

function CenteredState({ error }: { error?: string }) { return <main className="grid min-h-screen place-items-center bg-background p-6"><div className="text-center">{error ? <CircleAlert className="mx-auto mb-4 size-8 text-destructive" /> : <LoaderCircle className="mx-auto mb-4 size-8 animate-spin text-primary" />}<h1 className="text-xl font-semibold">{error || 'Loading your evidence brief…'}</h1>{error && <Button className="mt-5" onClick={() => window.location.assign('/')}>Return to dashboard</Button>}</div></main>; }
