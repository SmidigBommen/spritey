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

## Using Exports in Your Game

### Coordinate System

- Origin `(0, 0)` is the **top-left** corner
- X increases to the right, Y increases downward
- This matches canvas, CSS, and most game engine conventions (Unity, Godot, Phaser, etc.)

### PNG Sprites

Exported PNGs use **nearest-neighbor scaling** to preserve crisp pixels. When loading in your game engine, make sure to disable texture filtering (bilinear/trilinear) or the sprite will look blurry.

```
Engine setting:
  Unity         → Filter Mode: "Point (no filter)" on the texture import
  Godot         → Texture → Filter: "Nearest"
  Phaser        → this.textures.get('sprite').setFilter(Phaser.Textures.FilterMode.NEAREST)
  CSS           → image-rendering: pixelated
  Canvas2D      → ctx.imageSmoothingEnabled = false
```

### Animation Sheet

The animation sheet is a horizontal strip of all frames side by side. Each frame is `width × height` pixels (before scaling).

```
┌────────┬────────┬────────┬────────┐
│ Frame 0│ Frame 1│ Frame 2│ Frame 3│   height: sprite height
└────────┴────────┴────────┴────────┘
  width    width    width    width
```

To extract frame `i` at scale `s` from the sheet, use the region:

```
x: i * width * s
y: 0
w: width * s
h: height * s
```

### Animated GIF

The exported GIF loops forever and preserves transparency. Frame timing uses the FPS value set in the timeline. GIFs work directly in browsers, Discord, social media, etc. — good for sharing, not ideal for game engines (use the animation sheet or project file instead).

### Loading the Project File (.json)

The project file contains all frames, layers, and pixel data. This is useful if your game needs to composite layers at runtime or access individual layer data.

**Decoding pixel data (JavaScript):**

```js
function decodePixels(base64, width, height) {
  const binary = atob(base64);
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < binary.length; i++) {
    pixels[i] = binary.charCodeAt(i);
  }
  return pixels; // RGBA, row-major, 4 bytes per pixel
}
```

**Flattening layers (compositing visible layers bottom-to-top):**

```js
function flattenLayers(frame, width, height) {
  const total = width * height * 4;
  const result = new Uint8ClampedArray(total);

  for (const layer of frame.layers) {
    if (!layer.visible) continue;
    const src = decodePixels(layer.pixels, width, height);
    const opacity = layer.opacity ?? 1;

    for (let i = 0; i < total; i += 4) {
      const sa = (src[i + 3] / 255) * opacity;
      if (sa === 0) continue;
      const da = result[i + 3] / 255;
      const outA = sa + da * (1 - sa);
      if (outA === 0) continue;
      result[i]     = (src[i]     * sa + result[i]     * da * (1 - sa)) / outA;
      result[i + 1] = (src[i + 1] * sa + result[i + 1] * da * (1 - sa)) / outA;
      result[i + 2] = (src[i + 2] * sa + result[i + 2] * da * (1 - sa)) / outA;
      result[i + 3] = outA * 255;
    }
  }
  return result;
}
```

**Playing animation from project data:**

```js
const project = JSON.parse(fileContents);
const frames = project.frames.map(f => flattenLayers(f, project.width, project.height));
let current = 0;

function drawFrame(ctx) {
  const imgData = ctx.createImageData(project.width, project.height);
  imgData.data.set(frames[current]);
  ctx.putImageData(imgData, 0, 0);
  current = (current + 1) % frames.length;
}

setInterval(drawFrame, 1000 / desiredFPS, canvasContext);
```

### Layer Sheet

The layer sheet places each **visible layer** of the current frame side by side. This is useful for games that composite layers separately (e.g., character body + equipment as separate draw calls).

## Tech Stack

Vanilla JS with ES modules. No framework, no build tools, no dependencies. Single HTML page with CSS Grid layout and a dark theme.

## Architecture

- **EventBus**: Pub/sub singleton for all cross-component communication
- **Frame system**: `Project.frames[]` where each frame has its own layers and duration. `project.layers` is a getter into the active frame
- **Layer system**: All tools write to the active layer via `project.setPixel()`, rendering composites via Porter-Duff over
- **History**: Two snapshot types — single-frame for drawing ops, full-frames for frame-level ops
- **Animation**: `AnimationPlayer` cycles frames via setTimeout with per-frame durations
- **Tools**: All extend a `Tool` base class with `onPointerDown/Move/Up` interface
