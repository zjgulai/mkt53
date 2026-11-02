import { describe, expect, it } from 'vitest';
import {
  formatManifestScheduleText,
  getManifestScheduleStatus,
  getManifestSchedulePresentation,
} from '@/hooks/usePeriodicManifest';

describe('periodic manifest schedule status', () => {
  const now = new Date('2026-08-09T09:00:00+08:00');

  it('marks a past scheduled run as overdue instead of presenting it as the next run', () => {
    const scheduledAt = '2026-08-01T09:00:00+08:00';

    expect(getManifestScheduleStatus(scheduledAt, now)).toBe('overdue');
    expect(formatManifestScheduleText(scheduledAt, now)).toMatch(/^计划已逾期 /);
  });

  it('keeps a future scheduled run as scheduled', () => {
    const scheduledAt = '2026-08-16T09:00:00+08:00';

    expect(getManifestScheduleStatus(scheduledAt, now)).toBe('scheduled');
    expect(formatManifestScheduleText(scheduledAt, now)).toMatch(/^下次计划 /);
  });

  it('fails closed for missing or invalid schedule values', () => {
    expect(getManifestScheduleStatus(undefined, now)).toBe('unknown');
    expect(getManifestScheduleStatus('not-a-date', now)).toBe('unknown');
    expect(formatManifestScheduleText(undefined, now)).toBe('等待调度信息');
    expect(getManifestSchedulePresentation('ready', 'unknown')).toEqual({
      tone: 'warning',
      label: '调度信息未知',
    });
    expect(getManifestSchedulePresentation('ready', 'scheduled')).toEqual({
      tone: 'success',
      label: '调度正常',
    });
    expect(getManifestSchedulePresentation('ready', 'overdue')).toEqual({
      tone: 'danger',
      label: '调度逾期',
    });
    expect(getManifestSchedulePresentation('loading', 'scheduled')).toEqual({
      tone: 'warning',
      label: '采集状态未就绪',
    });
  });
});
