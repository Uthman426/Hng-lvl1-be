import { NextResponse } from "next/server";

export function middleware(req) {
  const start = Date.now();

  const response = NextResponse.next();

  const duration = Date.now() - start;

  console.log(
    `${req.method} ${req.nextUrl.pathname} ${response.status} ${duration}ms`
  );

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
