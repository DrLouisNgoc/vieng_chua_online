// Chants for the "Tu tập" panel (owner decision F2). Each line is split
// into syllables; the session advances one syllable per moktak beat.
//
// The Heart Sutra is the traditional Hán-Việt phiên âm (public domain),
// typed from the standard liturgy, NOT checked against a printed source:
// the owner should proofread it (docs/specs/milestone-7-atmosphere-practice).
// Modern Vietnamese translations are copyrighted and deliberately not used.

export type ChantId = "thichca" | "adida" | "quanam" | "tamkinh";

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
  {
    id: "adida",
    title: "Niệm A Di Đà Phật",
    unit: "câu",
    bpm: 96,
    lines: syllables("Nam Mô A Di Đà Phật"),
  },
  {
    id: "quanam",
    title: "Niệm Quán Thế Âm",
    unit: "câu",
    bpm: 108,
    lines: syllables("Nam Mô Đại Từ Đại Bi Tầm Thanh Cứu Khổ Cứu Nạn Quán Thế Âm Bồ Tát"),
  },
  {
    id: "tamkinh",
    title: "Bát Nhã Tâm Kinh",
    unit: "biến",
    bpm: 120,
    lines: syllables(
      "Quán Tự Tại Bồ Tát hành thâm Bát Nhã Ba La Mật Đa thời,",
      "chiếu kiến ngũ uẩn giai không, độ nhất thiết khổ ách.",
      "Xá Lợi Tử, sắc bất dị không, không bất dị sắc,",
      "sắc tức thị không, không tức thị sắc,",
      "thọ tưởng hành thức diệc phục như thị.",
      "Xá Lợi Tử, thị chư pháp không tướng,",
      "bất sinh bất diệt, bất cấu bất tịnh, bất tăng bất giảm.",
      "Thị cố không trung vô sắc, vô thọ tưởng hành thức,",
      "vô nhãn nhĩ tỷ thiệt thân ý, vô sắc thanh hương vị xúc pháp,",
      "vô nhãn giới nãi chí vô ý thức giới,",
      "vô vô minh diệc vô vô minh tận,",
      "nãi chí vô lão tử diệc vô lão tử tận.",
      "Vô khổ tập diệt đạo, vô trí diệc vô đắc.",
      "Dĩ vô sở đắc cố, Bồ Đề Tát Đỏa y Bát Nhã Ba La Mật Đa cố,",
      "tâm vô quái ngại, vô quái ngại cố, vô hữu khủng bố,",
      "viễn ly điên đảo mộng tưởng, cứu cánh Niết Bàn.",
      "Tam thế chư Phật y Bát Nhã Ba La Mật Đa cố,",
      "đắc A Nậu Đa La Tam Miệu Tam Bồ Đề.",
      "Cố tri Bát Nhã Ba La Mật Đa thị đại thần chú, thị đại minh chú,",
      "thị vô thượng chú, thị vô đẳng đẳng chú,",
      "năng trừ nhất thiết khổ, chân thật bất hư.",
      "Cố thuyết Bát Nhã Ba La Mật Đa chú, tức thuyết chú viết:",
      "Yết đế yết đế, ba la yết đế, ba la tăng yết đế, Bồ đề tát bà ha.",
    ),
  },
];

export function chantById(id: ChantId): ChantText {
  const chant = CHANTS.find((candidate) => candidate.id === id);
  if (!chant) throw new Error(`unknown chant ${id}`);
  return chant;
}
