import { NextResponse } from "next/server";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: message, ...(details ? { details } : {}) },
    { status }
  );
}

export async function parseJsonBody<T>(
  request: Request
): Promise<{ data?: T; error?: NextResponse }> {
  try {
    const data = (await request.json()) as T;
    return { data };
  } catch {
    return { error: apiError("Invalid JSON body", 400) };
  }
}
