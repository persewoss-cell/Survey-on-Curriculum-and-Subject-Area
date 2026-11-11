import { Redis } from "@upstash/redis";

// Vercel의 Upstash Redis 연동은 KV_REST_API_* 또는 UPSTASH_REDIS_REST_* 이름으로 환경변수를 넣어 줍니다.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const K = {
  total: "survey:total",
  q1: "survey:q1",
  q2: "survey:q2",
  others: "survey:others",
};
const OTHERS_KEEP = 300;

// Redis가 연결되지 않은 경우(내 컴퓨터에서 미리보기)에는 메모리에 저장합니다.
const mem = globalThis.__surveyMem || (globalThis.__surveyMem = fresh());
function fresh() {
  return { total: 0, q1: {}, q2: {}, others: [] };
}

export const usingRedis = Boolean(redis);

export async function addResponse({ q1, q2, other }) {
  const entry = other ? JSON.stringify({ text: other, at: Date.now() }) : null;
  if (redis) {
    const p = redis.multi();
    p.incr(K.total);
    p.hincrby(K.q1, q1, 1);
    p.hincrby(K.q2, q2, 1);
    if (entry) {
      p.lpush(K.others, entry);
      p.ltrim(K.others, 0, OTHERS_KEEP - 1);
    }
    await p.exec();
    return;
  }
  mem.total += 1;
  mem.q1[q1] = (mem.q1[q1] || 0) + 1;
  mem.q2[q2] = (mem.q2[q2] || 0) + 1;
  if (entry) mem.others = [JSON.parse(entry), ...mem.others].slice(0, OTHERS_KEEP);
}

export async function getResults() {
  if (redis) {
    const p = redis.pipeline();
    p.get(K.total);
    p.hgetall(K.q1);
    p.hgetall(K.q2);
    p.lrange(K.others, 0, OTHERS_KEEP - 1);
    const [total, q1, q2, others] = await p.exec();
    return {
      total: Number(total) || 0,
      q1: toNumbers(q1),
      q2: toNumbers(q2),
      // @upstash/redis는 JSON 문자열을 자동으로 객체로 바꿔 줍니다.
      others: (others || []).map((o) => (typeof o === "string" ? JSON.parse(o) : o)),
    };
  }
  return structuredClone(mem);
}

export async function resetAll() {
  if (redis) {
    await redis.del(K.total, K.q1, K.q2, K.others);
    return;
  }
  Object.assign(mem, fresh());
}

function toNumbers(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) out[k] = Number(v) || 0;
  return out;
}
