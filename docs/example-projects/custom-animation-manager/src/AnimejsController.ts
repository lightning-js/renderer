import { EventEmitter } from '@lightningjs/renderer/utils';
import type { JSAnimation } from 'animejs/animation';
import type { Timeline } from 'animejs/timeline';

export default class AnimejsController extends EventEmitter {
  constructor(readonly animation: JSAnimation | Timeline) {
    super();

    animation.onBegin = () => {
      this.emit('running');
    };

    animation.onComplete = () => {
      this.emit('stopped');
    };
  }

  start() {
    this.animation.play();
  }

  stop() {
    this.animation.pause();
    this.emit('stopped');
  }

  pause() {
    this.animation.pause();
    this.emit('paused');
  }

  restore() {
    this.animation.reset();
  }
}
