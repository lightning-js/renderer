import { describe, expect, it, vi } from 'vitest';
import { CancelToken } from './CancelToken.js';

describe('CancelToken', () => {
  it('runs registered listeners once on cancel', () => {
    const token = new CancelToken();
    const listener = vi.fn();
    token.onCancel(listener);

    token.cancel();
    token.cancel();

    expect(token.cancelled).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('runs a listener immediately when already cancelled', () => {
    const token = new CancelToken();
    token.cancel();
    const listener = vi.fn();

    token.onCancel(listener);

    expect(listener).toHaveBeenCalledOnce();
  });
});
