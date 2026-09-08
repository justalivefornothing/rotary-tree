/**
 * Immutable AVL tree. Each operation returns a brand-new tree plus the list of
 * rotations it took to restore balance, and a sequence of intermediate
 * snapshots ("phases") so a UI can show the plain BST step, the violating
 * node, and each rotation one at a time.
 */
import {
  type Node,
  type Tree,
  bf,
  contains,
  find,
  insertPlain,
  mk,
  removePlain,
} from './node'

export { empty, height, inorder, preorder, allBalanceFactors } from './node'
export type { Node, Tree } from './node'

export type RotationCase = 'LL' | 'RR' | 'LR' | 'RL'

export interface Rotation {
  readonly dir: 'left' | 'right'
  /** The node that is rotated (moves down). */
  readonly pivot: number
  /** The child that takes the pivot's place (moves up). */
  readonly riser: number
  /** Which imbalance this rotation is part of fixing. */
  readonly kind: RotationCase
  /** The node whose balance factor left [-1, 1]. */
  readonly violator: number
}

export interface Phase {
  readonly tree: Tree
  /** Deepest node with |bf| > 1 in this snapshot, if any — the one to flash. */
  readonly violator: number | null
  /** The rotation that produced this snapshot (null for the plain BST step). */
  readonly rotation: Rotation | null
}

export interface OpResult extends Tree {
  readonly op: 'insert' | 'remove'
  readonly key: number
  readonly tree: Tree
  /** False when inserting a duplicate or removing a missing key. */
  readonly changed: boolean
  /** Human-readable events, e.g. `rotateLeft(10)`. */
  readonly events: string[]
  readonly rotations: Rotation[]
  /** phases[0] is the tree after the plain BST step; one more per rotation. */
  readonly phases: Phase[]
}

export const formatRotation = (r: Rotation): string =>
  `${r.dir === 'left' ? 'rotateLeft' : 'rotateRight'}(${r.pivot})`

export function rotateLeft(n: Node): Node {
  if (!n.right) throw new Error(`rotateLeft(${n.key}): no right child`)
  const r = n.right
  return mk(r.key, mk(n.key, n.left, r.left), r.right)
}

export function rotateRight(n: Node): Node {
  if (!n.left) throw new Error(`rotateRight(${n.key}): no left child`)
  const l = n.left
  return mk(l.key, l.left, mk(n.key, l.right, n.right))
}

/** Path-copy down to `key` and replace that subtree with `fn(subtree)`. */
function replaceAt(n: Node | null, key: number, fn: (n: Node) => Node): Node {
  if (!n) throw new Error(`replaceAt: key ${key} not found`)
  if (key === n.key) return fn(n)
  return key < n.key
    ? mk(n.key, replaceAt(n.left, key, fn), n.right)
    : mk(n.key, n.left, replaceAt(n.right, key, fn))
}

function mustFind(root: Node | null, key: number): Node {
  const n = find(root, key)
  if (!n) throw new Error(`node ${key} vanished`)
  return n
}

/** Deepest node along `path` (root-first keys) whose balance is off. */
function deepestViolator(root: Node | null, path: readonly number[]): number | null {
  for (let i = path.length - 1; i >= 0; i--) {
    const k = path[i]
    if (k !== undefined && Math.abs(bf(find(root, k))) > 1) return k
  }
  return null
}

/**
 * Walk the changed path bottom-up and fix every unbalanced node with the
 * classic four cases. Inserts need at most one fix; deletes may cascade.
 */
function rebalance(root: Node | null, path: readonly number[]): Omit<OpResult, 'op' | 'key' | 'changed' | 'root'> {
  const rotations: Rotation[] = []
  const phases: Phase[] = [{ tree: { root }, violator: deepestViolator(root, path), rotation: null }]
  let cur = root

  const apply = (rotation: Rotation) => {
    const fn = rotation.dir === 'left' ? rotateLeft : rotateRight
    cur = replaceAt(cur, rotation.pivot, fn)
    rotations.push(rotation)
    phases.push({ tree: { root: cur }, violator: deepestViolator(cur, path), rotation })
  }

  for (let i = path.length - 1; i >= 0; i--) {
    const key = path[i]
    if (key === undefined) continue
    const node = mustFind(cur, key)
    const balance = bf(node)
    if (Math.abs(balance) <= 1) continue

    if (balance > 1) {
      const left = node.left as Node
      const kind: RotationCase = bf(left) >= 0 ? 'LL' : 'LR'
      if (kind === 'LR') {
        apply({ dir: 'left', pivot: left.key, riser: (left.right as Node).key, kind, violator: key })
      }
      const riser = (mustFind(cur, key).left as Node).key
      apply({ dir: 'right', pivot: key, riser, kind, violator: key })
    } else {
      const right = node.right as Node
      const kind: RotationCase = bf(right) <= 0 ? 'RR' : 'RL'
      if (kind === 'RL') {
        apply({ dir: 'right', pivot: right.key, riser: (right.left as Node).key, kind, violator: key })
      }
      const riser = (mustFind(cur, key).right as Node).key
      apply({ dir: 'left', pivot: key, riser, kind, violator: key })
    }
  }

  return { tree: { root: cur }, events: rotations.map(formatRotation), rotations, phases }
}

function unchanged(tree: Tree, op: OpResult['op'], key: number): OpResult {
  return {
    op,
    key,
    root: tree.root,
    tree,
    changed: false,
    events: [],
    rotations: [],
    phases: [{ tree, violator: null, rotation: null }],
  }
}

export function insert(tree: Tree, key: number): OpResult {
  if (contains(tree, key)) return unchanged(tree, 'insert', key)
  const path: number[] = []
  const root = insertPlain(tree.root, key, path)
  const r = rebalance(root, path)
  return { op: 'insert', key, root: r.tree.root, changed: true, ...r }
}

export function remove(tree: Tree, key: number): OpResult {
  if (!contains(tree, key)) return unchanged(tree, 'remove', key)
  const path: number[] = []
  const root = removePlain(tree.root, key, path)
  const r = rebalance(root, path)
  return { op: 'remove', key, root: r.tree.root, changed: true, ...r }
}

export interface BatchResult extends Tree {
  readonly tree: Tree
  readonly events: string[]
}

export function insertAll(tree: Tree, keys: Iterable<number>): BatchResult {
  const events: string[] = []
  let cur = tree
  for (const k of keys) {
    const r = insert(cur, k)
    cur = r.tree
    events.push(...r.events)
  }
  return { root: cur.root, tree: cur, events }
}
