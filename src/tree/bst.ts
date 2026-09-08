/**
 * The ghost: a plain, never-rebalanced BST fed the same operations as the
 * AVL tree. Same node type, same layout — only the shape differs.
 */
import { type Tree, contains, insertPlain, removePlain } from './node'

export function bstInsert(tree: Tree, key: number): Tree {
  if (contains(tree, key)) return tree
  return { root: insertPlain(tree.root, key, []) }
}

export function bstRemove(tree: Tree, key: number): Tree {
  if (!contains(tree, key)) return tree
  return { root: removePlain(tree.root, key, []) }
}
