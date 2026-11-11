// 설문 문항과 선택지. 문구를 바꾸려면 이 파일만 고치면 됩니다.
export const Q1_TITLE =
  "올해 선생님(또는 학교)이 운영한 학교자율시간은 어느 교과군에 편성되었나요?";
export const Q1_OPTIONS = [
  "국어", "수학", "사회", "도덕", "과학", "실과", "체육", "음악", "미술", "영어",
];

export const Q2_TITLE = "어떤 분야의 주제인가요?";
export const OTHER = "기타(직접 입력)";
export const Q2_OPTIONS = [
  "환경·생태", "디지털·AI", "국어·독서", "사회·시민(민주시민)", "체육·도전",
  "예술·음악", "학술제·프로젝트", "경제·금융", "역사·문화", "스피치·토론",
  "마을·지역연계", "진로·직업", "안전·건강", "인성·관계", "놀이",
  "세계시민·다문화", "독도·통일", OTHER,
];

export const OTHER_MAX = 40;

// 항목별 색(색상환 각도). 휴대폰 선택 버튼과 결과 막대가 같은 색을 씁니다.
function hues(list, start) {
  const out = {};
  list.forEach((o, i) => { out[o] = Math.round((start + (i * 360) / list.length) % 360); });
  return out;
}
export const Q1_HUES = hues(Q1_OPTIONS, 0);
export const Q2_HUES = hues(Q2_OPTIONS.filter((o) => o !== OTHER), 10);
Q2_HUES[OTHER] = 220; // 기타는 차분한 회청색 계열

// 색 만들기: chip(연한 배경), chipOn(선택된 진한 색), bar(결과 막대, 연하게)
export const tone = {
  chip: (h) => `hsl(${h} 80% 95%)`,
  chipLine: (h) => `hsl(${h} 55% 78%)`,
  chipText: (h) => `hsl(${h} 60% 30%)`,
  // 노랑·초록 계열은 밝아서 흰 글씨가 안 보이므로 더 어둡게
  chipOn: (h) => `hsl(${h} 62% ${h >= 35 && h <= 200 ? 32 : 45}%)`,
  bar: (h) => `hsl(${h} 70% 72%)`,
};
