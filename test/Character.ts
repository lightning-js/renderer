import type {
  INode,
  INodeWritableProps,
  RendererMain,
  TextureDesc,
} from '../index.js';
import { assertTruthy } from '../src/utils.js';

export class Character {
  node: INode;
  curIntervalAnimation: number | null = null;
  state!: 'idle' | 'walk' | 'run' | 'jump'; // Set in setState

  constructor(
    private props: Partial<INodeWritableProps>,
    private renderer: RendererMain,
    private frames: TextureDesc[],
  ) {
    this.node = renderer.createNode({
      x: props.x,
      y: props.y,
      w: 120,
      h: 120,
      texture: frames[0],
      parent: renderer.root,
    });
    assertTruthy(this.node);
    this.setState('idle');
  }

  setState(state: 'idle' | 'walk' | 'run' | 'jump') {
    if (this.state === state) {
      return;
    }
    this.state = state;
    switch (state) {
      case 'idle':
        this.animateCharacter(0, 7, 100);
        break;
      case 'walk':
        this.animateCharacter(8, 15, 100);
        break;
      case 'run':
        this.animateCharacter(16, 16, 100);
        break;
      case 'jump':
        this.animateCharacter(24, 30, 100);
        break;
    }
  }

  private animateCharacter(iStart: number, iEnd: number, intervalMs: number) {
    let curI = iStart;
    if (iEnd + 1 > this.frames.length || iStart < 0) {
      throw new Error('Animation out of bounds');
    }
    if (this.curIntervalAnimation) {
      clearInterval(this.curIntervalAnimation);
    }
    this.curIntervalAnimation = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.node.texture = this.frames[curI]!;
      curI++;
      if (curI > iEnd) {
        curI = iStart;
      }
    }, intervalMs);
  }
}
