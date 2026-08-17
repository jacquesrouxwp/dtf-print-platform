import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  console.info("[waitlist]", body);
  return NextResponse.json({ ok: true });
}
