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
│   │   ├── CanvasRenderer.js       # Viewport: zoom, pan, grid, checkerboard, selection rect
│   │   ├── HistoryManager.js       # Undo/redo with full multi-layer snapshots
│   │   ├── Project.js              # Canvas size, name, layer array, flattenPixels()
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
│       └── BottomBar.js            # Size selector, zoom, cursor position
└── assets/
    └── palettes/
        └── default-palettes.js     # PICO-8, NES, Endesga-32, Sweetie 16, etc.
```

## Architecture Patterns

- **EventBus**: All cross-component communication goes through `eventBus.emit()`/`eventBus.on()`. Never call between components directly.
- **Layer System**: `Project` holds `layers[]` (array of `Layer`) and `activeLayerIndex`. All tools write to `project.activeLayer` via `project.setPixel()`. Rendering composites all layers via `project.flattenPixels()` (Porter-Duff over).
- **Event Naming — avoid feedback loops**: UI components emit *command* events (e.g. `layer:add`). Core classes emit *state* events (e.g. `layers:changed`). Never use the same name for both.
- **Rendering**: `requestAnimationFrame` loop with dirty flag in `CanvasRenderer`. Call `eventBus.emit('canvas:dirty')` to trigger re-render. Selection rect keeps renderer always dirty for marching-ants animation.
- **History**: Full multi-layer snapshots. `project.snapshotLayers()` / `project.restoreSnapshot()`. `pushState()` before edits.
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

## Keyboard Shortcuts

B=pencil, E=eraser, G=fill, L=line, R=rect, I=eyedropper, S=select, M=symmetry, X=swap colors, Delete/Backspace=delete selection, Ctrl+Z=undo, Ctrl+Shift+Z=redo

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
