import type { ModuleId } from '../types';

export interface LiveActivity {
  id: string;
  module: ModuleId;
  icon: string;
  title: string;
  detail: string;
  priority: number;
  tone?: 'red' | 'green' | 'amber';
}

export function secondaryActivity(activities: LiveActivity[], active: ModuleId | 'call'): LiveActivity | null {
  return activities.filter(activity => activity.module !== active)
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))[0] ?? null;
}

export function playbackTransition(
  active: ModuleId | 'call',
  playing: boolean,
  wasPlaying: boolean,
  returnTo: ModuleId | 'call' | null,
  enabled: ModuleId[],
  fallback: ModuleId,
) {
  if (playing && !wasPlaying && enabled.includes('media'))
    return { active: 'media' as const, returnTo: active === 'media' ? fallback : active, changed: active !== 'media' };
  if (!playing && wasPlaying) {
    const target = returnTo && returnTo !== 'call' && enabled.includes(returnTo) ? returnTo : fallback;
    return { active: active === 'media' ? target : active, returnTo: null, changed: active === 'media' && target !== 'media' };
  }
  return { active, returnTo, changed: false };
}
