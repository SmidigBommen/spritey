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
- **Animation**: Frame-by-frame animation with timeline, playback, onion skinning
- **Export**: PNG at 1x-8x scale, animated GIF, sprite sheets, animation sheets, clipboard copy
- **Save/Open**: Project files as JSON (v2 format with frames, backward-compat v1)
- **Undo/Redo**: Frame-aware history (100 steps)
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
| N | New frame |
| , / < | Previous frame |
| . / > | Next frame |
| Space | Play/pause animation |
| O | Toggle onion skinning |

## File Formats

### Project File (.json)

Projects are saved as JSON files. Pixel data is stored as base64-encoded RGBA bytes.

#### Version 2 (current)

```json
{
  "version": 2,
  "name": "My Sprite",
  "width": 16,
  "height": 16,
  "activeFrameIndex": 0,
  "activeLayerIndex": 0,
  "frames": [
    {
      "duration": 100,
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
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | number | Format version, currently `2` |
| `name` | string | Project name, used for filename |
| `width` / `height` | number | Canvas size (`16` or `32`) |
| `activeFrameIndex` | number | Index of the selected frame |
| `activeLayerIndex` | number | Index of the selected layer |
| `frames` | array | Animation frames in order |
| `frames[].duration` | number | Frame duration in milliseconds |
| `frames[].layers` | array | Layers ordered bottom-to-top |
| `layers[].id` | string | Unique layer identifier |
| `layers[].name` | string | Display name |
| `layers[].visible` | boolean | Layer visibility |
| `layers[].opacity` | number | Layer opacity (`0`-`1`) |
| `layers[].pixels` | string | Base64-encoded RGBA pixel data |

Version 1 files (single layer list, no frames) are loaded and auto-converted to a single-frame v2 project.

**Pixel data encoding**: Raw RGBA bytes (4 bytes per pixel, row-major order) encoded as base64. A 16x16 layer is 1024 bytes (~1.4KB encoded). A 32x32 layer is 4096 bytes (~5.5KB encoded).

### Export Formats

- **PNG**: Standard PNG with nearest-neighbor scaling at 1x, 2x, 4x, or 8x
- **GIF**: Animated GIF with per-frame durations, looping, transparency support
- **Layer Sheet**: Horizontal strip of each visible layer as a PNG
- **Animation Sheet**: Horizontal strip of all frames (flattened) as a PNG

## Tech Stack

Vanilla JS with ES modules. No framework, no build tools, no dependencies. Single HTML page with CSS Grid layout and a dark theme.

## Architecture

- **EventBus**: Pub/sub singleton for all cross-component communication
- **Frame system**: `Project.frames[]` where each frame has its own layers and duration. `project.layers` is a getter into the active frame
- **Layer system**: All tools write to the active layer via `project.setPixel()`, rendering composites via Porter-Duff over
- **History**: Two snapshot types — single-frame for drawing ops, full-frames for frame-level ops
- **Animation**: `AnimationPlayer` cycles frames via setTimeout with per-frame durations
- **Tools**: All extend a `Tool` base class with `onPointerDown/Move/Up` interface
