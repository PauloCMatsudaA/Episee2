import { useState, useEffect, useCallback } from 'react';
import {
  PlusCircle, Edit2, Trash2, ChevronDown, ChevronUp,
  PlayCircle, ExternalLink, BookOpen, Tag,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function authHeaders() {
  const token = localStorage.getItem('episee_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const EPI_VAZIO = {
  nome: '', descricao: '', quando_usar: '', como_usar: '',
  erros_comuns: '', nr6_ref: '', palavras_chave: '',
};
const VIDEO_VAZIO = {
  titulo: '', url: '', descricao: '', fonte: '', aprovado: true, prioridade: 0,
};

export default function TrainingVideos() {
  const [epis, setEpis]           = useState([]);
  const [expandido, setExpandido] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const [modalEpi, setModalEpi]     = useState(null);
  const [modalVideo, setModalVideo] = useState(null);
  const [formEpi, setFormEpi]       = useState(EPI_VAZIO);
  const [formVideo, setFormVideo]   = useState(VIDEO_VAZIO);
  const [salvando, setSalvando]     = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch(`${API_BASE}/api/training/epis`, {
        headers: authHeaders(),
      });
      const data = await r.json();
      setEpis(Array.isArray(data) ? data : []);
    } catch { setEpis([]); }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirCriarEpi() { setFormEpi(EPI_VAZIO); setModalEpi('criar'); }
  function abrirEditarEpi(epi) {
    setFormEpi({
      nome: epi.nome || '', descricao: epi.descricao || '',
      quando_usar: epi.quando_usar || '', como_usar: epi.como_usar || '',
      erros_comuns: epi.erros_comuns || '', nr6_ref: epi.nr6_ref || '',
      palavras_chave: epi.palavras_chave || '',
    });
    setModalEpi(epi);
  }
  async function salvarEpi() {
    if (!formEpi.nome.trim()) return;
    setSalvando(true);
    try {
      const isNovo = modalEpi === 'criar';
      const url    = isNovo
        ? `${API_BASE}/api/training/epis`
        : `${API_BASE}/api/training/epis/${modalEpi.id}`;
      await fetch(url, {
        method:  isNovo ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body:    JSON.stringify(formEpi),
      });
      setModalEpi(null);
      await carregar();
    } finally { setSalvando(false); }
  }
  async function deletarEpi(id) {
    if (!confirm('Excluir este EPI e todos os seus vídeos?')) return;
    await fetch(`${API_BASE}/api/training/epis/${id}`, {
      method: 'DELETE', headers: authHeaders(),
    });
    await carregar();
  }

  function abrirCriarVideo(epiId) { setFormVideo(VIDEO_VAZIO); setModalVideo({ epiId }); }
  function abrirEditarVideo(epiId, video) {
    setFormVideo({
      titulo: video.titulo || '', url: video.url || '',
      descricao: video.descricao || '', fonte: video.fonte || '',
      aprovado: video.aprovado ?? true, prioridade: video.prioridade ?? 0,
    });
    setModalVideo({ epiId, video });
  }
  async function salvarVideo() {
    if (!formVideo.titulo.trim() || !formVideo.url.trim()) return;
    setSalvando(true);
    try {
      const { epiId, video } = modalVideo;
      const isNovo = !video;
      const url    = isNovo
        ? `${API_BASE}/api/training/epis/${epiId}/videos`
        : `${API_BASE}/api/training/videos/${video.id}`;
      await fetch(url, {
        method:  isNovo ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body:    JSON.stringify(isNovo ? { ...formVideo, epi_type_id: epiId } : formVideo),
      });
      setModalVideo(null);
      await carregar();
    } finally { setSalvando(false); }
  }
  async function deletarVideo(id) {
    if (!confirm('Excluir este vídeo?')) return;
    await fetch(`${API_BASE}/api/training/videos/${id}`, {
      method: 'DELETE', headers: authHeaders(),
    });
    await carregar();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Vídeos Educativos</h1>
          <p className="page-subtitle">Gerencie EPIs, instruções e vídeos de treinamento</p>
        </div>
        <button onClick={abrirCriarEpi} className="btn btn-primary">
          <PlusCircle className="w-4 h-4" /> Novo EPI
        </button>
      </div>

      {carregando ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : epis.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Nenhum EPI cadastrado ainda.</p>
          <button onClick={abrirCriarEpi} className="mt-3 text-sm" style={{ color: 'var(--brand)' }}>Cadastrar agora</button>
        </div>
      ) : (
        <div className="space-y-3">
          {epis.map(epi => (
            <div key={epi.id} className="card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => setExpandido(expandido === epi.id ? null : epi.id)}
                  className="flex-1 flex items-center gap-3 text-left"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--brand-light, #fff4ec)' }}>
                    <BookOpen className="w-4 h-4" style={{ color: 'var(--brand)' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{epi.nome}</p>
                    <p className="text-xs text-gray-400">
                      {(epi.videos || []).length} vídeo{(epi.videos || []).length !== 1 ? 's' : ''}
                      {epi.palavras_chave && (
                        <span className="ml-2" style={{ color: 'var(--brand)' }}>• palavras-chave cadastradas</span>
                      )}
                    </p>
                  </div>
                  {expandido === epi.id
                    ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>
                <button onClick={() => abrirEditarEpi(epi)}
                  className="btn btn-ghost btn-sm btn-icon">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => deletarEpi(epi.id)}
                  className="btn btn-danger btn-sm btn-icon">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {expandido === epi.id && (
                <div className="border-t border-gray-100 px-4 py-4 space-y-3">

                  {}
                  {epi.palavras_chave && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Palavras-chave (RAG)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {epi.palavras_chave.split(',').map(k => k.trim()).filter(Boolean).map(k => (
                          <span key={k} className="text-xs text-gray-500">{k}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {epi.quando_usar && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Quando usar</p>
                      <p className="text-sm text-gray-700">{epi.quando_usar}</p>
                    </div>
                  )}
                  {epi.como_usar && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Como usar</p>
                      <p className="text-sm text-gray-700">{epi.como_usar}</p>
                    </div>
                  )}
                  {epi.erros_comuns && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Erros comuns</p>
                      <p className="text-sm text-gray-700">{epi.erros_comuns}</p>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vídeos</p>
                      <button
                        onClick={() => abrirCriarVideo(epi.id)}
                        className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--brand)' }}
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Adicionar
                      </button>
                    </div>
                    {(epi.videos || []).length === 0 ? (
                      <p className="text-xs text-gray-400">Nenhum vídeo ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {epi.videos.map(v => (
                          <div key={v.id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                            <PlayCircle className="w-4 h-4 text-gray-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{v.titulo}</p>
                              <div className="flex items-center gap-2">
                                {v.fonte && <span className="text-xs text-gray-400">{v.fonte}</span>}
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                  v.aprovado ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {v.aprovado ? 'Visível' : 'Oculto'}
                                </span>
                              </div>
                            </div>
                            <a href={v.url} target="_blank" rel="noopener noreferrer"
                              className="p-1 text-gray-400 hover:text-gray-600 rounded">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button onClick={() => abrirEditarVideo(epi.id, v)}
                              className="btn btn-ghost btn-sm btn-icon">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deletarVideo(v.id)}
                              className="btn btn-danger btn-sm btn-icon">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {}
      {modalEpi && (
        <div className="overlay" onClick={() => setModalEpi(null)}>
          <div className="modal modal-lg fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalEpi === 'criar' ? 'Novo EPI' : `Editar: ${modalEpi.nome}`}
              </h2>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'Nome do EPI *', key: 'nome', placeholder: 'ex: Capacete de Segurança' },
                { label: 'Descrição', key: 'descricao', placeholder: 'Breve descrição...' },
                { label: 'Quando usar', key: 'quando_usar', placeholder: 'Situações de uso obrigatório...' },
                { label: 'Como usar corretamente', key: 'como_usar', placeholder: 'Passo a passo...' },
                { label: 'Erros comuns', key: 'erros_comuns', placeholder: 'Erros frequentes dos trabalhadores...' },
                {
                  label: 'Palavras-chave (RAG)',
                  key: 'palavras_chave',
                  placeholder: 'ex: capacete, protetor de cabeça, elmo (separadas por vírgula)',
                  help: 'O chatbot usa essas palavras para encontrar este EPI mesmo quando o trabalhador não usa o nome exato.',
                },
              ].map(({ label, key, placeholder, help }) => (
                <div key={key} className="field">
                  <label className="label">{label}</label>
                  <textarea
                    rows={key === 'palavras_chave' ? 2 : 3}
                    value={formEpi[key]}
                    onChange={e => setFormEpi(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="input"
                    style={{ resize: 'none' }}
                  />
                  {help && <p className="text-xs text-gray-500 mt-0.5">{help}</p>}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button onClick={() => setModalEpi(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={salvarEpi} disabled={salvando || !formEpi.nome.trim()} className="btn btn-primary">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {modalVideo && (
        <div className="overlay" onClick={() => setModalVideo(null)}>
          <div className="modal fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalVideo.video ? 'Editar Vídeo' : 'Novo Vídeo'}
              </h2>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'Título *', key: 'titulo', placeholder: 'Nome do vídeo' },
                { label: 'URL *', key: 'url', placeholder: 'https://youtube.com/...' },
                { label: 'Fonte', key: 'fonte', placeholder: 'ex: SENAI, Ministério do Trabalho' },
                { label: 'Descrição', key: 'descricao', placeholder: 'Descrição opcional...' },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="field">
                  <label className="label">{label}</label>
                  <input
                    value={formVideo[key]}
                    onChange={e => setFormVideo(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="input"
                  />
                </div>
              ))}
              <div className="flex items-center gap-3">
                <label className="label" style={{ margin: 0 }}>Prioridade</label>
                <input type="number" min={0} max={10}
                  value={formVideo.prioridade}
                  onChange={e => setFormVideo(f => ({ ...f, prioridade: Number(e.target.value) }))}
                  className="input" style={{ width: '5rem' }}
                />
                <label className="flex items-center gap-2 ml-auto text-xs font-semibold text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={formVideo.aprovado}
                    onChange={e => setFormVideo(f => ({ ...f, aprovado: e.target.checked }))}
                    style={{ accentColor: 'var(--brand)' }}
                  />
                  Visível para trabalhadores
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setModalVideo(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={salvarVideo}
                disabled={salvando || !formVideo.titulo.trim() || !formVideo.url.trim()}
                className="btn btn-primary">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
