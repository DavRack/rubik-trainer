import ollData from './oll.json';

export interface AlternativeAlg {
  alg: string;
  votes: number;
  etm: number | null;
  stm: number | null;
}

export interface OLLCase {
  id: number;
  name: string;
  subgroup: string;
  svg: string | null;
  setup: string;
  standard_alg: string;
  algs: AlternativeAlg[];
}

export const ollCases: OLLCase[] = ollData.map(c => ({
  ...c,
  id: parseInt(c.name.split(' ')[1])
}));
