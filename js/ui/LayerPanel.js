import { eventBus } from '../core/EventBus.js';

export class LayerPanel {
  constructor(container, project) {
    this.container = container;
    this.project = project;
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

    const btnRow = document.createElement('div');
    btnRow.className = 'layer-btn-row';

    const upBtn = document.createElement('button');
    upBtn.className = 'layer-add-btn';
    upBtn.title = 'Move layer up';
    upBtn.textContent = '▲';
    upBtn.addEventListener('click', () => this._moveActive(1));
    btnRow.appendChild(upBtn);

    const downBtn = document.createElement('button');
    downBtn.className = 'layer-add-btn';
    downBtn.title = 'Move layer down';
    downBtn.textContent = '▼';
    downBtn.addEventListener('click', () => this._moveActive(-1));
    btnRow.appendChild(downBtn);

    const addBtn = document.createElement('button');
    addBtn.className = 'layer-add-btn';
    addBtn.title = 'Add Layer';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => eventBus.emit('layer:add'));
    btnRow.appendChild(addBtn);

    controls.appendChild(btnRow);
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

  _moveActive(direction) {
    const from = this.project.activeLayerIndex;
    const to = from + direction;
    if (to < 0 || to >= this.project.layers.length) return;
    eventBus.emit('layer:reorder', { from, to });
  }

  _createLayerItem(layer, index, isActive) {
    const item = document.createElement('div');
    item.className = 'layer-item' + (isActive ? ' active' : '');
    item.dataset.index = index;

    // Visibility toggle
    const visBtn = document.createElement('button');
    visBtn.className = 'layer-visibility' + (layer.visible ? '' : ' hidden');
    visBtn.title = layer.visible ? 'Hide layer' : 'Show layer';
    visBtn.textContent = layer.visible ? '👁' : '○';
    visBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      eventBus.emit('layer:visibility', { index, visible: !layer.visible });
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
      eventBus.emit('layer:opacity', { index, opacity: parseInt(e.target.value) / 100 });
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

    return item;
  }
}
