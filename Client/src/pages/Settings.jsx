import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, Save, Eye, EyeOff, Check, Copy, Send, Link } from 'lucide-react';
import api from '../api/api';

export default function Configuracoes() {
  const { usuario } = useAuth();

  const [nome,           setNome]           = useState(usuario?.nome || usuario?.name || '');
  const [email,          setEmail]          = useState(usuario?.email || '');
  const [senhaAtual,     setSenhaAtual]     = useState('');
  const [novaSenha,      setNovaSenha]      = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenhas,  setMostrarSenhas]  = useState(false);
  const [perfilSalvo,    setPerfilSalvo]    = useState(false);
  const [senhaSalva,     setSenhaSalva]     = useState(false);

  const [tgVinculado,  setTgVinculado]  = useState(false);
  const [tgCodigo,     setTgCodigo]     = useState(null);
  const [tgCarregando, setTgCarregando] = useState(false);
  const [tgCopiado,    setTgCopiado]    = useState(false);
  const [tgErro,       setTgErro]       = useState('');

  useEffect(() => {
    api.get('/api/telegram/status')
      .then(({ data }) => setTgVinculado(data.vinculado))
      .catch(() => setTgVinculado(false));
  }, []);

  async function salvarPerfil() {
    try {
      await api.patch(`/api/users/${usuario.id}`, { name: nome, email });
      setPerfilSalvo(true);
      setTimeout(() => setPerfilSalvo(false), 2000);
    } catch {
      alert('Erro ao salvar perfil.');
    }
  }

  async function alterarSenha() {
    if (novaSenha !== confirmarSenha || !senhaAtual) return;
    try {
      await api.patch(`/api/users/${usuario.id}`, { password: novaSenha });
      setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha('');
      setSenhaSalva(true);
      setTimeout(() => setSenhaSalva(false), 2000);
    } catch {
      alert('Erro ao alterar senha.');
    }
  }

  async function gerarCodigoTelegram() {
    setTgCarregando(true);
    setTgErro('');
    try {
      const { data } = await api.post('/api/telegram/gerar-codigo');
      setTgCodigo(data);
    } catch {
      setTgErro('Erro ao gerar código. Tente novamente.');
    } finally {
      setTgCarregando(false);
    }
  }

  function copiarComandoTg() {
    navigator.clipboard.writeText(`/vincular ${tgCodigo.codigo}`);
    setTgCopiado(true);
    setTimeout(() => setTgCopiado(false), 2000);
  }

  const tiposInput = mostrarSenhas ? 'text' : 'password';
  const senhasNaoCoincidem = novaSenha && confirmarSenha && novaSenha !== confirmarSenha;

  return (
    <div className="pg">

      {}
      <div className="card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <div className="icon-box bg-blue-50"><User size={16} className="text-blue-500" /></div>
          <h3 className="sec-title">Minha Conta</h3>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="field">
              <label className="label">Nome</label>
              <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">E-mail</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={salvarPerfil} className="btn btn-primary gap-2">
              {perfilSalvo
                ? <><Check size={15} /> Salvo!</>
                : <><Save size={15} /> Salvar dados</>
              }
            </button>
          </div>

          <div className="divider pt-4 space-y-3">
            <h4 className="sec-title mb-3">Alterar Senha</h4>
            <div className="input-icon">
              <input
                className="input pr-10"
                type={tiposInput}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="Senha atual"
              />
              <button
                type="button"
                onClick={() => setMostrarSenhas((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {mostrarSenhas ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input className="input" type={tiposInput} value={novaSenha}      onChange={(e) => setNovaSenha(e.target.value)}      placeholder="Nova senha" />
              <input className="input" type={tiposInput} value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="Confirmar senha" />
            </div>
            {senhasNaoCoincidem && <p className="text-xs text-err">As senhas não coincidem.</p>}
            <div className="flex justify-end">
              <button
                onClick={alterarSenha}
                disabled={!senhaAtual || !novaSenha || novaSenha !== confirmarSenha}
                className="btn gap-2 bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {senhaSalva
                  ? <><Check size={15} /> Senha alterada!</>
                  : <><Save size={15} /> Alterar Senha</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="card mt-6">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <div className="icon-box bg-sky-50"><Send size={16} className="text-sky-500" /></div>
          <h3 className="sec-title">Alertas via Telegram</h3>
          {tgVinculado && (
            <span className="badge badge-success text-xs ml-auto">
              <Check size={11} /> Ativo
            </span>
          )}
        </div>
        <div className="card-body space-y-4">
          {tgVinculado ? (
            <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Check size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">Telegram vinculado com sucesso!</p>
                <p className="text-sm text-green-600">Você receberá alertas automaticamente quando uma não conformidade for detectada.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-700 mb-3">Como vincular:</p>
                <ol className="space-y-2.5">
                  {[
                    <>Clique em <strong>"Gerar código"</strong> abaixo</>,
                    <>Abra o Telegram e pesquise por <strong>@episee_bot</strong></>,
                    <>Envie o comando gerado (ex: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">/vincular EPIS-3FA2C1</code>)</>,
                  ].map((texto, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <span>{texto}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {tgErro && <p className="text-sm text-red-500">{tgErro}</p>}

              {!tgCodigo ? (
                <button onClick={gerarCodigoTelegram} disabled={tgCarregando} className="btn btn-primary gap-2">
                  <Link size={15} />
                  {tgCarregando ? 'Gerando...' : 'Gerar código de vinculação'}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 font-medium mb-1">
                        Envie este comando no Telegram para <strong className="text-slate-700">{tgCodigo.bot}</strong>:
                      </p>
                      <code className="text-base font-bold text-slate-800 tracking-wider font-mono">
                        /vincular {tgCodigo.codigo}
                      </code>
                    </div>
                    <button onClick={copiarComandoTg} className="btn btn-ghost btn-sm shrink-0" title="Copiar comando">
                      {tgCopiado ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">⚠️ O código é de uso único. Após vincular, esta tela atualizará.</p>
                  <button onClick={gerarCodigoTelegram} disabled={tgCarregando} className="btn btn-ghost btn-sm">
                    Gerar novo código
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

    </div>
  );
}
