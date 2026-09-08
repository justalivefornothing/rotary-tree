/** Key sequences for bulk insert, all deterministic. */

/** Inclusive integer range: range(1, 3) → [1, 2, 3]. */
export function range(from: number, to: number): number[] {
  const out: number[] = []
  for (let i = from; i <= to; i++) out.push(i)
  return out
}

/** mulberry32 — tiny, well-distributed 32-bit PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher–Yates with a seeded generator; never mutates the input. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice()
  const rnd = mulberry32(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const a = out[i] as T
    out[i] = out[j] as T
    out[j] = a
  }
  return out
}

/** 1, n, 2, n-1, 3, … — every insert lands on the inside, so it drives LR/RL. */
export function zigzag(n: number): number[] {
  const out: number[] = []
  for (let lo = 1, hi = n; lo <= hi; lo++, hi--) {
    out.push(lo)
    if (lo !== hi) out.push(hi)
  }
  return out
}
