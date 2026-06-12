import { useState, useEffect, useCallback } from 'react';
import {
  Download, RefreshCw, Sparkles,
  FileText, AlertCircle,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';

import { ocorrenciasApi, dashboardApi, relatoriosApi } from '../api/api';
import { PaginaCarregando } from '../components/LoadingSpinner';

const CORES_EPI  = ['#EF4444','#F97316','#EAB308','#22C55E','#3B82F6','#8B5CF6'];
const COR_VERDE  = '#16a34a';
const COR_VERM   = '#dc2626';
const COR_LARANJ = '#ea580c';
const COR_BRAND  = '#01696f';

const PDF_MAR = 14;
const PDF_W   = 210;
const CONT_W  = PDF_W - PDF_MAR * 2;

function agruparPorMes(ocorrencias) {
  const meses = {};
  ocorrencias.forEach((o) => {
    const d     = new Date(o.timestamp);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    if (!meses[chave]) meses[chave] = { mes: label, total: 0, conformes: 0, naoConformes: 0 };
    meses[chave].total++;
    o.status === 'conforme' ? meses[chave].conformes++ : meses[chave].naoConformes++;
  });
  return Object.values(meses)
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .map((m) => ({
      ...m,
      taxaConformidade: m.total > 0 ? Math.round((m.conformes / m.total) * 100) : 100,
    }));
}

function contarEpisAusentes(ocorrencias) {
  const contagem = {};
  ocorrencias
    .filter((o) => o.status === 'nao_conforme' && o.epi_detected)
    .forEach((o) => {
      const lista = Array.isArray(o.epi_detected) ? o.epi_detected : [o.epi_detected];
      lista.forEach((epi) => { contagem[epi] = (contagem[epi] || 0) + 1; });
    });
  return Object.entries(contagem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([epi, ausencias], i) => ({ epi, ausencias, cor: CORES_EPI[i] }));
}

function hexRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function TooltipCustom({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-4 py-3 text-xs shadow-md">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.value}{p.unit ?? ''}
        </p>
      ))}
    </div>
  );
}

