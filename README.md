# Dream Journal

A voice-first dream journal PWA. Record a dream the moment you wake up, and let the app keep the audio and a written record together — searchable, moodtagged, and installable on your phone's home screen.

## Features

- **Voice recording** — capture dreams by voice with a live audio visualizer, no typing required
- **Local-first storage** — recordings and metadata are stored in IndexedDB directly on your device, with persistent storage requested from the browser so entries survive
- **Mood tagging & search** — tag dreams with a mood and filter/search your journal
- **Installable PWA** — works offline via a service worker, installable to your home screen, with a shortcut that jumps straight into recording

## Tech stack

- [Preact](https://preactjs.com/) for the UI
- [Vite](https://vite.dev/) for dev/build tooling
- IndexedDB for local persistence (no backend/server)

## Getting started

Install dependencies and start the dev server:

```bash
bun install   # or: npm install
bun run dev   # or: npm run dev
```

Build for production:

```bash
bun run build   # or: npm run build
```

Preview the production build locally:

```bash
bun run preview   # or: npm run preview
```

## Deployment

This site is deployed to GitHub Pages using [gh-pages](https://github.com/tschaub/gh-pages). To build and publish:

```bash
npm run deploy
```

This builds the app and pushes the `dist/` folder to the `gh-pages` branch.
