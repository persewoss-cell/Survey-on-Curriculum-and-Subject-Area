"use client";

import { useEffect, useRef, useState } from "react";
import { Q1_TITLE, Q1_OPTIONS, Q2_TITLE, Q2_OPTIONS } from "@/lib/options";

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

      <Chart title={`Q1. ${Q1_TITLE}`} options={Q1_OPTIONS} counts={data.q1} fs="2.6vh" nameW="3em" />
      <Chart title={`Q2. ${Q2_TITLE}`} options={Q2_OPTIONS} counts={data.q2} fs="2vh" nameW="9.8em" label={(o) => (o.startsWith("기타") ? "기타" : o)} />

      <section className="panel">
        <h2>기타 의견 <span className="status">({data.others.length})</span></h2>
        <div className="others">
          {data.others.length === 0 && <p className="empty">아직 기타 의견이 없습니다.</p>}
          {data.others.map((o) => (
            <div className="note" key={`${o.at}-${o.text}`}>{o.text}</div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Chart({ title, options, counts, fs, nameW, label = (o) => o }) {
  const max = Math.max(0, ...options.map((o) => counts[o] || 0));
  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="bars">
        {options.map((o) => {
          const n = counts[o] || 0;
          const pct = max ? (n / max) * 100 : 0;
          return (
            <div key={o} className={`bar-row${n > 0 && n === max ? " top" : ""}`} style={{ "--fs": fs, "--name": nameW }}>
              <span className="name" title={o}>{label(o)}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
              <span className="count">{n}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
