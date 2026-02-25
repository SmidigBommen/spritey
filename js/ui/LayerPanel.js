import { eventBus } from '../core/EventBus.js';

export class LayerPanel {
  constructor(container, project) {
    this.container = container;
    this.project = project;
    this._dragState = null;
    this._build();
    this._setupEvents();
  }

  _build() {
    this.container.innerHTML = '';

    const controls = document.createElement('div');
    controls.className = 'layer-controls';

    const title = document.createElement('span');
    title.className = 'panel-title';
    title.textContent = 'Layers';
    controls.appendChild(title);

    const addBtn = document.createElement('button');
    addBtn.className = 'layer-add-btn';
    addBtn.title = 'Add Layer';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => eventBus.emit('layer:add'));
    controls.appendChild(addBtn);

    this.container.appendChild(controls);

    this._list = document.createElement('div');
    this._list.className = 'layer-list';
    this.container.appendChild(this._list);

    this._render();
  }

  _setupEvents() {
    eventBus.on('layers:changed', () => this._render());
  }

  _render() {
    this._list.innerHTML = '';
    const layers = this.project.layers;
    const activeIndex = this.project.activeLayerIndex;

    // Render in reverse order: top layer first visually
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      const item = this._createLayerItem(layer, i, i === activeIndex);
      this._list.appendChild(item);
    }
  }

  _createLayerItem(layer, index, isActive) {
    const item = document.createElement('div');
    item.className = 'layer-item' + (isActive ? ' active' : '');
    item.dataset.index = index;
    item.draggable = true;

    // Visibility toggle
    const visBtn = document.createElement('button');
    visBtn.className = 'layer-visibility' + (layer.visible ? '' : ' hidden');
    visBtn.title = layer.visible ? 'Hide layer' : 'Show layer';
    visBtn.textContent = layer.visible ? '👁' : '○';
    visBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      eventBus.emit('layer:visibility', { index, visible: !layer.visible }); // handled directly by app.js
    });
    item.appendChild(visBtn);

    // Layer name
    const name = document.createElement('span');
    name.className = 'layer-name';
    name.textContent = layer.name;
    item.appendChild(name);

    // Opacity slider
    const opacitySlider = document.createElement('input');
    opacitySlider.type = 'range';
    opacitySlider.className = 'layer-opacity';
    opacitySlider.min = 0;
    opacitySlider.max = 100;
    opacitySlider.value = Math.round(layer.opacity * 100);
    opacitySlider.title = `Opacity: ${Math.round(layer.opacity * 100)}%`;
    opacitySlider.addEventListener('input', (e) => {
      e.stopPropagation();
      eventBus.emit('layer:opacity', { index, opacity: parseInt(e.target.value) / 100 }); // handled directly by app.js
    });
    opacitySlider.addEventListener('click', (e) => e.stopPropagation());
    item.appendChild(opacitySlider);

    // Delete button (only if more than 1 layer)
    if (this.project.layers.length > 1) {
      const delBtn = document.createElement('button');
      delBtn.className = 'layer-delete';
      delBtn.title = 'Delete layer';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        eventBus.emit('layer:delete', { index });
      });
      item.appendChild(delBtn);
    }

    // Click to select
    item.addEventListener('click', () => {
      eventBus.emit('layer:select', { index });
    });

    // Drag to reorder
    item.addEventListener('dragstart', (e) => {
      this._dragState = { fromIndex: index };
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      this._list.querySelectorAll('.layer-item').forEach(el => el.classList.remove('drag-over'));
      this._dragState = null;
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      this._list.querySelectorAll('.layer-item').forEach(el => el.classList.remove('drag-over'));
      item.classList.add('drag-over');
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!this._dragState) return;
      const toIndex = index;
      const fromIndex = this._dragState.fromIndex;
      if (fromIndex !== toIndex) {
        eventBus.emit('layer:reorder', { from: fromIndex, to: toIndex });
      }
    });

    return item;
  }
}
