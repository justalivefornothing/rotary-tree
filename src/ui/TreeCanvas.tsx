import type { Rotation, Tree } from '../tree/avl'
import { COL, ROW, layout, px } from '../tree/layout'

const R = 14
const PAD = 26

interface Props {
  tree: Tree
  /** Shared grid so two panels draw at the same scale. */
  cols: number
  rows: number
  ghost?: boolean
  violator?: number | null
  rotation?: Rotation | null
  /** Key that just appeared in this phase (pop-in animation). */
  entering?: number | null
  cursor?: number | null
  visited?: ReadonlySet<number>
  emptyText?: string
}

const fmtBf = (b: number) => (b > 0 ? `+${b}` : String(b))

/**
 * Dashed arc on the circle centred on the pivot–riser edge. The four corners
 * of the rectangle spanned by the edge before and after the rotation all lie
 * on that circle, so the arc from a node's old spot to its new spot is a true
 * circular sweep — clockwise for rotateRight, counter-clockwise for rotateLeft.
 */
function arcPath(from: { x: number; y: number }, to: { x: number; y: number }, centre: { x: number; y: number }, clockwise: boolean) {
  const r = Math.hypot(from.x - centre.x, from.y - centre.y)
  if (r === 0) return ''
  const trim = (R + 4) / r
  let a0 = Math.atan2(from.y - centre.y, from.x - centre.x)
  let a1 = Math.atan2(to.y - centre.y, to.x - centre.x)
  if (clockwise) {
    if (a1 < a0) a1 += Math.PI * 2
    a0 += trim
    a1 -= trim
  } else {
    if (a1 > a0) a1 -= Math.PI * 2
    a0 -= trim
    a1 += trim
  }
  const p0 = { x: centre.x + r * Math.cos(a0), y: centre.y + r * Math.sin(a0) }
  const p1 = { x: centre.x + r * Math.cos(a1), y: centre.y + r * Math.sin(a1) }
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 0 ${clockwise ? 1 : 0} ${p1.x} ${p1.y}`
}

export function TreeCanvas({ tree, cols, rows, ghost = false, violator = null, rotation = null, entering = null, cursor = null, visited, emptyText }: Props) {
  const placed = layout(tree)
  const byKey = new Map(placed.map((p) => [p.key, px(p)]))
  // Minimums keep one- or two-node trees from scaling up to fill the panel.
  const nCols = Math.max(cols, 8)
  const nRows = Math.max(rows, 4)
  const vbW = (nCols - 1) * COL + PAD * 2
  const vbH = (nRows - 1) * ROW + PAD * 2 + 10
  // Centre a narrow tree inside the (wider) minimum viewBox.
  const x0 = -PAD - ((nCols - 1) * COL - Math.max(cols - 1, 0) * COL) / 2

  let arcs: { pivot: string; riser: string } | null = null
  if (rotation && !ghost) {
    const p = byKey.get(rotation.pivot)
    const r = byKey.get(rotation.riser)
    if (p && r) {
      const centre = { x: (p.x + r.x) / 2, y: (p.y + r.y) / 2 }
      const cw = rotation.dir === 'right'
      arcs = {
        pivot: arcPath({ x: p.x, y: r.y }, p, centre, cw),
        riser: arcPath({ x: r.x, y: p.y }, r, centre, cw),
      }
    }
  }

  const cursorPos = cursor !== null ? byKey.get(cursor) : undefined

  return (
    <svg
      className={`tree-svg block h-full w-full ${ghost ? 'ghost' : ''}`}
      viewBox={`${x0} ${-PAD} ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMin meet"
      role="img"
      aria-label={ghost ? 'Unbalanced binary search tree' : 'AVL tree'}
    >
      {!ghost && (
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-glow)" />
          </marker>
        </defs>
      )}

      <g className="ruler" aria-hidden="true">
        {Array.from({ length: nRows }, (_, d) => (
          <g key={d}>
            <line x1={x0 + 16} y1={d * ROW} x2={x0 + vbW - 8} y2={d * ROW} />
            <text x={x0 + 12} y={d * ROW} textAnchor="end" dominantBaseline="central">
              {d}
            </text>
          </g>
        ))}
      </g>

      {placed.length === 0 && emptyText && (
        <text x={x0 + vbW / 2} y={ROW * 1.5} className="empty-text" textAnchor="middle">
          {emptyText}
        </text>
      )}

      <g className="edges">
        {placed.map((p) => {
          if (p.parent === null) return null
          const c = byKey.get(p.key)
          const par = byKey.get(p.parent)
          if (!c || !par) return null
          const dx = par.x - c.x
          const dy = par.y - c.y
          const len = Math.hypot(dx, dy)
          const deg = (Math.atan2(dy, dx) * 180) / Math.PI
          return (
            <g key={p.key} className="edge" style={{ transform: `translate(${c.x}px, ${c.y}px) rotate(${deg}deg) scale(${len}, 1)` }}>
              <line x1={0} y1={0} x2={1} y2={0} vectorEffect="non-scaling-stroke" />
            </g>
          )
        })}
      </g>

      {arcs && (
        <g className="arcs">
          <path d={arcs.pivot} className="arc arc-pivot" markerEnd="url(#arrow)" />
          <path d={arcs.riser} className="arc arc-riser" markerEnd="url(#arrow)" />
        </g>
      )}

      {cursorPos && (
        <circle className="cursor" r={R + 6} style={{ transform: `translate(${cursorPos.x}px, ${cursorPos.y}px)` }} />
      )}

      <g className="nodes">
        {placed.map((p) => {
          const pos = byKey.get(p.key)
          if (!pos) return null
          const cls = [
            'node',
            p.key === violator ? 'violator' : '',
            rotation && p.key === rotation.pivot ? 'pivot' : '',
            rotation && p.key === rotation.riser ? 'riser' : '',
            visited?.has(p.key) ? 'visited' : '',
            p.key === cursor ? 'current' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <g key={p.key} className={cls} style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}>
              <g className={p.key === entering ? 'pop' : undefined}>
                <circle r={R} className="disc" />
                <text className="key" textAnchor="middle" dominantBaseline="central">
                  {p.key}
                </text>
                {!ghost && (
                  <g className="badges">
                    <circle cx={R - 1} cy={-R + 1} r={7.5} className={`bf-badge ${Math.abs(p.bf) > 1 ? 'bad' : ''}`} />
                    <text x={R - 1} y={-R + 1} className="bf-text" textAnchor="middle" dominantBaseline="central">
                      {fmtBf(p.bf)}
                    </text>
                    <text x={R + 3} y={R + 4} className="h-text" textAnchor="start">
                      h{p.height}
                    </text>
                  </g>
                )}
              </g>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
