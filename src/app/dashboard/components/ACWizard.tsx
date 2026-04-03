"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import {
  AirVent, CheckCircle2, AlertCircle, Power, ChevronUp, ChevronDown,
  RadioTower, Loader2
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
    color: 'text-neutral-300 border-neutral-700 bg-neutral-900',
  },
  {
    key: 'AC_COOL',
    label: 'Modo Resfriar',
    description: 'Pressione o botão de modo COOLING (❄️) ou RESFRIAMENTO no controle',
    hint: 'A IA usará este comando quando a temperatura ultrapassar 26°C com presença detectada.',
    icon: <AirVent className="h-5 w-5" />,
    color: 'text-neutral-300 border-neutral-700 bg-neutral-900',
  },
  {
    key: 'AC_TEMP_UP',
    label: 'Aumentar Temperatura',
    description: 'Pressione o botão ▲ (TEMP +) no controle',
    hint: 'Usado para ajuste fino de temperatura.',
    icon: <ChevronUp className="h-5 w-5" />,
    color: 'text-neutral-300 border-neutral-700 bg-neutral-900',
  },
  {
    key: 'AC_TEMP_DOWN',
    label: 'Diminuir Temperatura',
    description: 'Pressione o botão ▼ (TEMP -) no controle',
    hint: 'Usado para ajuste fino de temperatura.',
    icon: <ChevronDown className="h-5 w-5" />,
    color: 'text-neutral-300 border-neutral-700 bg-neutral-900',
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
  const [successToast, setSuccessToast] = useState<string | null>(null)
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
    if (!mac) return;

    channelRef.current = supabase
      .channel(`comandos_raw_live_${mac}`)
      .on(
        'postgres_changes',
        { 
           event: 'INSERT', 
           schema: 'public', 
           table: 'comandos_raw',
           filter: `mac_address=eq.${mac}` 
        },
        (payload: any) => {
          const newRow = payload.new;
          if (!newRow?.nome_comando) return

          const irLen = (newRow.codigo_ir ?? '').length
          if (irLen < MIN_IR_CODE_LENGTH) {
            setErrorMsg(`⚠️ Código IR recebido muito curto (${irLen} chars) — possível ruído. Tente novamente.`)
            setWaitingCapture(false)
            return
          }

          // Trigger Success States
          setErrorMsg(null)
          setWaitingCapture(false)
          setCaptured((prev) => ({
            ...prev,
            [newRow.nome_comando]: { ...newRow, validado: true },
          }))

          // Show Toast Feedback
          const stepMatch = STEPS.find(s => s.key === newRow.nome_comando);
          const cmdName = stepMatch ? stepMatch.label : newRow.nome_comando;
          setSuccessToast(`Sinal de ${cmdName} capturado com sucesso! ✅`);
          
          setTimeout(() => {
             setSuccessToast(null);
          }, 4000);

          // Advance to next step automatically
          setCurrentStep((prev) => {
            const next = prev + 1
            if (next >= STEPS.length) {
              finishWizard()
            }
            return next
          })
        }
      )
      .subscribe((status) => {
         console.log("Supabase Realtime Channel Status:", status);
      })
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
          <Card className="rounded-2xl border border-neutral-800 bg-neutral-900 backdrop-blur-md shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/20" />
            <CardHeader className="flex flex-row items-center gap-3 pb-3">
              <div className="h-10 w-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                <AirVent className="h-5 w-5 text-neutral-300" />
              </div>
              <div>
                <CardTitle className="text-white text-base">Mapeamento de Controle AC</CardTitle>
                <p className="text-xs text-neutral-400 mt-0.5">Treine o vaso para aprender os comandos do seu ar-condicionado</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {STEPS.map((step, i) => (
                  <div key={step.key} className={`rounded-xl border p-3 ${step.color}`}>
                    <div className="flex items-center gap-2 mb-1 text-neutral-400">
                      {step.icon}
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Passo {i + 1}</span>
                    </div>
                    <p className="text-xs font-medium text-white">{step.label}</p>
                  </div>
                ))}
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 text-white text-xs bg-neutral-800 border border-neutral-700 rounded-lg p-3 mb-4">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              <button
                onClick={handleStart}
                className="w-full py-3 px-6 rounded-xl font-bold text-sm text-black bg-white hover:bg-neutral-200 transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
              >
                <RadioTower className="h-4 w-4" />
                Iniciar Mapeamento de AC
              </button>
            </CardContent>
          </Card>
        </motion.div>
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
          <Card className="rounded-2xl border border-neutral-700 bg-neutral-900 backdrop-blur-md shadow-2xl">
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-neutral-800 border-2 border-neutral-600 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-white">Mapeamento Concluído!</h3>
                <p className="text-sm text-neutral-400 mt-1">O vaso aprendeu {STEPS.length} comandos do seu AC.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-2">
                {STEPS.map((step) => (
                  <div key={step.key} className="flex items-center gap-2 text-sm text-white bg-neutral-800 rounded-lg p-2.5">
                    <CheckCircle2 className="h-4 w-4 text-white flex-shrink-0" />
                    {step.label}
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setPhase('idle'); }}
                className="mt-2 py-2 px-6 rounded-xl font-semibold text-sm text-black bg-white hover:bg-neutral-200 transition-colors border border-transparent"
              >
                Configurar Novamente
              </button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Render: LEARNING state
  // ────────────────────────────────────────────────────────────────────────────
  const activeStep = STEPS[currentStep]

  return (
    <div className="space-y-6 relative">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-black px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center gap-2"
          >
            {successToast}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Progress bar */}
      <Card className="rounded-2xl border border-neutral-800 bg-black/40 backdrop-blur-md shadow-2xl overflow-hidden">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Progresso do Treinamento</span>
            <span className="text-xs font-black text-white">{capturedCount}/{STEPS.length} comandos</span>
          </div>
          <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
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
                      ? 'border-neutral-500 bg-neutral-800 text-white'
                      : active
                      ? 'border-neutral-300 bg-neutral-700 text-white'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-600'
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
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white opacity-40" />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-neutral-800 flex items-center justify-center">
                  {activeStep.icon}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400">Passo {currentStep + 1} de {STEPS.length}</p>
                  <CardTitle className="text-white text-base mt-0.5">{activeStep.label}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-300 leading-relaxed mb-1">{activeStep.description}</p>
              <p className="text-xs text-neutral-500 mb-5">{activeStep.hint}</p>

              {errorMsg && (
                <div className="flex items-start gap-2 text-white text-xs bg-neutral-800 border border-neutral-700 rounded-lg p-3 mb-4">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {waitingCapture ? (
                <div className="flex items-center justify-center gap-3 py-5 text-neutral-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">Aguardando sinal IR do vaso...</span>
                </div>
              ) : (
                <button
                  onClick={handlePressedButton}
                  className="w-full py-3 px-6 rounded-xl font-bold text-sm text-black bg-white hover:bg-neutral-200 transition-all duration-200 border border-transparent flex items-center justify-center gap-2"
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
        <Card className="rounded-2xl border border-neutral-800 bg-neutral-900 backdrop-blur-md shadow-2xl">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-3">Comandos Capturados</p>
            <div className="space-y-2">
              {STEPS.filter((s) => captured[s.key]?.validado).map((step) => (
                <div key={step.key} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-white flex-shrink-0" />
                  <span className="text-white font-medium">{step.label}</span>
                  <span className="text-neutral-500 text-xs font-mono ml-auto truncate max-w-[120px]">
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

