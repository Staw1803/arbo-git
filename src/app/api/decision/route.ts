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
      .select("monthly_ceiling, kwh_consumption")
      .order("created_at", { ascending: false })
      .limit(1)

    const ceiling = bills && bills.length > 0 ? bills[0].monthly_ceiling : null
    
    // If there's no ceiling, we can't make financial decisions yet
    if (!ceiling) {
      return NextResponse.json({ message: "Sem linha de base cadastrada. Motor inativo." })
    }

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
         
         // Insert Command to Vaso
         await supabase.from("device_commands").insert({
           mac_address,
           command: "AC_OFF",
           payload: { source: "ARBO_AI_ENGINE" },
           status: "PENDING"
         })

         // Log to Audit
         const assumedSavings = parseFloat((ceiling * 0.01).toFixed(2)) // Example: saved 1% of ceiling by turning off early
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

    return NextResponse.json({
      status: "Monitoring",
      projected: projectedConsumptionValue,
      ceiling: ceiling,
      noPresenceFor15Mins
    })

  } catch (err: any) {
    console.error("Decision Engine Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
