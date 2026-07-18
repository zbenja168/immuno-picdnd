import { useEffect, useMemo, useState } from 'react'
import { BrandBadge, BrandCard, LogoMark } from './components/Brand'

type Item = { id: string; imageRef: string; label: string; category: string; brick?: string; explanation?: string; order?: number }

const BASE = import.meta.env.BASE_URL
const ROUND_SIZE = 5
const ALL = '__all__'

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

export default function App() {
  const [items, setItems] = useState<Item[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [brick, setBrick] = useState<string | null>(null) // selected brick or ALL; null = menu
  const [order, setOrder] = useState<Item[]>([])
  const [roundIdx, setRoundIdx] = useState(0)
  const [placed, setPlaced] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [wrongFlash, setWrongFlash] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [over, setOver] = useState(false)

  useEffect(() => {
    fetch(`${BASE}data/dnd.json`)
      .then((r) => r.json())
      .then((d: Item[]) => setItems(d))
      .catch(() => setErr('Could not load game data.'))
  }, [])

  // bricks sorted by name, each with its items
  const bricks = useMemo(() => {
    if (!items) return []
    const g: Record<string, Item[]> = {}
    for (const it of items) (g[it.brick || 'Other'] ||= []).push(it)
    return Object.keys(g)
      .map((name) => ({ name, items: g[name], order: Math.min(...g[name].map((x) => x.order ?? 1e9)) }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
  }, [items])

  const rounds = useMemo(() => {
    const out: Item[][] = []
    for (let i = 0; i < order.length; i += ROUND_SIZE) out.push(order.slice(i, i + ROUND_SIZE))
    return out
  }, [order])
  const round = rounds[roundIdx] ?? []
  const bank = useMemo(() => shuffle(round.map((it) => it.id)), [round])
  const roundComplete = round.length > 0 && round.every((it) => placed[it.id])
  const gameOver = over || (brick !== null && roundIdx >= rounds.length && rounds.length > 0)

  function play(which: string) {
    const pool = which === ALL ? (items ?? []) : (bricks.find((b) => b.name === which)?.items ?? [])
    setOrder(shuffle(pool))
    setBrick(which); setRoundIdx(0); setPlaced({}); setSelected(null)
    setCorrect(0); setWrong(0); setOver(false)
  }
  function toMenu() { setBrick(null); setOver(false) }

  function tryMatch(imageId: string, labelId: string) {
    if (placed[imageId]) return
    if (imageId === labelId) {
      setPlaced((p) => ({ ...p, [imageId]: true }))
      setCorrect((c) => c + 1); setSelected(null)
    } else {
      setWrong((w) => w + 1); setSelected(null); setWrongFlash(imageId)
      setTimeout(() => setWrongFlash((f) => (f === imageId ? null : f)), 450)
    }
  }

  if (err) return <Shell><p className="text-red-400">{err}</p></Shell>
  if (!items) return <Shell><p className="text-slate-400">Loading…</p></Shell>

  // --- brick menu ---
  if (brick === null) {
    return (
      <Shell>
        <BrandCard />
        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/40 p-6">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-100">
            <LogoMark size={30} /> Picture Match
          </h1>
          <p className="mt-2 text-slate-300">
            Drag each name onto the matching picture — or tap a name, then tap its picture.
            Pick a brick to study, or match everything.
          </p>
          <button
            onClick={() => play(ALL)}
            className="mt-5 w-full rounded-xl bg-gradient-to-br from-sky-400 to-teal-400 px-6 py-3 text-left font-semibold text-slate-900 hover:opacity-90"
          >
            All bricks — {items.length} figures (shuffled) →
          </button>
          <div className="mt-5 border-t border-slate-700 pt-4">
            <p className="mb-2 text-sm font-semibold text-slate-400">Or pick a brick ({bricks.length}):</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {bricks.map((b) => (
                <button
                  key={b.name}
                  onClick={() => play(b.name)}
                  className="flex items-center justify-between rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-left text-sm text-slate-200 hover:border-sky-400"
                >
                  <span className="truncate pr-2">{b.name}</span>
                  <span className="shrink-0 rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">{b.items.length}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Shell>
    )
  }

  if (gameOver) {
    const total = correct + wrong
    const pct = total ? Math.round((correct / total) * 100) : 0
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-100">Done! 🎉</h1>
          <p className="mt-2 text-sm text-slate-400">{brick === ALL ? 'All bricks' : brick}</p>
          <p className="mt-3 text-lg text-slate-300">
            {correct} correct on the first try · {wrong} misses ·{' '}
            <span className="font-semibold text-teal-300">{pct}% first-try accuracy</span>
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={() => play(brick)} className="rounded-xl bg-gradient-to-br from-sky-400 to-teal-400 px-6 py-3 font-semibold text-slate-900 hover:opacity-90">Play again</button>
            <button onClick={toMenu} className="rounded-xl border border-slate-600 bg-slate-800 px-6 py-3 font-semibold text-slate-200 hover:border-slate-400">Choose another brick</button>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button onClick={toMenu} className="flex items-center gap-2 text-sm font-bold text-slate-100 hover:text-sky-300">
          <LogoMark size={22} /> Picture Match
        </button>
        <span className="truncate text-sm text-slate-400">
          {brick === ALL ? 'All bricks' : brick} · Round {roundIdx + 1}/{rounds.length} · {correct}✓ {wrong}✗
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {round.map((it) => {
          const done = placed[it.id]
          const flashing = wrongFlash === it.id
          return (
            <div
              key={it.id}
              onDragOver={(e) => { if (!done) e.preventDefault() }}
              onDrop={(e) => { e.preventDefault(); const l = e.dataTransfer.getData('text/plain'); if (l) tryMatch(it.id, l) }}
              onClick={() => selected && tryMatch(it.id, selected)}
              className={[
                'relative overflow-hidden rounded-xl border-2 bg-slate-900 transition',
                done ? 'border-teal-400' : flashing ? 'border-red-500' : selected ? 'cursor-pointer border-sky-500/60 hover:border-sky-400' : 'border-slate-700',
              ].join(' ')}
            >
              <img src={`${BASE}data/images/${it.imageRef}`} alt="" className="aspect-square w-full bg-white object-contain" draggable={false} />
              {done && (
                <div className="border-t border-teal-400/40 bg-teal-500/10 px-2.5 py-2">
                  <div className="text-sm font-semibold text-teal-300">{it.label}</div>
                  {it.explanation && <div className="mt-1 text-xs leading-snug text-slate-300">{it.explanation}</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {bank.map((id) => {
          const it = round.find((x) => x.id === id)!
          if (placed[id]) return null
          const isSel = selected === id
          return (
            <button
              key={id}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move' }}
              onClick={() => setSelected((s) => (s === id ? null : id))}
              className={['cursor-grab rounded-lg border px-3 py-2 text-sm font-medium transition active:cursor-grabbing', isSel ? 'border-sky-400 bg-sky-500/20 text-sky-200' : 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-400'].join(' ')}
            >
              {it.label}
            </button>
          )
        })}
      </div>

      {roundComplete && (
        <button
          onClick={() => {
            if (roundIdx + 1 < rounds.length) { setRoundIdx((i) => i + 1); setPlaced({}); setSelected(null) }
            else setOver(true)
          }}
          className="mt-6 rounded-xl bg-gradient-to-br from-sky-400 to-teal-400 px-6 py-3 font-semibold text-slate-900 hover:opacity-90"
        >
          {roundIdx + 1 < rounds.length ? 'Next round →' : 'See results →'}
        </button>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-4 py-8">
      <BrandBadge />
      <div className="mx-auto max-w-3xl">{children}</div>
    </div>
  )
}
