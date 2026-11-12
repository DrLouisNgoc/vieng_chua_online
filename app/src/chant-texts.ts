// Chants for the "Tu tập" panel (owner decision F2). Each line is split
// into syllables; the session advances one syllable per moktak beat.
//
// Owner, 2026-11-12: "bỏ phần adida, quan thế âm, và bát nhã tâm kinh đi" —
// keeps only the Shakyamuni chant, matching Theravada/Nguyên Thủy practice
// (no Pure Land Amitabha recitation, no Avalokitesvara veneration, no
// Mahayana sutra).

export type ChantId = "thichca";

export interface ChantText {
  id: ChantId;
  title: string;
  // What one completed pass is called in the count ("câu", "biến").
  unit: string;
  bpm: number;
  lines: string[][];
}

function syllables(...lines: string[]): string[][] {
  return lines.map((line) => line.trim().split(/\s+/));
}

export const CHANTS: readonly ChantText[] = [
  {
    id: "thichca",
    title: "Niệm Bổn Sư Thích Ca",
    unit: "câu",
    bpm: 100,
    // Owner, 2026-11-12: "thay câu đó bằng câu 'thấy, thấy, thấy, thấy'".
    lines: syllables("thấy, thấy, thấy, thấy"),
  },
];

export function chantById(id: string): ChantText {
  const chant = CHANTS.find((candidate) => candidate.id === id);
  if (!chant) throw new Error(`unknown chant ${id}`);
  return chant;
}
