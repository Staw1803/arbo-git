import { login } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/Logo'

export default async function LoginPage({
    searchParams
}: {
    searchParams: Promise<{ error?: string }>
}) {
  const resolvedParams = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-8 bg-black text-white selection:bg-white selection:text-black">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
            <Logo className="w-32 h-32 text-white mb-2" />
            <p className="text-sm text-gray-400">Insira suas credenciais</p>
        </div>

        <form className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-gray-400">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                className="bg-transparent border-white/20 focus-visible:ring-0 focus-visible:border-white rounded-none"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider text-gray-400">Senha</Label>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="bg-transparent border-white/20 focus-visible:ring-0 focus-visible:border-white rounded-none"
              />
            </div>
          </div>
          
          {resolvedParams?.error && (
            <p className="text-sm border border-[#333333] p-3 text-center">{resolvedParams.error}</p>
          )}

          <Button type="submit" formAction={login} className="w-full rounded-none bg-white text-black hover:bg-gray-200">
            Acessar Portal
          </Button>
        </form>
      </div>
    </main>
  )
}
