import { NextResponse } from "next/server";
import { getResults } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getResults();
  // Vercel CDN이 1초간 결과를 캐시합니다. 결과 화면을 여러 명이 열어도
  // Redis 조회는 초당 1회 정도로 유지되어 무료 한도를 넘지 않습니다.
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
      "CDN-Cache-Control": "public, s-maxage=1",
      "Vercel-CDN-Cache-Control": "public, s-maxage=1",
    },
  });
}
