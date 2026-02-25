# Sprite Creator - Implementation Plan

## Context

We're building a pixel art sprite creator for making game sprites (16x16 and 32x32). Starting with a focused core editor — a solid pixel drawing experience in a vanilla HTML/CSS/JS web app. Layers, templates, export, and procedural generation will be added in later phases. The tool should feel as good to use as Aseprite/Piskel while being browser-based with zero install.

## Research Insights (What Makes Great Sprite Tools)

From studying Aseprite, Piskel, Pixelorama, and community feedback:

- **Real-time mini preview** at actual size while editing zoomed in
- **Symmetry drawing** (X/Y/X+Y axis mirroring) - huge time saver for characters
- **Pre-built palettes** (PICO-8, NES, Endesga-32, etc.)
- **Keyboard shortcuts for everything** - B=brush, E=eraser, G=fill, etc.
- **Checkerboard transparency** indicator
- **Dark theme** essential for pixel art work
- **Clear, focused UI** - no excess functionality

---

## Milestone 1: Core Editor ✅

A fully functional pixel art editor with drawing tools, color system, undo/redo, and canvas controls. Both 16x16 and 32x32 canvas sizes. No layers, no templates, no export — just a great drawing experience.

### Implementation Steps

**Step 1: Foundation** ✅
- `index.html`, `style.css`, `EventBus.js`, `Project.js`, `CanvasRenderer.js`, `app.js`

**Step 2: Drawing Tools** ✅
- `Tool.js`, `PencilTool.js`, `EraserTool.js`, `FillTool.js`, `LineTool.js`, `RectTool.js`, `EyedropperTool.js`, `Toolbar.js`, `HistoryManager.js`

**Step 3: Color System** ✅
- `ColorUtils.js`, `ColorPicker.js`, `PalettePanel.js`, `default-palettes.js`, `BottomBar.js`

---

## Milestone 2: Layers + Advanced Tools ✅

### What was built

**New files:**
- `js/core/Layer.js` — Data class (pixels, visible, opacity, clone/getPixel/setPixel)
- `js/ui/LayerPanel.js` — Layer list with visibility, opacity slider, drag-reorder, add/delete
- `js/tools/SelectTool.js` — Rect marquee → floating move → Delete to clear
- `js/tools/SymmetryTool.js` — Mirror drawing across X, Y, or XY axes

**Modified files:**
- `js/core/Project.js` — Multi-layer array, `flattenPixels()` (Porter-Duff), `snapshotLayers()`
- `js/core/HistoryManager.js` — Full layer snapshots via `snapshotLayers()` / `restoreSnapshot()`
- `js/core/CanvasRenderer.js` — Composite rendering + animated marching ants selection rect
- `js/ui/Toolbar.js` — Symmetry axis toggle buttons (X/Y/XY) when SymmetryTool active
- `js/app.js` — New tools, layer events, Delete shortcut, tab switcher
- `index.html` + `style.css` — Color/Layers tabs + layer item styles

### Key architectural decisions

| Decision | Rationale |
|---|---|
| Separate command vs state events | Prevents EventBus feedback loops. UI emits `layer:add`, project emits `layers:changed`. |
| `flattenPixels()` on every render | Porter-Duff over compositing. At 32×32 × 5 layers it's ~80KB/frame, trivially fast. |
| Full multi-layer snapshots in history | 32×32×4×5 layers = 20KB per step, 100 steps = 2MB. Still trivial. |
| Floating selection (lift-on-move) | Matches Photoshop/Aseprite behavior. Pixels removed from layer until committed on pointer-up. |

---

## Milestone 3: Templates (next)

- Template data format (JSON), TemplatePart with color-slot tinting
- Pre-built pixel art parts (humanoids, creatures, items)
- TemplateMode + TemplatePanel UI

## Milestone 4: Export + Save/Load ✅

- PNG export at 1x–8x scale, sprite sheets, clipboard copy
- Save/Open project as .json files with name prompt
- Export dropdown with scale selector

## Milestone 5: Procedural Generation — On Hold

- Text prompt → procedural pixel art sprite
- API integration point for real AI backends
- Skipped: quality ceiling too low for procedural, AI adds unwanted dependencies

## Milestone 6: Animation

- Timeline, onion skinning, frame-by-frame editing
- Animated GIF / sprite sheet export
