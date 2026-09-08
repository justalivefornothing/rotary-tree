import { describe, expect, it } from 'vitest'
import { empty, insertAll } from './avl'
import { bstInsert } from './bst'
import { layout } from './layout'
import { range, seededShuffle, zigzag } from './seq'

describe('layout', () => {
  it('assigns x by in-order rank and y by depth', () => {
    const t = insertAll(empty, [1, 2, 3, 4, 5, 6, 7]).tree
    const placed = layout(t)
    expect(placed.map((p) => p.key)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(placed.map((p) => p.rank)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(placed.map((p) => p.depth)).toEqual([2, 1, 2, 0, 2, 1, 2])
    expect(placed.find((p) => p.key === 4)?.parent).toBeNull()
    expect(placed.find((p) => p.key === 3)?.parent).toBe(2)
  })

  it('gives the ghost BST the same columns as the AVL tree', () => {
    const keys = range(1, 10)
    const avl = layout(insertAll(empty, keys).tree)
    const ghost = layout(keys.reduce(bstInsert, empty))
    expect(ghost.map((p) => [p.key, p.rank])).toEqual(avl.map((p) => [p.key, p.rank]))
    expect(Math.max(...ghost.map((p) => p.depth))).toBe(9)
    expect(Math.max(...avl.map((p) => p.depth))).toBe(3)
  })

  it('carries balance factor and height for badges', () => {
    const placed = layout(insertAll(empty, [2, 1, 3, 4]).tree)
    expect(placed.find((p) => p.key === 2)).toMatchObject({ bf: -1, height: 3 })
    expect(placed.find((p) => p.key === 4)).toMatchObject({ bf: 0, height: 1 })
  })
})

describe('sequences', () => {
  it('range is inclusive', () => {
    expect(range(1, 3)).toEqual([1, 2, 3])
    expect(range(5, 4)).toEqual([])
  })

  it('seeded shuffle is a deterministic permutation', () => {
    const a = seededShuffle(range(1, 20), 7)
    expect(a).toEqual(seededShuffle(range(1, 20), 7))
    expect(a).not.toEqual(range(1, 20))
    expect([...a].sort((x, y) => x - y)).toEqual(range(1, 20))
  })

  it('zig-zag alternates low and high', () => {
    expect(zigzag(7)).toEqual([1, 7, 2, 6, 3, 5, 4])
    expect(zigzag(6)).toEqual([1, 6, 2, 5, 3, 4])
  })
})
