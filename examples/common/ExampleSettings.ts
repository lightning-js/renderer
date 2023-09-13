import type { Dimensions, RendererMain } from '@lightningjs/renderer';

export interface ExampleSettings {
  testName: string;
  renderer: RendererMain;
  appDimensions: Dimensions;
  driverName: 'main' | 'threadx';
  canvas: HTMLCanvasElement;
}
