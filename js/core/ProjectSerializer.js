import { Layer } from './Layer.js';

const STORAGE_KEY = 'spritey_project';

export class ProjectSerializer {
  /**
   * Serialize a Project to a plain object (version 1 format).
   * Pixel data is stored as base64-encoded binary.
   */
  static serialize(project) {
    return {
      version: 1,
      name: project.name,
      width: project.width,
      height: project.height,
      activeLayerIndex: project.activeLayerIndex,
      layers: project.layers.map(layer => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        opacity: layer.opacity,
        pixels: ProjectSerializer._encodePixels(layer.pixels),
      })),
    };
  }

  /**
   * Deserialize data into an existing Project instance (mutates in-place).
   * Keeps all external references to `project` valid.
   */
  static deserialize(project, data) {
    if (!data || data.version !== 1) {
      throw new Error('Invalid project format');
    }

    project.name = data.name || 'Untitled';
    project._width = data.width;
    project._height = data.height;
    project.activeLayerIndex = data.activeLayerIndex || 0;

    project.layers = data.layers.map(ld => {
      const layer = new Layer(data.width, data.height, ld.name);
      layer.id = ld.id;
      layer.visible = ld.visible !== false;
      layer.opacity = ld.opacity ?? 1;
      layer.pixels = ProjectSerializer._decodePixels(ld.pixels, data.width * data.height * 4);
      return layer;
    });

    if (project.layers.length === 0) {
      project.layers = [new Layer(data.width, data.height, 'Layer 1')];
    }
    project.activeLayerIndex = Math.min(project.activeLayerIndex, project.layers.length - 1);
  }

  /** Save project to localStorage. */
  static saveToStorage(project) {
    const json = JSON.stringify(ProjectSerializer.serialize(project));
    localStorage.setItem(STORAGE_KEY, json);
  }

  /** Load project from localStorage. Returns true if data was found. */
  static loadFromStorage(project) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    ProjectSerializer.deserialize(project, data);
    return true;
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
