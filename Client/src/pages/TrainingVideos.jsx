import { useEffect, useRef, useState } from 'react';
import {
  BookOpen, Play, Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle, ExternalLink, Video, Shield,
  Link2, Upload, X, FileVideo, Info, Settings2
} from 'lucide-react';
import api from '../api/api';
import './TrainingVideos.css';

export default function TrainingVideos() {
  const [epiTypes, setEpiTypes]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [erro, setErro]           = useState('');
  const [sucesso, setSucesso]     = useState('');
  const [expandido, setExpandido] = useState(null);

  // Modal EpiType
  const [modalEpi, setModalEpi]       = useState(false);
  const [epiEditando, setEpiEditando] = useState(null);
  const [formEpi, setFormEpi]         = useState({
    nome: '', descricao: '', quando_usar: '', como_usar: '', erros_comuns: '', nr6_ref: ''
  });

  // Modal Vídeo
  const [modalVideo, setModalVideo]         = useState(false);
  const [videoEditando, setVideoEditando]   = useState(null);
  const [epiIdSelecionado, setEpiIdSelecionado] = useState(null);
  const [formVideo, setFormVideo]           = useState({
    titulo: '', url: '', descricao: '', fonte: '', aprovado: true, prioridade: 0
  });
  const [abaVideo, setAbaVideo]   = useState('url'); // 'url' | 'upload'
  const [arquivo, setArquivo]     = useState(null);
  const [dragOver, setDragOver]   = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [enviando, setEnviando]   = useState(false);
  const fileInputRef              = useRef(null);

  const mostrarSucesso = (msg) => { setSucesso(msg); setTimeout(() => setSucesso(''), 3500); };
  const mostrarErro    = (msg) => { setErro(msg);    setTimeout(() => setErro(''), 4000); };

  const carregarEpis = async () => {
    try {
      const { data } = await api.get('/api/training/epi-types');
      setEpiTypes(data);
    } catch { mostrarErro('Erro ao carregar EPIs.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregarEpis(); }, []);

  // ── EpiType ────────────────────────────────────────────────────────────────
  const abrirModalEpi = (epi = null) => {
    setEpiEditando(epi);
    setFormEpi(epi
      ? { nome: epi.nome, descricao: epi.descricao || '', quando_usar: epi.quando_usar || '',
          como_usar: epi.como_usar || '', erros_comuns: epi.erros_comuns || '', nr6_ref: epi.nr6_ref || '' }
      : { nome: '', descricao: '', quando_usar: '', como_usar: '', erros_comuns: '', nr6_ref: '' }
    );
    setModalEpi(true);
  };

  const salvarEpi = async () => {
    if (!formEpi.nome.trim()) return mostrarErro('Nome do EPI é obrigatório.');
    try {
      if (epiEditando) {
        await api.patch(`/api/training/epi-types/${epiEditando.id}`, formEpi);
        mostrarSucesso('EPI atualizado com sucesso!');
      } else {
        await api.post('/api/training/epi-types', formEpi);
        mostrarSucesso('EPI criado com sucesso!');
      }
      setModalEpi(false);
      carregarEpis();
    } catch (e) { mostrarErro(e.response?.data?.detail || 'Erro ao salvar EPI.'); }
  };

  const deletarEpi = async (id) => {
    if (!confirm('Excluir este EPI e todos os seus vídeos?')) return;
    try {
      await api.delete(`/api/training/epi-types/${id}`);
      mostrarSucesso('EPI excluído.');
      carregarEpis();
    } catch { mostrarErro('Erro ao excluir EPI.'); }
  };

  // ── Vídeo ──────────────────────────────────────────────────────────────────
  const abrirModalVideo = (epiId, video = null) => {
    setEpiIdSelecionado(epiId);
    setVideoEditando(video);
    setFormVideo(video
      ? { titulo: video.titulo, url: video.url, descricao: video.descricao || '',
          fonte: video.fonte || '', aprovado: video.aprovado, prioridade: video.prioridade }
      : { titulo: '', url: '', descricao: '', fonte: '', aprovado: true, prioridade: 0 }
    );
    setAbaVideo('url');
    setArquivo(null);
    setUploadPct(0);
    setModalVideo(true);
  };

  const handleArquivo = (file) => {
    if (!file) return;
    const tipos = ['video/mp4','video/webm','video/ogg','video/quicktime','video/x-msvideo'];
    if (!tipos.includes(file.type)) return mostrarErro('Formato inválido. Use MP4, WebM, OGG, MOV ou AVI.');
    if (file.size > 500 * 1024 * 1024) return mostrarErro('Arquivo muito grande. Máximo 500 MB.');
    setArquivo(file);
    if (!formVideo.titulo) setFormVideo(p => ({ ...p, titulo: file.name.replace(/\.[^.]+$/, '') }));
  };

  const salvarVideo = async () => {
    if (!formVideo.titulo.trim()) return mostrarErro('Título é obrigatório.');

    try {
      setEnviando(true);

      if (abaVideo === 'upload' && arquivo && !videoEditando) {
        // Upload de arquivo
        const fd = new FormData();
        fd.append('file', arquivo);
        fd.append('titulo', formVideo.titulo);
        fd.append('descricao', formVideo.descricao);
        fd.append('fonte', formVideo.fonte);
        fd.append('aprovado', formVideo.aprovado);
        fd.append('prioridade', formVideo.prioridade);
        fd.append('epi_type_id', epiIdSelecionado);

        await api.post('/api/training/videos/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (ev) => {
            if (ev.total) setUploadPct(Math.round((ev.loaded / ev.total) * 100));
          },
        });
        mostrarSucesso('Vídeo enviado com sucesso!');
      } else {
        // URL
        if (!formVideo.url.trim()) return mostrarErro('URL do vídeo é obrigatória.');
        if (videoEditando) {
          await api.patch(`/api/training/videos/${videoEditando.id}`, formVideo);
          mostrarSucesso('Vídeo atualizado!');
        } else {
          await api.post('/api/training/videos', { ...formVideo, epi_type_id: epiIdSelecionado });
          mostrarSucesso('Vídeo adicionado!');
        }
      }

      setModalVideo(false);
      carregarEpis();
    } catch (e) {
      mostrarErro(e.response?.data?.detail || 'Erro ao salvar vídeo.');
    } finally {
      setEnviando(false);
      setUploadPct(0);
    }
  };

  const deletarVideo = async (videoId) => {
    if (!confirm('Excluir este vídeo?')) return;
    try {
      await api.delete(`/api/training/videos/${videoId}`);
      mostrarSucesso('Vídeo excluído.');
      carregarEpis();
    } catch { mostrarErro('Erro ao excluir vídeo.'); }
  };

  const toggleExpandido = (id) => setExpandido(expandido === id ? null : id);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
            <BookOpen size={22} /> Vídeos Educativos de EPIs
          </h2>
          <p className="text-sm text-secondary mt-1">Gerencie os vídeos que o chatbot recomendará aos trabalhadores</p>
        </div>
        <button onClick={() => abrirModalEpi()} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo EPI
        </button>
      </div>

      {/* Alertas */}
      {erro    && <div className="alert-error flex items-center gap-2"><AlertCircle size={16}/>{erro}</div>}
      {sucesso && <div className="alert-success flex items-center gap-2"><CheckCircle size={16}/>{sucesso}</div>}

      {/* Lista de EPIs */}
      {epiTypes.length === 0 ? (
        <div className="card text-center py-12 text-secondary">
          <Shield size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum EPI cadastrado ainda</p>
          <p className="text-sm mt-1">Clique em "Novo EPI" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {epiTypes.map(epi => (
            <div key={epi.id} className="card overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <button onClick={() => toggleExpandido(epi.id)} className="flex items-center gap-3 flex-1 text-left">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-primary">{epi.nome}</p>
                    <p className="text-xs text-secondary">
                      {epi.videos?.length ?? 0} vídeo(s){epi.nr6_ref && ` · ${epi.nr6_ref}`}
                    </p>
                  </div>
                  {expandido === epi.id
                    ? <ChevronUp size={18} className="ml-auto text-secondary" />
                    : <ChevronDown size={18} className="ml-auto text-secondary" />}
                </button>
                <div className="flex gap-2 ml-3">
                  <button onClick={() => abrirModalEpi(epi)} className="btn-icon" title="Editar EPI"><Pencil size={15}/></button>
                  <button onClick={() => deletarEpi(epi.id)} className="btn-icon btn-danger" title="Excluir EPI"><Trash2 size={15}/></button>
                </div>
              </div>

              {expandido === epi.id && (
                <div className="border-t border-border px-4 pb-4 space-y-4">
                  {(epi.quando_usar || epi.como_usar || epi.erros_comuns) && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                      {epi.quando_usar && (
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="font-semibold text-blue-700 mb-1">📅 Quando usar</p>
                          <p className="text-blue-600">{epi.quando_usar}</p>
                        </div>
                      )}
                      {epi.como_usar && (
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="font-semibold text-green-700 mb-1">✅ Como usar</p>
                          <p className="text-green-600">{epi.como_usar}</p>
                        </div>
                      )}
                      {epi.erros_comuns && (
                        <div className="bg-red-50 rounded-lg p-3">
                          <p className="font-semibold text-red-700 mb-1">⚠️ Erros comuns</p>
                          <p className="text-red-600">{epi.erros_comuns}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-primary flex items-center gap-1"><Video size={14}/> Vídeos</p>
                      <button onClick={() => abrirModalVideo(epi.id)} className="btn-secondary text-xs flex items-center gap-1">
                        <Plus size={13}/> Adicionar vídeo
                      </button>
                    </div>

                    {epi.videos?.length === 0 ? (
                      <p className="text-sm text-secondary">Nenhum vídeo cadastrado para este EPI.</p>
                    ) : (
                      <div className="space-y-2">
                        {epi.videos.map(v => (
                          <div key={v.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                            v.aprovado ? 'border-border bg-surface' : 'border-orange-200 bg-orange-50'
                          }`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <Play size={14} className="text-primary flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{v.titulo}</p>
                                {v.fonte && <p className="text-xs text-secondary">{v.fonte}</p>}
                                {!v.aprovado && <span className="text-xs text-orange-600 font-medium">Oculto do chatbot</span>}
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0 ml-2">
                              <a href={v.url} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Abrir vídeo"><ExternalLink size={14}/></a>
                              <button onClick={() => abrirModalVideo(epi.id, v)} className="btn-icon" title="Editar"><Pencil size={14}/></button>
                              <button onClick={() => deletarVideo(v.id)} className="btn-icon btn-danger" title="Excluir"><Trash2 size={14}/></button>
                            </div>
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

      {/* ═══════════════════════════════════════
          Modal — Novo / Editar EPI
      ═══════════════════════════════════════ */}
      {modalEpi && (
        <div className="tv-overlay" onClick={() => setModalEpi(false)}>
          <div className="tv-modal tv-modal--lg" onClick={e => e.stopPropagation()}>

            <div className="tv-modal__header">
              <h3 className="tv-modal__title">
                <Shield size={18} className="text-primary" />
                {epiEditando ? 'Editar EPI' : 'Novo Tipo de EPI'}
              </h3>
              <button className="tv-modal__close" onClick={() => setModalEpi(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="tv-modal__body">

              {/* Seção: Identificação */}
              <div className="tv-section">
                <div className="tv-section__label"><Info size={13}/> Identificação</div>
                <div className="tv-section__body">
                  <div>
                    <label className="form-label">Nome do EPI *</label>
                    <input className="form-input" value={formEpi.nome}
                      onChange={e => setFormEpi(p => ({...p, nome: e.target.value}))}
                      placeholder="ex: Capacete de Segurança" />
                  </div>
                  <div className="tv-row">
                    <div>
                      <label className="form-label">Descrição</label>
                      <input className="form-input" value={formEpi.descricao}
                        onChange={e => setFormEpi(p => ({...p, descricao: e.target.value}))}
                        placeholder="Breve descrição" />
                    </div>
                    <div>
                      <label className="form-label">Referência NR-6</label>
                      <input className="form-input" value={formEpi.nr6_ref}
                        onChange={e => setFormEpi(p => ({...p, nr6_ref: e.target.value}))}
                        placeholder="ex: NR-6 item 6.3" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção: Instruções de uso */}
              <div className="tv-section">
                <div className="tv-section__label"><BookOpen size={13}/> Instruções de uso</div>
                <div className="tv-section__body">
                  <div>
                    <label className="form-label">Quando usar</label>
                    <textarea className="form-input" rows={2} value={formEpi.quando_usar}
                      onChange={e => setFormEpi(p => ({...p, quando_usar: e.target.value}))}
                      placeholder="Descreva as ocasiões de uso" />
                  </div>
                  <div>
                    <label className="form-label">Como usar corretamente</label>
                    <textarea className="form-input" rows={2} value={formEpi.como_usar}
                      onChange={e => setFormEpi(p => ({...p, como_usar: e.target.value}))}
                      placeholder="Passo a passo de uso correto" />
                  </div>
                  <div>
                    <label className="form-label">Erros comuns</label>
                    <textarea className="form-input" rows={2} value={formEpi.erros_comuns}
                      onChange={e => setFormEpi(p => ({...p, erros_comuns: e.target.value}))}
                      placeholder="Erros frequentes que o chatbot deve alertar" />
                  </div>
                </div>
              </div>

            </div>

            <div className="tv-modal__footer">
              <button onClick={() => setModalEpi(false)} className="btn-secondary">Cancelar</button>
              <button onClick={salvarEpi} className="btn-primary">{epiEditando ? 'Salvar alterações' : 'Criar EPI'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          Modal — Novo / Editar Vídeo
      ═══════════════════════════════════════ */}
      {modalVideo && (
        <div className="tv-overlay" onClick={() => setModalVideo(false)}>
          <div className="tv-modal" onClick={e => e.stopPropagation()}>

            <div className="tv-modal__header">
              <h3 className="tv-modal__title">
                <Video size={18} className="text-primary" />
                {videoEditando ? 'Editar Vídeo' : 'Adicionar Vídeo'}
              </h3>
              <button className="tv-modal__close" onClick={() => setModalVideo(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="tv-modal__body">

              {/* Seção: Informações básicas */}
              <div className="tv-section">
                <div className="tv-section__label"><Info size={13}/> Informações básicas</div>
                <div className="tv-section__body">
                  <div>
                    <label className="form-label">Título *</label>
                    <input className="form-input" value={formVideo.titulo}
                      onChange={e => setFormVideo(p => ({...p, titulo: e.target.value}))}
                      placeholder="ex: Como usar capacete corretamente" />
                  </div>
                  <div className="tv-row">
                    <div>
                      <label className="form-label">Fonte / Produtora</label>
                      <input className="form-input" value={formVideo.fonte}
                        onChange={e => setFormVideo(p => ({...p, fonte: e.target.value}))}
                        placeholder="ex: SENAI, MTE" />
                    </div>
                    <div>
                      <label className="form-label">Descrição</label>
                      <input className="form-input" value={formVideo.descricao}
                        onChange={e => setFormVideo(p => ({...p, descricao: e.target.value}))}
                        placeholder="Breve descrição" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção: Origem do vídeo (abas) */}
              {!videoEditando && (
                <div className="tv-section">
                  <div className="tv-section__label"><FileVideo size={13}/> Origem do vídeo</div>
                  <div className="tv-section__body">

                    {/* Abas */}
                    <div className="tv-tabs">
                      <button
                        className={`tv-tab ${abaVideo === 'url' ? 'tv-tab--active' : ''}`}
                        onClick={() => setAbaVideo('url')}
                      >
                        <Link2 size={14}/> Link (URL)
                      </button>
                      <button
                        className={`tv-tab ${abaVideo === 'upload' ? 'tv-tab--active' : ''}`}
                        onClick={() => setAbaVideo('upload')}
                      >
                        <Upload size={14}/> Upload de arquivo
                      </button>
                    </div>

                    {/* Aba URL */}
                    {abaVideo === 'url' && (
                      <div>
                        <label className="form-label">URL do vídeo *</label>
                        <input className="form-input" value={formVideo.url}
                          onChange={e => setFormVideo(p => ({...p, url: e.target.value}))}
                          placeholder="https://youtube.com/watch?v=..." />
                      </div>
                    )}

                    {/* Aba Upload */}
                    {abaVideo === 'upload' && (
                      <div>
                        {!arquivo ? (
                          <div
                            className={`tv-dropzone ${dragOver ? 'tv-dropzone--active' : ''}`}
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={e => { e.preventDefault(); setDragOver(false); handleArquivo(e.dataTransfer.files[0]); }}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
                              onChange={e => handleArquivo(e.target.files[0])}
                            />
                            <div className="tv-dropzone__icon flex justify-center">
                              <FileVideo size={32} />
                            </div>
                            <p className="tv-dropzone__text">
                              <strong>Clique para selecionar</strong> ou arraste o arquivo aqui
                            </p>
                            <p className="tv-dropzone__hint">MP4, WebM, OGG, MOV, AVI · Máx. 500 MB</p>
                          </div>
                        ) : (
                          <div>
                            <div className="tv-file-selected">
                              <FileVideo size={16} className="text-primary flex-shrink-0" />
                              <span className="tv-file-selected__name">{arquivo.name}</span>
                              <span className="text-xs text-secondary flex-shrink-0">
                                {(arquivo.size / 1024 / 1024).toFixed(1)} MB
                              </span>
                              <button className="tv-file-selected__remove" onClick={() => setArquivo(null)}>
                                <X size={14}/>
                              </button>
                            </div>
                            {uploadPct > 0 && (
                              <div className="tv-progress mt-2">
                                <div className="tv-progress__bar" style={{ width: `${uploadPct}%` }} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Aba URL no modo edição */}
              {videoEditando && (
                <div className="tv-section">
                  <div className="tv-section__label"><Link2 size={13}/> Link do vídeo</div>
                  <div className="tv-section__body">
                    <div>
                      <label className="form-label">URL *</label>
                      <input className="form-input" value={formVideo.url}
                        onChange={e => setFormVideo(p => ({...p, url: e.target.value}))}
                        placeholder="https://youtube.com/watch?v=..." />
                    </div>
                  </div>
                </div>
              )}

              {/* Seção: Configurações */}
              <div className="tv-section">
                <div className="tv-section__label"><Settings2 size={13}/> Configurações</div>
                <div className="tv-section__body">
                  <div className="tv-row">
                    <div>
                      <label className="form-label">Prioridade (maior = aparece primeiro)</label>
                      <input type="number" className="form-input" value={formVideo.prioridade}
                        onChange={e => setFormVideo(p => ({...p, prioridade: Number(e.target.value)}))} />
                    </div>
                    <div className="flex items-center" style={{ paddingTop: '1.4rem' }}>
                      <label className="tv-toggle">
                        <input type="checkbox" checked={formVideo.aprovado}
                          onChange={e => setFormVideo(p => ({...p, aprovado: e.target.checked}))} />
                        <span className="tv-toggle__track" />
                        Visível no chatbot
                      </label>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="tv-modal__footer">
              <button onClick={() => setModalVideo(false)} className="btn-secondary" disabled={enviando}>Cancelar</button>
              <button onClick={salvarVideo} className="btn-primary" disabled={enviando}>
                {enviando
                  ? (uploadPct > 0 ? `Enviando ${uploadPct}%…` : 'Salvando…')
                  : videoEditando ? 'Salvar alterações' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
