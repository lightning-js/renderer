import type { IAnimationController } from '../../dist/exports/index.js';
import type { INode } from '../../dist/src/main-api/INode.js';
import type { ExampleSettings } from '../common/ExampleSettings.js';

const SHAPE_1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAEjSURBVHgBnZO9TgJBFIXvbEllQqsJNrTaSmVhqdHKViyplCewsTXhDcAnkBcwUkm52tqwJrYmVLTDOXAWJsPfhJN8e/fuzD2TmblrFsl7fw66YOSXyvWtZpuEwQPw5nfrKaxzZTFCDrjCBLyDIfjXvDo4Aw3lPefcfWjQRWiq4CUojEWjFqiANkw6jntG8qGVn7cUlzqVyRgcZ3jcaWCYUEx9gR/AbTczOVKflq5c8SQ0+LN0lXNrWfCxYnuIBoXeDy1d5dxvGrwqaVi6LhQHNOgpYaPUE4qvQBUU6IN+hkeBpK3Blow26RZc6n3ZiRQaqoPwoJT3zKviafNwj2Rc1fisC1fsYfIY/YWxRurchdwaE3bYDbi2ebexZX9BH6sO4vlTUbSnqsTgwTgAAAAASUVORK5CYII=';
const SHAPE_2 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABOSURBVHgB7ZKhDQAgDAQfwiA4loEhUKzFZoxSqKtAtFUILmnST/7cByJaADJs9OiQmJxEGAqhnmv8RDj54lOiHEBV9MtNbDDAYod9r3MDaHkHotN0PbEAAAAASUVORK5CYII=';
const SHAPE_3 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAATCAYAAACQjC21AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAFcSURBVHgBrVQtTwNBEJ1tMKCa8AOoqj6LK6BJjl8AFleCwsE/AEGQdx5RgYXUYTnbmjsSJKQ1xW7f5N4m28u2d/14ybuZ2515O9PerEgNrLVtMAf7sgtA6MqWmMguwOocerINVMAuYijbAAIJhb7AGf22bAIkdrzK7sB3+ver8gwCYtgIPOJah3R+Br6AXfCW6wXp/G/66R4eCbiqjQ/aMdmtHOqj0Ap1Y+gFpExU/AWSDsB98BA8k7I7xZMxpt/Co8DLidfCORNCYop/7kWe2I2KqWNcFP89bT9m0iv4uaTCaylbn1IsdZst52BxCl7AfWDSpYRxSrFCO/PFFgQ9ZLRjCcOtawFZdTMk2KMd0eqPry0e8/2HNmr0ket48QN+Bt+8CVH88iMfNZptXlUOvlBSuSRmTaYmdBnkrgoe9mjXuSz0RAZOlp3OGc9dXJ1gDA44PXWxevEOqutzNZRW6qN+HjoAAAAASUVORK5CYII=';

const SHAPES = [SHAPE_1, SHAPE_2, SHAPE_3];
const COLORS = [0x3c91efff, 0x847effff, 0x00a75eff, 0xf1604bff, 0xc4defaff];

const POOL_SIZE = 160;
const BURST_COUNT = 30;
const Y_START = -40;
const Y_END = 1600;

type Particle = {
  node: INode;
  launchDelay: number;
  animations: IAnimationController[];
  launch(isBurst: boolean, side: 'left' | 'right' | null, startY: number): void;
};
export default async function ({ renderer, testRoot }: ExampleSettings) {
  function createParticle(
    isBurst: boolean,
    side: 'left' | 'right' | null,
    startY: number,
    launchDelay: number,
  ) {
    const particle: Particle = {
      node: renderer.createNode({
        x: 0,
        y: Y_START,
        w: 40,
        h: 40,
        parent: testRoot,
      }),
      animations: [],
      launchDelay: Math.random() * 2000,
      launch(isBurst: boolean, side: 'left' | 'right' | null, startY: number) {
        const size = 11 + Math.random() * 25;
        const ratio = size / 36;
        const baseDurationMs = Math.round(
          (isBurst ? 2.2 + Math.random() * 1.5 : 4.5 + Math.random()) * 1000,
        );
        const durationMs = Math.round(
          (baseDurationMs * (Y_END - startY)) / (Y_END - Y_START),
        );
        const startX = isBurst
          ? side === 'left'
            ? -40
            : 1960
          : Math.random() * 1920;
        const endX =
          startX +
          (isBurst
            ? (3 + Math.random() * 35) * ratio * 28 * (side === 'left' ? 1 : -1)
            : (Math.random() - 0.5) * 40);
        const startRot = Math.random() * 360;
        const endRot =
          startRot +
          (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720);

        const node = this.node;
        node.w = size;
        node.h = size;
        node.x = startX;
        node.y = startY;
        node.rotation = startRot * (Math.PI / 180);
        node.color = COLORS[Math.floor(Math.random() * COLORS.length)]!;
        node.src = SHAPES[Math.floor(Math.random() * SHAPES.length)]!;

        const animateY = node.animate(
          {
            y: Y_END,
          },
          {
            duration: durationMs,
            easing: 'linear',
          },
        );

        animateY.start();
        const animateX = node.animate(
          {
            x: endX,
          },
          {
            duration: durationMs,
            easing: 'cubic-bezier(0,0,0.4,1)',
          },
        );

        animateX.start();

        // const animateRot = node.animate(
        //   {
        //     rotation: endRot * (Math.PI / 180),
        //   },
        //   {
        //     duration: durationMs,
        //     easing: 'ease-out',
        //   }
        // )

        // animateRot.start();

        animateY.on('stopped', () => {
          animateY.off('stopped', () => {});
          this.launch(false, null, Y_START);
          this.animations = [];
        });

        this.animations = [animateY, animateX /*, animateRot*/];
      },
    };
    setTimeout(() => {
      particle.launch(isBurst, side, startY);
    }, launchDelay);
  }

  for (let i = 0; i < BURST_COUNT; i++) {
    createParticle(true, i % 2 === 0 ? 'left' : 'right', -40, i * 15);
  }

  for (let i = 0; i < POOL_SIZE; i++) {
    createParticle(
      false,
      null,
      Math.floor(Math.random() * 1100),
      (i - BURST_COUNT) * 3,
    );
  }
}
