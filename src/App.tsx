import { useEffect, useMemo } from 'react'
import { type RotationCase, height } from './tree/avl'
import { bf, find, size } from './tree/node'
import { Controls } from './ui/Controls'
import { OpLog } from './ui/OpLog'
import { TreeCanvas } from './ui/TreeCanvas'
import { usePlayer } from './ui/usePlayer'

const CASES: { kind: RotationCase; hint: string }[] = [
  { kind: 'LL', hint: 'left-left → rotateRight' },
  { kind: 'RR', hint: 'right-right → rotateLeft' },
  { kind: 'LR', hint: 'left-right → rotateLeft, rotateRight' },
  { kind: 'RL', hint: 'right-left → rotateRight, rotateLeft' },
]

const fmtBf = (b: number) => (b > 0 ? `+${b}` : String(b))

export default function App() {
  const { state, dispatch } = usePlayer()
  const { avl, ghost, history, head, queue, active, stepMode, traversal, notice } = state

  const phase = active ? active.result.phases[active.phase] : undefined
  const avlShown = phase?.tree ?? avl
  const ghostShown = active?.ghost ?? ghost
  const violator = phase?.violator ?? null
  const rotation = phase?.rotation ?? null
  const entering = active && active.result.op === 'insert' && active.phase === 0 ? active.result.key : null

  const n = Math.max(size(avlShown.root), size(ghostShown.root))
  const avlH = height(avlShown)
  const ghostH = height(ghostShown)
  const rows = Math.max(avlH, ghostH, 1)
  const busy = !!active || queue.length > 0 || !!traversal

  const visited = useMemo(() => new Set(traversal ? traversal.keys.slice(0, traversal.i) : []), [traversal])
  const cursor = traversal && traversal.i > 0 ? (traversal.keys[traversal.i - 1] ?? null) : null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch({ type: 'stop' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])

  const violatorBf = violator !== null ? fmtBf(bf(find(avlShown.root, violator))) : ''

  let status: string
  if (notice) status = notice
  else if (traversal) status = `${traversal.order === 'in' ? 'In-order' : 'Pre-order'} traversal`
  else if (active && phase) {
    const { op, key } = active.result
    if (rotation) {
      status = `${rotation.dir === 'left' ? 'rotateLeft' : 'rotateRight'}(${rotation.pivot}) — ${rotation.riser} rises, ${rotation.pivot} swings ${rotation.dir === 'left' ? 'down-left' : 'down-right'} · ${rotation.kind}`
    } else if (violator !== null) {
      status = active.awaiting
        ? `${op}(${key}) done as a plain BST. Node ${violator} now has balance factor ${violatorBf}.`
        : `${op}(${key}): node ${violator} is out of balance (${violatorBf}) — rebalancing…`
    } else {
      status = `${op}(${key}) — still balanced, no rotation needed.`
    }
  } else if (queue.length > 0) status = `${queue.length} queued…`
  else if (!avl.root) status = 'Empty. Try “Ascending” and watch the ghost degenerate into a chain.'
  else status = `Ready. ${n} keys · AVL height ${avlH} vs plain BST height ${ghostH}.`

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-white/15 pb-4">
        <div>
          <h1 className="font-mono text-2xl font-light tracking-tight sm:text-3xl">
            Rotary <span className="text-glow">Tree</span>
          </h1>
          <p className="mt-1 max-w-2xl font-sans text-sm text-ink/70">
            An AVL tree that animates every rotation as nodes swing into place, next to a ghost unbalanced BST for contrast.
          </p>
        </div>
        <dl className="flex gap-5 font-mono text-xs text-ink/60">
          <Stat label="AVL height" value={avlH} accent />
          <Stat label="BST height" value={ghostH} />
          <Stat label="keys" value={n} />
        </dl>
      </header>

      <main className="grid flex-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="panel flex flex-col gap-6 p-4 lg:max-h-[calc(100dvh-9rem)]">
          <Controls
            busy={busy}
            hasTree={!!avl.root || history.length > 0}
            stepMode={stepMode}
            onInsert={(key) => dispatch({ type: 'enqueue', ops: [{ op: 'insert', key }] })}
            onRemove={(key) => dispatch({ type: 'enqueue', ops: [{ op: 'remove', key }] })}
            onBulk={(keys) => dispatch({ type: 'enqueue', ops: keys.map((key) => ({ op: 'insert' as const, key })) })}
            onTraverse={(order) => dispatch({ type: 'traverse', order })}
            onStepMode={(on) => dispatch({ type: 'stepMode', on })}
            onStop={() => dispatch({ type: 'stop' })}
            onClear={() => dispatch({ type: 'clear' })}
          />
          <OpLog history={history} head={head} playing={active?.replayOf ?? null} disabled={busy} onReplay={(i) => dispatch({ type: 'replay', index: i })} />
        </aside>

        <section className="grid min-w-0 gap-5 md:grid-cols-2">
          <article className="panel relative flex min-w-0 flex-col">
            <PanelHead title="AVL tree" meta={`height ${avlH} · ${size(avlShown.root)} nodes`} />
            <div className="canvas">
              <TreeCanvas
                tree={avlShown}
                cols={n}
                rows={rows}
                violator={violator}
                rotation={rotation}
                entering={entering}
                cursor={cursor}
                visited={visited}
                emptyText="empty — insert a key or run a sequence"
              />
            </div>
            {active?.awaiting && (
              <div className="prompt" role="dialog" aria-label="Predict the rotation">
                {violator !== null ? (
                  <>
                    <p className="font-mono text-sm">
                      Node <b className="text-rose">{violator}</b> has balance factor <b className="text-rose">{violatorBf}</b>. Which case is it?
                    </p>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {CASES.map((c) => (
                        <button key={c.kind} type="button" className="btn btn-primary" title={c.hint} onClick={() => dispatch({ type: 'resume', picked: c.kind })} autoFocus={c.kind === 'LL'}>
                          {c.kind}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-mono text-sm">Every balance factor is still within ±1 — nothing to fix.</p>
                    <button type="button" className="btn btn-primary mt-3" autoFocus onClick={() => dispatch({ type: 'resume' })}>
                      Continue
                    </button>
                  </>
                )}
              </div>
            )}
            <footer className="status" aria-live="polite">
              <span className={`dot ${busy ? 'live' : ''}`} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{status}</span>
              {active?.guess && (
                <span className={`guess ${active.guess.correct ? 'ok' : 'miss'}`}>{active.guess.correct ? `${active.guess.picked} ✓` : `not ${active.guess.picked}`}</span>
              )}
            </footer>
            {traversal && (
              <div className="ticker" aria-label="Traversal order">
                {traversal.keys.map((k, i) => (
                  <span key={k} className={`chip ${i < traversal.i - 1 ? 'seen' : i === traversal.i - 1 ? 'now' : ''}`}>
                    {k}
                  </span>
                ))}
              </div>
            )}
          </article>

          <article className="panel flex min-w-0 flex-col">
            <PanelHead title="Ghost BST" meta={`height ${ghostH} · never rebalanced`} ghost />
            <div className="canvas">
              <TreeCanvas tree={ghostShown} cols={n} rows={rows} ghost emptyText="same keys, no rotations" />
            </div>
            <footer className="status">
              <span className="dot" aria-hidden="true" />
              <span className="truncate">
                {ghost.root
                  ? `Same ${n} keys inserted in the same order. ${ghostH > avlH ? `${ghostH - avlH} level${ghostH - avlH === 1 ? '' : 's'} deeper than the AVL tree.` : 'Same height as the AVL tree — for now.'}`
                  : 'Mirrors every operation without rebalancing.'}
              </span>
            </footer>
          </article>
        </section>
      </main>

      <footer className="hint flex flex-wrap justify-between gap-2 border-t border-white/10 pt-3">
        <span>x = in-order rank, y = depth — a rotation only ever moves nodes vertically.</span>
        <span>
          Balance factor = h(left) − h(right) · <a className="underline decoration-white/30 hover:text-ink" href="https://github.com/goonerlogy-cyber/rotary-tree">source</a>
        </span>
      </footer>
    </div>
  )
}

function Stat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex flex-col items-end">
      <dt className="uppercase tracking-widest text-[10px]">{label}</dt>
      <dd className={`text-lg leading-none ${accent ? 'text-glow' : 'text-ink'}`}>{value}</dd>
    </div>
  )
}

function PanelHead({ title, meta, ghost = false }: { title: string; meta: string; ghost?: boolean }) {
  return (
    <header className="flex items-baseline justify-between gap-3 border-b border-white/10 px-4 py-2.5">
      <h2 className={`label ${ghost ? 'text-ink/50' : 'text-ink'}`}>{title}</h2>
      <span className="hint truncate">{meta}</span>
    </header>
  )
}
