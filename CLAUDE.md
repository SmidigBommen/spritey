# Sprite Creator

Pixel art sprite creator for making game sprites (16x16 and 32x32). Browser-based, zero install.

## Tech Stack

- Vanilla JS with ES modules (no framework, no build tools)
- Class-based architecture with EventBus for decoupled communication
- Single HTML page, CSS Grid layout, dark theme
- Requires a local dev server for ES module imports (`npx serve .` or `python3 -m http.server`)

## Project Structure

```
sprite-creator/
├── index.html                      # Single page, full layout
├── style.css                       # Dark theme, CSS custom properties, CSS Grid
├── js/
│   ├── app.js                      # Entry point, wires everything together
│   ├── core/
│   │   ├── EventBus.js             # Pub/sub singleton (eventBus)
│   │   ├── CanvasRenderer.js       # Viewport: zoom, pan, grid, checkerboard, onion skinning
│   │   ├── HistoryManager.js       # Undo/redo with frame-aware snapshots
│   │   ├── AnimationPlayer.js      # Frame playback loop with per-frame duration
│   │   ├── Project.js              # Frames, layers, canvas size, flattenPixels/flattenFrame
│   │   ├── ExportManager.js        # PNG, GIF, sprite sheet, animation sheet export
│   │   ├── ProjectSerializer.js    # Save/load v1 & v2 project format
│   │   ├── Layer.js                # Layer data class (pixels, visible, opacity, clone)
│   │   └── ColorUtils.js           # HSV/RGB/Hex conversions
│   ├── tools/
│   │   ├── Tool.js                 # Base class (onPointerDown/Move/Up)
│   │   ├── PencilTool.js           # Pixel drawing + Bresenham interpolation
│   │   ├── EraserTool.js           # Set pixels to transparent
│   │   ├── FillTool.js             # Flood fill (BFS)
│   │   ├── LineTool.js             # Bresenham line with preview
│   │   ├── RectTool.js             # Rectangle outline with preview
│   │   ├── EyedropperTool.js       # Pick color from active layer
│   │   ├── SelectTool.js           # Rect marquee, move (floating), delete
│   │   └── SymmetryTool.js         # Mirror drawing across X/Y/XY axes
│   └── ui/
│       ├── Toolbar.js              # Left sidebar tool buttons + tool option buttons
│       ├── ColorPicker.js          # Canvas-based HSV picker
│       ├── PalettePanel.js         # Preset palette swatches
│       ├── LayerPanel.js           # Layer list: add/delete/reorder/visibility/opacity
│       ├── TimelinePanel.js        # Frame thumbnails, playback controls, onion skin toggle
│       └── BottomBar.js            # Size selector, zoom, cursor position
└── assets/
    └── palettes/
        └── default-palettes.js     # PICO-8, NES, Endesga-32, Sweetie 16, etc.
```

## Architecture Patterns

- **EventBus**: All cross-component communication goes through `eventBus.emit()`/`eventBus.on()`. Never call between components directly.
- **Frame System**: `Project.frames[]` where each frame has `{ layers[], duration }`. `project.layers` is a getter into the active frame — existing code works unchanged.
- **Layer System**: All tools write to `project.activeLayer` via `project.setPixel()`. Rendering composites via `project.flattenPixels()` (Porter-Duff over). `flattenFrame(index)` composites a specific frame.
- **Event Naming — avoid feedback loops**: UI components emit *command* events (e.g. `layer:add`). Core classes emit *state* events (e.g. `layers:changed`). Never use the same name for both.
- **Rendering**: `requestAnimationFrame` loop with dirty flag in `CanvasRenderer`. Call `eventBus.emit('canvas:dirty')` to trigger re-render. Onion skinning renders adjacent frames with blue/red tint.
- **History**: Two snapshot types — `snapshotLayers()` for drawing ops (single frame), `snapshotAllFrames()` for frame-level ops. `restoreSnapshot()` detects type automatically.
- **Animation**: `AnimationPlayer` cycles frames via setTimeout with per-frame durations. Drawing disabled during playback.
- **Tools**: All tools extend `Tool` base class. Interface: `onPointerDown/Move/Up(x, y, project, ctx)`. `ctx` provides `{ color, renderer }`.

