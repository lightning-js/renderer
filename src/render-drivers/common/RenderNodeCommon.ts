import type { IRenderableNode } from '../../core/IRenderableNode.js';
import type { CoreRenderer } from '../../core/renderers/CoreRenderer.js';

/**
 * Common default implementation of IRenderableNode.render
 *
 * @param node
 * @param renderer
 */
export function commonRenderNode(
  node: IRenderableNode,
  renderer: CoreRenderer,
) {
  renderer.addQuad(
    node.x + (node.parent?.x || 0),
    node.y + (node.parent?.y || 0),
    node.w,
    node.h,
    node.color,
    node.texture,
  );
}
