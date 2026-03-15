"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/Logo'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Credenciais inválidas. Verifique e-mail e senha.')
      setIsLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8 bg-black text-white selection:bg-white selection:text-black">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <Logo className="w-32 h-32 text-white mb-2" />
          <p className="text-sm text-gray-400">Insira suas credenciais</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-gray-400">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                disabled={isLoading}
                className="bg-transparent border-white/20 focus-visible:ring-0 focus-visible:border-white rounded-none disabled:opacity-40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-gray-400">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                disabled={isLoading}
                className="bg-transparent border-white/20 focus-visible:ring-0 focus-visible:border-white rounded-none disabled:opacity-40"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-mono text-zinc-400 border border-zinc-800 px-3 py-2 text-center tracking-wide">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-none bg-white text-black hover:bg-gray-200 disabled:opacity-50 transition-all duration-300 h-12"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="text-sm font-medium tracking-widest">ACESSAR PORTAL</span>
            )}
          </Button>
        </form>
      </div>
    </main>
  )
}
