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
  direction!: 'left' | 'right'; // Set in setState
  state!: 'idle' | 'walk' | 'run' | 'jump'; // Set in setState
  leftFrames: TextureDesc[] = [];

  constructor(
    private props: Partial<INodeWritableProps>,
    private renderer: RendererMain,
    private rightFrames: TextureDesc<'SubTexture'>[],
  ) {
    this.node = renderer.createNode({
      x: props.x,
      y: props.y,
      w: 120,
      h: 120,
      texture: rightFrames[0],
      parent: renderer.root,
    });
    this.leftFrames = rightFrames.map((frame) => {
      return renderer.makeTexture('SubTexture', frame.props, {
        flipX: true,
      });
    });
    assertTruthy(this.node);
    this.setState('right', 'idle');
  }

  setState(
    direction: 'left' | 'right',
    state: 'idle' | 'walk' | 'run' | 'jump',
  ) {
    if (this.direction === direction && this.state === state) {
      return;
    }
    this.direction = direction;
    this.state = state;
    switch (state) {
      case 'idle':
        this.animateCharacter(direction, 0, 7, 100);
        break;
      case 'walk':
        this.animateCharacter(direction, 8, 15, 100);
        break;
      case 'run':
        this.animateCharacter(direction, 16, 16, 100);
        break;
      case 'jump':
        this.animateCharacter(direction, 24, 30, 100);
        break;
    }
  }

  private animateCharacter(
    direction: 'left' | 'right',
    iStart: number,
    iEnd: number,
    intervalMs: number,
  ) {
    let curI = iStart;
    const frameArr = direction === 'left' ? this.leftFrames : this.rightFrames;
    if (iEnd + 1 > frameArr.length || iStart < 0) {
      throw new Error('Animation out of bounds');
    }
    if (this.curIntervalAnimation) {
      clearInterval(this.curIntervalAnimation);
    }
    const nextFrame = () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.node.texture = frameArr[curI]!;
      curI++;
      if (curI > iEnd) {
        curI = iStart;
      }
    };
    nextFrame();
    this.curIntervalAnimation = setInterval(nextFrame, intervalMs);
  }
}
