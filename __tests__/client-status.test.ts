import { describe, it, expect } from 'vitest';
import { isClientActive } from '../lib/client-status';

describe('isClientActive', () => {
  it('returns false for null or undefined client', () => {
    expect(isClientActive(null)).toBe(false);
    expect(isClientActive(undefined)).toBe(false);
  });

  it('returns false for unrecognized or empty status', () => {
    expect(isClientActive({ status: 'lapsed' })).toBe(false);
    expect(isClientActive({ status: 'paused' })).toBe(false);
    expect(isClientActive({ status: '' })).toBe(false);
    expect(isClientActive({ status: null })).toBe(false);
  });

  describe('when status is trial', () => {
    it('returns true if trial_ends_at is null', () => {
      expect(isClientActive({ status: 'trial', trial_ends_at: null })).toBe(true);
    });

    it('returns true if trial_ends_at is in the future', () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      expect(isClientActive({ status: 'trial', trial_ends_at: future.toISOString() })).toBe(true);
    });

    it('returns false if trial_ends_at is in the past', () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      expect(isClientActive({ status: 'trial', trial_ends_at: past.toISOString() })).toBe(false);
    });
  });

  describe('when status is active', () => {
    it('returns true if paid_until is null', () => {
      expect(isClientActive({ status: 'active', paid_until: null })).toBe(true);
    });

    it('returns true if paid_until is in the future', () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      expect(isClientActive({ status: 'active', paid_until: future.toISOString() })).toBe(true);
    });

    it('returns false if paid_until is in the past', () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      expect(isClientActive({ status: 'active', paid_until: past.toISOString() })).toBe(false);
    });
  });
});
