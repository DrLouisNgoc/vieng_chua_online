// Vietnamese string table. Keys are the original Korean UI strings found in
// sansatemple.com's client; see
// docs/specs/milestone-2-vietnamese-client/spec.md for the source table.
const STRINGS: Record<string, string> = {
  "산사 — 온라인 절": "Viếng Chùa Online",
  산사: "Sơn tự",
  목탁: "Mõ",
  "목탁 두드리기": "Gõ mõ",
  "목탁 열기": "Mở mõ",
  "목탁 닫기": "Đóng mõ",
  "목탁 조작": "Thao tác mõ",
  "상단 소리와 설정의 효과음을 켠 뒤 목탁을 두드려주세요.": "Hãy bật âm thanh ở trên rồi gõ mõ.",
  "목탁 소리를 준비하지 못했어요. 다시 눌러주세요.": "Chưa chuẩn bị được tiếng mõ. Hãy thử lại.",
  "소리 켜기": "Bật âm thanh",
  "소리 끄기": "Tắt âm thanh",
  "바닥 클릭 · 드래그로 둘러보기 · 휠로 확대/축소":
    "WASD để di chuyển · Shift để chạy · Kéo chuột để xoay camera · Lăn chuột để phóng to/thu nhỏ",
  "방문객 보기": "người đang viếng chùa",
};

export function t(key: string): string {
  return STRINGS[key] ?? key;
}
