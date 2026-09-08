import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { range, seededShuffle, zigzag } from '../tree/seq'
import type { Order } from './usePlayer'

interface Props {
  busy: boolean
  hasTree: boolean
  stepMode: boolean
  onInsert: (key: number) => void
  onRemove: (key: number) => void
  onBulk: (keys: number[]) => void
  onTraverse: (order: Order) => void
  onStepMode: (on: boolean) => void
  onStop: () => void
  onClear: () => void
}

const SIZES = [7, 10, 15, 20]

export function Controls({ busy, hasTree, stepMode, onInsert, onRemove, onBulk, onTraverse, onStepMode, onStop, onClear }: Props) {
  const [text, setText] = useState('')
  const [size, setSize] = useState(10)
  const [seed, setSeed] = useState(3)

  const parsed = Number.parseInt(text, 10)
  const valid = Number.isInteger(parsed) && parsed >= 0 && parsed <= 999

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    onInsert(parsed)
    setText('')
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.shiftKey && valid) {
      e.preventDefault()
      onRemove(parsed)
      setText('')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h2 className="label">Manual</h2>
        <form onSubmit={submit} className="mt-2 flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder="key 0–999"
            aria-label="Key"
            className="field w-0 min-w-0 flex-1"
          />
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            Insert
          </button>
          <button type="button" className="btn" disabled={!valid} onClick={() => { onRemove(parsed); setText('') }}>
            Delete
          </button>
        </form>
        <p className="hint mt-1.5">Enter inserts · Shift+Enter deletes · Esc stops a running sequence</p>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="label">Sequences</h2>
          <div className="flex items-center gap-1.5">
            <label htmlFor="size" className="hint">n</label>
            <select id="size" value={size} onChange={(e) => setSize(Number(e.target.value))} className="field py-0.5 text-xs">
              {SIZES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <label htmlFor="seed" className="hint ml-1">seed</label>
            <input id="seed" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} className="field w-14 py-0.5 text-xs" />
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button type="button" className="btn" onClick={() => onBulk(range(1, size))} title="1, 2, 3, … — every insert lands on the far right (RR)">
            Ascending
          </button>
          <button type="button" className="btn" onClick={() => onBulk(seededShuffle(range(1, size), seed))} title="Seeded Fisher–Yates shuffle of 1..n">
            Random
          </button>
          <button type="button" className="btn" onClick={() => onBulk(zigzag(size))} title="1, n, 2, n−1, … — drives the double rotations (LR / RL)">
            Zig-zag
          </button>
        </div>
      </section>

      <section>
        <h2 className="label">Traversal</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" className="btn" disabled={busy || !hasTree} onClick={() => onTraverse('in')}>
            In-order
          </button>
          <button type="button" className="btn" disabled={busy || !hasTree} onClick={() => onTraverse('pre')}>
            Pre-order
          </button>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <label className="switch">
          <input type="checkbox" checked={stepMode} onChange={(e) => onStepMode(e.target.checked)} />
          <span className="track" aria-hidden="true" />
          <span>Step mode</span>
        </label>
        <div className="flex gap-2">
          <button type="button" className="btn" disabled={!busy} onClick={onStop}>
            Stop
          </button>
          <button type="button" className="btn btn-danger" disabled={!hasTree && !busy} onClick={onClear}>
            Clear
          </button>
        </div>
      </section>
    </div>
  )
}
