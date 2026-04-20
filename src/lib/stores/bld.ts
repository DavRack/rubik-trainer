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

const LETTERS = "ABCDEFGHIKLMNOPQRSTUVYZJ".split("").sort(); // A-V, Y, Z + J = 24 letters

function getSpanishPlaceholder(id: string): string {
  const map: Record<string, string> = {
    // A
    'AB': 'Abanico', 'AC': 'Aceite', 'AD': 'Adorno', 'AE': 'Aéreo', 'AF': 'Afilar', 'AG': 'Agua', 'AH': 'Ahogo', 'AI': 'Aire', 'AJ': 'Ajedrez', 'AK': 'Aker', 'AL': 'Alce', 'AM': 'Amo', 'AN': 'Ancla', 'AO': 'Aorta', 'AP': 'Apio', 'AQ': 'Aquí', 'AR': 'Arco', 'AS': 'Asa', 'AT': 'Atún', 'AU': 'Auto', 'AV': 'Ave', 'AY': 'Ayer', 'AZ': 'Azul',
    // B
    'BA': 'Bata', 'BC': 'Boca', 'BD': 'Boda', 'BE': 'Beso', 'BF': 'Bofia', 'BG': 'Bagre', 'BH': 'Búho', 'BI': 'Bici', 'BJ': 'Bajo', 'BK': 'Bikini', 'BL': 'Bola', 'BM': 'Broma', 'BN': 'Bono', 'BO': 'Bota', 'BP': 'Bypass', 'BQ': 'Buque', 'BR': 'Brazo', 'BS': 'Bus', 'BT': 'Bote', 'BU': 'Burro', 'BV': 'Bravo', 'BY': 'Byte', 'BZ': 'Bazo',
    // C
    'CA': 'Casa', 'CB': 'Cebo', 'CD': 'Codo', 'CE': 'Cena', 'CF': 'Café', 'CG': 'Ciego', 'CH': 'Chapa', 'CI': 'Cine', 'CJ': 'Ceja', 'CK': 'Check', 'CL': 'Cola', 'CM': 'Cama', 'CN': 'Cuna', 'CO': 'Copa', 'CP': 'Capa', 'CQ': 'Caqui', 'CR': 'Cara', 'CS': 'Cosa', 'CT': 'Coto', 'CU': 'Cubo', 'CV': 'Cueva', 'CY': 'Cyan', 'CZ': 'Caza',
    // D
    'DA': 'Dado', 'DB': 'Debo', 'DC': 'Ducha', 'DE': 'Dedo', 'DF': 'Defe', 'DG': 'Dogo', 'DH': 'Dher', 'DI': 'Día', 'DJ': 'DJ', 'DK': 'Dakar', 'DL': 'Duelo', 'DM': 'Dama', 'DN': 'Duna', 'DO': 'Domo', 'DP': 'Dopa', 'DQ': 'Duque', 'DR': 'Draga', 'DS': 'Dosis', 'DT': 'Dato', 'DU': 'Duende', 'DV': 'Diva', 'DY': 'Dylan', 'DZ': 'Diez',
    // E
    'EA': 'Ea', 'EB': 'Ebro', 'EC': 'Eco', 'ED': 'Edad', 'EF': 'Efe', 'EG': 'Ego', 'EH': 'Eh', 'EI': 'Eider', 'EJ': 'Eje', 'EK': 'Ek', 'EL': 'Elfo', 'EM': 'Emma', 'EN': 'Eno', 'EO': 'Eolo', 'EP': 'Épico', 'EQ': 'Equis', 'ER': 'Era', 'ES': 'Esa', 'ET': 'Eta', 'EU': 'Euro', 'EV': 'Eva', 'EY': 'Ey', 'EZ': 'Ez',
    // F
    'FA': 'Fama', 'FB': 'FBI', 'FC': 'Ficha', 'FD': 'Fado', 'FE': 'Feo', 'FG': 'Fuga', 'FH': 'Fahrenheit', 'FI': 'Fila', 'FJ': 'Fijo', 'FK': 'Folk', 'FL': 'Flor', 'FM': 'Fumo', 'FN': 'Fino', 'FO': 'Foca', 'FP': 'Flip', 'FQ': 'Fuque', 'FR': 'Frío', 'FS': 'Fase', 'FT': 'Foto', 'FU': 'Fuego', 'FV': 'Favor', 'FY': 'Fly', 'FZ': 'Faza',
    // G
    'GA': 'Gato', 'GB': 'Giba', 'GC': 'Goce', 'GD': 'Godo', 'GE': 'Gema', 'GF': 'Gafe', 'GH': 'Ghetto', 'GI': 'Giro', 'GJ': 'Gajo', 'GK': 'Gecko', 'GL': 'Gula', 'GM': 'Goma', 'GN': 'Gnomo', 'GO': 'Gota', 'GP': 'GPS', 'GQ': 'Gaque', 'GR': 'Grúa', 'GS': 'Gas', 'GT': 'Gaita', 'GU': 'Guía', 'GV': 'Gaviota', 'GY': 'Gyoza', 'GZ': 'Gaza',
    // H
    'HA': 'Hada', 'HB': 'Hobbit', 'HC': 'Hacha', 'HD': 'Hado', 'HE': 'Helo', 'HF': 'Hoff', 'HG': 'Higos', 'HI': 'Hilo', 'HJ': 'Hijo', 'HK': 'Hong Kong', 'HL': 'Halo', 'HM': 'Humo', 'HN': 'Hino', 'HO': 'Hola', 'HP': 'Hippo', 'HQ': 'Hique', 'HR': 'Hora', 'HS': 'Huso', 'HT': 'Hito', 'HU': 'Hueco', 'HV': 'Huevo', 'HY': 'Hyena', 'HZ': 'Haza',
    // I
    'IA': 'Iara', 'IB': 'Iba', 'IC': 'Ice', 'ID': 'Idea', 'IE': 'Ie', 'IF': 'If', 'IG': 'Igor', 'IH': 'Ih', 'IJ': 'Ijar', 'IK': 'Ikea', 'IL': 'Ilo', 'IM': 'Imán', 'IN': 'Inca', 'IO': 'Ion', 'IP': 'iPad', 'IQ': 'Ique', 'IR': 'Ira', 'IS': 'Isla', 'IT': 'Ito', 'IU': 'Iu', 'IV': 'IVA', 'IY': 'Iyar', 'IZ': 'Iza',
    // J
    'JA': 'Jara', 'JB': 'Jabón', 'JC': 'Jaca', 'JD': 'Joda', 'JE': 'Jefe', 'JF': 'Jofre', 'JG': 'Jugo', 'JH': 'Jher', 'JI': 'Jira', 'JK': 'Joker', 'JL': 'Jalo', 'JM': 'Jema', 'JN': 'Jino', 'JO': 'Joya', 'JP': 'Jeep', 'JQ': 'Jaque', 'JR': 'Jaro', 'JS': 'Jaso', 'JT': 'Jota', 'JU': 'Judo', 'JV': 'Java', 'JY': 'Jaya', 'JZ': 'Jazo',
    // K
    'KA': 'Kara', 'KB': 'Kebab', 'KC': 'Kico', 'KD': 'Kodak', 'KE': 'Ken', 'KF': 'KFC', 'KG': 'Kong', 'KH': 'Khan', 'KI': 'Kiwi', 'KJ': 'Koji', 'KL': 'Koala', 'KM': 'Kilo', 'KN': 'Keno', 'KO': 'Kopa', 'KP': 'Kappa', 'KQ': 'Kaque', 'KR': 'Kra', 'KS': 'Kuso', 'KT': 'Keto', 'KU': 'Kum', 'KV': 'Kiev', 'KY': 'Kyra', 'KZ': 'Kaza',
    // L
    'LA': 'Lana', 'LB': 'Lobo', 'LC': 'Loco', 'LD': 'Lodo', 'LE': 'Leña', 'LF': 'Lofo', 'LG': 'Lago', 'LH': 'Lh', 'LI': 'Lima', 'LJ': 'Lujo', 'LK': 'Lake', 'LM': 'Lomo', 'LN': 'Luna', 'LO': 'Loro', 'LP': 'Lupa', 'LQ': 'Lique', 'LR': 'Lira', 'LS': 'Losa', 'LT': 'Loto', 'LU': 'Luz', 'LV': 'Lava', 'LY': 'Lyra', 'LZ': 'Lazo',
    // M
    'MA': 'Masa', 'MB': 'Mambo', 'MC': 'Maca', 'MD': 'Moda', 'ME': 'Mesa', 'MF': 'Mafo', 'MG': 'Mago', 'MH': 'Mher', 'MI': 'Miel', 'MJ': 'Mijo', 'MK': 'Mika', 'ML': 'Malo', 'MN': 'Mano', 'MO': 'Mono', 'MP': 'Mapa', 'MQ': 'Maque', 'MR': 'Muro', 'MS': 'Mus', 'MT': 'Moto', 'MU': 'Mula', 'MV': 'Mueve', 'MY': 'Maya', 'MZ': 'Moza',
    // N
    'NA': 'Nata', 'NB': 'Nabo', 'NC': 'Naco', 'ND': 'Nudo', 'NE': 'Nene', 'NF': 'Nafo', 'NG': 'Nago', 'NH': 'Nher', 'NI': 'Nido', 'NJ': 'Ninja', 'NK': 'Nike', 'NL': 'Nulo', 'NM': 'Numa', 'NO': 'Nota', 'NP': 'Napa', 'NQ': 'Nique', 'NR': 'Nuera', 'NS': 'Nasa', 'NT': 'Nato', 'NU': 'Nuez', 'NV': 'Nave', 'NY': 'NY', 'NZ': 'Nazo',
    // O
    'OA': 'Oasis', 'OB': 'Obra', 'OC': 'Oca', 'OD': 'Odio', 'OE': 'Oeste', 'OF': 'Ofni', 'OG': 'Ogro', 'OH': 'Oh', 'OI': 'Oído', 'OJ': 'Ojo', 'OK': 'OK', 'OL': 'Ola', 'OM': 'Omán', 'ON': 'Onza', 'OP': 'Opio', 'OQ': 'Oque', 'OR': 'Oro', 'OS': 'Oso', 'OT': 'Otro', 'OU': 'Ou', 'OV': 'Ovni', 'OY': 'Oye', 'OZ': 'Ozo',
    // P
    'PA': 'Pala', 'PB': 'Pibe', 'PC': 'Pica', 'PD': 'Poda', 'PE': 'Pesa', 'PF': 'Pifa', 'PG': 'Pago', 'PH': 'Ph', 'PI': 'Piña', 'PJ': 'Pijama', 'PK': 'Poka', 'PL': 'Polo', 'PM': 'Pomo', 'PN': 'Pena', 'PO': 'Pozo', 'PQ': 'Paque', 'PR': 'Pro', 'PS': 'Piso', 'PT': 'Pato', 'PU': 'Puma', 'PV': 'Pavo', 'PY': 'Pyra', 'PZ': 'Paz',
    // Q
    'QA': 'Que', 'QB': 'Qabo', 'QC': 'Qoco', 'QD': 'Qedo', 'QE': 'Que', 'QF': 'Qafe', 'QG': 'Qago', 'QH': 'Qher', 'QI': 'Qui', 'QJ': 'Qojo', 'QK': 'Qiko', 'QL': 'Qolo', 'QM': 'Quma', 'QN': 'Quna', 'QO': 'Qoro', 'QP': 'Qapa', 'QR': 'Qaro', 'QS': 'Queso', 'QT': 'Quito', 'QU': 'Quino', 'QV': 'Qeva', 'QY': 'Qya', 'QZ': 'Qaza',
    // R
    'RA': 'Rata', 'RB': 'Robo', 'RC': 'Roca', 'RD': 'Roda', 'RE': 'Remo', 'RF': 'Rufo', 'RG': 'Rago', 'RH': 'Rho', 'RI': 'Rico', 'RJ': 'Roja', 'RK': 'Rock', 'RL': 'Rulo', 'RM': 'Rama', 'RN': 'Reno', 'RO': 'Rosa', 'RP': 'Ropa', 'RQ': 'Roque', 'RS': 'Risa', 'RT': 'Roto', 'RU': 'Rueda', 'RV': 'Riva', 'RY': 'Raya', 'RZ': 'Raza',
    // S
    'SA': 'Sapo', 'SB': 'Sub', 'SC': 'Saco', 'SD': 'Soda', 'SE': 'Seta', 'SF': 'Safo', 'SG': 'Soga', 'SH': 'Show', 'SI': 'Silla', 'SJ': 'Soja', 'SK': 'Skate', 'SL': 'Sala', 'SM': 'Sumo', 'SN': 'Seno', 'SO': 'Sofa', 'SP': 'Sopa', 'SQ': 'Saque', 'SR': 'Sara', 'ST': 'Soto', 'SU': 'Suyo', 'SV': 'Savia', 'SY': 'Sya', 'SZ': 'Saza',
    // T
    'TA': 'Tapa', 'TB': 'Tubo', 'TC': 'Taco', 'TD': 'Todo', 'TE': 'Tela', 'TF': 'Tufo', 'TG': 'Togo', 'TH': 'Thai', 'TI': 'Tiza', 'TJ': 'Teja', 'TK': 'Tika', 'TL': 'Tilo', 'TM': 'Timo', 'TN': 'Tuna', 'TO': 'Toro', 'TP': 'Topo', 'TQ': 'Taque', 'TR': 'Tren', 'TS': 'Tasa', 'TU': 'Tuya', 'TV': 'TV', 'TY': 'Tya', 'TZ': 'Taza',
    // U
    'UA': 'Uara', 'UB': 'Ube', 'UC': 'UCI', 'UD': 'Ud.', 'UE': 'Ue', 'UF': 'Ufo', 'UG': 'Ugar', 'UH': 'Uh', 'UI': 'Ui', 'UJ': 'Ujo', 'UK': 'Uk', 'UL': 'Ullo', 'UM': 'Umo', 'UN': 'Uno', 'UO': 'Uo', 'UP': 'Up', 'UQ': 'Uque', 'UR': 'Urna', 'US': 'Usa', 'UT': 'Uti', 'UV': 'Uva', 'UY': 'Uy', 'UZ': 'Uz',
    // V
    'VA': 'Vaca', 'VB': 'Vabo', 'VC': 'Vice', 'VD': 'Vida', 'VE': 'Vela', 'VF': 'Vafo', 'VG': 'Vago', 'VH': 'Vher', 'VI': 'Vino', 'VJ': 'Viaje', 'VK': 'Viking', 'VL': 'Vilo', 'VM': 'Vimo', 'VN': 'Vena', 'VO': 'Voto', 'VP': 'Vapa', 'VQ': 'Vaque', 'VR': 'Vara', 'VS': 'Vaso', 'VT': 'Veta', 'VU': 'Vuelo', 'VY': 'Vya', 'VZ': 'Vaza',
    // Y
    'YA': 'Yate', 'YB': 'Yba', 'YC': 'Yuca', 'YD': 'Yoda', 'YE': 'Yema', 'YF': 'Yfo', 'YG': 'Yugo', 'YH': 'Yh', 'YI': 'Yi', 'YJ': 'Yijo', 'YK': 'Yak', 'YL': 'Yolo', 'YM': 'Yumo', 'YN': 'Yana', 'YO': 'Yo-yo', 'YP': 'Yapa', 'YQ': 'Yaque', 'YR': 'Yara', 'YS': 'Yeso', 'YT': 'Yuto', 'YU': 'Yuri', 'YV': 'Yva', 'YZ': 'Yaza',
    // Z
    'ZA': 'Zapato', 'ZB': 'Zebu', 'ZC': 'Zaca', 'ZD': 'Zed', 'ZE': 'Zebra', 'ZF': 'Zafo', 'ZG': 'Zaga', 'ZH': 'Zher', 'ZI': 'Zinc', 'ZJ': 'Zojo', 'ZK': 'Zak', 'ZL': 'Zulo', 'ZM': 'Zumo', 'ZN': 'Zona', 'ZO': 'Zorro', 'ZP': 'Zapa', 'ZQ': 'Zaque', 'ZR': 'Zar', 'ZS': 'Zasa', 'ZT': 'Zeta', 'ZU': 'Zurdo', 'ZV': 'Zeva', 'ZY': 'Zya'
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
