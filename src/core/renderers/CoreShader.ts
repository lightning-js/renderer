export abstract class CoreShader {
  // abstract draw(): void;
  static makeCacheKey(props: Record<string, unknown>): string | false {
    return false;
  }

  static resolveDefaults(
    props: Record<string, unknown>,
  ): Record<string, unknown> {
    return {};
  }

  abstract useProgram(): void;
}
