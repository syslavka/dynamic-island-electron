import { describe, expect, it } from 'vitest';
import { playbackTransition, secondaryActivity } from '../services/activityPolicy';
import type { LiveActivity } from '../services/activityPolicy';

describe('playback activity handoff', () => {
  const enabled = ['clock', 'timer', 'media'] as const;
  it('takes over after any previous interaction and restores the prior activity', () => {
    const started = playbackTransition('timer', true, false, null, [...enabled], 'clock');
    expect(started).toEqual({ active: 'media', returnTo: 'timer', changed: true });
    expect(playbackTransition(started.active, false, true, started.returnTo, [...enabled], 'clock').active).toBe('timer');
    expect(playbackTransition('timer', true, false, null, [...enabled], 'clock').active).toBe('media');
  });
  it('does not steal back an activity manually selected during playback', () => {
    expect(playbackTransition('clock', false, true, 'timer', [...enabled], 'clock').active).toBe('clock');
    expect(playbackTransition('timer', true, true, 'clock', [...enabled], 'clock').active).toBe('timer');
  });
  it('falls back when the previous module was disabled and respects disabled music', () => {
    expect(playbackTransition('media', false, true, 'timer', ['clock', 'media'], 'clock').active).toBe('clock');
    expect(playbackTransition('timer', true, false, null, ['clock', 'timer'], 'clock').active).toBe('timer');
  });
});

describe('secondary island priority', () => {
  const activities: LiveActivity[] = [
    { id: 'media', module: 'media', icon: 'music', title: 'Music', detail: 'Track', priority: 60 },
    { id: 'timer', module: 'timer', icon: 'timer', title: 'Timer', detail: '00:20', priority: 85 },
    { id: 'camera', module: 'system', icon: 'camera', title: 'Camera', detail: 'App', priority: 100 },
  ];
  it('selects privacy status first, excluding the primary activity', () => {
    expect(secondaryActivity(activities, 'media')?.id).toBe('camera');
    expect(secondaryActivity(activities, 'system')?.id).toBe('timer');
    expect(activities[0].id).toBe('media');
  });
  it('merges away when only the primary activity remains', () => {
    expect(secondaryActivity([activities[0]], 'media')).toBeNull();
    expect(secondaryActivity([], 'clock')).toBeNull();
  });
});
