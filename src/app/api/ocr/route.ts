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

    console.log(`\n[OCR] PASSO 1: Lendo arquivo recebido -> Nome: "${file.name}" | Tipo: ${file.type} | Tamanho: ${file.size} bytes`);
    const buffer = await file.arrayBuffer()
    const nodeBuffer = Buffer.from(buffer)

    // Validar Magic Bytes
    const hexString = nodeBuffer.subarray(0, 4).toString("hex").toUpperCase()
    const isPDF = hexString === "25504446"
    const isPNG = hexString === "89504E47"
    const isJPEG = hexString.startsWith("FFD8FF")

    if (!isPDF && !isPNG && !isJPEG) {
      return NextResponse.json(
        { error: "Formato de arquivo inválido e/ou corrompido (Assinatura Magic Byte não reconhecida)." },
        { status: 400 }
      )
    }

    const base64Data = nodeBuffer.toString("base64")
    const mimeType = file.type || "application/pdf"
    console.log(`[OCR] PASSO 2: Conversão de Arquivo Finalizada -> String Base64 Tamanho: ${base64Data.length} | MimeType Final Tratado: "${mimeType}"`);
    
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

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
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
    } catch (apiError: any) {
      console.error("=============== GEMINI API EXCEPTION ===============");
      console.error("ErrorMessage:", apiError.message);
      console.error("ErrorName:", apiError.name);
      console.error("ErrorDetails:", JSON.stringify(apiError, null, 2));
      console.error("File Info:", {
          name: file.name,
          type: file.type,
          size: file.size,
          mimeTypeUsed: mimeType,
          base64Length: base64Data.length
      });
      console.error("====================================================");
      
      const isRateLimit = apiError.status === 429 || (apiError.message && apiError.message.includes("429")) || (apiError.message && apiError.message.includes("quota"));
      
      if (isRateLimit) {
        return NextResponse.json(
          { error: "Cota da API excedida", retryAfter: 32 },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: `Erro na leitura IA (Google). Veja os logs do servidor. Detalhe: ${apiError.message}` },
        { status: 502 }
      );
    }

    let jsonString = response.text || ""
    console.log(`\n[OCR] PASSO 3: Resposta Bruta da IA Gemini:\n${jsonString}\n`);
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