function SkeletonLinhas() {
  return (
    <div className="space-y-2 animate-pulse">
      {[90, 75, 95, 65, 80].map((w, i) => (
        <div key={i} className="h-3 rounded bg-slate-200" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

function EstadoVazio() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <FileText size={48} className="mb-4 text-slate-200" />
      <p className="text-sm font-medium">Nenhum dado de ocorrência encontrado.</p>
      <p className="mt-1 text-xs">
        Os gráficos serão preenchidos conforme as detecções forem registradas.
      </p>
    </div>
  );
}

function canvasLinha(dados, W = 540, H = 200) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const pL = 52, pR = 16, pT = 16, pB = 38;
  const gW = W - pL - pR, gH = H - pT - pB;

  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  [0, 25, 50, 75, 100].forEach((v) => {
    const y = pT + gH - (v / 100) * gH;
    ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(pL + gW, y); ctx.stroke();
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px sans-serif';
    ctx.textAlign = 'right'; ctx.fillText(`${v}%`, pL - 5, y + 4);
  });

  const stepX = gW / Math.max(dados.length - 1, 1);
  ctx.fillStyle = '#94a3b8'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
  dados.forEach((d, i) => ctx.fillText(d.mes, pL + i * stepX, pT + gH + 16));

  ctx.strokeStyle = COR_VERDE; ctx.lineWidth = 2.5; ctx.beginPath();
  dados.forEach((d, i) => {
    const x = pL + i * stepX, y = pT + gH - (d.taxaConformidade / 100) * gH;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  dados.forEach((d, i) => {
    const x = pL + i * stepX, y = pT + gH - (d.taxaConformidade / 100) * gH;
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = COR_VERDE; ctx.fill();
  });

  const maxNC = Math.max(...dados.map((d) => d.naoConformes), 1);
  ctx.setLineDash([6, 4]); ctx.strokeStyle = COR_VERM; ctx.lineWidth = 2; ctx.beginPath();
  dados.forEach((d, i) => {
    const x = pL + i * stepX, y = pT + gH - (d.naoConformes / maxNC) * gH;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke(); ctx.setLineDash([]);

  [[COR_VERDE, 'Conformidade (%)'], [COR_VERM, 'Não conformes']].forEach(([cor, txt], i) => {
    const lx = pL + i * 170, ly = pT + gH + 28;
    ctx.fillStyle = cor; ctx.fillRect(lx, ly - 3, 14, 3);
    ctx.fillStyle = '#475569'; ctx.font = '11px sans-serif';
    ctx.textAlign = 'left'; ctx.fillText(txt, lx + 18, ly + 1);
  });

  return c;
}

function canvasBarras(dados, W = 540) {
  const H   = Math.max(160, dados.length * 30 + 50);
  const c   = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const pL = 110, pR = 50, pT = 16, pB = 24;
  const gW  = W - pL - pR;
  const barH = Math.min(20, (H - pT - pB) / dados.length - 8);

  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);

  [0, 25, 50, 75, 100].forEach((v) => {
    const x = pL + (v / 100) * gW;
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, pT); ctx.lineTo(x, H - pB); ctx.stroke();
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${v}%`, x, H - pB + 14);
  });

  dados.forEach((d, i) => {
    const y   = pT + i * (barH + 8);
    const bW  = (d.conformidade / 100) * gW;
    const cor = d.conformidade >= 90 ? COR_VERDE : d.conformidade >= 70 ? COR_LARANJ : COR_VERM;

    ctx.fillStyle = '#334155'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
    const label = d.setor.length > 15 ? `${d.setor.slice(0, 14)}…` : d.setor;
    ctx.fillText(label, pL - 5, y + barH / 2 + 4);

    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath(); ctx.roundRect(pL, y, gW, barH, 4); ctx.fill();

    ctx.fillStyle = cor;
    ctx.beginPath(); ctx.roundRect(pL, y, bW, barH, 4); ctx.fill();

    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${d.conformidade}%`, pL + bW + 4, y + barH / 2 + 4);
  });

  return c;
}

function canvasPizza(dados, W = 280, H = 220) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);

  const total = dados.reduce((s, d) => s + d.ausencias, 0);
  const cx = W * 0.42, cy = H / 2, r = Math.min(cx, cy) - 18;

  let ang = -Math.PI / 2;
  dados.forEach((d) => {
    const fatia = (d.ausencias / total) * 2 * Math.PI;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, ang, ang + fatia); ctx.closePath();
    ctx.fillStyle = d.cor; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ang += fatia;
  });

  const lx = cx + r + 14;
  ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
  dados.forEach((d, i) => {
    const ly = 18 + i * 18;
    ctx.fillStyle = d.cor; ctx.fillRect(lx, ly, 10, 10);
    ctx.fillStyle = '#475569';
    const nome = d.epi.length > 13 ? `${d.epi.slice(0, 12)}…` : d.epi;
    ctx.fillText(`${nome} (${d.ausencias})`, lx + 14, ly + 9);
  });

  return c;
}


function pdfWrapText(pdf, text, maxW) {
  const words = text.split(' ');
  const lines = []; let cur = '';
  words.forEach((w) => {
    const test = cur ? `${cur} ${w}` : w;
    if (pdf.getTextWidth(test) <= maxW) { cur = test; }
    else { if (cur) lines.push(cur); cur = w; }
  });
  if (cur) lines.push(cur);
  return lines;
}

function pdfCheckPage(pdf, y, needed = 30) {
  if (y + needed > 276) { pdf.addPage(); return 20; }
  return y;
}

