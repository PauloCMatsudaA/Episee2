import { useState, useEffect, useCallback } from 'react';
import { Check, X, AlertCircle, Clock, CheckCircle, XCircle, RefreshCw, PackageCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { epiRequestsApi } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';

const tabs = [
  { id: 'pendente',  label: 'Pendentes',  icon: Clock,        color: 'text-warn' },
  { id: 'aprovada',  label: 'Aprovadas',  icon: CheckCircle,  color: 'text-ok'   },
  { id: 'rejeitada', label: 'Rejeitadas', icon: XCircle,      color: 'text-err'  },
];

export default function EpiRequests() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [abaAtiva,     setAbaAtiva]     = useState('pendente');
  const [carregando,   setCarregando]   = useState(true);
  const [processando,  setProcessando]  = useState(false);
  const [erro,         setErro]         = useState('');

  const [modalAprovar,   setModalAprovar]   = useState(null);
  const [modalRejeitar,  setModalRejeitar]  = useState(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  const carregarSolicitacoes = useCallback(async () => {
    setErro('');
    try {
      const res = await epiRequestsApi.listar();
      setSolicitacoes(res.data || []);
    } catch {
      setErro('Nao foi possivel carregar as solicitacoes.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregarSolicitacoes(); }, [carregarSolicitacoes]);

  function patchItem(id, campos) {
    setSolicitacoes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...campos } : s))
    );
  }

  const filtradas = solicitacoes.filter((s) => s.status === abaAtiva);
  const contagem  = {
    pendente:  solicitacoes.filter((s) => s.status === 'pendente').length,
    aprovada:  solicitacoes.filter((s) => s.status === 'aprovada').length,
    rejeitada: solicitacoes.filter((s) => s.status === 'rejeitada').length,
  };

  async function confirmarAprovacao() {
    if (!modalAprovar) return;
    const id = modalAprovar.id;
    setProcessando(true);
    patchItem(id, { status: 'aprovada' });
    setAbaAtiva('aprovada');
    setModalAprovar(null);
    try {
      await epiRequestsApi.aprovar(id);
    } catch {
      patchItem(id, { status: 'pendente' });
      setAbaAtiva('pendente');
      setErro('Erro ao aprovar a solicitacao. Tente novamente.');
    } finally {
      setProcessando(false);
    }
  }

  async function confirmarRejeicao() {
    if (!modalRejeitar || !motivoRejeicao.trim()) return;
    const id = modalRejeitar.id;
    const motivo = motivoRejeicao.trim();
    setProcessando(true);
    patchItem(id, { status: 'rejeitada', motivo_rejeicao: motivo });
    setAbaAtiva('rejeitada');
    setModalRejeitar(null);
    setMotivoRejeicao('');
    try {
      await epiRequestsApi.rejeitar(id, motivo);
    } catch {
      patchItem(id, { status: 'pendente', motivo_rejeicao: null });
      setAbaAtiva('pendente');
      setErro('Erro ao rejeitar a solicitacao. Tente novamente.');
    } finally {
      setProcessando(false);
    }
  }

  async function marcarEntrega(id, entregue) {
    setProcessando(true);
    patchItem(id, { entregue });
    try {
      await epiRequestsApi.entrega(id, entregue);
    } catch {
      patchItem(id, { entregue: !entregue });
      setErro('Erro ao registrar entrega. Tente novamente.');
    } finally {
      setProcessando(false);
    }
  }

  const solAprovarModal  = modalAprovar  ? solicitacoes.find((s) => s.id === modalAprovar.id)  : null;
  const solRejeitarModal = modalRejeitar ? solicitacoes.find((s) => s.id === modalRejeitar.id) : null;

  return (
    <div className="space-y-4">

      {erro && (
        <div className="alert alert-err flex items-center gap-2">
          <AlertCircle size={16} />
          <span className="text-sm">{erro}</span>
          <button onClick={() => setErro('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {}
      <div className="flex gap-1 rounded-xl border border-slate-100 bg-white p-1 shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setAbaAtiva(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                abaAtiva === tab.id
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                abaAtiva === tab.id ? 'bg-white/20' : 'bg-slate-100'
              }`}>
                {contagem[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      {}
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
        {carregando ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <AlertCircle size={40} className="mb-3 text-slate-300" />
            <p className="text-sm">
              Nenhuma solicitacao {abaAtiva === 'pendente' ? 'pendente' : abaAtiva === 'aprovada' ? 'aprovada' : 'rejeitada'}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {[
                    'Trabalhador', 'Setor', 'EPI Solicitado', 'Motivo', 'Data',
                    ...(abaAtiva === 'pendente'  ? ['Acoes']              : []),
                    ...(abaAtiva === 'aprovada'  ? ['Entrega']            : []),
                    ...(abaAtiva === 'rejeitada' ? ['Motivo da Rejeicao'] : []),
                  ].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtradas.map((sol) => (
                  <tr key={sol.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                      {sol.worker_name ?? `Trabalhador #${sol.worker_id}`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {sol.sector_name ?? `Setor #${sol.sector_id}`}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{sol.epi_type}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-500">{sol.reason}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {format(new Date(sol.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </td>

                    {}
                    {abaAtiva === 'pendente' && (
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setModalAprovar({ id: sol.id })}
                            disabled={processando}
                            className="flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                          >
                            <Check size={14} /> Aprovar
                          </button>
                          <button
                            onClick={() => { setModalRejeitar({ id: sol.id }); setMotivoRejeicao(''); }}
                            disabled={processando}
                            className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            <X size={14} /> Rejeitar
                          </button>
                        </div>
                      </td>
                    )}

                    {}
                    {abaAtiva === 'aprovada' && (
                      <td className="whitespace-nowrap px-4 py-3">
                        {sol.entregue ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                            <PackageCheck size={13} /> EPI Retirado
                          </span>
                        ) : (
                          <button
                            onClick={() => marcarEntrega(sol.id, true)}
                            disabled={processando}
                            className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-green-50 hover:text-green-700 disabled:opacity-50"
                          >
                            <PackageCheck size={14} /> Confirmar Retirada
                          </button>
                        )}
                      </td>
                    )}

                    {}
                    {abaAtiva === 'rejeitada' && (
                      <td className="max-w-xs px-4 py-3 text-xs text-red-600">
                        {sol.motivo_rejeicao || '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {}
      {modalAprovar && solAprovarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Check size={20} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Aprovar Solicitacao</h3>
                <p className="text-sm text-slate-500">Esta acao nao pode ser desfeita.</p>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1">
              <p><span className="font-medium text-slate-600">Trabalhador:</span> {solAprovarModal.worker_name ?? `#${solAprovarModal.worker_id}`}</p>
              <p><span className="font-medium text-slate-600">EPI:</span> {solAprovarModal.epi_type}</p>
              <p><span className="font-medium text-slate-600">Motivo:</span> {solAprovarModal.reason}</p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setModalAprovar(null)}
                disabled={processando}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAprovacao}
                disabled={processando}
                className="flex items-center gap-2 rounded-xl bg-ok px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60"
              >
                {processando && <RefreshCw size={14} className="animate-spin" />}
                Confirmar Aprovacao
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {modalRejeitar && solRejeitarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <X size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Rejeitar Solicitacao</h3>
                <p className="text-sm text-slate-500">O trabalhador sera notificado com o motivo.</p>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1 mb-4">
              <p><span className="font-medium text-slate-600">Trabalhador:</span> {solRejeitarModal.worker_name ?? `#${solRejeitarModal.worker_id}`}</p>
              <p><span className="font-medium text-slate-600">EPI:</span> {solRejeitarModal.epi_type}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Motivo da rejeicao <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                placeholder="Descreva o motivo da rejeicao..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
              />
              {!motivoRejeicao.trim() && (
                <p className="mt-1 text-xs text-red-500">O motivo e obrigatorio.</p>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setModalRejeitar(null); setMotivoRejeicao(''); }}
                disabled={processando}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRejeicao}
                disabled={processando || !motivoRejeicao.trim()}
                className="flex items-center gap-2 rounded-xl bg-err px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
              >
                {processando && <RefreshCw size={14} className="animate-spin" />}
                Confirmar Rejeicao
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
