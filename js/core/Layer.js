export class Layer {
  constructor(width, height, name = 'Layer') {
    this.id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.name = name;
    this.width = width;
    this.height = height;
    this.pixels = new Uint8ClampedArray(width * height * 4);
    this.visible = true;
    this.opacity = 1;
  }

  clone() {
    const copy = new Layer(this.width, this.height, this.name);
    copy.id = this.id;
    copy.pixels.set(this.pixels);
    copy.visible = this.visible;
    copy.opacity = this.opacity;
    return copy;
  }

  getPixel(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    const i = (y * this.width + x) * 4;
    return [this.pixels[i], this.pixels[i + 1], this.pixels[i + 2], this.pixels[i + 3]];
  }

  setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const i = (y * this.width + x) * 4;
    this.pixels[i] = r;
    this.pixels[i + 1] = g;
    this.pixels[i + 2] = b;
    this.pixels[i + 3] = a;
  }
}
