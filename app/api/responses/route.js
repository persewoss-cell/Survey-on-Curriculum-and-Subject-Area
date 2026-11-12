import { NextResponse } from "next/server";
import {
  OP_OPTIONS, OP_YES, TYPE_OPTIONS, SUBJECT_OPTIONS, FIELD_OPTIONS, OTHER, OTHER_MAX,
} from "@/lib/options";
import { addResponse } from "@/lib/store";

const bad = (msg) => NextResponse.json({ error: msg }, { status: 400 });

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return bad("잘못된 요청입니다.");
  }
  const { op, type, subject, field } = body || {};
  if (!OP_OPTIONS.includes(op)) return bad("Q1을 선택해 주세요.");

  // 미운영이면 나머지 문항 없이 저장합니다.
  if (op !== OP_YES) {
    await addResponse({ op });
    return NextResponse.json({ ok: true });
  }

  if (!TYPE_OPTIONS.includes(type)) return bad("Q2를 선택해 주세요.");
  if (!SUBJECT_OPTIONS.includes(subject)) return bad("Q3을 선택해 주세요.");
  if (!FIELD_OPTIONS.includes(field)) return bad("Q4를 선택해 주세요.");

  let other = null;
  if (field === OTHER) {
    if (typeof body.other !== "string") return bad("기타 내용을 입력해 주세요.");
    // 제어문자와 겹친 공백을 정리합니다. 화면에 표시할 때는 React가 HTML을 이스케이프합니다.
    other = body.other.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
    if (!other) return bad("기타 내용을 입력해 주세요.");
    if ([...other].length > OTHER_MAX) return bad(`기타 내용은 ${OTHER_MAX}자 이내로 입력해 주세요.`);
  }

  await addResponse({ op, type, subject, field, other });
  return NextResponse.json({ ok: true });
}
