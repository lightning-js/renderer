import type { ITextNodeProps, RendererMain } from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';
import { paginateTestRows, type TestRow } from '../common/paginateTestRows.js';
import { PageContainer } from '../common/PageContainer.js';
import { constructTestRow } from '../common/constructTestRow.js';

export async function automation(settings: ExampleSettings) {
  // Snapshot all the pages
  await (await test(settings)).snapshotPages();
}

export default async function test(settings: ExampleSettings) {
  const { renderer } = settings;
  const pageContainer = new PageContainer(settings, {
    width: renderer.settings.appWidth,
    height: renderer.settings.appHeight,
    title: 'Text wordBreak',
  });

  await paginateTestRows(pageContainer, [
    ...generateWordBreakTest(renderer, 'sdf', 4),
    ...generateWordBreakTest(renderer, 'sdf', 3),
    ...generateWordBreakTest(renderer, 'sdf', 2),
    ...generateWordBreakTest(renderer, 'sdf', 1),
  ]);

  return pageContainer;
}

const containerSize = 555;
const containerHeight = 200;
const descriptionPosition = 'top';
const NODE_PROPS = {
  x: 0,
  y: 0,
  color: 0x000000ff,
  text: `This is a long and Honorificabilitudinitatibus califragilisticexpialidocious Taumatawhakatangihangakoauauotamateaturipukakapikimaungahoronukupokaiwhenuakitanatahu`,
  fontFamily: 'Ubuntu',
  textRendererOverride: 'sdf',
  fontSize: 20,
  contain: 'width',
  width: containerSize,
  height: containerHeight,
  wordBreak: 'normal',
} satisfies Partial<ITextNodeProps>;

function generateWordBreakTest(
  renderer: RendererMain,
  textRenderer: 'canvas' | 'sdf',
  maxLines: number,
): TestRow[] {
  const text1 = `'wordBreak: normal' - which is the default.`;
  const text2 = `'wordBreak: breakAll'`;
  const text3 = `'wordBreak: breakWord'`;

  return [
    {
      title: maxLines < 4 ? `${text1} Maxlines set to ${maxLines}` : text1,
      content: async (rowNode) => {
        const nodeProps = {
          ...NODE_PROPS,
          textRendererOverride: textRenderer,
        } satisfies Partial<ITextNodeProps>;

        return await constructTestRow(
          {
            renderer,
            rowNode,
            containerSize,
            descriptionPosition,
            containerHeight,
          },
          [
            'Renderer: sdf',
            renderer.createTextNode({
              ...nodeProps,
              maxLines,
              textRendererOverride: 'sdf',
            }),
            'Renderer: canvas',
            renderer.createTextNode({
              ...nodeProps,
              maxLines,
              textRendererOverride: 'canvas',
            }),
          ],
        );
      },
    },
    {
      title: maxLines < 4 ? `${text2} and maxlines set to ${maxLines}` : text2,
      content: async (rowNode) => {
        const nodeProps = {
          ...NODE_PROPS,
          textRendererOverride: textRenderer,
        } satisfies Partial<ITextNodeProps>;

        return await constructTestRow(
          {
            renderer,
            rowNode,
            containerSize,
            descriptionPosition,
            containerHeight,
          },
          [
            'Renderer: sdf',
            renderer.createTextNode({
              ...nodeProps,
              maxLines,
              wordBreak: 'break-all',
              textRendererOverride: 'sdf',
            }),
            'Renderer: canvas',
            renderer.createTextNode({
              ...nodeProps,
              maxLines,
              wordBreak: 'break-all',
              textRendererOverride: 'canvas',
            }),
          ],
        );
      },
    },
    {
      title: maxLines < 4 ? `${text3} and maxlines set to ${maxLines}` : text3,
      content: async (rowNode) => {
        const nodeProps = {
          ...NODE_PROPS,
          textRendererOverride: textRenderer,
        } satisfies Partial<ITextNodeProps>;

        return await constructTestRow(
          {
            renderer,
            rowNode,
            containerSize,
            descriptionPosition,
            containerHeight,
          },
          [
            'Renderer: sdf',
            renderer.createTextNode({
              ...nodeProps,
              maxLines,
              wordBreak: 'break-word',
              textRendererOverride: 'sdf',
            }),
            'Renderer: canvas',
            renderer.createTextNode({
              ...nodeProps,
              maxLines,
              wordBreak: 'break-word',
              textRendererOverride: 'canvas',
            }),
          ],
        );
      },
    },
  ] satisfies TestRow[];
}
