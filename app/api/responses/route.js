import { NextResponse } from "next/server";
import { Q1_OPTIONS, Q2_OPTIONS, OTHER, OTHER_MAX } from "@/lib/options";
import { addResponse } from "@/lib/store";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { q1, q2 } = body || {};
  if (!Q1_OPTIONS.includes(q1) || !Q2_OPTIONS.includes(q2)) {
    return NextResponse.json({ error: "선택지를 다시 골라 주세요." }, { status: 400 });
  }

  let other = null;
  if (q2 === OTHER) {
    // 제어문자와 앞뒤 공백을 제거합니다. 화면에 표시할 때는 React가 HTML을 이스케이프합니다.
    other = String(body.other ?? "")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!other) {
      return NextResponse.json({ error: "기타 내용을 입력해 주세요." }, { status: 400 });
    }
    if ([...other].length > OTHER_MAX) {
      return NextResponse.json({ error: `기타 내용은 ${OTHER_MAX}자 이내로 입력해 주세요.` }, { status: 400 });
    }
  }

  await addResponse({ q1, q2, other });
  return NextResponse.json({ ok: true });
}
