"use client";

import { useState } from "react";
import {
  REGIONS, SCHOOL_SUFFIX, SCHOOL_MAX, cleanSchool,
  OP_TITLE, OP_OPTIONS, OP_YES, OP_HUES,
  TYPE_TITLE, TYPE_OPTIONS, TYPE_HUES,
  SUBJECT_TITLE, SUBJECT_OPTIONS, SUBJECT_HUES,
  FIELD_TITLE, FIELD_OPTIONS, FIELD_HUES, OTHER, OTHER_MAX, tone,
} from "@/lib/options";

const FIELD_CHOICES = FIELD_OPTIONS.filter((o) => o !== OTHER);

function Chips({ name, options, hues, value, onPick, wide }) {
  return (
    <div className={`chips${wide ? " wide" : ""}`} role="radiogroup" aria-label={name}>
      {options.map((o) => {
        const h = hues[o];
        const on = value === o;
        return (
          <button
            type="button"
            key={o}
            role="radio"
            aria-checked={on}
            className={`chip${on ? " on" : ""}`}
            style={{
              "--c-bg": tone.chip(h), "--c-line": tone.chipLine(h),
              "--c-text": tone.chipText(h), "--c-on": tone.chipOn(h),
            }}
            onClick={() => onPick(o)}
          >
            {on && <span className="tick" aria-hidden>✓</span>}
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Question({ num, title, children }) {
  return (
    <section className="q">
      <p className="title"><span className="num">Q{num}</span>{title}</p>
      {children}
    </section>
  );
}

const EMPTY = { region: "", school: "", op: "", type: "", subject: "", field: "", other: "" };

export default function SurveyPage() {
  const [a, setA] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const set = (patch) => setA((prev) => ({ ...prev, ...patch }));

  const running = a.op === OP_YES;
  const isOther = a.field === OTHER;
  const schoolName = cleanSchool(a.school);
  const missing =
    !a.region ? "지역을 선택해 주세요"
    : !schoolName ? "학교명을 입력해 주세요"
    : !a.op ? "Q1을 선택해 주세요"
    : !running ? ""
    : !a.type ? "Q2를 선택해 주세요"
    : !a.subject ? "Q3을 선택해 주세요"
    : !a.field ? "Q4를 선택해 주세요"
    : isOther && !a.other.trim() ? "기타 내용을 입력해 주세요"
    : "";
  const canSubmit = !missing && !sending;

  function typeOther(v) {
    const text = [...v].slice(0, OTHER_MAX).join("");
    if (text.trim()) set({ other: text, field: OTHER });
    else set({ other: text, field: a.field === OTHER ? "" : a.field });
  }

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    setError("");
    try {
      const base = { region: a.region, school: schoolName, op: a.op };
      const body = running
        ? { ...base, type: a.type, subject: a.subject, field: a.field, other: isOther ? a.other : "" }
        : base;
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "제출하지 못했습니다. 잠시 후 다시 눌러 주세요.");
        return;
      }
      setDone(true);
      window.scrollTo(0, 0);
    } catch {
      setError("인터넷 연결을 확인한 뒤 다시 제출해 주세요.");
    } finally {
      setSending(false);
    }
  }

  function again() {
    // 같은 분이 이어서 응답하는 경우가 많아 지역·학교명은 그대로 둡니다.
    setA((prev) => ({ ...EMPTY, region: prev.region, school: prev.school }));
    setError(""); setDone(false);
    window.scrollTo(0, 0);
  }

  if (done) {
    return (
      <main className="survey thanks">
        <div className="check">✓</div>
        <h2>응답해 주셔서 감사합니다</h2>
        <p className="lead">운영한 사례가 더 있다면 한 번 더 응답해 주세요.</p>
        <button className="primary" onClick={again}>한 번 더 응답하기</button>
      </main>
    );
  }

  const otherHue = FIELD_HUES[OTHER];

  return (
    <main className="survey">
      <h1>학교자율시간 설문</h1>
      <p className="lead">이름 등 개인 정보는 받지 않습니다. 운영한 사례가 여러 개라면 여러 번 응답해 주세요.</p>
      <form onSubmit={submit}>
        <section className="q basic">
          <p className="title"><span className="num req">필수</span>학교 정보</p>
          <label className="field-label" htmlFor="region">지역 (시·군·구)</label>
          <select
            id="region"
            className={`select${a.region ? "" : " placeholder"}`}
            value={a.region}
            onChange={(e) => set({ region: e.target.value })}
          >
            <option value="" disabled>지역을 고르세요</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <label className="field-label" htmlFor="school">학교명 (정식 명칭)</label>
          <div className="school-input">
            <input
              id="school"
              type="text"
              value={a.school}
              placeholder="예: 광양중동"
              autoComplete="off"
              onChange={(e) => set({ school: [...e.target.value].slice(0, SCHOOL_MAX + SCHOOL_SUFFIX.length).join("") })}
            />
            <span className="suffix">{SCHOOL_SUFFIX}</span>
          </div>
        </section>

        <Question num={1} title={OP_TITLE}>
          <Chips name="Q1" options={OP_OPTIONS} hues={OP_HUES} value={a.op} onPick={(op) => set({ op })} wide />
        </Question>

        {running && (
          <div className="reveal">
            <Question num={2} title={TYPE_TITLE}>
              <Chips name="Q2" options={TYPE_OPTIONS} hues={TYPE_HUES} value={a.type} onPick={(type) => set({ type })} wide />
            </Question>

            <Question num={3} title={SUBJECT_TITLE}>
              <Chips name="Q3" options={SUBJECT_OPTIONS} hues={SUBJECT_HUES} value={a.subject} onPick={(subject) => set({ subject })} />
            </Question>

            <Question num={4} title={FIELD_TITLE}>
              <Chips name="Q4" options={FIELD_CHOICES} hues={FIELD_HUES} value={a.field} onPick={(field) => set({ field, other: "" })} />
              <label
                className={`other-box${isOther ? " on" : ""}`}
                style={{ "--c-on": tone.chipOn(otherHue), "--c-bg": tone.chip(otherHue) }}
              >
                <span className="other-label">기타</span>
                <input
                  type="text"
                  value={a.other}
                  placeholder="목록에 없으면 직접 입력"
                  onChange={(e) => typeOther(e.target.value)}
                  enterKeyHint="done"
                />
                <span className="counter">{[...a.other].length}/{OTHER_MAX}</span>
              </label>
            </Question>
          </div>
        )}

        {a.op && !running && <p className="note-soft">미운영을 선택하셨어요. 아래 제출 버튼을 눌러 주세요.</p>}

        {error && <p className="error" role="alert">{error}</p>}
        <div className="submit-bar">
          <button className="primary" type="submit" disabled={!canSubmit}>
            {sending ? "제출 중…" : missing || "제출하기"}
          </button>
        </div>
      </form>
    </main>
  );
}
