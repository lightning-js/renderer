import type { Stage } from '../Stage.js';
import type { CoreFont } from './CoreFont.js';
import type {
  FontLoadOptions,
  TextRenderer,
  TextRenderers,
} from './TextRenderer.js';

export class CoreFontManager {
  private fonts: Record<string, CoreFont> = Object.create(null) as Record<
    string,
    CoreFont
  >;
  private renderers: Record<string, TextRenderer> = Object.create(
    null,
  ) as Record<string, TextRenderer>;

  constructor(stage: Stage, textRenderers: TextRenderer[]) {
    for (let i = 0; i < textRenderers.length; i++) {
      const renderer = textRenderers[i]!;
      this.renderers[renderer.type] = renderer;
      renderer.init(stage, this);
    }
  }

  loadFont(type: TextRenderers, options: FontLoadOptions) {
    const targetRenderer = this.renderers[type];
    if (targetRenderer === undefined) {
      console.error('renderer type for this font does not exist');
      return;
    }
    const font = targetRenderer.createFont(options);
    if (font === undefined) {
      return;
    }
    font.load();
    this.fonts[options.fontFamily] = font;
  }

  unloadFont(fontFamily: string) {
    const targetFont = this.fonts[fontFamily];
    if (targetFont === undefined) {
      return;
    }
    targetFont.destroy();
    delete this.fonts[fontFamily];
  }

  getFont(fontFamily: string) {
    const font = this.fonts[fontFamily];
    if (font === undefined) {
      console.warn('fontFamily not registered');
      return;
    }
    return font;
  }
}
