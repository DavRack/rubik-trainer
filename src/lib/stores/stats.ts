import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface Result {
  time: number;
  dnf: boolean;
  timestamp: number;
}

export type Stats = Record<number, Result[]>;

const initialStats: Stats = browser ? JSON.parse(localStorage.getItem('oll-stats') || '{}') : {};

export const stats = writable<Stats>(initialStats);

if (browser) {
  stats.subscribe(value => {
    localStorage.setItem('oll-stats', JSON.stringify(value));
  });
}

export function addResult(id: number, time: number, dnf: boolean) {
  stats.update(s => {
    const results = s[id] || [];
    return {
      ...s,
      [id]: [...results, { time, dnf, timestamp: Date.now() }]
    };
  });
}

export function removeResult(id: number, timestamp: number) {
  stats.update(s => {
    const results = (s[id] || []).filter(r => r.timestamp !== timestamp);
    return { ...s, [id]: results };
  });
}

export function clearAllStats() {
  stats.set({});
}
