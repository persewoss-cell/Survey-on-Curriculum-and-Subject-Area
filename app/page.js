"use client";

import { useState } from "react";
import { Q1_TITLE, Q1_OPTIONS, Q2_TITLE, Q2_OPTIONS, OTHER, OTHER_MAX } from "@/lib/options";

export default function SurveyPage() {
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [other, setOther] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const otherLen = [...other].length;
  const needOther = q2 === OTHER;
  const canSubmit = q1 && q2 && (!needOther || other.trim()) && !sending;

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q1, q2, other: needOther ? other : "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "제출하지 못했습니다.");
      setDone(true);
    } catch (err) {
      setError(err.message || "네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSending(false);
    }
  }

  function again() {
    setQ1("");
    setQ2("");
    setOther("");
    setError("");
    setDone(false);
    window.scrollTo(0, 0);
  }

  if (done) {
    return (
      <main className="survey thanks">
        <div className="check">✓</div>
        <h2>응답해 주셔서 감사합니다</h2>
        <button className="primary" onClick={again}>한 번 더 응답하기</button>
      </main>
    );
  }

  return (
    <main className="survey">
      <h1>학교자율시간 설문</h1>
      <p className="lead">익명으로 응답합니다. 운영한 사례가 여러 개라면 여러 번 응답해 주세요.</p>
      <form onSubmit={submit}>
        <div className="q">
          <label className="title" htmlFor="q1"><span className="num">Q1.</span>{Q1_TITLE}</label>
          <select id="q1" value={q1} onChange={(e) => setQ1(e.target.value)}>
            <option value="" disabled>교과군을 선택하세요</option>
            {Q1_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div className="q">
          <label className="title" htmlFor="q2"><span className="num">Q2.</span>{Q2_TITLE}</label>
          <select id="q2" value={q2} onChange={(e) => setQ2(e.target.value)}>
            <option value="" disabled>분야를 선택하세요</option>
            {Q2_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {needOther && (
            <div className="other-box">
              <input
                type="text"
                value={other}
                autoFocus
                placeholder="주제 분야를 직접 입력해 주세요"
                aria-label="기타 주제 분야"
                onChange={(e) => setOther([...e.target.value].slice(0, OTHER_MAX).join(""))}
              />
              <div className="counter">{otherLen} / {OTHER_MAX}자</div>
            </div>
          )}
        </div>

        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" type="submit" disabled={!canSubmit}>
          {sending ? "제출 중…" : "제출하기"}
        </button>
      </form>
    </main>
  );
}
