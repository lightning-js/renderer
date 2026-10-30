import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebPlatform } from './WebPlatform.js';
import {
  CancelToken,
  TextureLoadCancelledError,
} from '../../lib/CancelToken.js';

class FakeXhr {
  static DONE = 4;
  static instances: FakeXhr[] = [];
  readyState = 0;
  status = 0;
  response: unknown = null;
  statusText = '';
  responseType = '';
  aborted = false;
  onreadystatechange: (() => void) | null = null;
  constructor() {
    FakeXhr.instances.push(this);
  }
  open() {}
  send() {}
  abort() {
    this.aborted = true;
    this.readyState = FakeXhr.DONE;
    this.onreadystatechange?.();
  }
}

describe('WebPlatform.fetch cancellation', () => {
  afterEach(() => {
    FakeXhr.instances = [];
    vi.unstubAllGlobals();
  });

  it('aborts the request and rejects as cancelled', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const platform = Object.create(WebPlatform.prototype) as WebPlatform;
    const token = new CancelToken();

    const request = platform.fetch('https://cdn/a.png', token);
    token.cancel();

    await expect(request).rejects.toBeInstanceOf(TextureLoadCancelledError);
    expect(FakeXhr.instances[0]?.aborted).toBe(true);
  });
});
