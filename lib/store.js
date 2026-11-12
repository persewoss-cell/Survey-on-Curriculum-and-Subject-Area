import { Redis } from "@upstash/redis";

// Vercel의 Upstash Redis 연동은 KV_REST_API_* 또는 UPSTASH_REDIS_REST_* 이름으로 환경변수를 넣어 줍니다.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const FIELDS = ["op", "type", "subject", "field"];
const K = {
  total: "survey2:total",
  others: "survey2:others",
  ...Object.fromEntries(FIELDS.map((f) => [f, `survey2:${f}`])),
};
const OLD_KEYS = ["survey:total", "survey:q1", "survey:q2", "survey:others"]; // 이전 버전 데이터
const OTHERS_KEEP = 300;

// Redis가 연결되지 않은 경우(내 컴퓨터에서 미리보기)에는 메모리에 저장합니다.
const mem = globalThis.__surveyMem2 || (globalThis.__surveyMem2 = fresh());
function fresh() {
  return { total: 0, op: {}, type: {}, subject: {}, field: {}, others: [] };
}

export const usingRedis = Boolean(redis);

// answer: { op, type?, subject?, field?, other? }
export async function addResponse(answer) {
  const entry = answer.other ? JSON.stringify({ text: answer.other, at: Date.now() }) : null;
  if (redis) {
    const p = redis.multi();
    p.incr(K.total);
    for (const f of FIELDS) if (answer[f]) p.hincrby(K[f], answer[f], 1);
    if (entry) {
      p.lpush(K.others, entry);
      p.ltrim(K.others, 0, OTHERS_KEEP - 1);
    }
    await p.exec();
    return;
  }
  mem.total += 1;
  for (const f of FIELDS) if (answer[f]) mem[f][answer[f]] = (mem[f][answer[f]] || 0) + 1;
  if (entry) mem.others = [JSON.parse(entry), ...mem.others].slice(0, OTHERS_KEEP);
}

export async function getResults() {
  if (redis) {
    const p = redis.pipeline();
    p.get(K.total);
    for (const f of FIELDS) p.hgetall(K[f]);
    p.lrange(K.others, 0, OTHERS_KEEP - 1);
    const [total, op, type, subject, field, others] = await p.exec();
    return {
      total: Number(total) || 0,
      op: toNumbers(op),
      type: toNumbers(type),
      subject: toNumbers(subject),
      field: toNumbers(field),
      // @upstash/redis는 JSON 문자열을 자동으로 객체로 바꿔 줍니다.
      others: (others || []).map((o) => (typeof o === "string" ? JSON.parse(o) : o)),
    };
  }
  return structuredClone(mem);
}

export async function resetAll() {
  if (redis) {
    await redis.del(...Object.values(K), ...OLD_KEYS);
    return;
  }
  Object.assign(mem, fresh());
}

function toNumbers(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) out[k] = Number(v) || 0;
  return out;
}