## Key Events

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `canvas:dirty` | → Renderer | — | Trigger re-render |
| `layers:changed` | Project → UI | — | Layer state changed, re-render panel |
| `layer:add` | UI → app.js | — | Add a new layer |
| `layer:delete` | UI → app.js | `{ index }` | Delete layer at index |
| `layer:select` | UI → app.js | `{ index }` | Make layer active |
| `layer:reorder` | UI → app.js | `{ from, to }` | Reorder layers |
| `layer:visibility` | UI → app.js | `{ index, visible }` | Toggle layer visibility |
| `layer:opacity` | UI → app.js | `{ index, opacity }` | Set layer opacity (0–1) |
| `tool:select` | any → app.js | Tool instance | Switch active tool |
| `tool:option` | Toolbar → app.js | `{ axis }` | Set SymmetryTool axis |
| `color:changed` | ColorPicker → app.js | [r,g,b,a] | Primary color updated |
| `color:picked` | any → app.js | [r,g,b,a] | Color picked (eyedropper/palette) |
| `color:swap` | any → app.js | — | Swap primary/secondary |
| `history:undo` / `history:redo` | any → app.js | — | Trigger undo/redo |
| `canvas:resize` | BottomBar → app.js | number | Resize canvas (16 or 32) |
| `zoom:changed` | Renderer → UI | number | Zoom level changed |
| `cursor:move` | app.js → UI | `{x, y}` | Pixel coords under cursor |
| `frame:add` | UI → app.js | — | Add new frame |
| `frame:duplicate` | UI → app.js | `{ index }` | Duplicate frame |
| `frame:delete` | UI → app.js | `{ index }` | Delete frame |
| `frame:select` | UI → app.js | `{ index }` | Switch active frame |
| `frame:reorder` | UI → app.js | `{ from, to }` | Reorder frames |
| `frame:switched` | Project → UI | index | Active frame changed |
| `frames:changed` | Project → UI | — | Frame list changed |
| `playback:play/pause/stop` | UI → app.js | — | Playback controls |
| `playback:started/paused/stopped` | Player → UI | — | Playback state changed |
| `onion:toggle` | UI → app.js | — | Toggle onion skinning |
| `onion:changed` | app.js → UI | boolean | Onion skin state changed |

## Keyboard Shortcuts

B=pencil, E=eraser, G=fill, L=line, R=rect, I=eyedropper, S=select, M=symmetry, X=swap colors, Delete/Backspace=delete selection, Ctrl+Z=undo, Ctrl+Shift+Z=redo, N=new frame, ,/.=prev/next frame, Space=play/pause, O=toggle onion skin

## Running

```sh
npx serve .
# or
python3 -m http.server
```

## Conventions

- Keep files small and focused — one class per file
- No build step, no transpilation, no bundler
- Use CSS custom properties for theming (all in `:root` in style.css)
- Tools should never modify UI directly — emit events instead
- Prefer `const` over `let`, no `var`
- Use a MVP approach
- Use well known principles and patterns in your code
- Create a plan.md file with the implementation plan before starting development
- Never add Co-Authored-By or any AI attribution to commit messages

## IMPORTANT PROGRAMMING RULES:
- Minimize code, be DRY
  - Code is liability, logic is an opportunity for bugs
  - We should have as little code as necessary to solve the problem
  - Duplicated logic leads to drift and inconsistency which leads to tech debt, bugs and progress slowdown
  - Important for both source- and test-code
    - Examples:
      - Reusable functions, fixtures, types
      - Prefer table-driven/parameterized tests
      - Create consts and variables for strings/numbers when they are repeated
- Code should be clear and easily readable
- Don't prematurely build abstractions
- Use the right algorithms and datastructures for the problem
- Fix root causes (no band-aid solutions)
- Minimize external dependencies
- Be defensive
  - Examples:
    - Validation for arguments and parameters
    - Bounds and limits for sizes, parallelism etc
- Fail fast/early
- Return errors for user errors, use assertions for critical invariants and programmer errors
- Prefer pure code - easily testable
- Domain models should be free from infrastructure and dependencies
- Parse, dont validate. Prefer representations that prevent invalid states by design
- Be performant
  - Avoid unneeded work and allocations
  - Non-pessimize (don't write slow code for no reason)
  - Examples:
    - Minimize heap allocations (preallocate, reuse allocations, avoid closures, use stack, escape-analysis-friendly code)
    - CPU cache friendly datastructures, algorithms and layout
    - Minimize contention in parallel code
    - Pass by value for small arguments (~16 bytes or less)
    - Batching operations
- Comments should explain _why_ something is done, never _what_ is being done
  - Avoid obvious comments, we only want comments that explain non-obvious reasoning
  - Should have comments: "magic numbers/strings" and non-obvious configuration values
- Strict linting and static analysis
  - Don't suppress lints or warnings without a very good reason
- Warnings should be treated as errors
  - Suppressions should be documented and well-reasoned

## IMPORTANT BEHAVIORAL RULES:
- In all interactions, be extremely concise
- Be direct and straightforward in all responses
- Avoid overly positive or enthusiastic language
- Challenge assumptions and point out potential issues or flaws
- Provide constructive criticism
- Verify assumptions before proceeding
