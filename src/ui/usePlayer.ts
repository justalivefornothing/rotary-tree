/**
 * The playback state machine. Operations are queued, then played one at a
 * time through their phases (plain BST step → each rotation). History keeps a
 * before/after snapshot per operation so any entry can be replayed.
 */
import { useEffect, useReducer } from 'react'
import { type OpResult, type RotationCase, type Tree, empty, insert, remove, inorder, preorder } from '../tree/avl'
import { bstInsert, bstRemove } from '../tree/bst'

export type OpKind = 'insert' | 'remove'
export type Order = 'in' | 'pre'

export interface PendingOp {
  op: OpKind
  key: number
  replayOf?: number
}

export interface Guess {
  picked: RotationCase
  correct: boolean
}

export interface Entry {
  id: number
  op: OpKind
  key: number
  events: string[]
  kind: RotationCase | null
  before: Tree
  after: Tree
  ghostBefore: Tree
  ghostAfter: Tree
  guess: Guess | null
}

interface Active {
  result: OpResult
  ghost: Tree
  phase: number
  awaiting: boolean
  replayOf: number | null
  guess: Guess | null
}

export interface Traversal {
  order: Order
  keys: number[]
  i: number
}

export interface PlayerState {
  avl: Tree
  ghost: Tree
  history: Entry[]
  head: number
  queue: PendingOp[]
  active: Active | null
  stepMode: boolean
  traversal: Traversal | null
  notice: string | null
  nextId: number
}

type Action =
  | { type: 'enqueue'; ops: PendingOp[] }
  | { type: 'start' }
  | { type: 'advance' }
  | { type: 'resume'; picked?: RotationCase }
  | { type: 'replay'; index: number }
  | { type: 'traverse'; order: Order }
  | { type: 'tick' }
  | { type: 'stepMode'; on: boolean }
  | { type: 'stop' }
  | { type: 'clear' }
  | { type: 'notice'; text: string | null }

const initial: PlayerState = {
  avl: empty,
  ghost: empty,
  history: [],
  head: -1,
  queue: [],
  active: null,
  stepMode: false,
  traversal: null,
  notice: null,
  nextId: 1,
}

function reduce(s: PlayerState, a: Action): PlayerState {
  switch (a.type) {
    case 'enqueue':
      return { ...s, queue: [...s.queue, ...a.ops], notice: null }

    case 'start': {
      const [next, ...rest] = s.queue
      if (!next || s.active) return s
      const result = next.op === 'insert' ? insert(s.avl, next.key) : remove(s.avl, next.key)
      if (!result.changed) {
        const why = next.op === 'insert' ? `${next.key} is already in the tree` : `${next.key} is not in the tree`
        return { ...s, queue: rest, notice: why }
      }
      const ghost = next.op === 'insert' ? bstInsert(s.ghost, next.key) : bstRemove(s.ghost, next.key)
      return {
        ...s,
        queue: rest,
        active: { result, ghost, phase: 0, awaiting: s.stepMode, replayOf: next.replayOf ?? null, guess: null },
      }
    }

    case 'advance': {
      const act = s.active
      if (!act || act.awaiting) return s
      if (act.phase < act.result.phases.length - 1) {
        return { ...s, active: { ...act, phase: act.phase + 1 } }
      }
      const { result } = act
      const entry: Entry = {
        id: s.nextId,
        op: result.op,
        key: result.key,
        events: result.events,
        kind: result.rotations[0]?.kind ?? null,
        before: s.avl,
        after: result.tree,
        ghostBefore: s.ghost,
        ghostAfter: act.ghost,
        guess: act.guess,
      }
      const replaying = act.replayOf !== null
      const history = replaying
        ? s.history.map((e, i) => (i === act.replayOf ? { ...e, guess: act.guess ?? e.guess } : e))
        : [...s.history.slice(0, s.head + 1), entry]
      return {
        ...s,
        avl: result.tree,
        ghost: act.ghost,
        history,
        head: replaying ? (act.replayOf as number) : history.length - 1,
        active: null,
        nextId: replaying ? s.nextId : s.nextId + 1,
      }
    }

    case 'resume': {
      if (!s.active) return s
      const expected = s.active.result.rotations[0]?.kind ?? null
      const guess = a.picked && expected ? { picked: a.picked, correct: a.picked === expected } : null
      return { ...s, active: { ...s.active, awaiting: false, guess } }
    }

    case 'replay': {
      const e = s.history[a.index]
      if (!e || s.active || s.traversal) return s
      return {
        ...s,
        avl: e.before,
        ghost: e.ghostBefore,
        head: a.index - 1,
        queue: [{ op: e.op, key: e.key, replayOf: a.index }],
        notice: null,
      }
    }

    case 'traverse': {
      if (s.active || s.queue.length || !s.avl.root) return s
      const keys = a.order === 'in' ? inorder(s.avl) : preorder(s.avl)
      return { ...s, traversal: { order: a.order, keys, i: 0 } }
    }

    case 'tick': {
      if (!s.traversal) return s
      if (s.traversal.i >= s.traversal.keys.length) return { ...s, traversal: null }
      return { ...s, traversal: { ...s.traversal, i: s.traversal.i + 1 } }
    }

    case 'stepMode':
      return { ...s, stepMode: a.on }

    case 'stop':
      return { ...s, queue: [], traversal: null, active: s.active ? { ...s.active, awaiting: false } : null }

    case 'clear':
      return { ...initial, stepMode: s.stepMode }

    case 'notice':
      return { ...s, notice: a.text }
  }
}

export const GAP_MS = 260
export const FLASH_MS = 1000
export const PLAIN_MS = 520
export const ROTATE_MS = 760
export const TICK_MS = 380

export function usePlayer() {
  const [state, dispatch] = useReducer(reduce, initial)
  const { active, queue, traversal, notice } = state

  // Pull the next queued op once nothing is playing.
  useEffect(() => {
    if (active || traversal || queue.length === 0) return
    const t = setTimeout(() => dispatch({ type: 'start' }), GAP_MS)
    return () => clearTimeout(t)
  }, [active, traversal, queue])

  // Step through phases on a timer unless step mode is holding.
  useEffect(() => {
    if (!active || active.awaiting) return
    const phase = active.result.phases[active.phase]
    const ms = active.phase === 0 ? (phase?.violator !== null ? FLASH_MS : PLAIN_MS) : ROTATE_MS
    const t = setTimeout(() => dispatch({ type: 'advance' }), ms)
    return () => clearTimeout(t)
  }, [active])

  useEffect(() => {
    if (!traversal) return
    const done = traversal.i >= traversal.keys.length
    const t = setTimeout(() => dispatch({ type: 'tick' }), done ? 1400 : TICK_MS)
    return () => clearTimeout(t)
  }, [traversal])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => dispatch({ type: 'notice', text: null }), 2600)
    return () => clearTimeout(t)
  }, [notice])

  return { state, dispatch }
}
