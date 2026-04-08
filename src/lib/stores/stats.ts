import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { type FSRSState, type Grade, initFSRSState, nextState } from '../fsrs';

export interface Result {
  time: number;
  grade: Grade;
  timestamp: number;
}

export interface CaseStats {
  results: Result[];
  fsrs?: FSRSState;
}

export type Stats = Record<number, CaseStats>;

const initialStats: Stats = browser ? JSON.parse(localStorage.getItem('oll-stats-v2') || '{}') : {};

export const stats = writable<Stats>(initialStats);

if (browser) {
  stats.subscribe(value => {
    localStorage.setItem('oll-stats-v2', JSON.stringify(value));
  });
}

export function rateCase(id: number, time: number, grade: Grade) {
  stats.update(s => {
    const caseData = s[id] || { results: [] };
    const results = [...caseData.results, { time, grade, timestamp: Date.now() }];
    
    let fsrs = caseData.fsrs;
    if (!fsrs) {
      fsrs = initFSRSState(grade);
    } else {
      fsrs = nextState(fsrs, grade);
    }

    return {
      ...s,
      [id]: { results, fsrs }
    };
  });
}

export function removeResult(id: number, timestamp: number) {
  stats.update(s => {
    const caseData = s[id];
    if (!caseData) return s;
    const results = caseData.results.filter(r => r.timestamp !== timestamp);
    return { ...s, [id]: { ...caseData, results } };
  });
}

export function clearAllStats() {
  stats.set({});
}

export function getRetrievability(stability: number, lastReview: number): number {
  const elapsedDays = (Date.now() - lastReview) / (1000 * 60 * 60 * 24);
  return Math.pow(1 + (19 / 3) * (elapsedDays / stability), -0.5);
}
