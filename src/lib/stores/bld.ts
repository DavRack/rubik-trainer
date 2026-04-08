import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { type FSRSState, type Grade, initFSRSState, nextState } from '../fsrs';
import { getRetrievability } from './stats';

export interface BLDPair {
  id: string; // "AB", "AC", etc.
  num: number; // Case number
  memo: string;
  deleted: boolean;
  fsrs?: FSRSState;
}

export type BLDStats = Record<string, BLDPair>;

const LETTERS = "ABCDEFGHIKLMNOPQRSTUVYZ".split(""); // A-V (excluding J/X often) + Y, Z. 
// Standard 24 for cubing: A-V, Y, Z

function getSpanishPlaceholder(id: string): string {
  const map: Record<string, string> = {
    'AB': 'Abanico', 'AC': 'Acedo', 'AD': 'Adorno', 'AE': 'Aéreo', 'AF': 'Afilar', 'AG': 'Agua', 'AH': 'Ahogo', 'AI': 'Aire', 'AK': 'Aker', 'AL': 'Ala', 'AM': 'Amo', 'AN': 'Ana', 'AO': 'Aorta', 'AP': 'Apio', 'AQ': 'Aquí', 'AR': 'Aro', 'AS': 'Asa', 'AT': 'Atar', 'AU': 'Auto', 'AV': 'Ave', 'AY': 'Ayer', 'AZ': 'Azul',
    'BA': 'Bata', 'BC': 'Boca', 'BD': 'Boda', 'BE': 'Beso', 'BF': 'Bofia', 'BG': 'Bago', 'BH': 'Búho', 'BI': 'Bici', 'BK': 'Bikini', 'BL': 'Bola', 'BM': 'Broma', 'BN': 'Bono', 'BO': 'Bota', 'BP': 'Bypass', 'BQ': 'Buque', 'BR': 'Brazo', 'BS': 'Beso', 'BT': 'Bote', 'BU': 'Burro', 'BV': 'Bravo', 'BY': 'Byung', 'BZ': 'Bazo',
    'CA': 'Casa', 'CB': 'Cebo', 'CD': 'Codo', 'CE': 'Cena', 'CF': 'Café', 'CG': 'Ciego', 'CH': 'Chao', 'CI': 'Cine', 'CK': 'Check', 'CL': 'Cola', 'CM': 'Cama', 'CN': 'Cuna', 'CO': 'Copa', 'CP': 'Capa', 'CQ': 'Caqui', 'CR': 'Cara', 'CS': 'Casa', 'CT': 'Coto', 'CU': 'Cuna', 'CV': 'Cueva', 'CY': 'Cyan', 'CZ': 'Caza',
    'DA': 'Dado', 'DB': 'Debo', 'DC': 'Ducha', 'DE': 'Dedo', 'DF': 'Dufa', 'DG': 'Dogo', 'DH': 'Dher', 'DI': 'Día', 'DK': 'Dakar', 'DL': 'Duelo', 'DM': 'Dama', 'DN': 'Duna', 'DO': 'Dedo', 'DP': 'Dopa', 'DQ': 'Duque', 'DR': 'Draga', 'DS': 'Dosis', 'DT': 'Dato', 'DU': 'Duna', 'DV': 'Diva', 'DY': 'Dylan', 'DZ': 'Diez'
  };
  return map[id] || "";
}

function generateAllPairs(): BLDStats {
  const stats: BLDStats = {};
  let count = 1;
  for (const first of LETTERS) {
    for (const second of LETTERS) {
      if (first === second) continue;
      const id = first + second;
      stats[id] = {
        id,
        num: count++,
        memo: getSpanishPlaceholder(id),
        deleted: false
      };
    }
  }
  return stats;
}

const initialStats: BLDStats = browser 
  ? JSON.parse(localStorage.getItem('bld-stats') || 'null') || generateAllPairs()
  : generateAllPairs();

export const bldStats = writable<BLDStats>(initialStats);

if (browser) {
  bldStats.subscribe(value => {
    localStorage.setItem('bld-stats', JSON.stringify(value));
  });
}

export function updateMemo(id: string, memo: string) {
  bldStats.update(s => {
    if (!s[id]) return s;
    return { ...s, [id]: { ...s[id], memo } };
  });
}

export function toggleDelete(id: string) {
  bldStats.update(s => {
    if (!s[id]) return s;
    return { ...s, [id]: { ...s[id], deleted: !s[id].deleted } };
  });
}

export function resetBLDStats() {
  const defaultStats = generateAllPairs();
  bldStats.set(defaultStats);
}

export function addCustomPair(id: string) {
  bldStats.update(s => {
    if (s[id]) {
      // If it exists but is deleted, undelete it
      if (s[id].deleted) {
        return { ...s, [id]: { ...s[id], deleted: false } };
      }
      return s; // Already exists and active
    }
    
    const count = Object.keys(s).length + 1;
    return {
      ...s,
      [id]: {
        id,
        num: count,
        memo: "",
        deleted: false
      }
    };
  });
}

export function ratePair(id: string, grade: Grade) {
  bldStats.update(s => {
    const pair = s[id];
    if (!pair) return s;
    
    let fsrs = pair.fsrs;
    if (!fsrs) {
      fsrs = initFSRSState(grade);
    } else {
      fsrs = nextState(fsrs, grade);
    }

    return { ...s, [id]: { ...pair, fsrs } };
  });
}

export function nextPracticePair(): string | null {
  const stats = get(bldStats);
  const pairs = Object.values(stats).filter(p => !p.deleted && p.memo.trim() !== "");
  
  if (pairs.length === 0) return null;

  const unseen = pairs.filter(p => !p.fsrs);
  if (unseen.length > 0) {
    return unseen[Math.floor(Math.random() * unseen.length)].id;
  }

  const sortedByDue = pairs
    .map(p => ({
      id: p.id,
      r: p.fsrs ? getRetrievability(p.fsrs.stability, p.fsrs.last_review!) : 0
    }))
    .sort((a, b) => a.r - b.r);

  return sortedByDue[0].id;
}
