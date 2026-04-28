export type Grade = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

export interface FSRSState {
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  retrievability: number;
  last_review?: number; // timestamp
}

export const DEFAULT_PARAMETERS = [
  0.4025, 1.4612, 3.3558, 15.5251, // Initial stability for G=1..4
  5.2374, 1.3292, // Initial difficulty
  0.9312, 0.0, // Difficulty update
  0.0, 0.0, 0.0, // Stability update (success)
  0.0, 0.0, 0.0, 0.0, // Stability update (failure)
  0.0, 0.0, 0.0, 0.0, // Weight for Hard/Easy
];

// FSRS v5 weights (example weights, often optimized per user, but these are reasonable defaults)
const W = [
  0.4025, 1.4612, 3.3558, 15.5251, 
  5.2374, 1.3292, 0.9312, 0.0, 
  1.1143, 0.1117, 2.0225, 0.0055, 
  0.3183, 0.6359, 2.1358, 0.4025, 
  0.4523, 1.1803, 0.2333
];

export function initFSRSState(grade: Grade, now = Date.now()): FSRSState {
  const stability = W[grade - 1];
  const difficulty = clamp(W[4] - (grade - 3) * W[5], 1, 10);
  
  return {
    stability,
    difficulty,
    elapsed_days: 0,
    scheduled_days: Math.round(stability),
    retrievability: 1,
    last_review: now
  };
}

export function nextState(state: FSRSState, grade: Grade, now = Date.now()): FSRSState {
  const lastReview = state.last_review || now;
  const elapsedDays = Math.max(0, (now - lastReview) / (1000 * 60 * 60 * 24));
  const retrievability = calculateRetrievability(state.stability, elapsedDays);

  let newDifficulty = state.difficulty - W[6] * (grade - 3);
  newDifficulty = clamp(meanReversion(W[4], newDifficulty), 1, 10);

  let newStability: number;
  if (grade === 1) {
    // Failure
    newStability = W[11] * Math.pow(newDifficulty, -W[12]) * (Math.pow(state.stability + 1, W[13]) - 1) * Math.exp(W[14] * (1 - retrievability));
  } else {
    // Success
    const hardMultiplier = grade === 2 ? W[15] : 1;
    const easyMultiplier = grade === 4 ? W[16] : 1;
    
    const sInc = (1 + Math.exp(W[8]) * (11 - newDifficulty) * Math.pow(state.stability, -W[9]) * (Math.exp(W[10] * (1 - retrievability)) - 1) * hardMultiplier * easyMultiplier);
    newStability = state.stability * sInc;
  }

  return {
    stability: newStability,
    difficulty: newDifficulty,
    elapsed_days: elapsedDays,
    scheduled_days: Math.round(newStability),
    retrievability: calculateRetrievability(newStability, 0),
    last_review: now
  };
}

function calculateRetrievability(stability: number, elapsedDays: number): number {
  return Math.pow(1 + (19 / 3) * (elapsedDays / stability), -0.5);
}

function meanReversion(init: number, current: number): number {
  return W[7] * init + (1 - W[7]) * current;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function isDue(state: FSRSState): boolean {
  if (!state.last_review) return true;
  const now = Date.now();
  const elapsedDays = (now - state.last_review) / (1000 * 60 * 60 * 24);
  return elapsedDays >= state.scheduled_days;
}
