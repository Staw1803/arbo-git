import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { GoogleGenAI } from "@google/genai"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    // Initialize Supabase to get user/company ID
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 401 })
    }

    const aiOptions = process.env.GEMINI_API_KEY ? { apiKey: process.env.GEMINI_API_KEY } : {}
    const ai = new GoogleGenAI(aiOptions)

    // Convert file to Base64
    const buffer = await file.arrayBuffer()
    const base64Data = Buffer.from(buffer).toString("base64")

    // Determine mimeType
    const mimeType = file.type || "application/pdf"
    
    let instructions = `
    Analise esta fatura de energia e extraia os seguintes dados em formato estrito JSON sem markdown:
    {
      "total_value": 0.00, // número decimal. remover símbolo de moeda R$
      "kwh_consumption": 0, // número decimal, consumo total em kWh medido no mês
      "reading_period": "MMM/YYYY", // ex: "FEV/2024" ou mês de faturamento
      "history_json": {} // se possível extrair histórico
    }
    Forneça apenas o JSON válido e nada mais.
    `

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
           role: 'user',
           parts: [
              {
                 inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                 }
              },
              { text: instructions }
           ]
        }
      ]
    });

    let jsonString = response.text || ""
    jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "").trim()
    
    let parsedData
    try {
      parsedData = JSON.parse(jsonString)
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", jsonString)
      return NextResponse.json({ error: "Falha na leitura do documento pela IA." }, { status: 500 })
    }

    // Calula o "Teto Mensal" (-10%)
    const target_reduction = 10
    const monthly_ceiling = parsedData.total_value * (1 - (target_reduction / 100))

    // Salvar no banco
    const { error: dbError } = await supabase
      .from("energy_bills")
      .insert({
        company_id: user.id,
        total_value: parsedData.total_value,
        kwh_consumption: parsedData.kwh_consumption,
        reading_period: parsedData.reading_period,
        history_json: parsedData.history_json || {},
        target_reduction: target_reduction,
        monthly_ceiling: monthly_ceiling
      })

    if (dbError) {
      console.error("Erro ao salvar no Supabase:", dbError)
      return NextResponse.json({ error: "Falha ao salvar linha de base." }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      parsedData,
      monthly_ceiling
    })

  } catch (err: any) {
    console.error("OCR API error:", err)
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}
