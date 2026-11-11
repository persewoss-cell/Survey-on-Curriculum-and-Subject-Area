"use client";

import { useEffect, useRef, useState } from "react";
import { Q1_TITLE, Q1_OPTIONS, Q2_TITLE, Q2_OPTIONS, Q1_HUES, Q2_HUES, tone } from "@/lib/options";

const POLL_MS = 2000;
const EMPTY = { total: 0, q1: {}, q2: {}, others: [] };

export default function ResultsPage() {
  const [data, setData] = useState(EMPTY);
  const [offline, setOffline] = useState(false);
  const timer = useRef(null);

  async function load() {
    try {
      const res = await fetch("/api/results", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      await load();
      if (!stop) timer.current = setTimeout(tick, POLL_MS);
    };
    tick();
    return () => { stop = true; clearTimeout(timer.current); };
  }, []);

  async function reset() {
    if (!window.confirm("모든 응답을 삭제할까요? 되돌릴 수 없습니다.")) return;
    await fetch("/api/reset", { method: "POST" });
    load();
  }

  return (
    <main className="board">
      <header>
        <h1>학교자율시간 실시간 설문 결과</h1>
        <div className="head-right">
          {offline && <span className="status bad">연결 끊김 · 다시 시도 중</span>}
          <div className="total">총 응답 <b>{data.total}</b>건</div>
          <button className="reset" onClick={reset}>전체 초기화</button>
        </div>
      </header>

      <Chart title={`Q1. ${Q1_TITLE}`} options={Q1_OPTIONS} hues={Q1_HUES} counts={data.q1} nameW="3em" />
      <Chart
        title={`Q2. ${Q2_TITLE}`}
        options={Q2_OPTIONS}
        hues={Q2_HUES}
        counts={data.q2}
        nameW="22vh"
        highlightTop={3}
        label={(o) => (o.startsWith("기타") ? "기타" : o)}
      />

      <section className="panel others-panel">
        <h2>기타 의견 <span className="status">({data.others.length})</span></h2>
        <div className="others">
          {data.others.length === 0 && <p className="empty">아직 없습니다.</p>}
          {data.others.map((o) => (
            <div className="note" key={`${o.at}-${o.text}`}>{o.text}</div>
          ))}
        </div>
      </section>
    </main>
  );
}

// 응답 수 내림차순(같으면 원래 순서). 상위 highlightTop개는 줄을 크게 표시합니다.
function Chart({ title, options, hues, counts, nameW, highlightTop = 0, label = (o) => o }) {
  const sorted = options
    .map((o, i) => ({ o, i, n: counts[o] || 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i);
  const max = sorted[0]?.n || 0;
  const BIG = 1.9;
  const weights = sorted.map((r, rank) => (rank < highlightTop && r.n > 0 ? BIG : 1));
  const W = weights.reduce((a, b) => a + b, 0);

  let acc = 0;
  const pos = {};
  sorted.forEach((r, rank) => {
    pos[r.o] = { top: (acc / W) * 100, height: (weights[rank] / W) * 100, rank, big: weights[rank] > 1 };
    acc += weights[rank];
  });

  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className={`bars${highlightTop ? " ranked" : ""}`} style={{ "--name": nameW }}>
        {/* 원래 순서로 그려야 DOM 요소가 유지되어 위치 이동이 애니메이션됩니다 */}
        {options.map((o) => {
          const n = counts[o] || 0;
          const p = pos[o];
          return (
            <div
              key={o}
              className={`bar-row${p.big ? " big" : ""}`}
              style={{ top: `${p.top}%`, height: `${p.height}%`, "--bar": tone.bar(hues[o]), "--bar-strong": tone.chipOn(hues[o]) }}
            >
              <span className="name" title={o}>
                {p.big && <span className="rank">{p.rank + 1}</span>}
                {label(o)}
              </span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${max ? (n / max) * 100 : 0}%` }} /></div>
              <span className="count">{n}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
