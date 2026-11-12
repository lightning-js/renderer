/*
 * Copyright 2023 Comcast Cable Communications Management, LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WebGlShaderType } from '../../dist/exports/webgl-shaders.js';
import type { CoreShaderNode } from '../../dist/exports/index.js';
import type { ExampleSettings } from '../common/ExampleSettings.js';

/**
 * Two shaders that do the same thing (tint the node) and differ only in how
 * the tint prop is stored: a plain object vs. an array.
 *
 * Every node below has the same size, so the only thing that can differ in
 * the shader value cache key is the tint prop. Each square should be the
 * color written in its label.
 */

type Tint = { r: number; g: number; b: number; a: number };

const fragment = `
  # ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  # else
  precision mediump float;
  # endif

  uniform sampler2D u_texture;
  uniform vec4 u_tint;

  varying vec4 v_color;
  varying vec2 v_textureCoords;

  void main() {
    gl_FragColor = v_color * texture2D(u_texture, v_textureCoords) * u_tint;
  }
`;

const ObjectTintShader: WebGlShaderType<{ tint: Tint }> = {
  props: {
    tint: { default: { r: 1, g: 1, b: 1, a: 1 } },
  },
  update() {
    const { r, g, b, a } = this.props!.tint;
    this.uniform4f('u_tint', r, g, b, a);
  },
  fragment,
};

const ArrayTintShader: WebGlShaderType<{ tint: number[] }> = {
  props: {
    tint: { default: [1, 1, 1, 1] },
  },
  update() {
    const [r, g, b, a] = this.props!.tint;
    this.uniform4f('u_tint', r!, g!, b!, a!);
  },
  fragment,
};

const SIZE = 160;
const GAP = 40;

const cases = [
  { name: 'RED', object: { r: 1, g: 0, b: 0, a: 1 }, array: [1, 0, 0, 1] },
  { name: 'GREEN', object: { r: 0, g: 1, b: 0, a: 1 }, array: [0, 1, 0, 1] },
  { name: 'BLUE', object: { r: 0, g: 0, b: 1, a: 1 }, array: [0, 0, 1, 1] },
];

export async function automation(settings: ExampleSettings) {
  await test(settings);
  await settings.snapshot();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  renderer.stage.shManager.registerShaderType('ObjectTint', ObjectTintShader);
  renderer.stage.shManager.registerShaderType('ArrayTint', ArrayTintShader);

  const rows = [
    { title: 'Object prop { r, g, b, a }', shader: 'ObjectTint' as const },
    {
      title: 'Array prop [r, g, b, a] (control)',
      shader: 'ArrayTint' as const,
    },
  ];

  rows.forEach((row, rowIndex) => {
    const rowY = 20 + rowIndex * (SIZE + 200);

    renderer.createTextNode({
      parent: testRoot,
      x: 20,
      y: rowY,
      fontFamily: 'Ubuntu',
      fontSize: 30,
      text: row.title,
    });

    cases.forEach((c, i) => {
      const x = 20 + i * (SIZE + GAP + 200);
      const y = rowY + 50;

      const node = renderer.createNode({
        parent: testRoot,
        x,
        y,
        w: SIZE,
        h: SIZE,
        color: 0xffffffff,
        shader: renderer.createShader(row.shader, {
          tint: row.shader === 'ObjectTint' ? c.object : c.array,
        }),
      });

      renderer.createTextNode({
        parent: testRoot,
        x,
        y: y + SIZE + 10,
        fontFamily: 'Ubuntu',
        fontSize: 22,
        text: `expected: ${c.name}`,
      });

      renderer.createTextNode({
        parent: testRoot,
        x,
        y: y + SIZE + 40,
        fontFamily: 'Ubuntu',
        fontSize: 16,
        maxWidth: SIZE + 180,
        contain: 'width',
        text: `key: ${(node.shader as CoreShaderNode).createValueKey()}`,
      });
    });
  });
}
