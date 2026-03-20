"use client"

import { useState } from "react"
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2, Activity } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setResult(null)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar a fatura.")
      }

      setResult(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl animate-in fade-in zoom-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tighter">Portal de Ingestão ESG</h1>
        <p className="text-zinc-400 mt-2 font-mono text-sm">
          Faça o upload da sua conta de luz mensal para cálculo automático da Linha de Base A.R.B.O.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Lado Esquerdo - Upload */}
        <Card className="bg-black border-zinc-800 rounded-xl overflow-hidden shadow-2xl relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/50 to-transparent pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <UploadCloud className="w-5 h-5 text-zinc-400" /> Upload de Fatura
            </CardTitle>
            <CardDescription className="text-zinc-500">Envie o PDF ou Imagem da sua conta de energia mais recente.</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex flex-col justify-center">
            {file ? (
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-700 bg-zinc-900/30 rounded-lg">
                <FileText className="w-12 h-12 text-zinc-300 mb-4" />
                <p className="text-sm font-medium text-white truncate max-w-full">{file.name}</p>
                <p className="text-xs text-zinc-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button 
                  onClick={() => setFile(null)}
                  className="mt-4 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Remover arquivo
                </button>
              </div>
            ) : (
             <label className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-zinc-800 hover:border-zinc-500 hover:bg-zinc-900/50 transition-all rounded-lg cursor-pointer">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-10 h-10 mb-3 text-zinc-500 group-hover:text-white transition-colors" />
                  <p className="mb-2 text-sm text-zinc-400"><span className="font-semibold text-white">Clique para enviar</span> ou arraste e solte</p>
                  <p className="text-xs text-zinc-600 font-mono">PDF, PNG, JPG (MAX. 10MB)</p>
                </div>
                <input id="dropzone-file" type="file" className="hidden" accept=".pdf,image/png,image/jpeg" onChange={handleFileChange} />
             </label>
            )}
          </CardContent>
          <CardFooter>
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className={`w-full py-3 rounded-lg font-bold text-sm tracking-wide transition-all ${
                !file || loading 
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Processando com IA...
                </span>
              ) : (
                'INICIAR EXTRAÇÃO'
              )}
            </button>
          </CardFooter>
        </Card>

        {/* Lado Direito - Resultados */}
        <div className="flex flex-col gap-4">
          {error && (
            <Card className="bg-red-950/20 border-red-900/50 animate-in slide-in-from-right-4">
              <CardContent className="pt-6 flex gap-3 text-red-200">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm font-light">{error}</p>
              </CardContent>
            </Card>
          )}

          {!result && !error && !loading && (
             <div className="h-full border border-zinc-800 bg-black/50 rounded-xl flex items-center justify-center text-zinc-600 font-mono text-sm p-8 text-center border-dashed">
                Aguardando envio da fatura.<br/>Os resultados da análise A.R.B.O. aparecerão aqui.
             </div>
          )}

          {loading && (
             <div className="h-full border border-zinc-800 bg-black/50 rounded-xl flex flex-col items-center justify-center text-zinc-400 p-8 text-center border-dashed gap-4">
                <div className="w-12 h-12 relative flex items-center justify-center">
                   <div className="absolute inset-0 rounded-full border-t-2 border-white animate-spin"></div>
                   <Activity className="w-5 h-5 text-zinc-500" />
                </div>
                <div>
                   <p className="text-sm font-semibold text-white mb-1">A IA está lendo o documento</p>
                   <p className="text-xs font-mono text-zinc-500">Mapeando consumo e projetando teto base...</p>
                </div>
             </div>
          )}

          {result && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <Card className="bg-black border-zinc-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-bl-full blur-2xl" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-mono tracking-widest text-zinc-500 flex justify-between items-center">
                    LEITURA CONCLUÍDA <CheckCircle className="w-4 h-4 text-green-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-zinc-500 font-mono mb-1">VALOR TOTAL</p>
                      <p className="text-2xl font-black text-white tracking-tighter">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result.parsedData.total_value)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-mono mb-1">CONSUMO</p>
                      <p className="text-2xl font-black text-white tracking-tighter">
                        {result.parsedData.kwh_consumption} <span className="text-sm text-zinc-500 font-medium">kWh</span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800">
                    <p className="flex justify-between text-sm mb-2">
                      <span className="text-zinc-400">Teto Mensal Recomendado (-10%)</span>
                      <span className="font-bold text-green-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result.monthly_ceiling)}
                      </span>
                    </p>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 w-[90%]" />
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 p-3 rounded text-xs text-zinc-400 border border-zinc-800/50 flex gap-2">
                    <Activity className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span>Os dados foram salvos como sua nova linha de base. O Motor de Decisão Ativa utilizará este teto para limitar gastos.</span>
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
