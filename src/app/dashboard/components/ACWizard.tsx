"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import {
  AirVent, CheckCircle2, AlertCircle, Power, ChevronUp, ChevronDown,
  RadioTower, Loader2, BrainCircuit, Zap, Thermometer,
} from "lucide-react"

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
type WizardPhase = 'idle' | 'learning' | 'done' | 'error'

interface CapturedCommand {
  nome_comando: string
  codigo_ir: string | null
  validado: boolean
}

interface StepConfig {
  key: string          // nome_comando
  label: string
  description: string
  hint: string
  icon: React.ReactNode
  color: string
}

const STEPS: StepConfig[] = [
  {
    key: 'AC_OFF',
    label: 'Desligar / Ligar',
    description: 'Aponte o controle para o vaso e pressione o botão POWER (liga/desliga)',
    hint: 'Este comando será usado para desligar o AC quando a sala estiver vazia.',
    icon: <Power className="h-5 w-5" />,
    color: 'text-red-400 border-red-500/30 bg-red-950/20',
  },
  {
    key: 'AC_COOL',
    label: 'Modo Resfriar',
    description: 'Pressione o botão de modo COOLING (❄️) ou RESFRIAMENTO no controle',
    hint: 'A IA usará este comando quando a temperatura ultrapassar 26°C com presença detectada.',
    icon: <AirVent className="h-5 w-5" />,
    color: 'text-blue-400 border-blue-500/30 bg-blue-950/20',
  },
  {
    key: 'AC_TEMP_UP',
    label: 'Aumentar Temperatura',
    description: 'Pressione o botão ▲ (TEMP +) no controle',
    hint: 'Usado para ajuste fino de temperatura.',
    icon: <ChevronUp className="h-5 w-5" />,
    color: 'text-orange-400 border-orange-500/30 bg-orange-950/20',
  },
  {
    key: 'AC_TEMP_DOWN',
    label: 'Diminuir Temperatura',
    description: 'Pressione o botão ▼ (TEMP -) no controle',
    hint: 'Usado para ajuste fino de temperatura.',
    icon: <ChevronDown className="h-5 w-5" />,
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/20',
  },
]

