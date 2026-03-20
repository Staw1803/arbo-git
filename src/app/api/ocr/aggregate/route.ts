import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { GoogleGenAI } from "@google/genai"

export async function POST(req: NextRequest) {
  try {
    const { bills } = await req.json()
    
    if (!bills || !Array.isArray(bills) || bills.length === 0) {
      return NextResponse.json({ error: "Nenhum dado de lote enviado" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 401 })
    }

    const aiOptions = process.env.GEMINI_API_KEY ? { apiKey: process.env.GEMINI_API_KEY } : {}
    const ai = new GoogleGenAI(aiOptions)
    
    // Average calculation
    const totalSpend = bills.reduce((acc, b) => acc + Number(b.total_value || 0), 0)
    const average_spend = totalSpend / bills.length
    const totalKwh = bills.reduce((acc, b) => acc + Number(b.kwh_consumption || 0), 0)
    const average_kwh = totalKwh / bills.length

    let instructions = `
    Analise a seguinte série temporal de faturas de energia de uma empresa:
    ${JSON.stringify(bills, null, 2)}
    
    Com base nessa série, determine uma "Meta Realista de Redução". Leve em consideração que gastos muito altos podem ter grandes margens de desperdício em salas vazias, e gastos regulares já estão otimizados.
    Detecte sazonalidade se houver (ex: meses no meio do ano gastam mais).
    
    Retorne ESTRITAMENTE o seguinte JSON:
    {
       "seasonality_insight": "Texto curto descrevendo os padrões de gastos da frota ou empresa ao longo dos meses fornecidos.",
       "suggested_reduction_pct": 0, // Um número decimal, ex: 6.5 para 6.5%. Seja realista, entre 3% e 15%.
       "logic_explanation": "Breve justificativa técnica do modelo para escolher essa meta."
    }
    `

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: instructions
    });

    let jsonString = response.text || ""
    jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "").trim()
    
    let analysis
    try {
      analysis = JSON.parse(jsonString)
    } catch (e) {
      console.error("Failed to parse aggregate AI output:", jsonString)
      // Fallback fallback AI analysis
      analysis = {
          seasonality_insight: "Não foi possível traçar sazonalidade exata, perfil linear assumido.",
          suggested_reduction_pct: 8.0,
          logic_explanation: "Baseado na média aritmética simples das faturas enviadas."
      }
    }

    const target_reduction = analysis.suggested_reduction_pct || 8
    const monthly_ceiling = average_spend * (1 - (target_reduction / 100))

    // Salvar o "Agregado" (a linha de base oficial inteligente)
    const { error: dbError } = await supabase
      .from("energy_bills")
      .insert({
        company_id: user.id,
        total_value: average_spend,
        kwh_consumption: average_kwh,
        reading_period: "AGREGADO_IA",
        history_json: analysis, // guardamos o insight da IA aqui
        target_reduction: target_reduction,
        monthly_ceiling: monthly_ceiling
      })

    if (dbError) {
      console.error("Erro ao salvar baseline:", dbError)
      return NextResponse.json({ error: "Falha ao gravar linha de base realista." }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      average_spend,
      monthly_ceiling,
      seasonality_insight: analysis.seasonality_insight,
      reduction_meta: target_reduction
    })

  } catch (err: any) {
    console.error("Aggregate API error:", err)
    return NextResponse.json({ error: err.message || "Erro interno do servidor." }, { status: 500 })
  }
}
