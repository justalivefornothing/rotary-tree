/**
 * Immutable binary-search-tree primitives shared by the AVL tree and the
 * plain (ghost) BST. Every node stores its height so balance factors are O(1),
 * and every mutation path-copies from the root, so old trees stay valid
 * snapshots — which is what lets the UI animate between phases.
 */

export interface Node {
  readonly key: number
  readonly left: Node | null
  readonly right: Node | null
  /** Height in nodes: a leaf is 1, an empty subtree is 0. */
  readonly height: number
}

export interface Tree {
  readonly root: Node | null
}

export const empty: Tree = { root: null }

export const h = (n: Node | null): number => (n ? n.height : 0)

export const mk = (key: number, left: Node | null, right: Node | null): Node => ({
  key,
  left,
  right,
  height: 1 + Math.max(h(left), h(right)),
})

/** Balance factor: height(left) - height(right). AVL keeps this in [-1, 1]. */
export const bf = (n: Node | null): number => (n ? h(n.left) - h(n.right) : 0)

export function height(t: Tree | Node | null): number {
  if (!t) return 0
  return 'root' in t ? h(t.root) : t.height
}

export function find(n: Node | null, key: number): Node | null {
  while (n && n.key !== key) n = key < n.key ? n.left : n.right
  return n
}

export const contains = (t: Tree, key: number): boolean => find(t.root, key) !== null

export function minNode(n: Node): Node {
  while (n.left) n = n.left
  return n
}

export function size(n: Node | null): number {
  return n ? 1 + size(n.left) + size(n.right) : 0
}

/**
 * Plain BST insert. `path` receives the keys of every ancestor of the new
 * node, root first — the nodes whose heights (and balance) may have changed.
 * Callers must check `contains` first; duplicates are not handled here.
 */
export function insertPlain(n: Node | null, key: number, path: number[]): Node {
  if (!n) return mk(key, null, null)
  path.push(n.key)
  return key < n.key
    ? mk(n.key, insertPlain(n.left, key, path), n.right)
    : mk(n.key, n.left, insertPlain(n.right, key, path))
}

/**
 * Plain BST delete. A node with two children is replaced by its in-order
 * successor. `path` receives, root first, every surviving node whose subtree
 * changed shape — including the successor in its new spot.
 */
export function removePlain(n: Node | null, key: number, path: number[]): Node | null {
  if (!n) return null
  if (key < n.key) {
    path.push(n.key)
    return mk(n.key, removePlain(n.left, key, path), n.right)
  }
  if (key > n.key) {
    path.push(n.key)
    return mk(n.key, n.left, removePlain(n.right, key, path))
  }
  if (!n.left) return n.right
  if (!n.right) return n.left
  const succ = minNode(n.right)
  path.push(succ.key)
  return mk(succ.key, n.left, removeMin(n.right, path))
}

function removeMin(n: Node, path: number[]): Node | null {
  if (!n.left) return n.right
  path.push(n.key)
  return mk(n.key, removeMin(n.left, path), n.right)
}

export function inorder(t: Tree | Node | null): number[] {
  const out: number[] = []
  const walk = (n: Node | null) => {
    if (!n) return
    walk(n.left)
    out.push(n.key)
    walk(n.right)
  }
  walk(t && 'root' in t ? t.root : t)
  return out
}

export function preorder(t: Tree | Node | null): number[] {
  const out: number[] = []
  const walk = (n: Node | null) => {
    if (!n) return
    out.push(n.key)
    walk(n.left)
    walk(n.right)
  }
  walk(t && 'root' in t ? t.root : t)
  return out
}

/** Balance factor of every node, in pre-order. */
export function allBalanceFactors(t: Tree): number[] {
  const out: number[] = []
  const walk = (n: Node | null) => {
    if (!n) return
    out.push(bf(n))
    walk(n.left)
    walk(n.right)
  }
  walk(t.root)
  return out
}
