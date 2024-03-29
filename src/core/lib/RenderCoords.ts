const rx1 = 0;
const rx2 = 2;
const rx3 = 4;
const rx4 = 6;
const ry1 = 1;
const ry2 = 3;
const ry3 = 5;
const ry4 = 7;

export class RenderCoords {
  public data: Float32Array;
  constructor(
    entries?:
      | [number, number, number, number, number, number, number, number]
      | Float32Array,
  ) {
    this.data = new Float32Array(8);
    if (entries) {
      this.data[rx1] = entries[rx1];
      this.data[rx2] = entries[rx2];
      this.data[rx3] = entries[rx3];
      this.data[rx4] = entries[rx4];
      this.data[ry1] = entries[ry1];
      this.data[ry2] = entries[ry2];
      this.data[ry3] = entries[ry3];
      this.data[ry4] = entries[ry4];
    }
  }

  public static translate(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
    out?: RenderCoords,
  ): RenderCoords {
    if (!out) {
      out = new RenderCoords();
    }
    out.data[rx1] = x1;
    out.data[rx2] = x2;
    out.data[rx3] = x3;
    out.data[rx4] = x4;
    out.data[ry1] = y1;
    out.data[ry2] = y2;
    out.data[ry3] = y3;
    out.data[ry4] = y4;
    return out;
  }

  get x1(): number {
    return this.data[rx1]!;
  }

  get x2(): number {
    return this.data[rx2]!;
  }

  get x3(): number {
    return this.data[rx3]!;
  }

  get x4(): number {
    return this.data[rx4]!;
  }

  get y1(): number {
    return this.data[ry1]!;
  }

  get y2(): number {
    return this.data[ry2]!;
  }

  get y3(): number {
    return this.data[ry3]!;
  }

  get y4(): number {
    return this.data[ry4]!;
  }
}
