# Spritey

Pixel art sprite creator for making game sprites (16x16 and 32x32). Browser-based, zero install.

## Features

- **Drawing tools**: Pencil, eraser, flood fill, line, rectangle, eyedropper
- **Selection tool**: Marquee select, move, delete
- **Symmetry drawing**: Mirror across X, Y, or both axes
- **Layer system**: Multiple layers with visibility, opacity, drag-to-reorder
- **Color picker**: HSV picker with hex input
- **Palettes**: PICO-8, NES, Endesga-32, Sweetie 16, and more
- **Templates**: 10 recolorable sprite templates for quick starts
- **Export**: PNG at 1x-8x scale, sprite sheets, clipboard copy
- **Save/Open**: Project files as JSON
- **Undo/Redo**: Full multi-layer history (100 steps)
- **Canvas controls**: Zoom, pan, grid toggle

## Running

```sh
npx serve .
# or
python3 -m http.server
```

Then open `http://localhost:3000` (or `:8000` for Python).

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| B | Pencil |
| E | Eraser |
| G | Fill |
| L | Line |
| R | Rectangle |
| I | Eyedropper |
| S | Select |
| M | Symmetry |
| X | Swap colors |
| Delete / Backspace | Delete selection |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z / Ctrl+Y | Redo |
| Ctrl+S | Save project |
| Ctrl+Shift+E | Export dropdown |
| # | Toggle grid |

## File Formats

### Project File (.json)

Projects are saved as JSON files. Pixel data is stored as base64-encoded RGBA bytes.

```json
{
  "version": 1,
  "name": "My Sprite",
  "width": 16,
  "height": 16,
  "activeLayerIndex": 0,
  "layers": [
    {
      "id": "1737000000000_abc123",
      "name": "Layer 1",
      "visible": true,
      "opacity": 1,
      "pixels": "<base64>"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | number | Format version, currently `1` |
| `name` | string | Project name, used for filename |
| `width` / `height` | number | Canvas size (`16` or `32`) |
| `activeLayerIndex` | number | Index of the selected layer |
| `layers` | array | Ordered bottom-to-top |
| `layers[].id` | string | Unique layer identifier |
| `layers[].name` | string | Display name |
| `layers[].visible` | boolean | Layer visibility |
| `layers[].opacity` | number | Layer opacity (`0`-`1`) |
| `layers[].pixels` | string | Base64-encoded RGBA pixel data |

**Pixel data encoding**: Raw RGBA bytes (4 bytes per pixel, row-major order) encoded as base64. A 16x16 layer is 1024 bytes (~1.4KB encoded). A 32x32 layer is 4096 bytes (~5.5KB encoded).

### PNG Export

Exported as standard PNG files with nearest-neighbor scaling. Available at 1x, 2x, 4x, and 8x scale. Sprite sheets lay out each visible layer as a horizontal frame strip.

## Tech Stack

Vanilla JS with ES modules. No framework, no build tools, no dependencies. Single HTML page with CSS Grid layout and a dark theme.

## Architecture

- **EventBus**: Pub/sub singleton for all cross-component communication
- **Layer system**: `Project` holds `layers[]`, all tools write to the active layer via `project.setPixel()`, rendering composites via Porter-Duff over
- **History**: Full multi-layer snapshots with live-state capture on undo/redo
- **Tools**: All extend a `Tool` base class with `onPointerDown/Move/Up` interface
