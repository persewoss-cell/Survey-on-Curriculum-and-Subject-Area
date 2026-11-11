import { NextResponse } from "next/server";
import { getResults } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getResults();
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
