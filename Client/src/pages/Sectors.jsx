import { useState, useEffect, useCallback } from "react";
import {
  Plus, Edit2, Trash2, X, Building2, Camera, ShieldCheck,
  Loader2, AlertTriangle,
} from "lucide-react";
import clsx from "clsx";
import { setoresApi } from "../api/api";

const CLASSES_EPI = [
  { id: "helmet",             label: "Capacete" },
  { id: "safety-vest",        label: "Colete de Segurança" },
  { id: "glasses",            label: "Óculos de Proteção" },
  { id: "gloves",             label: "Luvas" },
  { id: "earmuffs",           label: "Protetor Auricular" },
  { id: "face-mask-medical",  label: "Máscara Médica" },
  { id: "face-guard",         label: "Protetor Facial" },
  { id: "medical-suit",       label: "Macacão Médico" },
  { id: "safety-suit",        label: "Macacão de Segurança" },
];

const FORM_VAZIO = { name: "", description: "", workers: "", epis_obrigatorios: [] };

function labelEpi(id) {
  return CLASSES_EPI.find((e) => e.id === id)?.label ?? id;
}

function BarConformidade({ valor }) {
  const cor = valor >= 95 ? "bg-ok" : valor >= 90 ? "bg-warn" : "bg-err";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={clsx("h-full rounded-full transition-all", cor)} style={{ width: `${valor}%` }} />
      </div>
      <span className="w-12 text-right text-xs font-medium text-slate-600">{valor}%</span>
    </div>
  );
}

