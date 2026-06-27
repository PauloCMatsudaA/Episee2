import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
  const navegar            = useNavigate();
  const { login, loading } = useAuth();

  const [email, setEmail]               = useState('');
  const [senha, setSenha]               = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro]                 = useState('');

  async function aoEnviar(e) {
    e.preventDefault();
    setErro('');

    if (!email || !senha) {
      setErro('Preencha todos os campos.');
      return;
    }

    try {
      await login(email, senha);
      navegar('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Credenciais inválidas.';
      setErro(msg);
    }
  }

  function alternarSenha() {
    setMostrarSenha((v) => !v);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6 sm:p-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <span className="text-3xl font-bold text-slate-800">
            EPI<span className="text-brand">see</span>
          </span>
        </div>

        <h3 className="text-2xl font-bold text-slate-800">Bem-vindo</h3>
        <p className="mt-1 text-sm text-slate-500">Faça login para acessar o painel de gestão.</p>
        <form onSubmit={aoEnviar} className="mt-6 space-y-4">
          {erro && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              {erro}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Senha</label>
            <div className="relative">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
              />
              <button
                type="button"
                onClick={alternarSenha}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-brand" />
              <span className="text-sm text-slate-500">Lembrar de mim</span>
            </label>
            <a href="#" className="text-sm font-medium text-brand hover:text-brand-h">
              Esqueceu a senha?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-brand-h disabled:opacity-60"
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> Entrando...</>
              : 'Entrar'
            }
          </button>
        </form>
      </div>
    </div>
  );
}
