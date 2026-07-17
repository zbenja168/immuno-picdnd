import { useEffect, useMemo, useState } from 'react'
import { BrandBadge, BrandCard, LogoMark } from './components/Brand'

type Item = { id: string; imageRef: string; label: string; category: string }

const BASE = import.meta.env.BASE_URL
const ROUND_SIZE = 5

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
  const [started, setStarted] = useState(false)
  const [order, setOrder] = useState<Item[]>([])
  const [roundIdx, setRoundIdx] = useState(0)
  const [placed, setPlaced] = useState<Record<string, boolean>>({}) // imageId -> matched
  const [selected, setSelected] = useState<string | null>(null) // labelId picked up (tap mode)
  const [wrongFlash, setWrongFlash] = useState<string | null>(null) // imageId flashing red
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)

  useEffect(() => {
    fetch(`${BASE}data/dnd.json`)
      .then((r) => r.json())
      .then((d: Item[]) => setItems(d))
      .catch(() => setErr('Could not load game data.'))
  }, [])

  const rounds = useMemo(() => {
    const out: Item[][] = []
    for (let i = 0; i < order.length; i += ROUND_SIZE) out.push(order.slice(i, i + ROUND_SIZE))
    return out
  }, [order])

  const round = rounds[roundIdx] ?? []
  const bank = useMemo(() => shuffle(round.map((it) => it.id)), [round])
  const roundComplete = round.length > 0 && round.every((it) => placed[it.id])
  const gameOver = started && roundIdx >= rounds.length

  function start() {
    if (!items) return
    setOrder(shuffle(items))
    setRoundIdx(0)
    setPlaced({})
    setSelected(null)
    setCorrect(0)
    setWrong(0)
    setStarted(true)
  }

  function tryMatch(imageId: string, labelId: string) {
    if (placed[imageId]) return
    if (imageId === labelId) {
      setPlaced((p) => ({ ...p, [imageId]: true }))
      setCorrect((c) => c + 1)
      setSelected(null)
    } else {
      setWrong((w) => w + 1)
      setSelected(null)
      setWrongFlash(imageId)
      setTimeout(() => setWrongFlash((f) => (f === imageId ? null : f)), 450)
    }
  }

  if (err)
    return <Shell><p className="text-red-400">{err}</p></Shell>
  if (!items)
    return <Shell><p className="text-slate-400">Loading…</p></Shell>

  if (!started)
    return (
      <Shell>
        <BrandCard />
        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/40 p-6">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-100">
            <LogoMark size={30} /> Immuno Picture Match
          </h1>
          <p className="mt-2 text-slate-300">
            Drag each name onto the matching picture — or tap a name, then tap its picture.
            {' '}{items.length} immunology figures across {Math.ceil(items.length / ROUND_SIZE)} rounds.
          </p>
          <button
            onClick={start}
            className="mt-5 rounded-xl bg-gradient-to-br from-sky-400 to-teal-400 px-6 py-3 font-semibold text-slate-900 hover:opacity-90"
          >
            Start matching →
          </button>
        </div>
      </Shell>
    )

  if (gameOver) {
    const total = correct + wrong
    const pct = total ? Math.round((correct / total) * 100) : 0
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-100">Done! 🎉</h1>
          <p className="mt-3 text-lg text-slate-300">
            {correct} correct on the first try · {wrong} misses ·{' '}
            <span className="font-semibold text-teal-300">{pct}% first-try accuracy</span>
          </p>
          <button
            onClick={start}
            className="mt-6 rounded-xl bg-gradient-to-br from-sky-400 to-teal-400 px-6 py-3 font-semibold text-slate-900 hover:opacity-90"
          >
            Play again
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold text-slate-100">
          <LogoMark size={22} /> Picture Match
        </h1>
        <span className="text-sm text-slate-400">
          Round {roundIdx + 1}/{rounds.length} · {correct} correct · {wrong} misses
        </span>
      </div>

      {/* Image drop targets */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {round.map((it) => {
          const done = placed[it.id]
          const flashing = wrongFlash === it.id
          return (
            <div
              key={it.id}
              onDragOver={(e) => {
                if (!done) e.preventDefault()
              }}
              onDrop={(e) => {
                e.preventDefault()
                const labelId = e.dataTransfer.getData('text/plain')
                if (labelId) tryMatch(it.id, labelId)
              }}
              onClick={() => selected && tryMatch(it.id, selected)}
              className={[
                'relative overflow-hidden rounded-xl border-2 bg-slate-900 transition',
                done
                  ? 'border-teal-400'
                  : flashing
                    ? 'border-red-500'
                    : selected
                      ? 'cursor-pointer border-sky-500/60 hover:border-sky-400'
                      : 'border-slate-700',
              ].join(' ')}
            >
              <img
                src={`${BASE}data/images/${it.imageRef}`}
                alt=""
                className="aspect-square w-full object-contain bg-white"
                draggable={false}
              />
              {done && (
                <div className="absolute inset-x-0 bottom-0 bg-teal-500/90 px-2 py-1 text-center text-sm font-semibold text-slate-900">
                  {it.label}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Label bank */}
      <div className="mt-6 flex flex-wrap gap-2">
        {bank.map((id) => {
          const it = round.find((x) => x.id === id)!
          if (placed[id]) return null
          const isSel = selected === id
          return (
            <button
              key={id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onClick={() => setSelected((s) => (s === id ? null : id))}
              className={[
                'cursor-grab rounded-lg border px-3 py-2 text-sm font-medium transition active:cursor-grabbing',
                isSel
                  ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                  : 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-400',
              ].join(' ')}
            >
              {it.label}
            </button>
          )
        })}
      </div>

      {roundComplete && (
        <button
          onClick={() => {
            setRoundIdx((i) => i + 1)
            setPlaced({})
            setSelected(null)
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
