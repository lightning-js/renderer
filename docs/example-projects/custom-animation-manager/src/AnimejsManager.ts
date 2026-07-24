import { type AnimationManager } from '@lightningjs/renderer/animation';
import {
  type INodeAnimateProps,
  type AnimationSettings,
  type INode,
} from '@lightningjs/renderer';
import {
  engine,
  animate,
  type TargetsParam,
  type AnimationParams,
  type JSAnimation,
  createTimeline,
} from 'animejs';
import AnimejsController from './AnimejsController.js';

export default class AnimejsManager implements AnimationManager {
  constructor() {
    engine.useDefaultMainLoop = false;
  }
  update(): void {
    engine.update();
  }

  animate(target: TargetsParam, props: AnimationParams): JSAnimation {
    return animate(target, props);
  }

  animateNode = function (
    this: INode<AnimejsManager>,
    props: Partial<INodeAnimateProps>,
    settings: Partial<AnimationSettings>,
  ): AnimejsController {
    const shaderProps = props.shaderProps;
    const timeline = createTimeline({
      defaults: {
        duration: settings.duration,
        ease: settings.easing,
        delay: settings.delay,
        loop: settings.loop,
      },
      autoplay: false,
    });

    if (shaderProps !== undefined) {
      timeline.add(this.shader!, shaderProps as AnimationParams);
    }

    timeline.add(this, props as AnimationParams);

    // if you wish you can return the timeline directly instead of using a controller,
    //return timeline;

    // but if you want to use the controller, you can do it like this:
    // the controller will emit events when the animation is running, paused or stopped
    // and you can use the controller to start, stop, pause or restore the animation
    // this however does add some overhead, so if you don't need the controller, you can just return the timeline directly
    return new AnimejsController(timeline);
  };
}
