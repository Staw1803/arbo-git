import React, { useState } from 'react';
import { Wallet, ArrowDownCircle, Coins, RefreshCw, Check } from 'lucide-react';
import { db, isFirebaseConfigured } from '../firebaseClient';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

const COINS_PER_BRL = 10; // 10 moedas = R$ 1,00

interface WalletTabProps {
  balance: number;
  userId: string | null;
  setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
  onBalanceUpdate: (newBalance: number) => void;
}

export default function WalletTab({ balance, userId, setToast, onBalanceUpdate }: WalletTabProps) {
  const [pixKey, setPixKey] = useState('');
  const [withdrawCoins, setWithdrawCoins] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const brlValue = (balance / COINS_PER_BRL).toFixed(2);
  const withdrawBRL = (Number(withdrawCoins) / COINS_PER_BRL).toFixed(2);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const coins = Number(withdrawCoins);
    if (!coins || coins <= 0) { setToast({ message: 'Informe um valor válido de moedas.', type: 'error' }); return; }
    if (coins > balance) { setToast({ message: 'Saldo insuficiente.', type: 'error' }); return; }
    if (coins < COINS_PER_BRL) { setToast({ message: `Mínimo de ${COINS_PER_BRL} moedas (R$ 1,00) para saque.`, type: 'error' }); return; }
    if (!pixKey.trim()) { setToast({ message: 'Informe sua chave PIX.', type: 'error' }); return; }

    setLoading(true);
    try {
      const brl = Number((coins / COINS_PER_BRL).toFixed(2));
      if (isFirebaseConfigured && userId) {
        await updateDoc(doc(db, 'users', userId), { credits: increment(-coins) });
        await addDoc(collection(db, 'withdrawals'), {
          userId, pixKey: pixKey.trim(), coinsAmount: coins, brlAmount: brl,
          status: 'pendente', createdAt: serverTimestamp()
        });
        onBalanceUpdate(balance - coins);
      }
      setSuccess(true);
      setPixKey('');
      setWithdrawCoins('');
      setToast({ message: `Saque de R$ ${brl.toFixed(2)} solicitado! Processamento em até 3 dias úteis.`, type: 'success' });
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setToast({ message: `Erro ao solicitar saque: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen border-r border-zinc-800 bg-black min-w-0">
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-6 py-4">
        <h2 className="text-lg font-black tracking-tight text-white text-left">Carteira</h2>
      </div>

      <div className="p-4 flex flex-col gap-5 max-w-lg">
        {/* Balance Card */}
        <div className="border border-zinc-800 rounded-3xl p-6 bg-transparent flex flex-col gap-3">
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-black uppercase tracking-wider">
            <Wallet className="w-4 h-4" />
            <span>Saldo Disponível</span>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-black text-white">{balance.toLocaleString('pt-BR')}</span>
            <span className="text-zinc-400 font-bold text-sm mb-1">🪙 moedas</span>
          </div>
          <div className="flex items-center gap-2 border-t border-zinc-900 pt-3 mt-1">
            <Coins className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400 font-bold">
              Equivalente a{' '}
              <span className="text-white font-black">R$ {brlValue}</span>
              {' '}(taxa: {COINS_PER_BRL} moedas = R$ 1,00)
            </span>
          </div>
        </div>

        {/* Withdraw Form */}
        <div className="border border-zinc-800 rounded-3xl p-6 bg-transparent flex flex-col gap-5">
          <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
            <ArrowDownCircle className="w-4 h-4 text-sky-400" />
            <h3 className="font-extrabold text-white text-sm">Solicitar Saque via PIX</h3>
          </div>

          <form onSubmit={handleWithdraw} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Chave PIX de destino</label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                className="bg-black border border-zinc-800 focus:border-sky-500 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none font-medium"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Quantidade de Moedas</label>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  min={COINS_PER_BRL}
                  max={balance}
                  step={COINS_PER_BRL}
                  value={withdrawCoins}
                  onChange={(e) => setWithdrawCoins(e.target.value)}
                  placeholder={`Mín. ${COINS_PER_BRL} moedas`}
                  className="flex-1 bg-black border border-zinc-800 focus:border-sky-500 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setWithdrawCoins(String(balance))}
                  className="px-3 py-2 rounded-xl border border-zinc-800 text-xs font-black text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer shrink-0"
                >
                  Máx
                </button>
              </div>
              {withdrawCoins && Number(withdrawCoins) > 0 && (
                <p className="text-xs text-zinc-500 font-bold">
                  Você vai receber: <span className="text-sky-400 font-black">R$ {withdrawBRL}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || success || balance === 0}
              className="w-full py-3 rounded-full bg-white text-black font-extrabold text-sm hover:bg-zinc-200 disabled:opacity-40 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {success ? (
                <><Check className="w-4 h-4 text-emerald-500" /><span>Saque solicitado!</span></>
              ) : loading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /><span>Processando...</span></>
              ) : (
                <><ArrowDownCircle className="w-4 h-4" /><span>Solicitar Saque</span></>
              )}
            </button>
          </form>

          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-3 text-xs text-zinc-500 font-medium leading-relaxed">
            ℹ️ Saques são processados manualmente em até <strong className="text-zinc-300">3 dias úteis</strong>.
            O valor mínimo é de <strong className="text-zinc-300">R$ 1,00 ({COINS_PER_BRL} moedas)</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}
