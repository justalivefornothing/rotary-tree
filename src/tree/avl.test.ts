import { describe, expect, it } from 'vitest'
import {
  type Tree,
  allBalanceFactors,
  empty,
  height,
  inorder,
  insert,
  insertAll,
  preorder,
  remove,
} from './avl'
import { bf, contains } from './node'
import { range, seededShuffle } from './seq'

const rootKey = (t: Tree) => t.root?.key

describe('AVL insert', () => {
  it('builds a perfect tree from 1..7', () => {
    const t = insertAll(empty, [1, 2, 3, 4, 5, 6, 7])
    expect(t.root?.key).toBe(4)
    expect(height(t)).toBe(3)
    expect(t.events).toEqual(['rotateLeft(1)', 'rotateLeft(3)', 'rotateLeft(2)', 'rotateLeft(5)'])
  })

  it('LL case: single right rotation', () => {
    const { tree, events } = insertAll(empty, [30, 20, 10])
    expect(rootKey(tree)).toBe(20)
    expect(events).toEqual(['rotateRight(30)'])
  })

  it('LR case: left then right', () => {
    const { tree, events } = insertAll(empty, [30, 10, 20])
    expect(rootKey(tree)).toBe(20)
    expect(events).toEqual(['rotateLeft(10)', 'rotateRight(30)'])
  })

  it('RR case: single left rotation', () => {
    const { tree, events } = insertAll(empty, [10, 20, 30])
    expect(rootKey(tree)).toBe(20)
    expect(events).toEqual(['rotateLeft(10)'])
  })

  it('RL case: right then left', () => {
    const { tree, events } = insertAll(empty, [10, 30, 20])
    expect(rootKey(tree)).toBe(20)
    expect(events).toEqual(['rotateRight(30)', 'rotateLeft(10)'])
  })

  it('ignores duplicates without changing the tree', () => {
    const base = insertAll(empty, [2, 1, 3]).tree
    const r = insert(base, 2)
    expect(r.changed).toBe(false)
    expect(r.tree).toBe(base)
    expect(r.events).toEqual([])
  })

  it('exposes the unbalanced intermediate tree and the violator as phases', () => {
    const base = insertAll(empty, [30, 10]).tree
    const r = insert(base, 20)
    expect(r.phases).toHaveLength(3)
    const [plain, afterFirst, afterSecond] = r.phases
    expect(plain?.rotation).toBeNull()
    expect(plain?.violator).toBe(30)
    expect(bf(plain?.tree.root ?? null)).toBe(2)
    expect(rootKey(plain!.tree)).toBe(30)
    expect(afterFirst?.rotation).toMatchObject({ dir: 'left', pivot: 10, riser: 20, kind: 'LR', violator: 30 })
    expect(afterFirst?.violator).toBe(30)
    expect(afterSecond?.rotation).toMatchObject({ dir: 'right', pivot: 30, riser: 20, kind: 'LR' })
    expect(afterSecond?.violator).toBeNull()
    expect(afterSecond?.tree).toEqual(r.tree)
  })

  it('never returns an unbalanced tree on a 1000-key seeded shuffle', () => {
    const t = insertAll(empty, seededShuffle(range(1, 1000), 3)).tree
    expect(inorder(t)).toEqual(range(1, 1000))
    expect(height(t)).toBeLessThanOrEqual(Math.floor(1.44 * Math.log2(1002)))
    expect(allBalanceFactors(t).every((b) => Math.abs(b) <= 1)).toBe(true)
  })
})

describe('AVL remove', () => {
  it('stays balanced while deleting the left half of 1..15', () => {
    let t = insertAll(empty, range(1, 15)).tree
    for (const k of [1, 2, 3, 4, 5, 6, 7]) t = remove(t, k).tree
    expect(allBalanceFactors(t).every((b) => Math.abs(b) <= 1)).toBe(true)
    expect(inorder(t)).toEqual(range(8, 15))
  })

  it('removes a node with two children via its in-order successor', () => {
    const t = insertAll(empty, [4, 2, 6, 1, 3, 5, 7]).tree
    const r = remove(t, 4)
    expect(r.changed).toBe(true)
    expect(rootKey(r.tree)).toBe(5)
    expect(inorder(r.tree)).toEqual([1, 2, 3, 5, 6, 7])
    expect(r.events).toEqual([])
  })

  it('rotates when a delete unbalances an ancestor', () => {
    // 20(10, 30(_, 40)) — deleting 10 leaves 20 right-heavy by 2.
    const t = insertAll(empty, [20, 10, 30, 40]).tree
    const r = remove(t, 10)
    expect(r.events).toEqual(['rotateLeft(20)'])
    expect(rootKey(r.tree)).toBe(30)
    expect(r.phases[0]?.violator).toBe(20)
  })

  it('is a no-op for missing keys', () => {
    const t = insertAll(empty, [1, 2]).tree
    const r = remove(t, 99)
    expect(r.changed).toBe(false)
    expect(r.tree).toBe(t)
  })

  it('survives a randomised insert/delete soak and always agrees with a sorted set', () => {
    const keys = seededShuffle(range(1, 200), 11)
    let t: Tree = empty
    const live = new Set<number>()
    for (const k of keys) {
      t = insert(t, k).tree
      live.add(k)
    }
    for (const k of seededShuffle(range(1, 200), 12).slice(0, 150)) {
      t = remove(t, k).tree
      live.delete(k)
      expect(allBalanceFactors(t).every((b) => Math.abs(b) <= 1)).toBe(true)
    }
    expect(inorder(t)).toEqual([...live].sort((a, b) => a - b))
    expect([...live].every((k) => contains(t, k))).toBe(true)
  })
})

describe('traversals', () => {
  it('pre-order lists parents before children', () => {
    const t = insertAll(empty, [1, 2, 3, 4, 5, 6, 7]).tree
    expect(preorder(t)).toEqual([4, 2, 1, 3, 6, 5, 7])
  })
})
