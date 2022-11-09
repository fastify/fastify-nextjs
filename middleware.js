// middleware.ts
'use strict'
import { NextResponse } from 'next/server'

// This function can be marked `async` if using `await` inside
export default function middleware (request) {
  return NextResponse.redirect(new URL('/hello', request.url))
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/about/:path*'
}
