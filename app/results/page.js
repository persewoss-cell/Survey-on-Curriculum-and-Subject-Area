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
    setData(EMPTY); // 캐시(최대 1초) 때문에 이전 값이 잠깐 보이지 않도록 바로 비웁니다.
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

      <Chart title={`Q1. ${Q1_TITLE}`} options={Q1_OPTIONS} hues={Q1_HUES} counts={data.q1} total={data.total} />
      <Chart
        title={`Q2. ${Q2_TITLE}`}
        options={Q2_OPTIONS}
        hues={Q2_HUES}
        counts={data.q2}
        total={data.total}
        highlightTop={3}
        label={(o) => (o.startsWith("기타") ? "기타" : o)}
      />

      <section className="panel others-panel">
        <h2>기타 의견 <span className="status">({data.others.length})</span></h2>
        <div className="others">
          {data.others.length === 0 && <p className="empty">아직 없습니다.</p>}
          {data.others.map((o, i) => (
            <div className="note" key={`${o.at}-${i}`}>{o.text}</div>
          ))}
        </div>
      </section>
    </main>
  );
}

// 글자 폭 측정(캔버스). 모든 줄이 같은 px 칸 너비를 쓰도록 하기 위함.
let ctx2d = null;
function textW(text, px, weight) {
  if (typeof document === "undefined") return text.length * px;
  ctx2d = ctx2d || document.createElement("canvas").getContext("2d");
  ctx2d.font = `${weight} ${px}px ${getComputedStyle(document.body).fontFamily}`;
  return ctx2d.measureText(text).width;
}

function useSize(ref) {
  const [size, setSize] = useState(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

const fmtPct = (n, total) => `${total ? ((n / total) * 100).toFixed(1) : "0.0"}%`;

// 응답 수 내림차순(같으면 원래 순서). 공동 순위: 더 많은 항목 수 + 1 (예: 1, 1, 3).
// highlightTop이면 3위 이내(응답 1건 이상)를 크게 표시합니다.
function Chart({ title, options, hues, counts, total, highlightTop = 0, label = (o) => o }) {
  const boxRef = useRef(null);
  const size = useSize(boxRef);

  const rows = options
    .map((o, i) => ({ o, i, n: counts[o] || 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i);
  rows.forEach((r) => { r.rank = 1 + rows.filter((x) => x.n > r.n).length; });
  const max = rows[0]?.n || 0;
  const BIG = 1.8;
  // 3위 이내를 크게 표시하되, 동률이 많아 MAX_BIG줄을 넘기는 순위부터는 강조하지 않습니다.
  const MAX_BIG = 5;
  let bigCount = 0;
  for (const rank of [...new Set(rows.map((r) => r.rank))]) {
    const group = rows.filter((r) => r.rank === rank);
    const ok = highlightTop > 0 && rank <= highlightTop && group[0].n > 0 && bigCount + group.length <= MAX_BIG;
    group.forEach((r) => { r.big = ok; r.badge = highlightTop > 0 && rank <= highlightTop && r.n > 0; });
    if (ok) bigCount += group.length; else if (highlightTop) { rows.filter((r) => r.rank >= rank).forEach((r) => { r.big = false; }); break; }
  }
  const W = rows.reduce((a, r) => a + (r.big ? BIG : 1), 0);

  // 크기 계산 (px)
  const H = size?.h || 600, CW = size?.w || 600;
  const unitH = H / W;
  const anyBig = rows.some((r) => r.big);
  const badge = highlightTop ? 1.7 : 0; // 순위 배지 폭(em)
  const longest = Math.max(...options.map((o) => textW(label(o), 1, 800)));
  // 실제 렌더링(고정폭 숫자 등)과의 차이를 감안해 여유를 둡니다.
  const countText = (r, fs) => (textW(String(r.n), fs, 800) + textW(`(${fmtPct(r.n, total)})`, fs * 0.72, 700)) * 1.08 + fs * 0.5;
  const GAP = 24;
  const MIN_FS = 11;
  let smallFs = Math.max(MIN_FS, Math.min(anyBig ? 19 : 28, unitH * 0.52));
  let bigFs = Math.min(30, unitH * BIG * 0.5);
  let nameW, countW;
  const layout = () => {
    // 가장 긴 항목이 (큰 글씨일 때도) 잘리지 않는 이름 칸
    nameW = (longest + badge) * (anyBig ? bigFs : smallFs) + 6;
    countW = Math.max(...rows.map((r) => countText(r, r.big ? bigFs : smallFs))) + 4;
  };
  layout();
  // 막대가 칸 너비의 40% 이상 남도록, 부족하면 글씨를 함께 줄입니다.
  const room = CW * 0.6 - GAP;
  if (nameW + countW > room) {
    const k = room / (nameW + countW);
    bigFs = Math.max(MIN_FS, bigFs * k); smallFs = Math.max(MIN_FS, smallFs * k);
    layout();
  }

  let acc = 0;
  for (const r of rows) {
    const h = (r.big ? BIG : 1) * unitH;
    r.top = acc; r.h = h; acc += h;
  }
  const byKey = Object.fromEntries(rows.map((r) => [r.o, r]));

  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className={`bars${highlightTop ? " ranked" : ""}`} ref={boxRef}>
        {/* 원래 순서로 그려야 DOM 요소가 유지되어 위치 이동이 애니메이션됩니다 */}
        {options.map((o) => {
          const r = byKey[o];
          const fs = r.big ? bigFs : smallFs;
          return (
            <div
              key={o}
              className={`bar-row${r.big ? " big" : ""}`}
              style={{
                top: r.top, height: r.h, fontSize: fs,
                gridTemplateColumns: `${nameW}px 1fr ${countW}px`,
                "--bar": tone.bar(hues[o]), "--bar-strong": tone.chipOn(hues[o]),
              }}
            >
              <span className="name" title={o}>
                {highlightTop > 0 && (r.badge ? <span className="rank">{r.rank}</span> : <span className="rank-gap" />)}
                {label(o)}
              </span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${max ? (r.n / max) * 100 : 0}%` }} /></div>
              <span className="count">{r.n}<small>({fmtPct(r.n, total)})</small></span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