function pdfSecHeader(pdf, y, titulo) {
  y = pdfCheckPage(pdf, y, 12);
  pdf.setFillColor(...hexRgb(COR_BRAND));
  pdf.roundedRect(PDF_MAR, y, CONT_W, 7, 1.5, 1.5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
  pdf.text(titulo, PDF_MAR + 4, y + 5);
  return y + 9;
}

function pdfAddCanvas(pdf, canvas, y, maxW = CONT_W) {
  const h = maxW * (canvas.height / canvas.width);
  y = pdfCheckPage(pdf, y, h + 6);
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', PDF_MAR, y, maxW, h);
  return y + h + 6;
}

async function gerarPdf({ stats, dadosMensais, dadosSetor, episAusentes, analiseIA }) {
  const pdf  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const hoje = new Date().toLocaleDateString('pt-BR');
  const conf  = stats?.compliance_rate   ?? 0;
  const total = stats?.total_occurrences ?? 0;
  let Y = PDF_MAR;

  pdf.setFillColor(...hexRgb(COR_BRAND));
  pdf.rect(0, 0, PDF_W, 28, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(17); pdf.setFont('helvetica', 'bold');
  pdf.text('EPIsee — Relatório de Conformidade EPI', PDF_MAR, 12);
  pdf.setFontSize(8.5); pdf.setFont('helvetica', 'normal');
  pdf.text(
    `Gerado em: ${hoje}  ·  Total de ocorrências: ${total.toLocaleString('pt-BR')}  ·  Conformidade: ${conf}%`,
    PDF_MAR, 21,
  );
  Y = 34;

  const kpis = [
    { label: 'Conformidade Geral',  valor: `${conf}%`,                       rgb: [22, 163, 74]       },
    { label: 'Total Ocorrências',   valor: total.toLocaleString('pt-BR'),      rgb: hexRgb(COR_BRAND)   },
    { label: 'Setores Monitorados', valor: `${dadosSetor.length}`,             rgb: [234, 88, 12]       },
    { label: 'EPIs Analisados',     valor: `${episAusentes.length}`,           rgb: [109, 40, 217]      },
  ];
  const kW = CONT_W / kpis.length - 3;
  kpis.forEach((k, i) => {
    const kx = PDF_MAR + i * (kW + 4);
    pdf.setFillColor(248, 250, 252); pdf.roundedRect(kx, Y, kW, 18, 2, 2, 'F');
    pdf.setFillColor(...k.rgb);      pdf.rect(kx, Y, 3, 18, 'F');
    pdf.setTextColor(...k.rgb);
    pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
    pdf.text(k.valor, kx + 7, Y + 10);
    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal');
    pdf.text(k.label, kx + 7, Y + 15.5);
  });
  Y += 26;

  if (analiseIA) {
    Y = pdfCheckPage(pdf, Y, 20);

    pdf.setDrawColor(...hexRgb(COR_BRAND));
    pdf.setLineWidth(0.4); pdf.line(PDF_MAR, Y, PDF_MAR + CONT_W, Y);
    pdf.setTextColor(...hexRgb(COR_BRAND));
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold');
    pdf.text('Análise gerada por Inteligência Artificial', PDF_MAR, Y + 5);
    pdf.setLineWidth(0.2); pdf.line(PDF_MAR, Y + 7, PDF_MAR + CONT_W, Y + 7);
    Y += 11;

    const IA_FONT_SIZE = 9;
    const IA_LINE_H    = 5.5; 

    const setIaFont = () => {
      pdf.setFontSize(IA_FONT_SIZE);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(30, 41, 59);
    };

    setIaFont();
    const paragrafos = analiseIA.split('\n\n').filter(Boolean);
    paragrafos.forEach((paragrafo) => {
      setIaFont(); 
      const linhas = pdfWrapText(pdf, paragrafo, CONT_W - 4);
      linhas.forEach((linha) => {
        Y = pdfCheckPage(pdf, Y, IA_LINE_H + 2);
        setIaFont(); 
        pdf.text(linha, PDF_MAR, Y);
        Y += IA_LINE_H;
      });
      Y += 3;
    });

    Y = pdfCheckPage(pdf, Y, 6);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.2); pdf.line(PDF_MAR, Y, PDF_MAR + CONT_W, Y);
    Y += 8;
  }

  if (dadosMensais.length > 0) {
    Y = pdfSecHeader(pdf, Y, 'Tendência Mensal de Conformidade');
    Y = pdfAddCanvas(pdf, canvasLinha(dadosMensais), Y);
  }

  if (dadosSetor.length > 0) {
    Y = pdfSecHeader(pdf, Y, 'Conformidade por Setor');
    Y = pdfAddCanvas(pdf, canvasBarras(dadosSetor), Y);
  }

  if (episAusentes.length > 0) {
    Y = pdfSecHeader(pdf, Y, 'EPIs com Maior Índice de Ausência');
    Y = pdfCheckPage(pdf, Y, 70);

    const pizzaCanvas = canvasPizza(episAusentes);
    const pizzaW      = CONT_W * 0.45;
    const pizzaH      = pizzaW * (pizzaCanvas.height / pizzaCanvas.width);
    pdf.addImage(pizzaCanvas.toDataURL('image/png'), 'PNG', PDF_MAR, Y, pizzaW, pizzaH);

    const lx    = PDF_MAR + pizzaW + 8;
    const bW    = CONT_W * 0.5 - 40;
    const maxA  = episAusentes[0].ausencias;
    let   ly    = Y + 6;
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
    episAusentes.forEach((e) => {
      const [r, g, b] = hexRgb(e.cor);
      pdf.setFillColor(r, g, b); pdf.circle(lx + 3, ly + 2.5, 2.5, 'F');
      pdf.setTextColor(51, 65, 85);
      const nome = e.epi.length > 18 ? `${e.epi.slice(0, 17)}…` : e.epi;
      pdf.text(nome, lx + 8, ly + 4);
      pdf.setFillColor(226, 232, 240); pdf.roundedRect(lx, ly + 6, bW, 4, 1, 1, 'F');
      pdf.setFillColor(r, g, b);      pdf.roundedRect(lx, ly + 6, bW * (e.ausencias / maxA), 4, 1, 1, 'F');
      pdf.setTextColor(71, 85, 105);
      pdf.text(`${e.ausencias}`, lx + bW + 4, ly + 9.5);
      ly += 16;
    });
    Y += Math.max(pizzaH, ly - Y) + 6;
  }

  if (dadosMensais.length > 0) {
    Y = pdfSecHeader(pdf, Y, 'Resumo Mensal');

    const cols  = ['Mês', 'Total', 'Conformes', 'Não Conformes', 'Taxa (%)'];
    const colsW = [30, 25, 35, 45, 30];
    const rowH  = 7;

    Y = pdfCheckPage(pdf, Y, rowH * 2);
    pdf.setFillColor(241, 245, 249); pdf.rect(PDF_MAR, Y, CONT_W, rowH, 'F');
    let cx = PDF_MAR + 2;
    pdf.setTextColor(71, 85, 105); pdf.setFontSize(8); pdf.setFont('helvetica', 'bold');
    cols.forEach((col, i) => { pdf.text(col, cx, Y + 5); cx += colsW[i]; });
    Y += rowH;

    pdf.setFont('helvetica', 'normal');
    dadosMensais.forEach((d, idx) => {
      Y = pdfCheckPage(pdf, Y, rowH + 2);
      if (idx % 2 === 0) {
        pdf.setFillColor(248, 250, 252); pdf.rect(PDF_MAR, Y, CONT_W, rowH, 'F');
      }
      cx = PDF_MAR + 2;
      [d.mes, d.total, d.conformes, d.naoConformes, `${d.taxaConformidade}%`].forEach((v, i) => {
        if (i === 2)      pdf.setTextColor(22, 163, 74);
        else if (i === 3) pdf.setTextColor(220, 38, 38);
        else              pdf.setTextColor(30, 41, 59);
        pdf.text(String(v), cx, Y + 5); cx += colsW[i];
      });
      pdf.setDrawColor(226, 232, 240);
      pdf.line(PDF_MAR, Y + rowH, PDF_MAR + CONT_W, Y + rowH);
      Y += rowH;
    });
  }

  const totalPags = pdf.internal.getNumberOfPages();
  for (let p = 1; p <= totalPags; p++) {
    pdf.setPage(p);
    pdf.setFillColor(248, 250, 252); pdf.rect(0, 287, PDF_W, 10, 'F');
    pdf.setTextColor(148, 163, 184); pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal');
    pdf.text('EPIsee — Sistema de Monitoramento de EPIs', PDF_MAR, 293);
    pdf.text(`Pág. ${p} / ${totalPags}`, PDF_W - PDF_MAR, 293, { align: 'right' });
  }

  pdf.save(`relatorio-episee-${hoje.replace(/\//g, '-')}.pdf`);
}

export default function Relatorios() {
  const [dadosMensais, setDadosMensais] = useState([]);
  const [dadosSetor,   setDadosSetor]   = useState([]);
  const [episAusentes, setEpisAusentes] = useState([]);
  const [stats,        setStats]        = useState(null);
  const [carregando,   setCarregando]   = useState(true);
  const [gerando,      setGerando]      = useState(false);
  const [analiseIA,    setAnaliseIA]    = useState('');
  const [gerandoIA,    setGerandoIA]    = useState(false);
  const [erroIA,       setErroIA]       = useState('');
  const [erro,         setErro]         = useState('');

  const carregarDados = useCallback(async () => {
    setCarregando(true); setErro('');
    try {
      const [ocorrRes, statsRes] = await Promise.all([
        ocorrenciasApi.listar({ limit: 300 }),
        dashboardApi.estatisticas(),
      ]);
      const ocorrencias = ocorrRes.data || [];
      const statsData   = statsRes.data;
      setDadosMensais(agruparPorMes(ocorrencias));
      setEpisAusentes(contarEpisAusentes(ocorrencias));
      setStats(statsData);
      setDadosSetor(
        (statsData.occurrences_by_sector || []).map((s) => ({
          setor: s.sector_name, conformidade: s.compliance_rate, ocorrencias: s.total,
        })),
      );
    } catch {
      setErro('Não foi possível carregar os dados do relatório.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  async function gerarAnaliseIA() {
    if (!dadosMensais.length) return;
    setGerandoIA(true); setErroIA(''); setAnaliseIA('');
    try {
      const res = await relatoriosApi.gerarAnalise({
        conformidade_geral: stats?.compliance_rate   ?? 0,
        total_ocorrencias:  stats?.total_occurrences ?? 0,
        dados_mensais:      dadosMensais,
        dados_setor:        dadosSetor,
        epis_ausentes:      episAusentes,
        periodo:            'mensal',
      });
      setAnaliseIA(res.data.analise);
    } catch {
      setErroIA('Não foi possível gerar a análise. Verifique se a API de IA está configurada no servidor.');
    } finally {
      setGerandoIA(false);
    }
  }

  async function exportarPdf(comIA = false) {
    setGerando(true);
    try {
      let analise = analiseIA;
      if (comIA && !analise) {
        setGerandoIA(true);
        try {
          const res = await relatoriosApi.gerarAnalise({
            conformidade_geral: stats?.compliance_rate   ?? 0,
            total_ocorrencias:  stats?.total_occurrences ?? 0,
            dados_mensais:      dadosMensais,
            dados_setor:        dadosSetor,
            epis_ausentes:      episAusentes,
            periodo:            'mensal',
          });
          analise = res.data.analise;
          setAnaliseIA(analise);
        } catch {
          setErroIA('Não foi possível gerar a análise IA para o PDF.');
        } finally {
          setGerandoIA(false);
        }
      }
      await gerarPdf({ stats, dadosMensais, dadosSetor, episAusentes, analiseIA: analise });
    } finally {
      setGerando(false);
    }
  }

  if (carregando) return <PaginaCarregando />;

  const conf  = stats?.compliance_rate   ?? 0;
  const total = stats?.total_occurrences ?? 0;

  return (
    <div className="pg-wide">

      <div className="row-between flex-wrap gap-3">
        {erro && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={14} /> {erro}
          </div>
        )}
        <div className="row gap-2 ml-auto">
          <button onClick={carregarDados} className="btn btn-ghost gap-2">
            <RefreshCw size={15} /> Atualizar
          </button>
          <button
            onClick={() => exportarPdf(true)}
            disabled={gerando || gerandoIA || carregando}
            className="btn btn-primary gap-2 disabled:opacity-60"
          >
            {gerando
              ? <RefreshCw size={15} className="animate-spin" />
              : <Download size={15} />}
            {gerando ? 'Gerando PDF…' : 'Exportar com IA'}
          </button>
          <button
            onClick={() => exportarPdf(false)}
            disabled={gerando || gerandoIA || carregando}
            className="btn btn-ghost gap-2 disabled:opacity-60"
          >
            <FileText size={15} /> PDF simples
          </button>
        </div>
      </div>

      <div className="space-y-6 rounded-xl bg-white p-2">

        <div className="card p-5 row-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Relatório de Conformidade EPI</h2>
            <p className="sec-sub mt-1">
              Total de ocorrências: {total.toLocaleString('pt-BR')} ·{' '}
              Gerado em: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-brand">{conf}%</p>
            <p className="sec-sub text-xs">Conformidade geral</p>
          </div>
        </div>

        {erroIA && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={14} /> {erroIA}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="card p-5">
            <h3 className="sec-title mb-4">Tendência Mensal de Conformidade</h3>
            {!dadosMensais.length ? (
              <p className="flex h-56 items-center justify-center text-sm text-slate-400">
                Sem dados mensais ainda.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={dadosMensais}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipCustom />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="taxaConformidade" name="Conformidade" stroke="#22C55E" strokeWidth={2.5} dot={{ r: 4 }} unit="%" />
                  <Line type="monotone" dataKey="naoConformes" name="Não Conformes" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card p-5">
            <h3 className="sec-title mb-4">Conformidade por Setor</h3>
            {!dadosSetor.length ? (
              <p className="flex h-56 items-center justify-center text-sm text-slate-400">
                Sem dados por setor ainda.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dadosSetor} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="setor" type="category" width={110} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipCustom />} />
                  <Bar dataKey="conformidade" name="Conformidade" fill="#F97316" radius={[0, 6, 6, 0]} barSize={16} unit="%" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {!!episAusentes.length && (
          <div className="card p-5">
            <h3 className="sec-title mb-4">EPIs com Maior Índice de Ausência</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={episAusentes} dataKey="ausencias" nameKey="epi" cx="50%" cy="50%" outerRadius={90}>
                    {episAusentes.map((e, i) => <Cell key={i} fill={e.cor} />)}
                  </Pie>
                  <Tooltip />
                  <Legend formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 self-center">
                {episAusentes.map((e) => (
                  <div key={e.epi} className="row-between gap-3">
                    <div className="row gap-2 min-w-0">
                      <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: e.cor }} />
                      <span className="truncate text-sm text-slate-700">{e.epi}</span>
                    </div>
                    <div className="row gap-2 shrink-0">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(e.ausencias / episAusentes[0].ausencias) * 100}%`,
                            backgroundColor: e.cor,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs font-medium text-slate-600">
                        {e.ausencias}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!!dadosMensais.length && (
          <div className="card">
            <div className="card-header">
              <FileText size={16} className="text-slate-400" />
              <h3 className="sec-title">Resumo Mensal</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Mês', 'Total', 'Conformes', 'Não Conformes', 'Taxa'].map((h) => (
                      <th key={h} className="tbl-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dadosMensais.map((d) => (
                    <tr key={d.mes} className="tbl-tr">
                      <td className="tbl-td font-medium">{d.mes}</td>
                      <td className="tbl-td">{d.total}</td>
                      <td className="tbl-td font-medium text-ok">{d.conformes}</td>
                      <td className="tbl-td text-err">{d.naoConformes}</td>
                      <td className="tbl-td">
                        <span className={d.taxaConformidade >= 93 ? 'badge badge-ok' : 'badge badge-warn'}>
                          {d.taxaConformidade}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!carregando && !dadosMensais.length && !dadosSetor.length && <EstadoVazio />}

      </div>
    </div>
  );
}
