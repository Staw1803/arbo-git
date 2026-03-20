import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // 1. Fetch latest baseline (teto mensal)
    const { data: bills } = await supabase
      .from("energy_bills")
      .select("monthly_ceiling, kwh_consumption")
      .eq("company_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)

    const baseline = bills && bills.length > 0 ? bills[0] : null
    
    // 2. Fetch sum of active economy (audit_logs)
    const { data: audits } = await supabase
      .from("audit_logs")
      .select("savings_generated_brl")
      .eq("company_id", user.id)

    let totalSavings = 0
    if (audits) {
       totalSavings = audits.reduce((acc, log) => acc + Number(log.savings_generated_brl || 0), 0)
    }

    // Cost estimate to calculate Carbon
    // Assuming R$ 0.90 per kWh in Brazil average
    const kwhSaved = totalSavings / 0.90
    // Factor: 0.085 kg CO2 per kWh
    const carbonReducedKg = kwhSaved * 0.085

    // Projected spend (Mock: assuming we are tracking at 40% of ceiling for the month, or baseline if no ceiling)
    const projectedSpend = baseline ? (baseline.monthly_ceiling * 0.42) : 0

    return NextResponse.json({
      ceiling: baseline?.monthly_ceiling || 0,
      projected_spend: projectedSpend,
      total_savings_brl: totalSavings,
      carbon_reduced_kg: carbonReducedKg
    })

  } catch (err: any) {
    console.error("ESG API Error:", err)
    return NextResponse.json({ error: "Erro ao buscar métricas ESG" }, { status: 500 })
  }
}
