import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smile, TrendingDown, Zap, ArrowRight, Leaf, Building2, LineChart } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-black text-white selection:bg-white selection:text-black">

      {/* Hero */}
      <section className="flex flex-col items-center justify-center min-h-screen p-8 lg:p-24 relative overflow-hidden bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-50" />
        <div className="flex flex-col items-center gap-10 text-center max-w-4xl mx-auto relative z-10">
          <Logo className="w-52 h-52 text-white" />
          <div className="space-y-4">
            <p className="text-xs font-mono tracking-[0.4em] text-gray-500 uppercase">Plataforma de Governança Ambiental</p>
            <h1 className="text-4xl lg:text-6xl font-black tracking-tighter text-white leading-tight">
              Inteligência Ambiental.
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl leading-relaxed mx-auto">
              Telemetria autônoma e governança de dados para a climatização corporativa.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 px-8 py-4 text-sm font-medium tracking-widest text-black bg-white hover:bg-gray-200 transition-all duration-300"
            >
              ACESSAR PORTAL
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#roi" className="px-8 py-4 text-sm font-medium tracking-widest text-gray-400 border border-gray-700 hover:border-white hover:text-white transition-all duration-300">
              VER RESULTADOS
            </a>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
      </section>

      {/* Stats Bar */}
      <section className="border-y border-white/10 py-8 px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto text-center">
          <div>
            <p className="text-3xl font-black text-white">RT</p>
            <p className="text-xs text-gray-500 tracking-widest mt-1 uppercase">Telemetria de Alta Fidelidade</p>
          </div>
          <div>
            <p className="text-3xl font-black text-white">A.I.</p>
            <p className="text-xs text-gray-500 tracking-widest mt-1 uppercase">Núcleo Preditivo</p>
          </div>
          <div>
            <p className="text-3xl font-black text-white">24/7</p>
            <p className="text-xs text-gray-500 tracking-widest mt-1 uppercase">Monitoramento Contínuo</p>
          </div>
          <div>
            <p className="text-3xl font-black text-white">ROI</p>
            <p className="text-xs text-gray-500 tracking-widest mt-1 uppercase">Retorno Mensurável</p>
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section id="roi" className="py-24 px-8 lg:px-24">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16 text-center">
            <p className="text-xs font-mono tracking-[0.4em] text-gray-500 uppercase mb-4">Eficiência Energética</p>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight">Retorno sobre investimento real</h2>
            <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
              A automação ambiental inteligente da A.R.B.O. gera redução de desperdício, uso otimizado de recursos e eficiência energética mensurável.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            <div className="border border-zinc-800 p-10 group hover:border-zinc-600 transition-colors duration-300 bg-black">
              <TrendingDown className="h-8 w-8 text-zinc-400 mb-6" strokeWidth={1.2} />
              <h3 className="text-xl font-bold mb-3">Redução de Desperdício</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Acionamentos inteligentes e baseados em dados evitam o uso desnecessário de recursos, reduzindo perdas operacionais e custos variáveis mensais.
              </p>
              <div className="mt-6 pt-6 border-t border-zinc-800 group-hover:border-zinc-700 transition-colors duration-300">
                <p className="text-3xl font-black text-white">↓ Custos</p>
                <p className="text-xs text-gray-500 mt-1">por automação de acionamento</p>
              </div>
            </div>
            <div className="border border-zinc-800 lg:border-l-0 p-10 group hover:border-zinc-600 transition-colors duration-300 bg-black">
              <Zap className="h-8 w-8 text-zinc-400 mb-6" strokeWidth={1.2} />
              <h3 className="text-xl font-bold mb-3">Eficiência Energética</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Leituras em tempo real e controle de ciclos de consumo permitem que equipamentos operem apenas quando necessário — reduzindo a conta de energia.
              </p>
              <div className="mt-6 pt-6 border-t border-zinc-800 group-hover:border-zinc-700 transition-colors duration-300">
                <p className="text-3xl font-black text-white">↑ Eficiência</p>
                <p className="text-xs text-gray-500 mt-1">por controle de ciclos de consumo</p>
              </div>
            </div>
            <div className="border border-zinc-800 lg:border-l-0 p-10 group hover:border-zinc-600 transition-colors duration-300 bg-black">
              <LineChart className="h-8 w-8 text-zinc-400 mb-6" strokeWidth={1.2} />
              <h3 className="text-xl font-bold mb-3">Governança por Dados</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Histórico completo e auditável de todas as ações e leituras. Relatórios prontos para justificar investimentos e demonstrar impacto ao corpo diretivo.
              </p>
              <div className="mt-6 pt-6 border-t border-zinc-800 group-hover:border-zinc-700 transition-colors duration-300">
                <p className="text-3xl font-black text-white">↑ Visibilidade</p>
                <p className="text-xs text-gray-500 mt-1">via relatórios e histórico</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pilares */}
      <section className="py-24 px-8 lg:px-24 bg-white/[0.02] border-y border-white/10">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16 text-center">
            <p className="text-xs font-mono tracking-[0.4em] text-gray-500 uppercase mb-4">Propósito</p>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight">Pilares do projeto</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-none border border-zinc-800 bg-black text-white hover:border-zinc-600 shadow-none transition-colors duration-300">
              <CardHeader className="flex flex-col space-y-4 pb-4">
                <Smile className="h-8 w-8 text-zinc-400" strokeWidth={1.2} />
                <CardTitle className="text-xl font-semibold tracking-wide">Conforto & Bem-Estar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Ambientes com ambiente calibrado aumentam em até 15% a produtividade e reduzem o estresse ocupacional, em conformidade com a NR-17.
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-none border border-zinc-800 bg-black text-white hover:border-zinc-600 shadow-none transition-colors duration-300">
              <CardHeader className="flex flex-col space-y-4 pb-4">
                <Leaf className="h-8 w-8 text-zinc-400" strokeWidth={1.2} />
                <CardTitle className="text-xl font-semibold tracking-wide">ESG & Sustentabilidade</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Dados rastreáveis para demonstrar práticas sustentáveis, alinhadas às metas ESG e critérios de certificação ambiental corporativa.
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-none border border-zinc-800 bg-black text-white hover:border-zinc-600 shadow-none transition-colors duration-300">
              <CardHeader className="flex flex-col space-y-4 pb-4">
                <Building2 className="h-8 w-8 text-zinc-400" strokeWidth={1.2} />
                <CardTitle className="text-xl font-semibold tracking-wide">Inteligência Corporativa</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Dados centralizados para auditoria, relatórios executivos e tomada de decisão estratégica baseada em métricas reais.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-8 border-t border-white/10">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-8">
          <Logo className="w-20 h-20 text-white" hideText={true} />
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight">Comece a medir o que importa</h2>
          <p className="text-gray-400 max-w-xl">
            Acesse o portal de telemetria e visualize seus dados ambientais, decisões da A.I. e o histórico completo de governança em tempo real.
          </p>
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 px-10 py-5 text-sm font-bold tracking-widest text-black bg-white hover:bg-gray-200 transition-all duration-300"
          >
            ACESSAR PORTAL AGORA
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 py-10 text-center mt-auto">
        <div className="flex flex-col items-center justify-center gap-4">
          <Logo className="w-16 h-16 text-white" hideText={false} />
          <p className="text-xs text-gray-600 tracking-wider">
            © 2025 Projeto A.R.B.O. — Automação, Robótica e Biofilia Organizacional.
          </p>
        </div>
      </footer>
    </main>
  );
}
