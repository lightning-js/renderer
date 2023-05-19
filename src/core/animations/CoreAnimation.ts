import type { INodeAnimatableProps } from '../INode.js';
import type { IRenderableNode } from '../IRenderableNode.js';

function lerp(start: number, end: number, t: number) {
  return start * (1 - t) + end * t;
}

export class CoreAnimation {
  private propStartValues: Partial<INodeAnimatableProps> = {};
  private progress = 0;

  constructor(
    private node: IRenderableNode,
    private props: Partial<INodeAnimatableProps>,
    private duration: number,
  ) {
    this.propStartValues = {};
    (Object.keys(props) as Array<keyof INodeAnimatableProps>).forEach(
      (propName) => {
        this.propStartValues[propName] = node[propName];
      },
    );
  }

  reset() {
    this.progress = 0;
    this.update(0);
  }

  update(dt: number) {
    (Object.keys(this.props) as Array<keyof INodeAnimatableProps>).forEach(
      (propName) => {
        const propValue = this.props[propName] as number;
        const startValue = this.propStartValues[propName] as number;
        const endValue = propValue;
        this.progress += dt / this.duration;
        if (this.progress > 1) {
          this.progress = 1;
          this.emit('finished', {});
        }
        const value = startValue + (endValue - startValue) * this.progress;
        this.node[propName] = value;
      },
    );
  }

  //#region EventEmitter
  private eventListeners: { [eventName: string]: any } = {};

  on(event: string, listener: (target: any, data: any) => void): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let listeners = this.eventListeners[event];
    if (!listeners) {
      listeners = [];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    listeners.push(listener);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.eventListeners[event] = listeners;
  }

  off(event: string, listener: (target: any, data: any) => void): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const listeners = this.eventListeners[event];
    if (!listeners) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      listeners.splice(index, 1);
    }
  }

  once(event: string, listener: (target: any, data: any) => void): void {
    const onceListener = (target: any, data: any) => {
      this.off(event, onceListener);
      listener(target, data);
    };
    this.on(event, onceListener);
  }

  emit(event: string, data: Record<string, unknown>): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const listeners = this.eventListeners[event];
    if (!listeners) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    [...listeners].forEach((listener) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      listener(this, data);
    });
  }
  //#endregion EventEmitter
}
