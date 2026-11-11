"use client";

import { useState } from "react";
import {
  Q1_TITLE, Q1_OPTIONS, Q2_TITLE, Q2_OPTIONS, OTHER, OTHER_MAX, Q1_HUES, Q2_HUES, tone,
} from "@/lib/options";

const Q2_CHOICES = Q2_OPTIONS.filter((o) => o !== OTHER);

function Chips({ name, options, hues, value, onPick }) {
  return (
    <div className="chips" role="radiogroup" aria-label={name}>
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

export default function SurveyPage() {
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [other, setOther] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const isOther = q2 === OTHER;
  const canSubmit = q1 && q2 && (!isOther || other.trim()) && !sending;

  function pickQ2(o) {
    setQ2(o);
    setOther("");
  }
  function typeOther(v) {
    const text = [...v].slice(0, OTHER_MAX).join("");
    setOther(text);
    if (text.trim()) setQ2(OTHER);
    else if (q2 === OTHER) setQ2("");
  }

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q1, q2, other: isOther ? other : "" }),
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
    setQ1(""); setQ2(""); setOther(""); setError(""); setDone(false);
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

  const otherHue = Q2_HUES[OTHER];

  return (
    <main className="survey">
      <h1>학교자율시간 설문</h1>
      <p className="lead">익명 설문입니다. 운영한 사례가 여러 개라면 여러 번 응답해 주세요.</p>
      <form onSubmit={submit}>
        <section className="q">
          <p className="title"><span className="num">Q1</span>{Q1_TITLE}</p>
          <Chips name="Q1" options={Q1_OPTIONS} hues={Q1_HUES} value={q1} onPick={setQ1} />
        </section>

        <section className="q">
          <p className="title"><span className="num">Q2</span>{Q2_TITLE}</p>
          <Chips name="Q2" options={Q2_CHOICES} hues={Q2_HUES} value={q2} onPick={pickQ2} />
          <label
            className={`other-box${isOther ? " on" : ""}`}
            style={{ "--c-on": tone.chipOn(otherHue), "--c-bg": tone.chip(otherHue) }}
          >
            <span className="other-label">기타</span>
            <input
              type="text"
              value={other}
              placeholder="목록에 없으면 직접 입력"
              onChange={(e) => typeOther(e.target.value)}
              enterKeyHint="done"
            />
            <span className="counter">{[...other].length}/{OTHER_MAX}</span>
          </label>
        </section>

        {error && <p className="error" role="alert">{error}</p>}
        <div className="submit-bar">
          <button className="primary" type="submit" disabled={!canSubmit}>
            {sending ? "제출 중…" : !q1 ? "Q1을 선택해 주세요" : !q2 ? "Q2를 선택해 주세요" : "제출하기"}
          </button>
        </div>
      </form>
    </main>
  );
}
