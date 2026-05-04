# Desktop_Pal

A transparent always-on-top desktop pet for Windows powered by Live2D and an LLM chat bubble. Currently uses Live2D Cubism 2 sample model **Tororo** (white cat) as the visual.

Status: in active development. See specs in `docs/superpowers/specs/`, plans in `docs/superpowers/plans/`.

## Quick start

```bash
npm install
# Set Anthropic env vars (or OpenAI-compatible equivalents):
# ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_MODEL
unset ELECTRON_RUN_AS_NODE  # if your shell exports this for tooling
npm run dev
```

## First-time setup (assets not in git)

Three asset bundles must be downloaded once. They are gitignored due to license / size.

### 1. Live2D Cubism 2 runtime (~129 KB)

```
Source:      https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js
Place at:    src/renderer/public/cubism/live2d.min.js
```

### 2. Live2D Cubism 4 core (~207 KB, kept for future use)

```
Source:      https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js
Place at:    src/renderer/public/cubism/live2dcubismcore.min.js
```

### 3. Tororo sample model (~586 KB)

Mirror: <https://github.com/akyuu-cn/thermal-cat/tree/master/live2d_api/model/tororo>

Place under `src/renderer/public/model/tororo/` preserving the original layout:

```
src/renderer/public/model/tororo/
├── index.json               (this repo's modified version uses motion group "tap_body" instead of "")
├── tororo.pose.json
├── moc/
│   ├── tororo.moc
│   └── tororo.2048/texture_00.png
└── mtn/
    ├── 00_idle.mtn
    └── 01.mtn .. 08.mtn
```

The `index.json` shipped via the mirror has the tap motions under an empty-string group; this repo's tracked `index.json` has them renamed to `tap_body`. After downloading the mirror's files, replace just the `index.json` with this repo's version (it's tracked in git despite the broader `model/**` ignore).

### 4. LLM credentials

Either:
- `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_MODEL`
- `OPENAI_BASE_URL` + `OPENAI_API_KEY` + `OPENAI_MODEL`

Settings UI lets you change them at runtime; env vars only seed first-launch defaults.

## Scripts

| Script             | Purpose                                              |
|--------------------|------------------------------------------------------|
| `npm run dev`      | electron-vite dev (HMR, transparent window).         |
| `npm test`         | vitest run (unit + integration tests).               |
| `npm run typecheck`| `tsc --noEmit` against renderer + node tsconfigs.    |
| `npm run build`    | electron-vite build (out/main, out/preload, out/renderer). |
| `npm run dist`     | electron-builder produces installer in release/.     |

> ⚠️ This shell may have `ELECTRON_RUN_AS_NODE=1` set globally (e.g. for Claude Code's own runtime). It must be unset before `npm run dev`, otherwise electron.exe runs as plain Node and `app` is undefined.

## Third-party assets and SDKs

- **Live2D Cubism Core SDK** © Live2D Inc. — [website](https://www.live2d.com/) / [publishing license](https://www.live2d.com/en/sdk/license/). Free for personal use and small companies (annual revenue under JPY 10 million); we do not redistribute the binary.
- **Live2D Cubism 2 Web Runtime** (`live2d.min.js`) © Live2D Inc., obtained via the [dylanNew/live2d](https://github.com/dylanNew/live2d) mirror.
- **Tororo sample model** © Live2D Inc. — [sample license](https://www.live2d.com/en/learn/sample/). For learning and prototyping only; not redistributed in this repo. Obtained via the [akyuu-cn/thermal-cat](https://github.com/akyuu-cn/thermal-cat) mirror.
- **pixi.js** (MIT) — [pixi.js](https://github.com/pixijs/pixijs).
- **pixi-live2d-display** (MIT) — [@guansss/pixi-live2d-display](https://github.com/guansss/pixi-live2d-display).
- **Vercel AI SDK** (Apache-2.0) — [vercel/ai](https://github.com/vercel/ai).

## Project layout

```
src/main/        Electron main process (window, tray, IPC, settings/credentials, LLM orchestration)
src/preload/     contextBridge exposing window/chat/settings APIs
src/renderer/
  app/           Window-level concerns (passthrough, drag, context menu)
  chat/          Chat bubble + input + useChatStream hook
  settings/      Settings panel UI
  stage/         Live2D rendering (Live2DStage, CursorTracker, MotionController, motionMapper)
docs/            Specs and implementation plans
tests/           vitest suites
```

## License

MIT for our own code. Third-party assets retain their original licenses (see above).
