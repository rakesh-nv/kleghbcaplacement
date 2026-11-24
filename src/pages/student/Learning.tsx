import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ExternalLink, Bookmark, BookmarkCheck, CheckCircle2, Circle, Timer, Plus, Trash2, Trophy, Lightbulb } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useStudent } from '@/hooks/useStudent'
import { Banner, Card, Chips, FilterBar, Input, PageHeader, Progress, SearchInput, Select, StatCard, Tabs } from '@/components/ui/primitives'
import { Modal } from '@/components/shared/Modal'
import { INTERVIEW_QUESTIONS } from '@/data/learning'
import { suggestPaths } from '@/lib/learning'
import { cn, formatDate, labelize, startOfWeek } from '@/lib/utils'
import type { LearningResource, Quiz, QuizAttempt } from '@/types/models'

type Tab = 'paths' | 'resources' | 'quizzes' | 'interview' | 'progress'

function ResourceRow({ r }: { r: LearningResource }) {
  const { db, api } = useData()
  const { run } = useToast()
  const { me } = useStudent()
  const p = db.progress.find(x => x.student_id === me.id && x.resource_id === r.id)
  return (
    <li className="flex items-start gap-3 py-2.5">
      <button onClick={() => run(() => api.setResourceProgress(r.id, { completed: !p?.completed }))} aria-label={p?.completed ? 'Mark not done' : 'Mark done'} className="mt-0.5">
        {p?.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Circle className="w-5 h-5 text-text-muted" />}
      </button>
      <div className="flex-1 min-w-0">
        <a href={r.url} target="_blank" rel="noreferrer" className={cn('font-medium text-sm hover:text-accent inline-flex items-center gap-1', p?.completed && 'line-through text-text-secondary')}>{r.title}<ExternalLink className="w-3 h-3" /></a>
        <p className="text-xs text-text-secondary">{r.description}</p>
        <p className="text-[11px] text-text-muted mt-0.5">{labelize(r.resource_type)} · {r.difficulty} · {(r.skill_tags ?? []).join(', ')}</p>
      </div>
      <button onClick={() => run(() => api.setResourceProgress(r.id, { saved: !p?.saved }), p?.saved ? 'Removed from saved' : 'Saved')} aria-label={p?.saved ? 'Unsave' : 'Save'} className="p-1">
        {p?.saved ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4 text-text-muted" />}
      </button>
    </li>
  )
}

function QuizRunner({ quiz, onClose }: { quiz: Quiz; onClose: () => void }) {
  const { db, api } = useData()
  const { toast } = useToast()
  const qs = db.questions.filter(q => q.quiz_id === quiz.id)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [start] = useState(Date.now())
  const [left, setLeft] = useState((quiz.time_limit_minutes ?? 10) * 60)
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const submit = async () => {
    if (attempt) return
    try { setAttempt(await api.submitQuiz(quiz.id, answers, Math.round((Date.now() - start) / 1000))) } catch (e) { toast({ type: 'error', title: 'Could not submit', message: (e as Error).message }) }
  }
  useEffect(() => {
    if (attempt) return
    if (left <= 0) { submit(); return }
    const t = setTimeout(() => setLeft(l => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left, attempt]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal isOpen onClose={onClose} title={quiz.title} size="lg"
      footer={attempt ? <button className="btn-primary" onClick={onClose}>Done</button> : <><span className="text-sm text-text-secondary mr-auto">{Object.keys(answers).length}/{qs.length} answered</span><button className="btn-primary" onClick={submit}>Submit</button></>}>
      {!attempt && <p className={cn('text-sm mb-4 flex items-center gap-1', left < 60 ? 'text-danger' : 'text-text-secondary')}><Timer className="w-4 h-4" />{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} remaining · pass mark {quiz.passing_score}%</p>}
      {attempt && <div className="mb-4"><Banner tone={attempt.passed ? 'success' : 'warning'} title={`You scored ${attempt.score}/${attempt.total_points} (${Math.round(attempt.score / attempt.total_points * 100)}%)`}>{attempt.passed ? 'Passed — well done.' : `Pass mark is ${quiz.passing_score}%. Review the explanations below and try again.`}</Banner></div>}
      <ol className="space-y-5">
        {qs.map((q, n) => (
          <li key={q.id}>
            <p className="text-sm font-medium mb-2">{n + 1}. {q.question}</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {q.options.map((o, i) => {
                const chosen = answers[q.id] === i
                const correct = attempt && i === q.correct_option
                const wrong = attempt && chosen && i !== q.correct_option
                return (
                  <button key={i} disabled={!!attempt} onClick={() => setAnswers({ ...answers, [q.id]: i })}
                    className={cn('text-left text-sm px-3 py-2 rounded-lg border transition', correct ? 'border-emerald-500 bg-emerald-50' : wrong ? 'border-red-400 bg-red-50' : chosen ? 'border-primary bg-blue-50' : 'border-border hover:bg-secondary')}>{o}</button>
                )
              })}
            </div>
            {attempt && q.explanation && <p className="text-xs text-text-secondary mt-2">{answers[q.id] === q.correct_option ? '✓ Correct. ' : answers[q.id] == null ? 'Not answered. ' : '✗ Incorrect. '}{q.explanation}</p>}
          </li>
        ))}
      </ol>
    </Modal>
  )
}

export default function Learning() {
  const { db, api } = useData()
  const { run } = useToast()
  const { me } = useStudent()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>(params.get('path') ? 'paths' : 'paths')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [iqCat, setIqCat] = useState('')
  const [shown, setShown] = useState<number[]>([])
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [goal, setGoal] = useState('')
  const week = startOfWeek()

  const progress = db.progress.filter(p => p.student_id === me.id)
  const done = new Set(progress.filter(p => p.completed).map(p => p.resource_id))
  const suggestions = useMemo(() => suggestPaths(db, me.id), [db, me.id])
  const attempts = db.attempts.filter(a => a.student_id === me.id).sort((a, b) => b.created_at.localeCompare(a.created_at))
  const goals = db.goals.filter(g => g.student_id === me.id && g.week_start === week)
  const focusPath = params.get('path')
  const pathPct = (ids: string[]) => ids.length ? Math.round(ids.filter(id => done.has(id)).length / ids.length * 100) : 0
  const categories = [...new Set(db.resources.map(r => r.category))]
  const resources = db.resources.filter(r => (!cat || r.category === cat) && (!q || [r.title, r.description, ...(r.skill_tags ?? [])].some(v => v?.toLowerCase().includes(q.toLowerCase()))))

  useEffect(() => { if (focusPath) document.getElementById(focusPath)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [focusPath])

  return (
    <div>
      <PageHeader title="Skill Development" description="Learning paths, practice quizzes and interview preparation. Progress is saved to your account." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Resources completed" value={`${done.size}/${db.resources.length}`} icon={CheckCircle2} tone="green" onClick={() => setTab('progress')} />
        <StatCard label="Saved resources" value={progress.filter(p => p.saved).length} icon={Bookmark} onClick={() => setTab('progress')} />
        <StatCard label="Quizzes passed" value={new Set(attempts.filter(a => a.passed).map(a => a.quiz_id)).size} hint={`${attempts.length} attempt(s)`} icon={Trophy} tone="amber" onClick={() => setTab('quizzes')} />
        <StatCard label="This week's goals" value={`${goals.filter(g => g.done).length}/${goals.length}`} icon={Lightbulb} tone="slate" onClick={() => setTab('progress')} />
      </div>
      <Tabs value={tab} onChange={t => { setTab(t); if (focusPath) setParams({}) }} tabs={[{ id: 'paths', label: 'Learning paths' }, { id: 'resources', label: 'Resources' }, { id: 'quizzes', label: 'Quizzes & aptitude' }, { id: 'interview', label: 'Interview questions' }, { id: 'progress', label: 'Progress & goals' }]} />

      {tab === 'paths' && (
        <div className="space-y-4">
          {suggestions.length > 0 && <Banner title="Recommended for you">Based on skills that open jobs ask for and you haven't listed: {suggestions.slice(0, 3).map(s => `${s.path.title} (${s.covers.join(', ')})`).join(' · ')}.</Banner>}
          <div className="grid lg:grid-cols-2 gap-4">
            {[...db.paths].sort((a, b) => Number(suggestions.some(s => s.path.id === b.id)) - Number(suggestions.some(s => s.path.id === a.id))).map(p => {
              const sug = suggestions.find(s => s.path.id === p.id)
              const pctDone = pathPct(p.resources)
              return (
                <div id={p.id} key={p.id} className={cn('card p-5', focusPath === p.id && 'ring-2 ring-primary')}>
                  <div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold">{p.title}</h3><p className="text-sm text-text-secondary">{p.description}</p></div>{sug && <span className="text-[11px] font-medium bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full whitespace-nowrap">Recommended</span>}</div>
                  <p className="text-xs text-text-secondary mt-2">{labelize(p.difficulty)} · ~{p.estimated_hours} h</p>
                  <div className="flex items-center gap-2 mt-3"><Progress value={pctDone} tone={pctDone === 100 ? 'green' : 'navy'} className="flex-1" /><span className="text-xs tabular-nums">{pctDone}%</span></div>
                  <ul className="divide-y divide-border mt-2">{p.resources.map(id => db.resources.find(r => r.id === id)).filter((r): r is LearningResource => !!r).map(r => <ResourceRow key={r.id} r={r} />)}</ul>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'resources' && <>
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Search topic or skill" />
          <Select value={cat} onChange={e => setCat(e.target.value)} aria-label="Category"><option value="">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</Select>
        </FilterBar>
        <Card bodyClassName="px-5 py-1"><ul className="divide-y divide-border">{resources.map(r => <ResourceRow key={r.id} r={r} />)}</ul>{resources.length === 0 && <p className="py-6 text-sm text-center text-text-secondary">No resources match.</p>}</Card>
        <p className="text-xs text-text-secondary mt-2">Coding practice: use LeetCode, HackerRank and GeeksforGeeks links in the Data Structures category.</p>
      </>}

      {tab === 'quizzes' && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {db.quizzes.filter(x => x.is_active).map(x => {
            const mine = attempts.filter(a => a.quiz_id === x.id)
            const best = mine.reduce((m, a) => Math.max(m, Math.round(a.score / a.total_points * 100)), -1)
            return (
              <Card key={x.id} title={x.title}>
                <p className="text-sm text-text-secondary">{x.description}</p>
                <p className="text-xs text-text-secondary mt-2">{db.questions.filter(qq => qq.quiz_id === x.id).length} questions · {x.time_limit_minutes} min · {labelize(x.difficulty)} · pass {x.passing_score}%</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm">{best >= 0 ? <>Best: <strong className={best >= x.passing_score ? 'text-emerald-700' : 'text-amber-700'}>{best}%</strong> ({mine.length} attempt{mine.length > 1 ? 's' : ''})</> : <span className="text-text-muted">Not attempted</span>}</span>
                  <button className="btn-primary btn-sm" onClick={() => setQuiz(x)}>{mine.length ? 'Retake' : 'Start'}</button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'interview' && <>
        <FilterBar><Select value={iqCat} onChange={e => setIqCat(e.target.value)} aria-label="Category"><option value="">All categories</option>{[...new Set(INTERVIEW_QUESTIONS.map(x => x.category))].map(c => <option key={c}>{c}</option>)}</Select></FilterBar>
        <div className="card divide-y divide-border">{INTERVIEW_QUESTIONS.map((x, i) => ({ ...x, i })).filter(x => !iqCat || x.category === iqCat).map(x => (
          <div key={x.i} className="px-5 py-3">
            <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium"><span className="chip mr-2">{x.category}</span>{x.question}</p><button className="btn-ghost btn-sm shrink-0" onClick={() => setShown(s => s.includes(x.i) ? s.filter(n => n !== x.i) : [...s, x.i])}>{shown.includes(x.i) ? 'Hide tip' : 'Show tip'}</button></div>
            {shown.includes(x.i) && <p className="text-sm text-text-secondary mt-2 bg-slate-50 rounded-lg p-3">{x.tip}</p>}
          </div>
        ))}</div>
      </>}

      {tab === 'progress' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title={`Weekly goals (week of ${formatDate(week)})`}>
            <form className="flex gap-2 mb-3" onSubmit={async e => { e.preventDefault(); if (await run(() => api.saveGoal(goal, week))) setGoal('') }}>
              <Input value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. Finish SQL joins lesson" maxLength={120} />
              <button className="btn-primary" disabled={!goal.trim()}><Plus className="w-4 h-4" />Add</button>
            </form>
            {goals.length === 0 ? <p className="text-sm text-text-muted">No goals for this week yet.</p> : <ul className="space-y-1.5">{goals.map(g => (
              <li key={g.id} className="flex items-center gap-2 text-sm"><button onClick={() => run(() => api.toggleGoal(g.id))} aria-label="Toggle">{g.done ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Circle className="w-5 h-5 text-text-muted" />}</button><span className={cn('flex-1', g.done && 'line-through text-text-secondary')}>{g.title}</span><button onClick={() => run(() => api.deleteGoal(g.id))} aria-label="Delete goal" className="p-1"><Trash2 className="w-3.5 h-3.5 text-text-muted hover:text-danger" /></button></li>
            ))}</ul>}
          </Card>
          <Card title="Path progress">
            <ul className="space-y-3">{db.paths.map(p => <li key={p.id}><div className="flex justify-between text-sm mb-1"><span>{p.title}</span><span className="tabular-nums text-text-secondary">{pathPct(p.resources)}%</span></div><Progress value={pathPct(p.resources)} tone={pathPct(p.resources) === 100 ? 'green' : 'navy'} /></li>)}</ul>
          </Card>
          <Card title="Saved resources" bodyClassName="px-5 py-1">
            {progress.filter(p => p.saved).length === 0 ? <p className="py-4 text-sm text-text-muted">Bookmark resources to find them here.</p> : <ul className="divide-y divide-border">{progress.filter(p => p.saved).map(p => db.resources.find(r => r.id === p.resource_id)).filter((r): r is LearningResource => !!r).map(r => <ResourceRow key={r.id} r={r} />)}</ul>}
          </Card>
          <Card title="Quiz history">
            {attempts.length === 0 ? <p className="text-sm text-text-muted">No attempts yet.</p> : <ul className="space-y-1.5 text-sm">{attempts.slice(0, 12).map(a => <li key={a.id} className="flex justify-between gap-2"><span>{db.quizzes.find(x => x.id === a.quiz_id)?.title}</span><span className="tabular-nums"><span className={a.passed ? 'text-emerald-700' : 'text-amber-700'}>{a.score}/{a.total_points}</span> <span className="text-xs text-text-muted">{formatDate(a.created_at, 'relative')}</span></span></li>)}</ul>}
          </Card>
          <Card title="Completed topics" className="lg:col-span-2"><Chips items={db.resources.filter(r => done.has(r.id)).map(r => r.title)} empty="Nothing completed yet." /></Card>
        </div>
      )}
      {quiz && <QuizRunner quiz={quiz} onClose={() => setQuiz(null)} />}
    </div>
  )
}
