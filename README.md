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

## Live GitHub Pages site

After the deployment workflow completes:

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

Every push to `main` runs the GitHub Pages workflow in
`.github/workflows/deploy-pages.yml`. The workflow builds the Vite application
and publishes `dist/` to GitHub Pages.
