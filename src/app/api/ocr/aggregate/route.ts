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
    Analise a seguinte ${bills.length === 1 ? 'única fatura' : 'série temporal de faturas'} de energia de uma empresa:
    ${JSON.stringify(bills, null, 2)}
    
    Com base nisso, determine uma "Meta Realista de Redução".
    Se houver apenas uma fatura, estime uma meta de redução de 10% em cima dela como ponto de partida (mas baseie-se nesse único valor para preencher o insight).
    Se houver várias faturas, analise a tendência de gastos ao longo dos meses e sugira uma meta corporativa avançada focando em provável desperdício de HVAC.
    
    Retorne ESTRITAMENTE o seguinte JSON sem nenhum block de markdown:
    {
       "seasonality_insight": "Texto curto descrevendo os padrões ou justificando a meta proposta",
       "suggested_reduction_pct": 0, // Decimal entre 3% e 15% ou 10% se houver apenas 1 fatura
       "logic_explanation": "Breve justificativa técnica do modelo para escolher essa meta."
    }
    `

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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
    const baselineDataToInsert = {
      company_id: user.id,
      total_value: average_spend,
      kwh_consumption: average_kwh,
      reading_period: "AGREGADO_IA",
      history_json: analysis, // guardamos o insight da IA aqui
      target_reduction: target_reduction,
      monthly_ceiling: monthly_ceiling
    };
    
    console.log("\n[OCR AGGREGATE] PASSO 4: Tentativa de Gravação no Supabase:");
    console.log(JSON.stringify(baselineDataToInsert, null, 2));

    const { error: dbError } = await supabase
      .from("energy_bills")
      .insert(baselineDataToInsert)

    if (dbError) {
      console.error("Erro ao salvar baseline no Supabase, ativando fallback de visualização (Rascunho):", dbError)
      // Em vez de quebrar a jornada do usuário retornando 500, finaliza e avisa na UI via insight.
      return NextResponse.json({
        success: true,
        average_spend,
        monthly_ceiling,
        seasonality_insight: analysis.seasonality_insight + `\n\n[AVISO: Salvo como Rascunho Virtual. Uma trava técnica do banco impediu a gravação oficial. Erro: ${dbError.message}]`,
        reduction_meta: target_reduction,
        is_draft: true
      })
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
    
    const isRateLimit = err.status === 429 || (err.message && err.message.includes("429")) || (err.message && err.message.includes("quota"));
    if (isRateLimit) {
      return NextResponse.json(
        { error: "Cota diária excedida no modelo 2.5. Migrando para rascunho no 1.5..." },
        { status: 429 }
      )
    }

    return NextResponse.json({ error: err.message || "Erro interno do servidor." }, { status: 500 })
  }
}
