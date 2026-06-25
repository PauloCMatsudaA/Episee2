import BadgeStatus from './AlertBadge';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye } from 'lucide-react';

function formatarData(valor) {
  if (!valor) return '—';
  try {
    const data = typeof valor === 'string' ? parseISO(valor) : new Date(valor);
    if (!isValid(data)) return '—';
    return format(data, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  } catch {
    return '—';
  }
}

function celulasCabecalho(compacto) {
  return (
    <tr className="border-b border-slate-100">
      {['ID', 'Câmera', !compacto && 'Setor', 'EPIs', 'Status', !compacto && 'Confiança', 'Data/Hora', null]
        .filter(Boolean)
        .map((coluna) => (
          <th
            key={coluna}
            className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            {coluna}
          </th>
        ))}
    </tr>
  );
}

function LinhaOcorrencia({ occ, compacto, aoVerDetalhes }) {
  const idFormatado = `#${String(occ.id).padStart(4, '0')}`;

  const dataFormatada = formatarData(occ.timestamp ?? occ.datetime ?? occ.created_at);

  const confiancaPct = occ.confidence != null
    ? occ.confidence <= 1
      ? Math.round(occ.confidence * 100)
      : Math.round(occ.confidence)
    : 0;

  const listaEpis = Array.isArray(occ.epi_detected)
    ? occ.epi_detected
    : typeof occ.epi_detected === 'string'
      ? occ.epi_detected.split(',').map(s => s.trim()).filter(Boolean)
      : occ.epis ?? [];

  const nomeCamera = occ.camera_name ?? occ.camera ?? (occ.camera_id ? `Camera ${occ.camera_id}` : '—');
  const nomeSetor  = occ.sector_name  ?? occ.sector  ?? (occ.sector_id  ? `Setor ${occ.sector_id}`   : '—');

  return (
    <tr className="transition-colors hover:bg-slate-50/50">
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">{idFormatado}</td>
      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{nomeCamera}</td>

      {!compacto && (
        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{nomeSetor}</td>
      )}

      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {listaEpis.length > 0 ? (
            listaEpis.map((epi, i) => (
              <span
                key={i}
                className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
              >
                {epi}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>
      </td>

      <td className="whitespace-nowrap px-4 py-3">
        <BadgeStatus status={occ.status} />
      </td>

      {!compacto && (
        <td className="whitespace-nowrap px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${confiancaPct}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{confiancaPct}%</span>
          </div>
        </td>
      )}

      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{dataFormatada}</td>

      {aoVerDetalhes && (
        <td className="whitespace-nowrap px-4 py-3">
          <button
            onClick={() => aoVerDetalhes(occ)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-brand-l transition-colors"
          >
            <Eye size={14} />
            Detalhes
          </button>
        </td>
      )}
    </tr>
  );
}

export default function TabelaOcorrencias({ ocorrencias = [], aoVerDetalhes, compacto = false }) {
  if (ocorrencias.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-slate-400">
        Nenhuma ocorrência encontrada.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>{celulasCabecalho(compacto)}</thead>
        <tbody className="divide-y divide-slate-50">
          {ocorrencias.map((occ) => (
            <LinhaOcorrencia
              key={occ.id}
              occ={occ}
              compacto={compacto}
              aoVerDetalhes={aoVerDetalhes}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
