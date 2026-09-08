# Rotary Tree — plan

An AVL tree that animates every rotation as nodes physically swing into place,
next to a ghost unbalanced BST for contrast.

## Goal

Make the *why* of AVL trees visible. Insert 1..10 in order: the plain BST
degenerates into a diagonal chain, while the AVL tree beside it keeps pivoting.
Each rotation is shown as an arc, with the pivot node glowing and the violating
node flashing before the fix.

## Features

1. AVL insert and delete covering LL, RR, LR and RL cases. Every rotation
   animates over ~400 ms with spring easing on SVG node positions.
2. Balance factor badge and height on every node; the violating node flashes
   before the rebalance.
3. Ghost panel: the same insert sequence applied to an unbalanced BST, drawn
   at 40 % opacity for side-by-side height comparison.
4. Operation log listing each rotation (`rotateLeft(30)`) with click-to-replay.
5. Bulk insert sequences (ascending, seeded random, zig-zag) plus manual key
   input.
6. Step mode: pause after the plain BST insert, before the rebalance, so you
   can predict the rotation.
7. In-order / pre-order traversal ticker animating along the tree.

## Architecture

```
src/
  avl/
    avl.ts        immutable AVL: insert/remove return { tree, events, phases }
    bst.ts        plain unbalanced BST for the ghost panel
    layout.ts     x by in-order rank, y by depth -> positioned nodes
    seq.ts        ascending / seeded shuffle / zig-zag generators
    *.test.ts     vitest specs
  ui/
    TreeCanvas    SVG renderer, CSS-transitioned transforms keyed by value
    RotationArc   dashed cyan arrow from pivot to its new position
    Controls      key input, bulk buttons, step mode toggle, traversal
    OpLog         rotation events, click to replay
  App.tsx         state machine: idle -> inserted (unbalanced) -> rebalanced
```

The core is immutable-style: each operation returns a new tree plus an array of
rotation events. Because nodes are keyed by value, React reuses the same `<g>`
for a node whose position changed, and a CSS transition on `transform` tweens
it into place — no animation library.

Step mode works by exposing the intermediate tree: `insert` first performs the
plain BST insert (recording the path), then rebalances bottom-up. The UI can
render the intermediate, possibly-unbalanced tree, highlight the node whose
balance factor is out of range, and wait for the user before applying the
rotations.

## Milestones

- [ ] plan, license, scaffold
- [ ] AVL core + BST ghost + layout, tests green
- [ ] SVG canvas with tweened nodes, badges, rotation arcs
- [ ] controls, bulk sequences, op log with replay
- [ ] step mode and traversal ticker
- [ ] polish: blueprint styling, keyboard, responsive, README
