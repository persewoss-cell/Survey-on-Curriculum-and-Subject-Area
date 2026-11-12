// 설문 문항과 선택지. 문구를 바꾸려면 이 파일만 고치면 됩니다.
// 내부 이름: op(운영 여부) · type(편성 형태) · subject(교과) · field(분야)

// 기본 정보(필수, 결과 화면에는 표시하지 않음 · 학교 일괄 등록 엑셀로만 내려받음)
// 지역 목록은 일괄 등록 양식의 '지역' 시트와 같아야 합니다(광주 5개 구 + 전남 22개 시·군, 가나다순).
export const REGIONS = [
  "강진군", "고흥군", "곡성군", "광산구", "광양시", "구례군", "나주시", "남구", "담양군",
  "동구", "목포시", "무안군", "보성군", "북구", "서구", "순천시", "신안군", "여수시",
  "영광군", "영암군", "완도군", "장성군", "장흥군", "진도군", "함평군", "해남군", "화순군",
];
export const SCHOOL_SUFFIX = "초등학교";
export const SCHOOL_MAX = 20; // '초등학교' 앞부분 글자 수
export const BULK_PASSWORD = "gkrwktl1@"; // 일괄 등록 엑셀에 모든 학교 공통으로 넣는 비밀번호

// 학교명 앞부분 정리: 공백 제거, 실수로 붙인 '초등학교' 제거. 한글·영문·숫자만 허용.
export function cleanSchool(raw) {
  let s = String(raw ?? "").replace(/\s+/g, "");
  if (s.endsWith(SCHOOL_SUFFIX)) s = s.slice(0, -SCHOOL_SUFFIX.length);
  return s;
}
export const SCHOOL_PATTERN = /^[가-힣A-Za-z0-9]+$/;

export const OP_TITLE = "올해 선생님이 계신 학교에서는 학교자율시간을 운영하셨나요?";
export const OP_YES = "운영";
export const OP_NO = "미운영";
export const OP_OPTIONS = [OP_YES, OP_NO];

export const TYPE_TITLE = "올해 선생님(또는 학교)이 운영한 학교자율시간은 무엇으로 편성했나요?";
export const TYPE_OPTIONS = ["활동", "과목"];

export const SUBJECT_TITLE =
  "올해 선생님(또는 학교)이 운영한 학교자율시간은 어느 교과에 편성되었나요?";
export const SUBJECT_OPTIONS = [
  "국어", "수학", "사회", "도덕", "과학", "실과", "체육", "음악", "미술", "영어",
];

export const FIELD_TITLE = "어떤 분야의 주제인가요?";
export const OTHER = "기타(직접 입력)";
// 가나다순, 기타는 맨 끝
export const FIELD_OPTIONS = [
  "경제·금융", "놀이", "다문화", "독서·문해력", "디지털·AI", "미술", "민주·세계시민",
  "발명·탐구", "보건", "안전", "역사", "운동", "음악", "인성·정서", "진로·직업",
  "토론·스피치", "통일", "학술제", "환경·생태", OTHER,
];

export const OTHER_MAX = 40;

// 항목별 색(색상환 각도). 휴대폰 선택 버튼과 결과 막대가 같은 색을 씁니다.
function hues(list, start) {
  const out = {};
  list.forEach((o, i) => { out[o] = Math.round((start + (i * 360) / list.length) % 360); });
  return out;
}
export const OP_HUES = { [OP_YES]: 165, [OP_NO]: 15 };
export const TYPE_HUES = { 활동: 215, 과목: 35 };
export const SUBJECT_HUES = hues(SUBJECT_OPTIONS, 0);
export const FIELD_HUES = hues(FIELD_OPTIONS.filter((o) => o !== OTHER), 10);
FIELD_HUES[OTHER] = 220; // 기타는 차분한 회청색 계열

// 색 만들기: chip(연한 배경), chipOn(선택된 진한 색), bar(결과 막대, 연하게)
export const tone = {
  chip: (h) => `hsl(${h} 80% 95%)`,
  chipLine: (h) => `hsl(${h} 55% 80%)`,
  chipText: (h) => `hsl(${h} 55% 30%)`,
  // 노랑·초록 계열은 밝아서 흰 글씨가 안 보이므로 더 어둡게
  chipOn: (h) => `hsl(${h} 58% ${h >= 35 && h <= 200 ? 34 : 47}%)`,
  bar: (h) => `hsl(${h} 70% 74%)`,
};
