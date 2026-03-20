"use client"

import { useState } from "react"
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2, Activity, Layers } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"

interface ParsedBill {
  total_value: number
  kwh_consumption: number
  taxes: number
  reading_date: string
}

export default function UploadBatchPage() {
  const [files, setFiles] = useState<File[]>([])
  const [processingIndex, setProcessingIndex] = useState(-1)
  const [results, setResults] = useState<ParsedBill[]>([])
  const [aggregateResult, setAggregateResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files).slice(0, 6) // Max 6 files
      
      const oversized = selectedFiles.some(f => f.size > 4 * 1024 * 1024)
      if (oversized) {
         setError("Um ou mais arquivos excedem o limite de 4MB da plataforma. Por favor comprima-os.")
         return
      }

      setFiles(selectedFiles)
      setResults([])
      setAggregateResult(null)
      setError(null)
      setProcessingIndex(-1)
    }
  }

  const handleUploadQueue = async () => {
    if (files.length === 0) return

    setError(null)
    const extractedData: ParsedBill[] = []

    // 1. Process one file at a time (Queue)
    for (let i = 0; i < files.length; i++) {
       setProcessingIndex(i)
       try {
         const formData = new FormData()
         formData.append("file", files[i])

         const response = await fetch("/api/ocr", {
           method: "POST",
           body: formData,
         })

         let data;
         const contentType = response.headers.get("content-type");
         if (contentType && contentType.includes("application/json")) {
           data = await response.json();
         } else {
           const text = await response.text();
           if (response.status === 413) throw new Error("Arquivo muito grande (Limite 4MB).")
           throw new Error(`Erro no servidor (${response.status})`)
         }

         if (!response.ok) throw new Error(data?.error || "Erro ao processar a fatura.")

         extractedData.push(data.parsedData)
         setResults(prev => [...prev, data.parsedData])

       } catch (err: any) {
         console.error(err)
         setError(`Falha ao processar o arquivo "${files[i].name}": ${err.message}`)
         setProcessingIndex(-1)
         return // Stop entirely on error
       }
    }

    // 2. All files processed. Send to aggregate.
    setProcessingIndex(-2) // Represents "Aggregating"
    try {
       const aggResponse = await fetch("/api/ocr/aggregate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bills: extractedData })
       })

       if (!aggResponse.ok) {
          const e = await aggResponse.json()
          throw new Error(e.error || "Falha na agregação de Linha de Base.")
       }

       const finalData = await aggResponse.json()
       setAggregateResult(finalData)
    } catch(err: any) {
       setError(err.message)
    } finally {
       setProcessingIndex(-1)
    }
  }

  const isProcessing = processingIndex >= 0 || processingIndex === -2
  const progressPct = Object.is(processingIndex, -2) ? 100 : Math.max(0, (processingIndex / files.length) * 100)

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl animate-in fade-in zoom-in duration-500">
      <div className="mb-8 border-b border-zinc-800 pb-4">
        <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
            Portal de Ingestão de Lote <Layers className="text-zinc-500" />
        </h1>
        <p className="text-zinc-400 mt-2 font-mono text-sm max-w-xl">
          Selecione até 6 faturas de energia recentes. O Motor IA consumirá os arquivos sequencialmente para extração em lote e formulação de uma meta de redução corporativa avançada.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Column */}
        <Card className="bg-black border-zinc-800 rounded-xl overflow-hidden shadow-2xl relative h-fit">
          <CardHeader>
             <CardTitle className="text-sm tracking-widest text-zinc-400 font-mono">ARQUIVOS DO LOTE</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             {files.length === 0 ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-zinc-800 hover:border-zinc-500 hover:bg-zinc-900/50 transition-all rounded-lg cursor-pointer">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-10 h-10 mb-3 text-zinc-500" />
                    <p className="mb-2 text-sm text-zinc-400"><span className="text-white">Selecionar Contas (Até 6)</span></p>
                    <p className="text-xs text-zinc-600 font-mono">PDF, PNG, JPG (MAX. 4MB cada)</p>
                  </div>
                  <input type="file" multiple className="hidden" accept=".pdf,image/png,image/jpeg" onChange={handleFileChange} />
                </label>
             ) : (
                <div className="space-y-2">
                   {files.map((file, i) => (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${processingIndex === i ? 'border-blue-500 bg-blue-500/10' : results[i] ? 'border-green-500 bg-green-500/10' : 'border-zinc-800 bg-zinc-900/30'}`}>
                         <FileText className={`w-5 h-5 ${results[i] ? 'text-green-400' : 'text-zinc-400'}`} />
                         <div className="flex-1 truncate">
                            <p className="text-xs font-mono text-zinc-300 truncate">{file.name}</p>
                            <p className="text-[10px] text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                         </div>
                         {results[i] && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                         {processingIndex === i && <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />}
                      </div>
                   ))}
                   {!isProcessing && !aggregateResult && (
                      <button onClick={() => setFiles([])} className="text-xs text-red-500 font-mono mt-4 hover:underline">Limpar lote</button>
                   )}
                </div>
             )}

             {/* Progress Info */}
             {isProcessing && (
                <div className="pt-4 border-t border-zinc-800">
                    <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                       <span>{processingIndex === -2 ? "Calculando Meta Dinâmica..." : `Analisando arquivo ${processingIndex + 1} de ${files.length}`}</span>
                       <span>{Math.round(progressPct)}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                       <div className="h-full bg-white transition-all duration-300" style={{ width: `${progressPct}%` }} />
                    </div>
                </div>
             )}
          </CardContent>
          <CardFooter>
            <button
              onClick={handleUploadQueue}
              disabled={files.length === 0 || isProcessing || !!aggregateResult}
              className={`w-full py-3 px-4 rounded-lg font-bold text-xs font-mono tracking-widest transition-all ${
                files.length === 0 || isProcessing || !!aggregateResult
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                  : 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]'
              }`}
            >
              {processingIndex === -2 ? 'SINTETIZANDO AUDITORIA IA...' : isProcessing ? 'PROCESSANDO FILA...' : 'INICIAR INGESTÃO DE LOTE'}
            </button>
          </CardFooter>
        </Card>

        {/* Results Column */}
        <div className="flex flex-col gap-4">
          {error && (
            <Card className="bg-red-950/20 border-red-900/50">
              <CardContent className="pt-6 flex gap-3 text-red-200">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm font-light">{error}</p>
              </CardContent>
            </Card>
          )}

          {!aggregateResult && files.length > 0 && !error && (
             <div className="h-full border border-zinc-800 bg-black/50 rounded-xl flex items-center justify-center text-zinc-600 font-mono text-xs p-8 text-center border-dashed">
                <Activity className="w-8 h-8 opacity-20 mb-4 mx-auto" /><br/>
                Os arquivos estão sendo despachados um por um para o modelo GPT-Flash.<br/>Seu navegador não será sobrecarregado.
             </div>
          )}

          {aggregateResult && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <Card className="bg-black border-zinc-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full blur-2xl" />
                <CardHeader className="pb-2 border-b border-zinc-800 mb-4">
                  <CardTitle className="text-xs font-mono tracking-widest text-blue-400 flex justify-between items-center">
                    RELATÓRIO DE AUDITORIA <CheckCircle className="w-5 h-5 text-blue-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                     <p className="text-[10px] text-zinc-500 font-mono mb-2 uppercase tracking-widest">Padrões Identificados</p>
                     <p className="text-sm text-zinc-300 format-markdown font-serif italic text-justify leading-relaxed">
                        "{aggregateResult.seasonality_insight}"
                     </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                    <div>
                      <p className="text-xs text-zinc-500 font-mono mb-1">MÉDIA DE GASTOS</p>
                      <p className="text-xl font-black text-white tracking-tighter">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(aggregateResult.average_spend)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-mono mb-1">META REALISTA</p>
                      <p className="text-xl font-black text-green-400 tracking-tighter shrink-0 flex items-center gap-2">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(aggregateResult.monthly_ceiling)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 p-4 rounded-lg text-xs text-zinc-400 border border-zinc-800/50 flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                       <span className="font-bold text-white tracking-wide">Modo de Aprendizado Automático</span>
                       <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-widest">Ativado (15 Dias)</span>
                    </div>
                    <p className="leading-relaxed">Sua meta foi calculada considerando seus dados atuais. Como não temos histórico tátil do seu <i>Capital Humano</i> da sala, o Vaso manterá o Ar Condicionado ligado pelas próximas duas semanas apenas mapeando <b>potencial de economia</b>. O modo autônomo pleno ativará a seguir.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
