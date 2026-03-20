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

    const aiOptions = process.env.GEMINI_API_KEY ? { apiKey: process.env.GEMINI_API_KEY } : {}
    const ai = new GoogleGenAI(aiOptions)

    const buffer = await file.arrayBuffer()
    const base64Data = Buffer.from(buffer).toString("base64")
    const mimeType = file.type || "application/pdf"
    
    let instructions = `
    Analise esta fatura de energia e extraia os seguintes dados em formato estrito JSON sem markdown:
    {
      "total_value": 0.00, // decimal. remover símbolo de R$
      "kwh_consumption": 0, // decimal, consumo medido no mês
      "taxes": 0.00, // decimal, soma de tributos (ICMS, PIS, COFINS, etc) se identificável, senão 0
      "reading_date": "YYYY-MM-DD", // data da leitura ou mês de referência (formate como achar o primeiro/último dia do mês)
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

    // Nesta nova versão (Lote), não salvamos no banco aqui.
    // O frontend agrupa tudo e envia para /api/ocr/aggregate
    return NextResponse.json({
      success: true,
      parsedData
    })

  } catch (err: any) {
    console.error("OCR API error:", err)
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}
