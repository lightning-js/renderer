/**
 * Generic WebGL Utility Functions
 *
 * @remarks
 * Nothing here should be coupled to Renderer logic / types.
 *
 * @param gl
 * @returns
 */

export function isWebGl2(
  gl: WebGLRenderingContext,
): gl is WebGL2RenderingContext {
  return (
    self.WebGL2RenderingContext && gl instanceof self.WebGL2RenderingContext
  );
}
