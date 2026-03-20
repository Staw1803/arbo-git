import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Use service role key to bypass RLS for background jobs
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { searchParams } = new URL(request.url)
    const mac_address = searchParams.get('mac_address') || 'C8:F0:9E:XX:XX:XX' // Fallback for dev

    // 1. Fetch the Monthly Ceiling (Baseline)
    const { data: bills } = await supabase
      .from("energy_bills")
      .select("monthly_ceiling, kwh_consumption, created_at")
      .order("created_at", { ascending: false })
      .limit(1)

    if (!bills || bills.length === 0) {
      return NextResponse.json({ message: "Sem linha de base cadastrada. Motor inativo." })
    }

    const billsRecord = bills[0]
    const ceiling = billsRecord.monthly_ceiling || null
    
    // If there's no ceiling, we can't make financial decisions yet
    if (!ceiling) {
      return NextResponse.json({ message: "Limites não estabelecidos." })
    }

    // Determine se a empresa está no Modo de Aprendizado (15 dias)
    const baselineDate = new Date(billsRecord.created_at)
    const msSinceBaseline = Date.now() - baselineDate.getTime()
    const isLearningMode = (msSinceBaseline < 15 * 24 * 60 * 60 * 1000)

    // 2. Fetch recent telemetry (last 15 minutes)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60000).toISOString()
    
    // Check if there was ANY presence in the last 15 mins
    const { data: presenceData, error: telemetryError } = await supabase
      .from("telemetria")
      .select("presenca")
      .eq("mac_address", mac_address)
      .gte("timestamp", fifteenMinsAgo)
    
    if (telemetryError) {
      console.error("Telemetry error", telemetryError)
      return NextResponse.json({ error: "Erro ao buscar telemetria" }, { status: 500 })
    }

    // True if we have data AND none of the records showed presence
    const hasData = presenceData && presenceData.length > 0
    const noPresenceFor15Mins = hasData && presenceData.every(row => row.presenca === false)

    // 3. Projected Consumption Logic (Mocked for prototype)
    // Normally we'd calculate: (Current kWh used / days passed) * days in month
    // We will simulate a high projection to trigger the rule if no presence is detected
    const projectedConsumptionValue = ceiling * 1.05 // Simulating it's 5% above ceiling
    const isAboveCeiling = projectedConsumptionValue > ceiling

    // 4. Execute Business Rule: IF (Projected > Teto) AND (Sem Presenca > 15m) -> Desligar Ar
    if (isAboveCeiling && noPresenceFor15Mins) {
       // Check if we already turned it off recently to prevent spamming
       const { data: recentCommand } = await supabase
         .from("device_commands")
         .select("id")
         .eq("mac_address", mac_address)
         .eq("command", "AC_OFF")
         .gte("created_at", fifteenMinsAgo)
         .limit(1)

       if (!recentCommand || recentCommand.length === 0) {
         console.log("Condição atingida. Acionando desligamento autônomo.")
         const assumedSavings = parseFloat((ceiling * 0.01).toFixed(2))

         if (isLearningMode) {
             // O vaso DEVE NÃO desligar o ar. Apenas registra.
             await supabase.from("audit_logs").insert({
               action: "LEARNING_SIMULATION",
               reason: "Modo Aprendizado (+Projeção Alta & Sala Vazia)",
               savings_generated_brl: assumedSavings
             })

             return NextResponse.json({
               action: "LEARNING_SIMULATION",
               message: "Ar condicionado seria desligado, mas o Modo de Aprendizado (Capital Humano) está mapeando potenciais.",
               savings: assumedSavings
             })
         } else {
             // Modo Real, desliga o ar.
             await supabase.from("device_commands").insert({
               mac_address,
               command: "AC_OFF",
               payload: { source: "ARBO_AI_ENGINE" },
               status: "PENDING"
             })

             await supabase.from("audit_logs").insert({
               action: "AC_TURN_OFF",
               reason: "Consumo projetado alto detectado e sala vazia por >15min",
               savings_generated_brl: assumedSavings
             })

             return NextResponse.json({
               action: "AC_TURN_OFF",
               message: "Ar condicionado desligado automaticamente por inatividade.",
               savings: assumedSavings
             })
         }
       }
    }

    return NextResponse.json({
      status: "Monitoring",
      projected: projectedConsumptionValue,
      ceiling: ceiling,
      isLearningMode,
      noPresenceFor15Mins
    })

  } catch (err: any) {
    console.error("Decision Engine Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
