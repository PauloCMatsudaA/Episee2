import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { AlertTriangle, CheckCircle, XCircle, ClipboardList } from 'lucide-react';
import CartaoEstatistica from '../components/StatCard';
import TabelaOcorrencias from '../components/OccurrenceTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { dashboardApi, ocorrenciasApi } from '../api/api';

function TooltipGrafico({ active, payload, label }) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-lg">
      <p className="mb-1 text-sm font-semibold text-slate-700">{label}</p>
      {payload.map((entrada, i) => (
        <p key={i} className="text-xs" style={{ color: entrada.color }}>
          {entrada.name}: {entrada.value}{typeof entrada.value === 'number' && entrada.name.toLowerCase().includes('taxa') ? '%' : ''}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [stats,                 setStats]                = useState(null);
  const [ocorrenciasRecentes,   setOcorrenciasRecentes]  = useState([]);
  const [carregando,            setCarregando]           = useState(true);
  const [erro,                  setErro]                 = useState('');

  async function carregarDados() {
    setErro('');
    try {
      const [statsRes, recentesRes] = await Promise.all([
        dashboardApi.estatisticas(),
        ocorrenciasApi.listar({ limit: 5 }),
      ]);
      setStats(statsRes.data);
      setOcorrenciasRecentes(recentesRes.data || []);
    } catch (e) {
      setErro('Não foi possível carregar os dados do dashboard.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
    const intervalo = setInterval(carregarDados, 30_000);
    return () => clearInterval(intervalo);
  }, []);

  if (carregando) return <div className="page"><LoadingSpinner /></div>;
  if (erro)       return <div className="page"><div className="alert alert-err">{erro}</div></div>;
  if (!stats)     return null;

  const tendenciaConformidade = (stats.compliance_trend || []).map((item) => ({
    dia: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    conformidade:    item.rate,
    naoConformidade: item.total > 0 ? Math.round((item.non_compliant / item.total) * 100) : 0,
  })).slice(-7); 

  const dadosSetor = (stats.occurrences_by_sector || []).map((s) => ({
    setor:        s.sector_name,
    ok:           s.total - s.non_compliant,
    naoConformes: s.non_compliant,
  }));

  const cartoes = [
    {
      titulo:   'Total de Ocorrências',
      valor:    stats.total_occurrences.toLocaleString('pt-BR'),
      icone:    AlertTriangle,
      tendencia: 0,
      cor:      'laranja',
    },
    {
      titulo:   'Taxa de Conformidade',
      valor:    `${stats.compliance_rate}%`,
      icone:    CheckCircle,
      tendencia: 0,
      cor:      'verde',
    },
    {
      titulo:   'Não Conformes Hoje',
      valor:    stats.non_compliant_today,
      icone:    XCircle,
      tendencia: 0,
      cor:      'vermelho',
    },
    {
      titulo:   'Solicitações Pendentes',
      valor:    stats.pending_requests,
      icone:    ClipboardList,
      tendencia: 0,
      cor:      'amarelo',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cartoes.map((c) => (
          <CartaoEstatistica
            key={c.titulo}
            titulo={c.titulo}
            valor={c.valor}
            icone={c.icone}
            tendencia={c.tendencia}
            cor={c.cor}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">
            Tendência de Conformidade — Últimos 7 dias
          </h3>
          {tendenciaConformidade.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              Nenhum dado de conformidade registrado ainda.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={tendenciaConformidade}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip content={<TooltipGrafico />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(v) => v === 'conformidade' ? 'Conformidade' : 'Não Conformidade'}
                />
                <Line type="monotone" dataKey="conformidade"    name="conformidade"    stroke="#22C55E" strokeWidth={2.5} dot={{ fill: '#22C55E', r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="naoConformidade" name="naoConformidade" stroke="#EF4444" strokeWidth={2}   dot={{ fill: '#EF4444', r: 3 }} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Ocorrências por Setor</h3>
          {dadosSetor.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              Nenhuma ocorrência registrada ainda.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dadosSetor} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  dataKey="setor"
                  type="category"
                  width={100}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="ok"           name="Conforme"      fill="#22C55E" radius={[0, 4, 4, 0]} barSize={14} />
                <Bar dataKey="naoConformes" name="Não Conforme"  fill="#EF4444" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-700">Últimas Ocorrências</h3>
          <a href="/occurrences" className="text-xs font-medium text-brand hover:text-brand-h">
            Ver todas →
          </a>
        </div>
        {ocorrenciasRecentes.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-400">
            Nenhuma ocorrência registrada ainda.
          </div>
        ) : (
          <TabelaOcorrencias ocorrencias={ocorrenciasRecentes} compacto />
        )}
      </div>
    </div>
  );
}