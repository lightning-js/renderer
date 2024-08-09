/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the License);
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
 */

// test modules
import { Bench } from 'tinybench';

// src files
import { ImageTexture } from '../../src/core/textures/ImageTexture.js';
import { CoreTextureManager } from '../../src/core/CoreTextureManager.js';

const bench = new Bench();
const txManager = new CoreTextureManager(0);

bench
  .add('png', () => {
    new ImageTexture(txManager, {
      src: 'https://somedomain.com/image.png',
    });
  })
  .add('jpg', () => {
    new ImageTexture(txManager, {
      src: 'https://somedomain.com/image.jpg',
    });
  })
  .add('pvr', () => {
    new ImageTexture(txManager, {
      src: 'https://somedomain.com/image.pvr',
    });
  })
  .add('svg', () => {
    new ImageTexture(txManager, {
      src: 'https://somedomain.com/image.svg',
    });
  })
  .add('null', () => {
    new ImageTexture(txManager, {
      src: null,
    });
  });
// TBD feat/svg branch
// .add('regular type', () => {
//   new ImageTexture(txManager, {
//     src: 'https://somedomain.com/image.png',
//     type: 'regular'
//   });
// })
// .add('svg type', () => {
//   new ImageTexture(txManager, {
//     src: 'https://somedomain.com/image.svg',
//     type: 'svg'
//   });
// })
// .add('compressed type', () => {
//   new ImageTexture(txManager, {
//     src: 'https://somedomain.com/image.ktx',
//     type: 'compressed'
//   });
// })

await bench.warmup();
await bench.run();

console.table(bench.table());
