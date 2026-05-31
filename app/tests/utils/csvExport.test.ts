import { describe, expect, it } from 'vitest';
import { objectsToCsv } from '@/utils/csvExport';

describe('objectsToCsv', () => {
  it('adds a UTF-8 BOM and escapes cells that contain CSV control characters', () => {
    const csv = objectsToCsv(
      [
        {
          name: 'Momcozy, M5',
          quote: 'He said "ok"',
          note: 'line 1\nline 2',
          empty: undefined,
        },
      ],
      {
        name: 'Name',
        quote: 'Quote',
        note: 'Note',
        empty: 'Empty',
      }
    );

    expect(csv).toBe('\ufeffName,Quote,Note,Empty\n"Momcozy, M5","He said ""ok""","line 1\nline 2",\n');
  });
});
