import { NextResponse } from 'next/server'

// Tabela de bandeiras tarifárias ANEEL 2025 (R$/kWh)
// Fonte: ANEEL - Resolução Normativa vigente
const TARIFA_BASE_KWH = 0.826 // tarifa residencial média Manaus (AM) - Amazonas Energia

const BANDEIRAS = {
  verde:       { nome: 'Verde',        acrescimo: 0.00000, cor: '#22c55e', descricao: 'Condições favoráveis de geração de energia.' },
  amarela:     { nome: 'Amarela',      acrescimo: 0.01874, cor: '#eab308', descricao: 'Condições de atenção para a geração de energia.' },
  vermelha_p1: { nome: 'Vermelha P1', acrescimo: 0.03971, cor: '#ef4444', descricao: 'Condições críticas de geração.' },
  vermelha_p2: { nome: 'Vermelha P2', acrescimo: 0.09492, cor: '#dc2626', descricao: 'Condições muito críticas de geração.' },
}

// Bandeira atual — atualizar mensalmente conforme ANEEL
// Março 2025: Bandeira Verde
const BANDEIRA_ATUAL = 'verde' as keyof typeof BANDEIRAS

// Potência padrão do AC (configurável) — 12000 BTUs = 1.400 kW (incluindo compressor)
const AC_POTENCIA_KW = 1.4

export async function GET() {
  const bandeira = BANDEIRAS[BANDEIRA_ATUAL]
  const tarifaTotal = TARIFA_BASE_KWH + bandeira.acrescimo

  // Custo por hora com AC ligado
  const custoPorHora = AC_POTENCIA_KW * tarifaTotal

  // Economia estimada em modo econômico (+2°C setpoint = ~15% menos consumo)
  const economiaModoPorHora = custoPorHora * 0.15

  return NextResponse.json({
    bandeira: {
      codigo: BANDEIRA_ATUAL,
      nome: bandeira.nome,
      cor: bandeira.cor,
      descricao: bandeira.descricao,
      acrescimo: bandeira.acrescimo,
    },
    tarifa: {
      base: TARIFA_BASE_KWH,
      total: parseFloat(tarifaTotal.toFixed(5)),
      unidade: 'R$/kWh',
    },
    ac: {
      potencia_kw: AC_POTENCIA_KW,
      custo_por_hora: parseFloat(custoPorHora.toFixed(4)),
      economia_modo_eco_por_hora: parseFloat(economiaModoPorHora.toFixed(4)),
    },
    fonte: 'ANEEL — Resolução Homologatória',
    atualizado_em: new Date().toISOString(),
  })
}
