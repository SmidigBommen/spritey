import { Layer } from './Layer.js';

const CURRENT_VERSION = 2;

export class ProjectSerializer {
  /**
   * Serialize a Project to version 2 format with frames.
   */
  static serialize(project) {
    return {
      version: CURRENT_VERSION,
      name: project.name,
      width: project.width,
      height: project.height,
      activeFrameIndex: project.activeFrameIndex,
      activeLayerIndex: project.activeLayerIndex,
      frames: project.frames.map(frame => ({
        duration: frame.duration,
        layers: frame.layers.map(layer => ({
          id: layer.id,
          name: layer.name,
          visible: layer.visible,
          opacity: layer.opacity,
          pixels: ProjectSerializer._encodePixels(layer.pixels),
        })),
      })),
    };
  }

  /**
   * Deserialize data into an existing Project instance (mutates in-place).
   * Supports v1 (single layer list) and v2 (frames) formats.
   */
  static deserialize(project, data) {
    if (!data || !data.version) {
      throw new Error('Invalid project format');
    }

    project.name = data.name || 'Untitled';
    project._width = data.width;
    project._height = data.height;

    if (data.version === 1) {
      ProjectSerializer._deserializeV1(project, data);
    } else if (data.version === 2) {
      ProjectSerializer._deserializeV2(project, data);
    } else {
      throw new Error(`Unsupported project version: ${data.version}`);
    }
  }

  static _deserializeV1(project, data) {
    const layers = data.layers.map(ld => {
      const layer = new Layer(data.width, data.height, ld.name);
      layer.id = ld.id;
      layer.visible = ld.visible !== false;
      layer.opacity = ld.opacity ?? 1;
      layer.pixels = ProjectSerializer._decodePixels(ld.pixels, data.width * data.height * 4);
      return layer;
    });

    if (layers.length === 0) {
      layers.push(new Layer(data.width, data.height, 'Layer 1'));
    }

    // Wrap v1 layers into a single frame
    project.frames = [{ layers, duration: 100 }];
    project.activeFrameIndex = 0;
    project.activeLayerIndex = Math.min(data.activeLayerIndex || 0, layers.length - 1);
  }

  static _deserializeV2(project, data) {
    project.frames = data.frames.map(fd => ({
      duration: fd.duration || 100,
      layers: fd.layers.map(ld => {
        const layer = new Layer(data.width, data.height, ld.name);
        layer.id = ld.id;
        layer.visible = ld.visible !== false;
        layer.opacity = ld.opacity ?? 1;
        layer.pixels = ProjectSerializer._decodePixels(ld.pixels, data.width * data.height * 4);
        return layer;
      }),
    }));

    // Ensure at least one frame with one layer
    if (project.frames.length === 0) {
      project.frames = [{ layers: [new Layer(data.width, data.height, 'Layer 1')], duration: 100 }];
    }
    for (const frame of project.frames) {
      if (frame.layers.length === 0) {
        frame.layers.push(new Layer(data.width, data.height, 'Layer 1'));
      }
    }

    project.activeFrameIndex = Math.min(data.activeFrameIndex || 0, project.frames.length - 1);
    project.activeLayerIndex = Math.min(data.activeLayerIndex || 0, project.frames[project.activeFrameIndex].layers.length - 1);
  }

  /** Download project as a .json file. */
  static downloadProject(project) {
    const json = JSON.stringify(ProjectSerializer.serialize(project), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name || 'sprite'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Upload a .json file and deserialize into the project.
   * @returns {Promise<boolean>} true if a file was loaded
   */
  static uploadProject(project) {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) { resolve(false); return; }
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result);
            ProjectSerializer.deserialize(project, data);
            resolve(true);
          } catch {
            resolve(false);
          }
        };
        reader.onerror = () => resolve(false);
        reader.readAsText(file);
      });
      input.click();
    });
  }

  /** Encode Uint8ClampedArray to base64 string. */
  static _encodePixels(pixels) {
    let binary = '';
    for (let i = 0; i < pixels.length; i++) {
      binary += String.fromCharCode(pixels[i]);
    }
    return btoa(binary);
  }

  /** Decode base64 string to Uint8ClampedArray. */
  static _decodePixels(base64, expectedLength) {
    const binary = atob(base64);
    const arr = new Uint8ClampedArray(expectedLength);
    const len = Math.min(binary.length, expectedLength);
    for (let i = 0; i < len; i++) {
      arr[i] = binary.charCodeAt(i);
    }
    return arr;
  }
}
