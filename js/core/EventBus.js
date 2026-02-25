/** Simple pub/sub event bus singleton */
class EventBus {
  constructor() {
    this._listeners = {};
  }

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const list = this._listeners[event];
    if (!list) return;
    this._listeners[event] = list.filter(cb => cb !== callback);
  }

  emit(event, ...args) {
    const list = this._listeners[event];
    if (!list) return;
    for (const cb of list) cb(...args);
  }
}

export const eventBus = new EventBus();