export default function Setores() {
  const [setores, setSetores]           = useState([]);
  const [statsMap, setStatsMap]         = useState({});
  const [carregando, setCarregando]     = useState(true);
  const [erro, setErro]                 = useState(null);
  const [salvando, setSalvando]         = useState(false);
  const [modalAberto, setModalAberto]   = useState(false);
  const [editando, setEditando]         = useState(null);
  const [confirmarDel, setConfirmarDel] = useState(null);
  const [form, setForm]                 = useState(FORM_VAZIO);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await setoresApi.listar();
      setSetores(data);
      const resultados = await Promise.allSettled(
        data.map((s) => setoresApi.stats(s.id))
      );
      const mapa = {};
      resultados.forEach((r, i) => {
        if (r.status === "fulfilled") mapa[data[i].id] = r.value.data;
      });
      setStatsMap(mapa);
    } catch (e) {
      setErro("Não foi possível carregar os setores.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirAdicionar() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  function abrirEditar(setor) {
    setEditando(setor);
    setForm({
      name: setor.name,
      description: setor.description ?? "",
      workers: String(setor.workers ?? ""),
      epis_obrigatorios: setor.epis_obrigatorios ?? [],
    });
    setModalAberto(true);
  }

  function toggleEpi(epiId) {
    setForm((prev) => ({
      ...prev,
      epis_obrigatorios: prev.epis_obrigatorios.includes(epiId)
        ? prev.epis_obrigatorios.filter((e) => e !== epiId)
        : [...prev.epis_obrigatorios, epiId],
    }));
  }

  async function salvar() {
    if (!form.name.trim()) return;
    setSalvando(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        epis_obrigatorios: form.epis_obrigatorios,
      };
      if (editando) {
        await setoresApi.editar(editando.id, payload);
      } else {
        await setoresApi.criar(payload);
      }
      setModalAberto(false);
      await carregar();
    } catch (e) {
      alert(e?.response?.data?.detail ?? "Erro ao salvar setor.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id) {
    try {
      await setoresApi.excluir(id);
      setConfirmarDel(null);
      await carregar();
    } catch (e) {
      alert(e?.response?.data?.detail ?? "Erro ao remover setor.");
    }
  }

  if (carregando) {
    return (
      <div className="pg-wide flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-brand" />
        <span className="ml-3 text-slate-500">Carregando setores…</span>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="pg-wide flex flex-col items-center justify-center py-24 gap-3">
        <AlertTriangle size={32} className="text-err" />
        <p className="text-slate-600">{erro}</p>
        <button onClick={carregar} className="btn-primary">Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="pg-wide relative">

      {}
      <div className="card row gap-3 p-4 w-fit mb-6">
        <Building2 size={20} className="text-slate-500" />
        <div>
          <p className="sec-sub">Total de Setores</p>
          <p className="text-2xl font-bold text-slate-800">{setores.length}</p>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {setores.map((setor) => {
          const stats = statsMap[setor.id];
          const conformidade = stats ? +(stats.taxa_conformidade * 100).toFixed(1) : null;
          const epis = setor.epis_obrigatorios ?? [];

          return (
            <div key={setor.id} className="card card-hover p-5">
              <div className="row gap-3 mb-3">
                <Building2 size={20} className="text-slate-400" />
                <div>
                  <h4 className="font-semibold text-slate-800">{setor.name}</h4>
                  <p className="sec-sub text-xs max-w-[200px] truncate">
                    {setor.description || "Sem descrição"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="row gap-1.5 mb-0.5">
                    <Camera size={12} className="text-slate-400" />
                    <span className="sec-sub text-[11px]">Total Ocorrências</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">{stats?.total_ocorrencias ?? "—"}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="row gap-1.5 mb-0.5">
                    <ShieldCheck size={12} className="text-slate-400" />
                    <span className="sec-sub text-[11px]">Não conformes</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">{stats?.nao_conformes ?? "—"}</p>
                </div>
              </div>

              <div className="mb-3">
                <p className="sec-sub text-[11px] mb-1.5">EPIs obrigatórios</p>
                {epis.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhum configurado</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {epis.map((e) => (
                      <span key={e} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        {labelEpi(e)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {stats?.epis_mais_ausentes?.length > 0 && (
                <div className="mb-3">
                  <p className="sec-sub text-[11px] mb-1.5">Mais ausentes</p>
                  <div className="flex flex-wrap gap-1">
                    {stats.epis_mais_ausentes.slice(0, 3).map(({ epi, ausencias }) => (
                      <span key={epi} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                        {labelEpi(epi)} <span className="opacity-70">({ausencias}×)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {conformidade !== null && (
                <div className="mb-4">
                  <p className="sec-sub text-[11px] mb-1">Conformidade</p>
                  <BarConformidade valor={conformidade} />
                </div>
              )}

              <div className="row gap-2 border-t border-slate-100 pt-3">
                <button onClick={() => abrirEditar(setor)} className="btn btn-full btn-sm btn-ghost">
                  <Edit2 size={13} /> Editar
                </button>
                <button onClick={() => setConfirmarDel(setor.id)} className="btn btn-full btn-sm btn-danger">
                  <Trash2 size={13} /> Remover
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {}
      <button
        onClick={abrirAdicionar}
        title="Adicionar Setor"
        className="fixed bottom-8 right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 active:scale-95 transition-all duration-150"
      >
        <Plus size={24} />
      </button>

      {}
      {modalAberto && (
        <div className="overlay">
          <div className="modal fade-in" style={{ maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-head">
              <h3 className="modal-title">{editando ? "Editar Setor" : "Adicionar Setor"}</h3>
              <button onClick={() => setModalAberto(false)} className="btn-icon"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div className="field">
                <label className="label">Nome do Setor *</label>
                <input
                  className="input"
                  placeholder="Ex: Usinagem"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">Descrição</label>
                <input
                  className="input"
                  placeholder="Descreva brevemente o setor"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">EPIs Obrigatórios</label>
                <p className="sec-sub text-xs mb-2">
                  Selecione os EPIs que serão exigidos nas câmeras deste setor.
                </p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {CLASSES_EPI.map(({ id, label }) => {
                    const marcado = form.epis_obrigatorios.includes(id);
                    return (
                      <label
                        key={id}
                        className={clsx(
                          "flex items-center gap-2.5 cursor-pointer rounded-lg border px-3 py-2 text-sm transition-all",
                          marcado
                            ? "border-blue-400 bg-blue-50 text-blue-800"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="accent-blue-600"
                          checked={marcado}
                          onChange={() => toggleEpi(id)}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button onClick={() => setModalAberto(false)} className="btn-ghost" disabled={salvando}>
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={!form.name.trim() || salvando}
                className="btn-primary disabled:opacity-50 flex items-center gap-2"
              >
                {salvando && <Loader2 size={14} className="animate-spin" />}
                {editando ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {confirmarDel && (
        <div className="overlay">
          <div className="modal modal-sm fade-in">
            <div className="flex flex-col items-center text-center gap-3 pb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Trash2 size={22} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Remover Setor</h3>
                <p className="sec-sub text-sm mt-0.5">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setConfirmarDel(null)} className="btn btn-sm btn-ghost">Cancelar</button>
              <button onClick={() => excluir(confirmarDel)} className="btn btn-sm btn-danger">
                <Trash2 size={13} /> Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
