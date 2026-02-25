import { eventBus } from './core/EventBus.js';
import { Project } from './core/Project.js';
import { CanvasRenderer } from './core/CanvasRenderer.js';
import { HistoryManager } from './core/HistoryManager.js';
import { PencilTool } from './tools/PencilTool.js';
import { EraserTool } from './tools/EraserTool.js';
import { FillTool } from './tools/FillTool.js';
import { LineTool } from './tools/LineTool.js';
import { RectTool } from './tools/RectTool.js';
import { EyedropperTool } from './tools/EyedropperTool.js';
import { SelectTool } from './tools/SelectTool.js';
import { SymmetryTool } from './tools/SymmetryTool.js';
import { Toolbar } from './ui/Toolbar.js';
import { ColorPicker } from './ui/ColorPicker.js';
import { PalettePanel } from './ui/PalettePanel.js';
import { BottomBar } from './ui/BottomBar.js';
import { LayerPanel } from './ui/LayerPanel.js';
import { TemplatePanel } from './ui/TemplatePanel.js';
import { ExportManager } from './core/ExportManager.js';
import { ProjectSerializer } from './core/ProjectSerializer.js';
import { rgbToHex, hexToRgb } from './core/ColorUtils.js';

class App {
  constructor() {
    // Core state
    this.project = new Project(16, 16);
    this.renderer = new CanvasRenderer(
      document.getElementById('main-canvas'),
      this.project
    );
    this.history = new HistoryManager(this.project);

    // Colors
    this._primaryColor = [0, 0, 0, 255];
    this._secondaryColor = [255, 255, 255, 255];

    // Tools
    this._selectTool = new SelectTool();
    this._symmetryTool = new SymmetryTool();
    this.tools = [
      new PencilTool(),
      new EraserTool(),
      new FillTool(),
      new LineTool(),
      new RectTool(),
      new EyedropperTool(),
      this._selectTool,
      this._symmetryTool,
    ];
    this.activeTool = this.tools[0];

    // UI
    this.toolbar = new Toolbar(document.getElementById('toolbar'), this.tools);
    this.colorPicker = new ColorPicker(document.getElementById('color-picker'));
    this.palettePanel = new PalettePanel(document.getElementById('palette-panel'));
    this.bottomBar = new BottomBar(document.getElementById('bottom-bar'));
    this.layerPanel = new LayerPanel(document.getElementById('layer-panel'), this.project);
    this.templatePanel = new TemplatePanel(document.getElementById('template-panel'));

    // Mini preview
    this._miniCanvas = document.getElementById('mini-preview');
    this._miniCtx = this._miniCanvas.getContext('2d');

    this._setupToolSelection();
    this._setupCanvasInput();
    this._setupColorEvents();
    this._setupHistoryEvents();
    this._setupCanvasControls();
    this._setupLayerEvents();
    this._setupKeyboardShortcuts();
    this._setupMiniPreview();
    this._setupTabs();
    this._setupTemplateEvents();
    this._setupExportEvents();
    this._setupSaveLoadEvents();

    // Initial state
    this.toolbar.setActive(this.activeTool);
    this.bottomBar.setZoom(this.renderer.zoom);
    this.bottomBar.setSize(this.project.width);
    this._updateProjectName();
  }

  _setupToolSelection() {
    eventBus.on('tool:select', (tool) => {
      // Clear selection when switching away from SelectTool
      if (this.activeTool === this._selectTool && tool !== this._selectTool) {
        this._selectTool.clearSelection(this.project, { renderer: this.renderer });
      }
      this.activeTool = tool;
      this.toolbar.setActive(tool);
      document.getElementById('main-canvas').style.cursor = tool.getCursor();
    });
  }

  _setupCanvasInput() {
    const canvas = document.getElementById('main-canvas');
    let isDrawing = false;

    const getCtx = () => ({
      color: this._primaryColor,
      renderer: this.renderer,
    });

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 1) return; // Middle click = pan
      if (e.button === 2) return;

      const { x, y } = this.renderer.screenToPixel(e.clientX, e.clientY);

      // SelectTool can interact outside bounds (for move operations)
      const inBounds = x >= 0 && x < this.project.width && y >= 0 && y < this.project.height;
      if (!inBounds && this.activeTool !== this._selectTool) return;

      isDrawing = true;
      canvas.setPointerCapture(e.pointerId);

      // Push history before any drawing tool action
      if (this.activeTool !== this._selectTool) {
        this.history.pushState();
      } else if (!this._selectTool._floatingPixels) {
        // Push history before starting a new selection action
        this.history.pushState();
      }

