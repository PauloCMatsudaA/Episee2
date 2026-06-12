import { useState, useEffect, useCallback } from 'react';
import { Filter, X, ChevronLeft, ChevronRight, Search, RefreshCw } from 'lucide-react';
import TabelaOcorrencias from '../components/OccurrenceTable';
import BadgeStatus from '../components/AlertBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ocorrenciasApi } from '../api/api';

const STATUS_OPTS = [
  { value: '',             label: 'Todos'         },
  { value: 'conforme',     label: 'Conforme'      },
  { value: 'nao_conforme', label: 'Não Conforme'  },
];

function formatarDataModal(valor) {
  if (!valor) return '—';
  try {
    const d = typeof valor === 'string' ? parseISO(valor) : new Date(valor);
    return isValid(d) ? format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—';
  } catch { return '—'; }
}

export default function Occurrences() {
  const [ocorrencias,       setOcorrencias]       = useState([]);
  const [carregando,        setCarregando]         = useState(true);
  const [erro,              setErro]               = useState('');
  const [totalResultados,   setTotalResultados]    = useState(0);

  const [statusFilter,  setStatusFilter]  = useState('');
  const [startDate,     setStartDate]     = useState('');
  const [endDate,       setEndDate]       = useState('');
  const [searchTerm,    setSearchTerm]    = useState('');
  const [currentPage,   setCurrentPage]  = useState(1);
  const [selected,      setSelected]      = useState(null);

  const perPage = 10;

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const params = {
        skip:  (currentPage - 1) * perPage,
        limit: perPage,
      };
      if (statusFilter) params.status    = statusFilter;
      if (startDate)    params.start_date = startDate;
      if (endDate)      params.end_date   = endDate;

      const res = await ocorrenciasApi.listar(params);
      const lista = res.data || [];
      setOcorrencias(lista);
      setTotalResultados(lista.length < perPage
        ? (currentPage - 1) * perPage + lista.length
        : currentPage * perPage + 1
      );
    } catch (e) {
      setErro('Não foi possível carregar as ocorrências.');
    } finally {
      setCarregando(false);
    }
  }, [currentPage, statusFilter, startDate, endDate]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  const filtradas = ocorrencias.filter((occ) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    const camera = (occ.camera ?? occ.camera_id ?? '').toString().toLowerCase();
    const epis   = Array.isArray(occ.epi_detected)
      ? occ.epi_detected.join(' ').toLowerCase()
      : '';
    return (
      camera.includes(t) ||
      epis.includes(t)   ||
      String(occ.id).includes(t)
    );
  });

  const totalPages = Math.max(1, Math.ceil(totalResultados / perPage));

  const limparFiltros = () => {
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const campoModal = (occ) => ({
    camera:     occ.camera    ?? occ.camera_id    ?? '—',
    sector:     occ.sector    ?? occ.sector_id    ?? '—',
    data:       formatarDataModal(occ.timestamp   ?? occ.datetime ?? occ.created_at),
    confianca:  occ.confidence != null
      ? occ.confidence <= 1
        ? `${Math.round(occ.confidence * 100)}%`
        : `${Math.round(occ.confidence)}%`
      : '—',
    epis: Array.isArray(occ.epi_detected)
      ? occ.epi_detected
      : typeof occ.epi_detected === 'string'
        ? occ.epi_detected.split(',').map(s => s.trim()).filter(Boolean)
        : occ.epis ?? [],
    status:     occ.status,
    notas:      occ.notes ?? '',
    trabalhador: occ.worker ?? occ.worker_name ?? '—',
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          {/* Busca local */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Câmera, EPI, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-40 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
            >
              {STATUS_OPTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* De */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">De</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
            />
          </div>

          {/* Até */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Até</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
            />
          </div>

          <button
            onClick={limparFiltros}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100"
          >
            <X size={14} /> Limpar
          </button>

          <button
            onClick={() => buscar()}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-brand transition-colors hover:bg-brand-l"
          >
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs text-slate-400">
            {filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''} nesta página
          </span>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
        {carregando ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : erro ? (
          <div className="flex justify-center py-12 text-sm text-red-500">{erro}</div>
        ) : (
          <TabelaOcorrencias
            ocorrencias={filtradas}
            aoVerDetalhes={setSelected}
          />
        )}

        {/* Paginação */}
        {!carregando && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <span className="text-xs text-slate-400">Página {currentPage} de {totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page;
                if (totalPages <= 5)          page = i + 1;
                else if (currentPage <= 3)    page = i + 1;
                else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                else                          page = currentPage - 2 + i;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-brand text-white'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalhes */}
      {selected && (() => {
        const c = campoModal(selected);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl fade-in">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">
                  Ocorrência #{String(selected.id).padStart(4, '0')}
                </h3>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-400">Câmera</p>
                    <p className="text-sm font-medium text-slate-700">{c.camera}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Setor</p>
                    <p className="text-sm font-medium text-slate-700">{c.sector}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Data/Hora</p>
                    <p className="text-sm font-medium text-slate-700">{c.data}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Confiança</p>
                    <p className="text-sm font-medium text-slate-700">{c.confianca}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Status</p>
                  <div className="mt-1"><BadgeStatus status={c.status} size="md" /></div>
                </div>

                <div>
                  <p className="text-xs text-slate-400">EPIs Detectados</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {c.epis.length > 0 ? c.epis.map((epi, i) => (
                      <span key={i} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {epi}
                      </span>
                    )) : <span className="text-xs text-slate-400">—</span>}
                  </div>
                </div>

                {c.notas && (
                  <div>
                    <p className="text-xs text-slate-400">Observações</p>
                    <p className="mt-1 text-sm text-slate-600">{c.notas}</p>
                  </div>
                )}

                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">Trabalhador</p>
                  <p className="text-sm font-medium text-slate-700">{c.trabalhador}</p>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}