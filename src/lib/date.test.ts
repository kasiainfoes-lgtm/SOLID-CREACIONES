import { describe, expect, it } from 'vitest';
import { addBusinessDays } from './date.js';

describe('addBusinessDays', () => {
  it('skips weekends when adding business days', () => {
    // Friday 2026-01-02
    const friday = new Date('2026-01-02T10:00:00Z');
    const result = addBusinessDays(friday, 2);
    // +1 business day -> Monday 2026-01-05, +2 -> Tuesday 2026-01-06
    expect(result.getUTCDay()).toBe(2);
    expect(result.toISOString().slice(0, 10)).toBe('2026-01-06');
  });

  it('adds plain weekdays without crossing a weekend', () => {
    const monday = new Date('2026-01-05T10:00:00Z');
    const result = addBusinessDays(monday, 1);
    expect(result.toISOString().slice(0, 10)).toBe('2026-01-06');
  });
});
