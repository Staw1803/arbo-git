import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Mapeamento simples de Rate Limit em memória por instância Node/Edge.
// OBS: Em deploy distribuído via Vercel as instâncias podem não compartilhar o MAP.
const rateLimitMap = new Map();

export function proxy(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
  const limit = 30; // 30 requisições 
  const windowMs = 60 * 1000; // a cada 1 minuto

  if (request.nextUrl.pathname.startsWith('/api')) {
    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, {
        count: 1,
        startTime: Date.now()
      })
    } else {
      const data = rateLimitMap.get(ip)
      if (Date.now() - data.startTime > windowMs) {
        // Reseta a janela de tempo
        data.count = 1
        data.startTime = Date.now()
      } else {
        data.count++
        if (data.count > limit) {
          return new NextResponse(
            JSON.stringify({ error: "Too Many Requests (Rate Limit excedido para o IP: " + ip + ")" }), 
            { status: 429, headers: { 'content-type': 'application/json' } }
          )
        }
      }
    }
  }

  // Permite todas opções que não excederam (CORS/Preflight ou tráfego normal)
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