      this.activeTool.onPointerDown(x, y, this.project, getCtx());
      eventBus.emit('canvas:dirty');
      this._updateMiniPreview();
    });

    canvas.addEventListener('pointermove', (e) => {
      const { x, y } = this.renderer.screenToPixel(e.clientX, e.clientY);

      if (x >= 0 && x < this.project.width && y >= 0 && y < this.project.height) {
        eventBus.emit('cursor:move', { x, y });
      } else {
        eventBus.emit('cursor:leave');
      }

      if (!isDrawing) return;

      this.activeTool.onPointerMove(x, y, this.project, getCtx());
      eventBus.emit('canvas:dirty');
      this._updateMiniPreview();
    });

    const endDraw = (e) => {
      if (!isDrawing) return;
      isDrawing = false;

      const { x, y } = this.renderer.screenToPixel(e.clientX, e.clientY);
      this.activeTool.onPointerUp(x, y, this.project, getCtx());
      eventBus.emit('canvas:dirty');
      this._updateMiniPreview();
    };

    canvas.addEventListener('pointerup', endDraw);
    canvas.addEventListener('pointercancel', endDraw);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerleave', () => eventBus.emit('cursor:leave'));
  }

  _setupColorEvents() {
    eventBus.on('color:changed', (color) => {
      this._primaryColor = color;
    });

    eventBus.on('color:picked', (color) => {
      if (color[3] > 0) {
        this._primaryColor = [...color];
      }
    });

    eventBus.on('color:swap', () => {
      const tmp = this._primaryColor;
      this._primaryColor = this._secondaryColor;
      this._secondaryColor = tmp;
      eventBus.emit('color:picked', this._primaryColor);
      this.colorPicker.setSecondaryColor(rgbToHex(...this._secondaryColor.slice(0, 3)));
    });
  }

  _setupHistoryEvents() {
    eventBus.on('history:undo', () => {
      this.history.undo();
      this._updateMiniPreview();
    });
    eventBus.on('history:redo', () => {
      this.history.redo();
      this._updateMiniPreview();
    });
    eventBus.on('canvas:clear', () => {
      this.history.pushState();
      this.project.clear();
      this._updateMiniPreview();
    });
  }

  _setupCanvasControls() {
    eventBus.on('zoom:in', () => {
      this.renderer.zoom = this.renderer.zoom + Math.max(1, Math.floor(this.renderer.zoom / 4));
    });
    eventBus.on('zoom:out', () => {
      this.renderer.zoom = this.renderer.zoom - Math.max(1, Math.floor(this.renderer.zoom / 4));
    });
    eventBus.on('zoom:reset', () => {
      this.renderer.zoom = 24;
      this.renderer.resetView();
    });

    eventBus.on('canvas:resize', (size) => {
      this.history.pushState();
      this.project.resize(size, size);
      this.history.reset();
      this.bottomBar.setSize(size);
      this.renderer.resetView();
      this._setupMiniPreview();
      this._updateMiniPreview();
    });
  }

  _setupLayerEvents() {
    // These events are "commands" emitted by LayerPanel UI.
    // Project methods emit `layers:changed` (state) in response.
    eventBus.on('layer:add', () => this.project.addLayer());
    eventBus.on('layer:delete', ({ index }) => this.project.deleteLayer(index));
    eventBus.on('layer:select', ({ index }) => this.project.setActiveLayer(index));
    eventBus.on('layer:reorder', ({ from, to }) => this.project.reorderLayer(from, to));
    eventBus.on('layer:visibility', ({ index, visible }) => this.project.setLayerVisibility(index, visible));
    eventBus.on('layer:opacity', ({ index, opacity }) => this.project.setLayerOpacity(index, opacity));
  }

  _setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.history.undo();
        this._updateMiniPreview();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault();
        this.history.redo();
        this._updateMiniPreview();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        this.history.redo();
        this._updateMiniPreview();
        return;
      }

      // Save / Export shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this._saveProject();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        this._toggleExportDropdown();
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();

      // Delete selection
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.activeTool === this._selectTool) {
        if (this._selectTool.hasSelection()) {
          this.history.pushState();
          this._selectTool.deleteSelection(this.project, { renderer: this.renderer });
          this._updateMiniPreview();
        }
        return;
      }

      // Tool shortcuts
      for (const tool of this.tools) {
        if (tool.shortcut === key) {
          eventBus.emit('tool:select', tool);
          return;
        }
      }

      // Swap colors
      if (key === 'x') {
        eventBus.emit('color:swap');
        return;
      }

      // Toggle grid
      if (key === '#' || (e.shiftKey && e.code === 'Digit3')) {
        this.renderer.showGrid = !this.renderer.showGrid;
        return;
      }
    });

    // Symmetry axis toggle via tool:option
    eventBus.on('tool:option', ({ axis }) => {
      if (this.activeTool === this._symmetryTool) {
        this._symmetryTool.axis = axis;
      }
    });
  }

  _setupTabs() {
    const tabs = document.querySelectorAll('.panel-tab');
    const sections = {
      color: document.getElementById('color-section'),
      layers: document.getElementById('layer-panel'),
      templates: document.getElementById('template-panel'),
    };
    const palettePanel = document.getElementById('palette-panel');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const active = tab.dataset.tab;
        for (const [key, el] of Object.entries(sections)) {
          el.classList.toggle('hidden', key !== active);
        }
        palettePanel.classList.toggle('hidden', active !== 'color');
      });
    });
  }

  _setupTemplateEvents() {
    eventBus.on('template:apply', ({ template, colors }) => {
      if (template.size !== this.project.width) return;

      this.history.pushState();
      const size = template.size;
      for (let i = 0; i < template.pixels.length; i++) {
        const slot = template.pixels[i];
        if (slot === 0) continue;
        const [r, g, b] = hexToRgb(colors[slot - 1]);
        const x = i % size;
        const y = Math.floor(i / size);
        this.project.setPixel(x, y, r, g, b, 255);
      }
      eventBus.emit('canvas:dirty');
      this._updateMiniPreview();
    });
  }

  _setupExportEvents() {
    const exportBtn = document.getElementById('btn-export');
    const dropdown = document.getElementById('export-dropdown');
    const scaleSelect = document.getElementById('export-scale');

    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleExportDropdown();
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!dropdown.classList.contains('hidden') && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });

    dropdown.addEventListener('click', (e) => e.stopPropagation());

    document.getElementById('btn-export-png').addEventListener('click', async () => {
      const scale = parseInt(scaleSelect.value);
      const pixels = this.project.flattenPixels();
      const blob = await ExportManager.exportPNG(pixels, this.project.width, this.project.height, scale);
      ExportManager.downloadBlob(blob, `${this.project.name || 'sprite'}_${scale}x.png`);
      dropdown.classList.add('hidden');
    });

    document.getElementById('btn-export-sheet').addEventListener('click', async () => {
      const scale = parseInt(scaleSelect.value);
      const blob = await ExportManager.exportSpriteSheet(this.project.layers, this.project.width, this.project.height, scale);
      ExportManager.downloadBlob(blob, `${this.project.name || 'sprite'}_sheet.png`);
      dropdown.classList.add('hidden');
    });

    document.getElementById('btn-copy-clipboard').addEventListener('click', async () => {
      const btn = document.getElementById('btn-copy-clipboard');
      try {
        const pixels = this.project.flattenPixels();
        await ExportManager.copyToClipboard(pixels, this.project.width, this.project.height);
        this._showFeedback(btn, 'Copied!');
      } catch {
        this._showFeedback(btn, 'Failed');
      }
      dropdown.classList.add('hidden');
    });
  }

  _toggleExportDropdown() {
    document.getElementById('export-dropdown').classList.toggle('hidden');
  }

  _setupSaveLoadEvents() {
    document.getElementById('btn-save').addEventListener('click', () => {
      this._saveProject();
    });

    document.getElementById('btn-open').addEventListener('click', async () => {
      const loaded = await ProjectSerializer.uploadProject(this.project);
      if (loaded) this._onProjectLoaded();
    });
  }

  _saveProject() {
    if (!this.project.name || this.project.name === 'Untitled') {
      const name = prompt('Project name:', this.project.name || 'Untitled');
      if (name === null) return;
      this.project.name = name.trim() || 'Untitled';
      this._updateProjectName();
    }
    ProjectSerializer.downloadProject(this.project);
  }

  _updateProjectName() {
    const el = document.getElementById('project-name');
    const name = this.project.name;
    el.textContent = (name && name !== 'Untitled') ? `— ${name}` : '— unnamed';
  }

  _onProjectLoaded() {
    this.history.reset();
    this.renderer.resetView();
    this.bottomBar.setSize(this.project.width);
    this._setupMiniPreview();
    this._updateMiniPreview();
    this._updateProjectName();
    eventBus.emit('layers:changed');
    eventBus.emit('canvas:dirty');
  }

  _showFeedback(btn, text) {
    const orig = btn.textContent;
    btn.textContent = text;
    setTimeout(() => { btn.textContent = orig; }, 1200);
  }

  _setupMiniPreview() {
    const size = this.project.width;
    this._miniCanvas.width = size;
    this._miniCanvas.height = size;
    const displaySize = 64;
    this._miniCanvas.style.width = displaySize + 'px';
    this._miniCanvas.style.height = displaySize + 'px';
    this._miniCanvas.style.imageRendering = 'pixelated';
  }

  _updateMiniPreview() {
    const pw = this.project.width;
    const ph = this.project.height;
    const imgData = this._miniCtx.createImageData(pw, ph);
    imgData.data.set(this.project.flattenPixels());
    this._miniCtx.putImageData(imgData, 0, 0);
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
