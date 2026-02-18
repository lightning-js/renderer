/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2026 Comcast Cable Communications Management, LLC.
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

export const PROTOCOL_REGEX = /^(data|ftps?|https?):/;

export function isBase64Image(src: string) {
  return src.startsWith('data:') === true;
}

export function dataURIToBlob(dataURI: string): Blob {
  dataURI = dataURI.replace(/^data:/, '');

  const type = dataURI.match(/image\/[^;]+/)?.[0] || '';
  const base64 = dataURI.replace(/^[^,]+,/, '');

  const sliceSize = 1024;
  const byteCharacters = atob(base64);
  const bytesLength = byteCharacters.length;
  const slicesCount = Math.ceil(bytesLength / sliceSize);
  const byteArrays = new Array(slicesCount);

  for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
    const begin = sliceIndex * sliceSize;
    const end = Math.min(begin + sliceSize, bytesLength);

    const bytes = new Array(end - begin);
    for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
      bytes[i] = byteCharacters[offset]?.charCodeAt(0);
    }
    byteArrays[sliceIndex] = new Uint8Array(bytes);
  }
  return new Blob(byteArrays, { type });
}

export function convertUrlToAbsolute(url: string): string {
  // handle local file imports if the url isn't remote resource or data blob
  if (self.location.protocol === 'file:' && !PROTOCOL_REGEX.test(url)) {
    const path = self.location.pathname.split('/');
    path.pop();
    const basePath = path.join('/');
    const baseUrl = self.location.protocol + '//' + basePath;

    // check if url has a leading dot
    if (url.charAt(0) === '.') {
      url = url.slice(1);
    }

    // check if url has a leading slash
    if (url.charAt(0) === '/') {
      url = url.slice(1);
    }

    return baseUrl + '/' + url;
  }

  const absoluteUrl = new URL(url, self.location.href);
  return absoluteUrl.href;
}

export function createWebGLContext(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  forceWebGL2 = false,
): WebGLRenderingContext {
  const config: WebGLContextAttributes = {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: true,
    desynchronized: false,
    // Disabled because it prevents Visual Regression Tests from working
    // failIfMajorPerformanceCaveat: true,
    powerPreference: 'high-performance',
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
  };
  const gl =
    // TODO: Remove this assertion once this issue is fixed in TypeScript
    // https://github.com/microsoft/TypeScript/issues/53614
    (canvas.getContext(forceWebGL2 ? 'webgl2' : 'webgl', config) ||
      canvas.getContext(
        'experimental-webgl' as 'webgl',
        config,
      )) as unknown as WebGLRenderingContext | null;
  if (!gl) {
    throw new Error('Unable to create WebGL context');
  }

  return gl;
}
