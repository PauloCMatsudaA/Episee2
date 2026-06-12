import { useState, useEffect, useCallback } from 'react';
import { Check, X, AlertCircle, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import BadgeStatus from '../components/AlertBadge';
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
  const [solicitacoes,  setSolicitacoes]  = useState([]);
  const [abaAtiva,      setAbaAtiva]      = useState('pendente');
  const [modalConfirm,  setModalConfirm]  = useState(null);
  const [carregando,    setCarregando]    = useState(true);
  const [processando,   setProcessando]   = useState(false);
  const [erro,          setErro]          = useState('');

  const carregarSolicitacoes = useCallback(async () => {
    setErro('');
    try {
      const res = await epiRequestsApi.listar();
      setSolicitacoes(res.data || []);
    } catch {
      setErro('Não foi possível carregar as solicitações.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarSolicitacoes();
  }, [carregarSolicitacoes]);

  const filtradas = solicitacoes.filter((s) => s.status === abaAtiva);
  const contagem  = {
    pendente:  solicitacoes.filter((s) => s.status === 'pendente').length,
    aprovada:  solicitacoes.filter((s) => s.status === 'aprovada').length,
    rejeitada: solicitacoes.filter((s) => s.status === 'rejeitada').length,
  };

  async function confirmarAcao() {
    if (!modalConfirm) return;
    const { id, acao } = modalConfirm;
    setProcessando(true);
    try {
      if (acao === 'aprovar') {
        await epiRequestsApi.aprovar(id);
      } else {
        await epiRequestsApi.rejeitar(id);
      }
      await carregarSolicitacoes();
      setAbaAtiva(acao === 'aprovar' ? 'aprovada' : 'rejeitada');
    } catch {
      setErro('Erro ao processar a solicitação. Tente novamente.');
    } finally {
      setProcessando(false);
      setModalConfirm(null);
    }
  }

  const solicitacaoModal = modalConfirm
    ? solicitacoes.find((s) => s.id === modalConfirm.id)
    : null;

  return (
    <div className="space-y-4">

      {erro && (
        <div className="alert alert-err flex items-center gap-2">
          <AlertCircle size={16} />
          <span className="text-sm">{erro}</span>
          <button onClick={() => setErro('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

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

      <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
        {carregando ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <AlertCircle size={40} className="mb-3 text-slate-300" />
            <p className="text-sm">
              Nenhuma solicitação{' '}
              {abaAtiva === 'pendente' ? 'pendente' : abaAtiva === 'aprovada' ? 'aprovada' : 'rejeitada'}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Trabalhador', 'Setor', 'EPI Solicitado', 'Motivo', 'Data', 'Status', ...(abaAtiva === 'pendente' ? ['Ações'] : [])].map((h) => (
                    <th key={h} className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 ${h === 'Motivo' ? 'hidden md:table-cell' : ''}`}>
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
                    <td className="hidden max-w-xs truncate px-4 py-3 text-slate-500 md:table-cell">
                      {sol.reason}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {format(new Date(sol.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <BadgeStatus status={sol.status} />
                    </td>
                    {abaAtiva === 'pendente' && (
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setModalConfirm({ id: sol.id, acao: 'aprovar' })}
                            className="flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                          >
                            <Check size={14} /> Aprovar
                          </button>
                          <button
                            onClick={() => setModalConfirm({ id: sol.id, acao: 'rejeitar' })}
                            className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                          >
                            <X size={14} /> Rejeitar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalConfirm && solicitacaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl fade-in">
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                modalConfirm.acao === 'aprovar' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {modalConfirm.acao === 'aprovar'
                  ? <Check size={20} className="text-green-600" />
                  : <X size={20} className="text-red-600" />}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {modalConfirm.acao === 'aprovar' ? 'Aprovar Solicitação' : 'Rejeitar Solicitação'}
                </h3>
                <p className="text-sm text-slate-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1">
              <p><span className="font-medium text-slate-600">EPI:</span> {solicitacaoModal.epi_type}</p>
              <p><span className="font-medium text-slate-600">Motivo:</span> {solicitacaoModal.reason}</p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setModalConfirm(null)}
                disabled={processando}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAcao}
                disabled={processando}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                  modalConfirm.acao === 'aprovar'
                    ? 'bg-ok hover:bg-green-600'
                    : 'bg-err hover:bg-red-600'
                }`}
              >
                {processando && <RefreshCw size={14} className="animate-spin" />}
                {modalConfirm.acao === 'aprovar' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}