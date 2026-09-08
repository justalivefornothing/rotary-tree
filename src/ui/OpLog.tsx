import { useEffect, useRef } from 'react'
import type { Entry } from './usePlayer'

interface Props {
  history: Entry[]
  head: number
  playing: number | null
  disabled: boolean
  onReplay: (index: number) => void
}

export function OpLog({ history, head, playing, disabled, onReplay }: Props) {
  const listRef = useRef<HTMLOListElement>(null)
  const rotations = history.slice(0, head + 1).reduce((n, e) => n + e.events.length, 0)

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [history.length])

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-baseline justify-between">
        <h2 className="label">Operation log</h2>
        <span className="hint">
          {head + 1} ops · {rotations} rotation{rotations === 1 ? '' : 's'}
        </span>
      </div>
      {history.length === 0 ? (
        <p className="hint mt-3 border border-dashed border-white/15 px-3 py-4 text-center">
          Nothing yet. Every insert and delete lands here; click one to replay it.
        </p>
      ) : (
        <ol ref={listRef} className="log mt-2 min-h-0 flex-1 overflow-y-auto pr-1" aria-label="Operations, click to replay">
          {history.map((e, i) => {
            const future = i > head
            const isPlaying = i === playing
            return (
              <li key={e.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onReplay(i)}
                  aria-current={i === head ? 'step' : undefined}
                  className={`log-row ${future ? 'future' : ''} ${isPlaying ? 'playing' : ''} ${i === head ? 'head' : ''}`}
                  title="Replay this operation"
                >
                  <span className="idx">{String(i + 1).padStart(2, '0')}</span>
                  <span className="op">
                    {e.op}({e.key})
                  </span>
                  {e.kind && <span className="kind">{e.kind}</span>}
                  {e.events.length === 0 ? (
                    <span className="ev muted">balanced</span>
                  ) : (
                    e.events.map((ev, j) => (
                      <span key={j} className="ev">
                        {ev}
                      </span>
                    ))
                  )}
                  {e.guess && (
                    <span className={`guess ${e.guess.correct ? 'ok' : 'miss'}`} title={e.guess.correct ? 'Predicted correctly' : `You said ${e.guess.picked}`}>
                      {e.guess.correct ? 'predicted' : `guessed ${e.guess.picked}`}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
