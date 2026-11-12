"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  OP_TITLE, OP_OPTIONS, OP_YES, OP_HUES,
  TYPE_TITLE, TYPE_OPTIONS, TYPE_HUES,
  SUBJECT_TITLE, SUBJECT_OPTIONS, SUBJECT_HUES,
  FIELD_TITLE, FIELD_OPTIONS, FIELD_HUES, tone,
} from "@/lib/options";

const POLL_MS = 2000;
const EMPTY = { total: 0, op: {}, type: {}, subject: {}, field: {}, others: [] };

export default function ResultsPage() {
  const [data, setData] = useState(EMPTY);
  const [offline, setOffline] = useState(false);
  const timer = useRef(null);

  async function load() {
    try {
      const res = await fetch("/api/results", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData({ ...EMPTY, ...(await res.json()) });
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

  // 학교 일괄 등록 엑셀: 서버가 정한 파일 이름(학교_일괄등록_날짜.xlsx)으로 저장합니다.
  async function downloadExcel(e) {
    e.preventDefault();
    try {
      const res = await fetch("/api/export", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename\*=UTF-8''([^;]+)/);
      const name = m ? decodeURIComponent(m[1]) : "학교_일괄등록.xlsx";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(await res.blob());
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch {
      window.location.href = "/api/export";
    }
  }

  // Q2~Q4는 '운영'이라고 답한 분만 응답하므로 비율의 기준도 운영 응답 수입니다.
  const running = data.op[OP_YES] || 0;
  const others = groupOthers(data.others);

  return (
    <main className="board">
      <header>
        <span className="head-side">
          {offline && <span className="status bad">연결 끊김 · 다시 시도 중</span>}
        </span>
        <h1>
          학교자율시간 실시간 설문 결과
          <span className="n">(N={data.total})</span>
        </h1>
        <span className="head-side right">
          <a className="icon-btn" href="/api/export" onClick={downloadExcel} title="학교 일괄 등록 엑셀 내려받기" aria-label="학교 일괄 등록 엑셀 내려받기">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v11" /><path d="M7 10l5 5 5-5" /><path d="M5 20h14" />
            </svg>
          </a>
          <button className="reset" onClick={reset}>전체 초기화</button>
        </span>
      </header>

      <div className="col-left">
        <Split num={1} title={OP_TITLE} options={OP_OPTIONS} hues={OP_HUES} counts={data.op} />
        <Split num={2} title={TYPE_TITLE} options={TYPE_OPTIONS} hues={TYPE_HUES} counts={data.type} />
        <Chart
          num={3}
          title={SUBJECT_TITLE}
          options={SUBJECT_OPTIONS}
          hues={SUBJECT_HUES}
          counts={data.subject}
          total={running}
          onlyVoted
          maxRows={7}
        />
      </div>
      <Chart
        num={4}
        title={FIELD_TITLE}
        options={FIELD_OPTIONS}
        hues={FIELD_HUES}
        counts={data.field}
        total={running}
        highlightTop={3}
        onlyVoted
        maxRows={16}
        label={(o) => (o.startsWith("기타") ? "기타" : o)}
      />

      <div className="col-right">
      <QrCard />
      <section className="panel others-panel">
        <h2>기타 의견 <span className="status">({data.others.length})</span></h2>
        <div className="others">
          {others.length === 0 && <p className="empty">아직 없습니다.</p>}
          {others.map((g) => (
            <div className="note" key={g.key}>
              {g.text}
              {g.n > 1 && <span className="times">×{g.n}</span>}
            </div>
          ))}
        </div>
      </section>
      </div>
    </main>
  );
}

// 설문 참여 QR: 이 결과 화면을 연 주소(도메인)를 그대로 써서 만듭니다.
function QrCard() {
  const [qr, setQr] = useState({ url: "", svg: "" });
  useEffect(() => {
    const url = `${window.location.origin}/`;
    QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#2b3044", light: "#ffffff" } })
      .then((svg) => setQr({ url, svg }))
      .catch(() => {});
  }, []);

  return (
    <section className="panel qr-panel">
      <h2>휴대폰으로 참여하기</h2>
      {/* qrcode 라이브러리가 만든 SVG(외부 입력 없음) */}
      <div className="qr" aria-label={`설문 주소 QR 코드: ${qr.url}`} dangerouslySetInnerHTML={{ __html: qr.svg }} />
    </section>
  );
}

// 두 개 중 하나를 고르는 문항: "운영 12 : 미운영 3" + 비율 막대
function Split({ num, title, options, hues, counts }) {
  const [a, b] = options;
  const na = counts[a] || 0, nb = counts[b] || 0, sum = na + nb;
  const pa = sum ? (na / sum) * 100 : 50;
  // 한쪽이 0건이면 막대에 그 칸이 없으므로 숫자 옆에 (0%)를 붙입니다. 응답이 생기면 %는 막대 안으로 옮겨갑니다.
  const zero = (n) => (sum > 0 && n === 0 ? <small className="zero">(0%)</small> : null);
  return (
    <section className="panel split">
      <h2><span className="qnum">Q{num}</span>{title}</h2>
      <div className="split-nums">
        <span style={{ color: tone.chipOn(hues[a]) }}>{a} <b>{na}</b>{zero(na)}</span>
        <span className="colon">:</span>
        <span style={{ color: tone.chipOn(hues[b]) }}>{b} <b>{nb}</b>{zero(nb)}</span>
      </div>
      <div className={`split-bar${sum ? "" : " empty"}`}>
        <div style={{ width: `${pa}%`, background: tone.bar(hues[a]) }}>{sum > 0 && na > 0 && <em>{fmtPct(na, sum)}</em>}</div>
        <div style={{ width: `${100 - pa}%`, background: tone.bar(hues[b]) }}>{sum > 0 && nb > 0 && <em>{fmtPct(nb, sum)}</em>}</div>
      </div>
    </section>
  );
}

// 같은 내용(띄어쓰기·대소문자 무시)은 하나로 묶고 횟수를 셉니다. 최근에 들어온 순서를 유지합니다.
function groupOthers(list) {
  const map = new Map();
  for (const o of list) {
    const key = String(o.text).replace(/\s+/g, "").toLowerCase();
    const g = map.get(key);
    if (g) g.n += 1;
    else map.set(key, { key, text: o.text, n: 1 });
  }
  return [...map.values()];
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
function Chart({ num, title, options, hues, counts, total, highlightTop = 0, onlyVoted = false, maxRows = 13, label = (o) => o }) {
  const boxRef = useRef(null);
  const size = useSize(boxRef);

  const rows = options
    .map((o, i) => ({ o, i, n: counts[o] || 0 }))
    .filter((r) => !onlyVoted || r.n > 0) // onlyVoted: 응답이 있는 항목만 표시
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
    group.forEach((r) => { r.big = ok; }); // 순위 배지도 크게 표시되는 줄에만
    if (ok) bigCount += group.length; else if (highlightTop) { rows.filter((r) => r.rank >= rank).forEach((r) => { r.big = false; }); break; }
  }
  const W = rows.reduce((a, r) => a + (r.big ? BIG : 1), 0);

  // 크기 계산 (px)
  const H = size?.h || 600, CW = size?.w || 600;
  // onlyVoted: 항목이 적으면 줄 높이를 제한해 위에서부터 쌓고, 많으면 최소 높이를 지키며 스크롤합니다.
  const unitH = onlyVoted ? Math.max(32, Math.min(H / maxRows, H / Math.max(W, 1))) : H / W;
  const anyBig = rows.some((r) => r.big);
  const badge = highlightTop ? 1.7 : 0; // 순위 배지 폭(em)
  const longest = Math.max(...options.map((o) => textW(label(o), 1, 800)));
  // 실제 렌더링(고정폭 숫자 등)과의 차이를 감안해 여유를 둡니다.
  if (rows.length === 0) {
    return (
      <section className={`panel chart q${num}`}>
        <h2><span className="qnum">Q{num}</span>{title}</h2>
        <div className="bars" ref={boxRef}><p className="empty">아직 응답이 없습니다.</p></div>
      </section>
    );
  }
  const countText = (r, fs) => (textW(String(r.n), fs, 800) + textW(`(${fmtPct(r.n, total)})`, fs * 0.72, 700)) * 1.08 + fs * 0.5;
  const GAP = 24;
  const MIN_FS = 11;
  let smallFs = Math.max(MIN_FS, Math.min(anyBig ? 19 : 26, unitH * 0.52));
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
    <section className={`panel chart q${num}`}>
      <h2><span className="qnum">Q{num}</span>{title}</h2>
      <div className={`bars${highlightTop ? " ranked" : ""}${onlyVoted ? " scroll" : ""}`} ref={boxRef}>
        {/* 원래 순서로 그려야 DOM 요소가 유지되어 위치 이동이 애니메이션됩니다 */}
        {options.map((o) => {
          const r = byKey[o];
          if (!r) return null;
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
                {highlightTop > 0 && (r.big ? <span className="rank">{r.rank}</span> : <span className="rank-gap" />)}
                {label(o)}
              </span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${max ? (r.n / max) * 100 : 0}%` }} /></div>
              <span className="count">{r.n}<small>({fmtPct(r.n, total)})</small></span>
            </div>
          );
        })}
        {onlyVoted && <div aria-hidden style={{ height: acc }} />}
      </div>
    </section>
  );
}
