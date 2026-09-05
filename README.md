# Bézier Pen Lab

An interactive Grade 8 platform for learning vector paths and the Pen Tool through progressive, Illustrator-style practice.

## Student experience

- Corner points, smooth curves, mixed node types, and broken handles
- Shift angle constraint, Alt/Option independent handles, undo, redo, and anchor deletion
- Accuracy and node-efficiency feedback
- Five-layer **Eco Summit** logo evidence challenge
- Eleven-part **Homer Head** construction challenge based on the supplied class guide
- Local progress saving
- Downloadable assembled SVG artwork and evidence sheets

## Tablet drawing controls

The two controls above the drawing toolbar work with a finger, stylus, or mouse:

| Control | What it does | Keyboard equivalent |
| --- | --- | --- |
| **Snap angles (45°)** | Constrains a handle to horizontal, vertical, or diagonal directions while creating or adjusting it. | Hold Shift |
| **Independent handles** | Moves one existing handle without moving its opposite. | Hold Alt/Option |

Both controls start **Off**. Tap either to toggle it; they can be used together.
They stay selected across exercises until switched off or the page reloads.
The keyboard shortcuts also work while the controls are off.

Tap once to place a corner. Press and drag to create a smooth point with two
handles, then turn on **Independent handles** and drag one handle to shape a
corner between curves. Use the **Close path** or **Finish stroke** button as
appropriate, then **Check**. Undo, Redo, Delete, and Reset path are also buttons.

Toolbar controls wrap on narrow screens and retain their text labels. Only the
drawing canvas captures drawing gestures; scroll using the surrounding page.

## Live GitHub Pages site

Published from the production build committed at the repository root:

**https://karbian.github.io/bezier-pen-lab/**

## Run locally

```bash
npm install
npm run dev
```

Then open the local address displayed in the terminal.

## Build

```bash
npm run build
```

The static site is generated in `dist/`.

## Deployment

Source changes on `main` run `.github/workflows/deploy-pages.yml`. The workflow
builds the Vite application and refreshes the branch-hosted production assets.
GitHub Pages then publishes the repository root.

## Focused regression checks

Using Node.js 22.13 or newer, run the dependency-free pen-input tests:

```bash
node --experimental-strip-types --test tests/pen-input.test.mjs
npm run build
```

The tests cover handle constraints, independent movement, SVG coordinate mapping,
and ownership of a gesture by one pointer. The build also checks TypeScript.
Actual tablet interaction and download checks are listed in the
[classroom launch review](docs/classroom-launch-review.md).
