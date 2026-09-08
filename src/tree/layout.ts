/**
 * Layout pass: x is the node's in-order rank, y is its depth. Because a
 * rotation never changes in-order, nodes only ever move vertically during a
 * rebalance — the AVL panel and the ghost BST share columns exactly, so their
 * heights compare honestly.
 */
import { type Node, type Tree, bf } from './node'

export interface Placed {
  readonly key: number
  /** In-order rank, 0-based. */
  readonly rank: number
  readonly depth: number
  readonly parent: number | null
  readonly bf: number
  readonly height: number
}

export function layout(tree: Tree): Placed[] {
  const out: Placed[] = []
  let rank = 0
  const walk = (n: Node | null, depth: number, parent: number | null) => {
    if (!n) return
    walk(n.left, depth + 1, n.key)
    out.push({ key: n.key, rank: rank++, depth, parent, bf: bf(n), height: n.height })
    walk(n.right, depth + 1, n.key)
  }
  walk(tree.root, 0, null)
  return out
}

export const COL = 44
export const ROW = 60

export const px = (p: { rank: number; depth: number }) => ({
  x: p.rank * COL,
  y: p.depth * ROW,
})
