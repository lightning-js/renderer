const x1 = 0;
const x2 = 2;
const x3 = 4;
const x4 = 6;
const y1 = 1;
const y2 = 3;
const y3 = 5;
const y4 = 7;

export class RenderCoords {
  public data: Float32Array;
  constructor(
    entries?:
      | [number, number, number, number, number, number, number, number]
      | Float32Array,
  ) {
    this.data = new Float32Array(8);
    if (entries) {
      this.data[x1] = entries[x1];
      this.data[x2] = entries[x2];
      this.data[x3] = entries[x3];
      this.data[x4] = entries[x4];
      this.data[y1] = entries[y1];
      this.data[y2] = entries[y2];
      this.data[y3] = entries[y3];
      this.data[y4] = entries[y4];
    }
  }

  get x1(): number {
    return this.data[x1]!;
  }

  get x2(): number {
    return this.data[x2]!;
  }

  get x3(): number {
    return this.data[x3]!;
  }

  get xValues(): [number, number, number, number] {
    return [this.data[x1]!, this.data[x2]!, this.data[x3]!, this.data[x4]!];
  }

  get x4(): number {
    return this.data[x4]!;
  }

  get y1(): number {
    return this.data[y1]!;
  }

  get y2(): number {
    return this.data[y2]!;
  }

  get y3(): number {
    return this.data[y3]!;
  }

  get y4(): number {
    return this.data[y4]!;
  }

  get yValues(): [number, number, number, number] {
    return [this.data[y1]!, this.data[y2]!, this.data[y3]!, this.data[y4]!];
  }
}
