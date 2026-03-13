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
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars
 */
export function createImageWorkerLegacy() {
  function hasAlphaChannel(mimeType: string) {
    return mimeType.indexOf('image/png') !== -1;
  }

  function getImage(
    src: string,
    premultiplyAlpha: boolean | null,
    x: number | null,
    y: number | null,
    width: number | null,
    height: number | null,
  ): Promise<{ data: Blob; premultiplyAlpha: boolean | null }> {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', src, true);
      xhr.responseType = 'blob';

      xhr.onload = function () {
        if (xhr.status !== 200 && xhr.status !== 0) {
          return reject(
            new Error(
              `Image loading failed. HTTP status code: ${
                xhr.status || 'N/A'
              }. URL: ${src}`,
            ),
          );
        }

        var blob = xhr.response;
        var withAlphaChannel =
          premultiplyAlpha !== undefined
            ? premultiplyAlpha
            : hasAlphaChannel(blob.type);

        resolve({ data: blob, premultiplyAlpha: withAlphaChannel });
      };

      xhr.onerror = function () {
        reject(
          new Error('Network error occurred while trying to fetch the image.'),
        );
      };

      xhr.send();
    });
  }

  self.onmessage = (event) => {
    var src = event.data.src;
    var id = event.data.id;
    var premultiplyAlpha = event.data.premultiplyAlpha;
    var x = event.data.sx;
    var y = event.data.sy;
    var width = event.data.sw;
    var height = event.data.sh;

    getImage(src, premultiplyAlpha, x, y, width, height)
      .then(function (data) {
        self.postMessage({ id: id, src: src, data: data });
      })
      .catch(function (error) {
        self.postMessage({ id: id, src: src, error: error.message });
      });
  };
}
