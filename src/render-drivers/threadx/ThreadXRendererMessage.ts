/**
 * @module
 * @description
 * Message types / utils for communication between the main worker and the
 * worker worker.
 */

/**
 * Defines the shape of a message sent from the main worker to the worker
 */
export interface ThreadXRendererMessage {
  type: string;
}

/**
 * An initialization message sent from the main worker to the renderer worker
 */
export interface ThreadXRendererInitMessage extends ThreadXRendererMessage {
  type: 'init';
  canvas: OffscreenCanvas;
  deviceLogicalPixelRatio: number;
  devicePhysicalPixelRatio: number;
}

/**
 * A message sent from the main worker to the renderer worker to release a
 * texture
 */
export interface ThreadXRendererReleaseTextureMessage
  extends ThreadXRendererMessage {
  type: 'releaseTexture';
  textureDescId: number;
}

/**
 * A map of message types to message shapes
 */
export interface ThreadXRendererMessageMap {
  init: ThreadXRendererInitMessage;
  releaseTexture: ThreadXRendererReleaseTextureMessage;
}

/**
 * Type guard util for a message sent from the main worker to the renderer worker
 *
 * @param type
 * @param message
 * @returns
 */
export function isThreadXRendererMessage<
  Type extends keyof ThreadXRendererMessageMap,
>(type: Type, message: unknown): message is ThreadXRendererMessageMap[Type] {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    message.type === type
  );
}