const MIN_IR_CODE_LENGTH = 10   // minimum characters to consider a valid IR capture

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────
export function ACWizard({ mac }: { mac?: string }) {
  const [supabase] = useState(() => createClient())
  const [phase, setPhase] = useState<WizardPhase>('idle')
  const [currentStep, setCurrentStep] = useState(0)
  const [captured, setCaptured] = useState<Record<string, CapturedCommand>>({})
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [geminiLoading, setGeminiLoading] = useState(false)
  const [geminiResult, setGeminiResult] = useState<{ action: string; reason: string; confidence: number } | null>(null)
  const [waitingCapture, setWaitingCapture] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const capturedCount = Object.values(captured).filter((c) => c.validado).length
  const progress = Math.round((capturedCount / STEPS.length) * 100)

  // ── Start wizard ─────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!mac) {
      setErrorMsg('Nenhum dispositivo detectado. Aguarde os dados do vaso chegarem.')
      return
    }
    setErrorMsg(null)
    setPhase('learning')
    setCurrentStep(0)
    setCaptured({})
    setGeminiResult(null)

    await fetch('/api/ac/learn/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mac_address: mac }),
    })

    subscribeToRawCommands()
  }

  // ── Realtime subscription for comandos_raw ────────────────────────────────
  const subscribeToRawCommands = () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    channelRef.current = supabase
      .channel('comandos_raw_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comandos_raw' },
        (payload: any) => {
          const newRow = payload.new as CapturedCommand
          if (!newRow?.nome_comando) return

          const irLen = (newRow.codigo_ir ?? '').length
          if (irLen < MIN_IR_CODE_LENGTH) {
            setErrorMsg(`⚠️ Código IR recebido muito curto (${irLen} chars) — possível ruído. Tente novamente.`)
            setWaitingCapture(false)
            return
          }

          setErrorMsg(null)
          setWaitingCapture(false)
          setCaptured((prev) => ({
            ...prev,
            [newRow.nome_comando]: { ...newRow, validado: true },
          }))

          // Advance to next step
          setCurrentStep((prev) => {
            const next = prev + 1
            if (next >= STEPS.length) {
              finishWizard()
            }
            return next
          })
        }
      )
      .subscribe()
  }

  // ── Finish wizard ─────────────────────────────────────────────────────────
  const finishWizard = async () => {
    if (!mac) return
    await fetch('/api/ac/learn/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mac_address: mac }),
    })
    setPhase('done')
    if (channelRef.current) supabase.removeChannel(channelRef.current)
  }

  // ── Simulate waiting for code capture (user pressed button) ──────────────
  const handlePressedButton = () => {
    setWaitingCapture(true)
    setErrorMsg(null)
  }

  // ── Gemini AI analysis ───────────────────────────────────────────────────
  const handleGeminiAnalysis = async () => {
    if (!mac) return
    setGeminiLoading(true)
    setGeminiResult(null)
    try {
      const res = await fetch('/api/ai/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac_address: mac }),
      })
      const data = await res.json()
      if (data.decision) setGeminiResult(data.decision)
      else setErrorMsg(data.error ?? 'Erro ao consultar Gemini.')
    } catch {
      setErrorMsg('Falha ao conectar com a API Gemini.')
    } finally {
      setGeminiLoading(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [supabase])

  // ────────────────────────────────────────────────────────────────────────────
  // Render: IDLE state
  // ────────────────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="space-y-6">
        {/* Intro card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-950/40 via-black/60 to-purple-950/40 backdrop-blur-md shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500" />
            <CardHeader className="flex flex-row items-center gap-3 pb-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <AirVent className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-white text-base">Mapeamento de Controle AC</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">Treine o vaso para aprender os comandos do seu ar-condicionado</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {STEPS.map((step, i) => (
                  <div key={step.key} className={`rounded-xl border p-3 ${step.color}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {step.icon}
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Passo {i + 1}</span>
                    </div>
                    <p className="text-xs font-medium text-white">{step.label}</p>
                  </div>
                ))}
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-950/30 border border-red-500/20 rounded-lg p-3 mb-4">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              <button
                onClick={handleStart}
                className="w-full py-3 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-200 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                <RadioTower className="h-4 w-4" />
                Iniciar Mapeamento de AC
              </button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Gemini AI AC control */}
        <GeminiACCard
          mac={mac}
          loading={geminiLoading}
          result={geminiResult}
          onAnalyze={handleGeminiAnalysis}
          error={null}
        />
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Render: DONE state
  // ────────────────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="rounded-2xl border border-green-500/30 bg-green-950/20 backdrop-blur-md shadow-2xl">
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-white">Mapeamento Concluído!</h3>
                <p className="text-sm text-gray-400 mt-1">O vaso aprendeu {STEPS.length} comandos do seu AC.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-2">
                {STEPS.map((step) => (
                  <div key={step.key} className="flex items-center gap-2 text-sm text-white bg-white/5 rounded-lg p-2.5">
                    <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                    {step.label}
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setPhase('idle'); setGeminiResult(null) }}
                className="mt-2 py-2 px-6 rounded-xl font-semibold text-sm text-white bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
              >
                Configurar Novamente
              </button>
            </CardContent>
          </Card>
        </motion.div>

        <GeminiACCard
          mac={mac}
          loading={geminiLoading}
          result={geminiResult}
          onAnalyze={handleGeminiAnalysis}
          error={errorMsg}
        />
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Render: LEARNING state
  // ────────────────────────────────────────────────────────────────────────────
  const activeStep = STEPS[currentStep]

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <Card className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl overflow-hidden">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Progresso do Treinamento</span>
            <span className="text-xs font-black text-white">{capturedCount}/{STEPS.length} comandos</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {/* Step indicators */}
          <div className="flex gap-2 mt-4">
            {STEPS.map((step, i) => {
              const done = captured[step.key]?.validado
              const active = i === currentStep
              return (
                <div
                  key={step.key}
                  className={`flex-1 h-10 rounded-lg border flex items-center justify-center transition-all duration-300 ${
                    done
                      ? 'border-green-500/40 bg-green-900/30 text-green-400'
                      : active
                      ? 'border-blue-500/40 bg-blue-900/30 text-blue-400'
                      : 'border-white/10 bg-white/5 text-gray-600'
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    step.icon
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active step card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
        >
          <Card className={`rounded-2xl border backdrop-blur-md shadow-2xl overflow-hidden ${activeStep.color}`}>
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-current opacity-40" />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
                  {activeStep.icon}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest opacity-60">Passo {currentStep + 1} de {STEPS.length}</p>
                  <CardTitle className="text-white text-base mt-0.5">{activeStep.label}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/80 leading-relaxed mb-1">{activeStep.description}</p>
              <p className="text-xs text-gray-500 mb-5">{activeStep.hint}</p>

              {errorMsg && (
                <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/40 border border-red-500/20 rounded-lg p-3 mb-4">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {waitingCapture ? (
                <div className="flex items-center justify-center gap-3 py-5 text-blue-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">Aguardando sinal IR do vaso...</span>
                </div>
              ) : (
                <button
                  onClick={handlePressedButton}
                  className="w-full py-3 px-6 rounded-xl font-bold text-sm text-white bg-white/10 hover:bg-white/20 transition-all duration-200 border border-white/20 flex items-center justify-center gap-2"
                >
                  <RadioTower className="h-4 w-4" />
                  Já pressionei o botão: {activeStep.label}
                </button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Completed steps */}
      {capturedCount > 0 && (
        <Card className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Comandos Capturados</p>
            <div className="space-y-2">
              {STEPS.filter((s) => captured[s.key]?.validado).map((step) => (
                <div key={step.key} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span className="text-white font-medium">{step.label}</span>
                  <span className="text-gray-600 text-xs font-mono ml-auto truncate max-w-[120px]">
                    {captured[step.key]?.codigo_ir?.substring(0, 12) ?? ''}...
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-component: Gemini AC Controller
// ──────────────────────────────────────────────────────────────────────────────
function GeminiACCard({
  mac,
  loading,
  result,
  onAnalyze,
  error,
}: {
  mac?: string
  loading: boolean
  result: { action: string; reason: string; confidence: number } | null
  onAnalyze: () => void
  error: string | null
}) {
  const actionColors: Record<string, string> = {
    AC_OFF: 'text-red-400',
    AC_COOL: 'text-blue-400',
    STANDBY: 'text-green-400',
  }
  const actionLabels: Record<string, string> = {
    AC_OFF: 'Desligar AC',
    AC_COOL: 'Resfriar Ambiente',
    STANDBY: 'Sem ação necessária',
  }
  const actionIcons: Record<string, React.ReactNode> = {
    AC_OFF: <Power className="h-5 w-5 text-red-400" />,
    AC_COOL: <AirVent className="h-5 w-5 text-blue-400" />,
    STANDBY: <Zap className="h-5 w-5 text-green-400" />,
  }

  return (
    <Card className="rounded-2xl border border-purple-500/20 bg-purple-950/20 backdrop-blur-md shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-bold tracking-widest text-purple-400 flex items-center gap-2">
          <BrainCircuit className="h-4 w-4" />
          CONTROLE AUTÔNOMO — GEMINI AI
        </CardTitle>
        <Thermometer className="h-4 w-4 text-purple-400/60" />
      </CardHeader>
      <CardContent>
        <p className="text-xs text-gray-500 mb-4">
          A IA analisa a telemetria em tempo real (presença + temperatura) e decide autonomamente se deve ligar, desligar ou resfiar o AC.
        </p>

        {result && (
          <div className="bg-black/40 rounded-xl border border-white/10 p-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              {actionIcons[result.action] ?? <Zap className="h-5 w-5 text-white" />}
              <div>
                <div className={`text-lg font-black ${actionColors[result.action] ?? 'text-white'}`}>
                  {actionLabels[result.action] ?? result.action}
                </div>
                <div className="text-[10px] font-mono text-gray-600">{result.action}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-xs text-gray-500">Confiança</div>
                <div className="text-lg font-black text-white">{result.confidence}%</div>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed border-t border-white/10 pt-2 mt-2">{result.reason}</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-950/30 border border-red-500/20 rounded-lg p-3 mb-4">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={onAnalyze}
          disabled={loading || !mac}
          className="w-full py-3 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Consultando Gemini...</>
          ) : (
            <><BrainCircuit className="h-4 w-4" /> Analisar com Gemini AI</>
          )}
        </button>
      </CardContent>
    </Card>
  )
}
