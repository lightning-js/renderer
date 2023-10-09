import type { Dimensions, RendererMain } from '@lightningjs/renderer';

export interface ExampleSettings {
  testName: string;
  renderer: RendererMain;
  driverName: 'main' | 'threadx';
  canvas: HTMLCanvasElement;
}
