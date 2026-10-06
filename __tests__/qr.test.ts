import { expect, test, describe } from 'vitest';
import { isValidSlug, buildUrl } from '../scripts/make-qr.mjs';

describe('QR Generator validation', () => {
  describe('isValidSlug', () => {
    test('accepts valid lowercase slugs', () => {
      expect(isValidSlug('royal-salon')).toBe(true);
      expect(isValidSlug('cafe-123')).toBe(true);
      expect(isValidSlug('my-business-name')).toBe(true);
      expect(isValidSlug('one')).toBe(true);
    });

    test('rejects invalid slugs', () => {
      expect(isValidSlug('Royal-Salon')).toBe(false); // uppercase
      expect(isValidSlug('royal_salon')).toBe(false); // underscore
      expect(isValidSlug('royal--salon')).toBe(false); // double hyphen
      expect(isValidSlug('-royal-salon')).toBe(false); // leading hyphen
      expect(isValidSlug('royal-salon-')).toBe(false); // trailing hyphen
      expect(isValidSlug('royal salon')).toBe(false); // space
    });
  });

  describe('buildUrl', () => {
    test('builds correct URL from valid inputs', () => {
      expect(buildUrl('https://example.com', 'demo-salon')).toBe('https://example.com/r/demo-salon');
      expect(buildUrl('https://example.com/', 'demo-salon')).toBe('https://example.com/r/demo-salon'); // strips trailing slash
    });

    test('throws on missing or non-https SITE_URL', () => {
      expect(() => buildUrl('http://example.com', 'demo-salon')).toThrow('SITE_URL must be set and start with https://');
      expect(() => buildUrl(undefined, 'demo-salon')).toThrow('SITE_URL must be set and start with https://');
      expect(() => buildUrl('', 'demo-salon')).toThrow('SITE_URL must be set and start with https://');
    });

    test('throws on invalid slug', () => {
      expect(() => buildUrl('https://example.com', 'invalid_slug')).toThrow('Invalid slug format');
    });
  });
});
