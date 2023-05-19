import { CoreAnimation } from './CoreAnimation.js';

export class AnimationManager {
  activeAnimations: Set<CoreAnimation> = new Set();

  registerAnimation(animation: CoreAnimation) {
    if (!this.activeAnimations.has(animation)) {
      animation.once('finished', () => {
        this.unregisterAnimation(animation);
      });
    }
    this.activeAnimations.add(animation);
  }

  unregisterAnimation(animation: CoreAnimation) {
    this.activeAnimations.delete(animation);
  }

  update(dt: number) {
    this.activeAnimations.forEach((animation) => {
      animation.update(dt);
    });
  }
}
