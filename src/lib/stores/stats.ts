import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { type FSRSState, type Grade, initFSRSState, nextState } from '../fsrs';
import { ollCases } from '../data/oll';

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

function getMedian(times: number[]): number {
  if (times.length === 0) return 0;
  const sorted = [...times].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function recalculateAll(s: Stats): Stats {
  const newStats: Stats = {};

  // 1. Find the Global Best Median (Moving Indicator)
  // This is the lowest median-of-last-5 found among all OLL cases
  let globalBestMedian = Infinity;
  Object.values(s).forEach(data => {
    const last5 = data.results
      .filter(r => r.time > 0)
      .slice(-5)
      .map(r => r.time);
    
    if (last5.length > 0) {
      const m = getMedian(last5);
      if (m < globalBestMedian) globalBestMedian = m;
    }
  });

  // Fallback if no solves exist yet
  const benchmark = globalBestMedian === Infinity ? 1.0 : globalBestMedian;

  // 2. Re-calculate grades and FSRS for every case against this global benchmark
  Object.entries(s).forEach(([idStr, data]) => {
    const id = parseInt(idStr);
    const sortedResults = [...data.results].sort((a, b) => a.timestamp - b.timestamp);
    const updatedResults: Result[] = [];
    
    sortedResults.forEach(r => {
      if (r.time === 0) {
        updatedResults.push({ ...r, grade: 1 });
        return;
      }

      const score = benchmark / r.time;

      let grade: Grade;
      // Note: Long algorithms will naturally score lower and be graded as "Hard"
      if (score >= 0.90) grade = 4;      // Near global peak
      else if (score >= 0.60) grade = 3; // Good effort
      else grade = 2;                   // Hard (common for long algorithms)

      updatedResults.push({ ...r, grade, score } as any); // Storing score for UI if needed
    });

    // Re-simulate FSRS
    let fsrs: FSRSState | undefined = undefined;
    updatedResults.forEach(r => {
      if (!fsrs) {
        fsrs = initFSRSState(r.grade, r.timestamp);
      } else {
        fsrs = nextState(fsrs, r.grade, r.timestamp);
      }
    });

    newStats[id] = { results: updatedResults, fsrs };
  });

  return newStats;
}

export function rateCase(id: number, time: number, grade: Grade) {
  stats.update(s => {
    const caseData = s[id] || { results: [] };
    const results = [...caseData.results, { time, grade, timestamp: Date.now() }];
    const updatedStats = { ...s, [id]: { ...caseData, results } };
    return recalculateAll(updatedStats);
  });
}

export function removeResult(id: number, timestamp: number) {
  stats.update(s => {
    const caseData = s[id];
    if (!caseData) return s;
    const results = caseData.results.filter(r => r.timestamp !== timestamp);
    const updatedStats = { ...s, [id]: { ...caseData, results } };
    return recalculateAll(updatedStats);
  });
}

export function clearAllStats() {
  stats.set({});
}

export function getRetrievability(stability: number, lastReview: number): number {
  const elapsedDays = (Date.now() - lastReview) / (1000 * 60 * 60 * 24);
  return Math.pow(1 + (19 / 3) * (elapsedDays / stability), -0.5);
}
