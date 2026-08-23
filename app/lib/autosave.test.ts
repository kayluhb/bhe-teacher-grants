import {describe, expect, it, vi} from 'vitest';
import {requestSubmitIfDirty} from '~/lib/autosave';

describe('requestSubmitIfDirty', () => {
  it('does not submit when the value is unchanged', () => {
    const requestSubmit = vi.fn();
    requestSubmitIfDirty({requestSubmit}, {defaultValue: 'PTA Treasurer', value: 'PTA Treasurer'});
    expect(requestSubmit).not.toHaveBeenCalled();
  });

  it('submits when the value changed', () => {
    const requestSubmit = vi.fn();
    requestSubmitIfDirty({requestSubmit}, {defaultValue: 'PTA Treasurer', value: 'Caleb Brown'});
    expect(requestSubmit).toHaveBeenCalledTimes(1);
  });
});
