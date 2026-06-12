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

  const [modalEpi, setModalEpi]       = useState(false);
  const [epiEditando, setEpiEditando] = useState(null);
  const [formEpi, setFormEpi]         = useState({
    nome: '', descricao: '', quando_usar: '', como_usar: '', erros_comuns: ''
  });

  const [modalVideo, setModalVideo]             = useState(false);
  const [videoEditando, setVideoEditando]       = useState(null);
  const [epiIdSelecionado, setEpiIdSelecionado] = useState(null);
  const [formVideo, setFormVideo]               = useState({
    titulo: '', url: '', descricao: '', fonte: '', aprovado: true, prioridade: 0
  });
  const [abaVideo, setAbaVideo]   = useState('url');
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

  const abrirModalEpi = (epi = null) => {
    setEpiEditando(epi);
    setFormEpi(epi
      ? { nome: epi.nome, descricao: epi.descricao || '', quando_usar: epi.quando_usar || '',
          como_usar: epi.como_usar || '', erros_comuns: epi.erros_comuns || '' }
      : { nome: '', descricao: '', quando_usar: '', como_usar: '', erros_comuns: '' }
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

  if (loading) return (
    <div className="tv-loading">
      <div className="tv-spinner" />
    </div>
  );

  return (
    <div className="tv-page">
      <div className="tv-header">
        <div>
          <h2 className="tv-header__title">
            <BookOpen size={22} /> Vídeos Educativos de EPIs
          </h2>
          <p className="tv-header__subtitle">Gerencie os vídeos que o chatbot recomendará aos trabalhadores</p>
        </div>
        <button onClick={() => abrirModalEpi()} className="btn-primary tv-header__btn">
          <Plus size={16} /> Novo EPI
        </button>
      </div>

      {erro    && <div className="tv-alert tv-alert--error"><AlertCircle size={16}/>{erro}</div>}
      {sucesso && <div className="tv-alert tv-alert--success"><CheckCircle size={16}/>{sucesso}</div>}

      {epiTypes.length === 0 ? (
        <div className="tv-empty">
          <Shield size={40} className="tv-empty__icon" />
          <p className="tv-empty__title">Nenhum EPI cadastrado ainda</p>
          <p className="tv-empty__hint">Clique em "Novo EPI" para começar</p>
        </div>
      ) : (
        <div className="tv-list">
          {epiTypes.map(epi => (
            <div key={epi.id} className="tv-card">
              <div className="tv-card__row">
                <button onClick={() => toggleExpandido(epi.id)} className="tv-card__toggle">
                  <div className="tv-card__icon">
                    <Shield size={18} />
                  </div>
                  <div className="tv-card__info">
                    <p className="tv-card__name">{epi.nome}</p>
                    <p className="tv-card__meta">{epi.videos?.length ?? 0} vídeo(s)</p>
                  </div>
                  {expandido === epi.id
                    ? <ChevronUp size={18} className="tv-card__chevron" />
                    : <ChevronDown size={18} className="tv-card__chevron" />}
                </button>
                <div className="tv-card__actions">
                  <button onClick={() => abrirModalEpi(epi)} className="btn-icon" title="Editar EPI"><Pencil size={15}/></button>
                  <button onClick={() => deletarEpi(epi.id)} className="btn-icon btn-danger" title="Excluir EPI"><Trash2 size={15}/></button>
                </div>
              </div>

              {expandido === epi.id && (
                <div className="tv-card__expanded">
                  {(epi.quando_usar || epi.como_usar || epi.erros_comuns) && (
                    <div className="tv-instructions">
                      {epi.quando_usar && (
                        <div className="tv-instruction tv-instruction--blue">
                          <p className="tv-instruction__label">📅 Quando usar</p>
                          <p className="tv-instruction__text">{epi.quando_usar}</p>
                        </div>
                      )}
                      {epi.como_usar && (
                        <div className="tv-instruction tv-instruction--green">
                          <p className="tv-instruction__label">✅ Como usar</p>
                          <p className="tv-instruction__text">{epi.como_usar}</p>
                        </div>
                      )}
                      {epi.erros_comuns && (
                        <div className="tv-instruction tv-instruction--red">
                          <p className="tv-instruction__label">⚠️ Erros comuns</p>
                          <p className="tv-instruction__text">{epi.erros_comuns}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="tv-videos">
                    <div className="tv-videos__header">
                      <p className="tv-videos__title"><Video size={14}/> Vídeos</p>
                      <button onClick={() => abrirModalVideo(epi.id)} className="btn-secondary tv-videos__add">
                        <Plus size={13}/> Adicionar vídeo
                      </button>
                    </div>

                    {epi.videos?.length === 0 ? (
                      <p className="tv-videos__empty">Nenhum vídeo cadastrado para este EPI.</p>
                    ) : (
                      <div className="tv-videos__list">
                        {epi.videos.map(v => (
                          <div key={v.id} className={`tv-video-item ${!v.aprovado ? 'tv-video-item--hidden' : ''}`}>
                            <div className="tv-video-item__info">
                              <Play size={14} className="tv-video-item__icon" />
                              <div>
                                <p className="tv-video-item__title">{v.titulo}</p>
                                {v.fonte && <p className="tv-video-item__fonte">{v.fonte}</p>}
                                {!v.aprovado && <span className="tv-video-item__badge">Oculto do chatbot</span>}
                              </div>
                            </div>
                            <div className="tv-video-item__actions">
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

      {modalEpi && (
        <div className="tv-overlay" onClick={() => setModalEpi(false)}>
          <div className="tv-modal tv-modal--lg" onClick={e => e.stopPropagation()}>
            <div className="tv-modal__header">
              <h3 className="tv-modal__title">
                <Shield size={18} />
                {epiEditando ? 'Editar EPI' : 'Novo Tipo de EPI'}
              </h3>
              <button className="tv-modal__close" onClick={() => setModalEpi(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="tv-modal__body">
              <div className="tv-section">
                <div className="tv-section__label"><Info size={13}/> Identificação</div>
                <div className="tv-section__body">
                  <div className="tv-field">
                    <label className="tv-label">Nome do EPI *</label>
                    <input className="tv-input" value={formEpi.nome}
                      onChange={e => setFormEpi(p => ({...p, nome: e.target.value}))}
                      placeholder="ex: Capacete de Segurança" />
                  </div>
                  <div className="tv-field">
                    <label className="tv-label">Descrição</label>
                    <input className="tv-input" value={formEpi.descricao}
                      onChange={e => setFormEpi(p => ({...p, descricao: e.target.value}))}
                      placeholder="Breve descrição" />
                  </div>
                </div>
              </div>

              <div className="tv-section">
                <div className="tv-section__label"><BookOpen size={13}/> Instruções de uso</div>
                <div className="tv-section__body">
                  <div className="tv-field">
                    <label className="tv-label">Quando usar</label>
                    <textarea className="tv-input" rows={2} value={formEpi.quando_usar}
                      onChange={e => setFormEpi(p => ({...p, quando_usar: e.target.value}))}
                      placeholder="Descreva as ocasiões de uso" />
                  </div>
                  <div className="tv-field">
                    <label className="tv-label">Como usar corretamente</label>
                    <textarea className="tv-input" rows={2} value={formEpi.como_usar}
                      onChange={e => setFormEpi(p => ({...p, como_usar: e.target.value}))}
                      placeholder="Passo a passo de uso correto" />
                  </div>
                  <div className="tv-field">
                    <label className="tv-label">Erros comuns</label>
                    <textarea className="tv-input" rows={2} value={formEpi.erros_comuns}
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

      {modalVideo && (
        <div className="tv-overlay" onClick={() => setModalVideo(false)}>
          <div className="tv-modal" onClick={e => e.stopPropagation()}>
            <div className="tv-modal__header">
              <h3 className="tv-modal__title">
                <Video size={18} />
                {videoEditando ? 'Editar Vídeo' : 'Adicionar Vídeo'}
              </h3>
              <button className="tv-modal__close" onClick={() => setModalVideo(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="tv-modal__body">
              <div className="tv-section">
                <div className="tv-section__label"><Info size={13}/> Informações básicas</div>
                <div className="tv-section__body">
                  <div className="tv-field">
                    <label className="tv-label">Título *</label>
                    <input className="tv-input" value={formVideo.titulo}
                      onChange={e => setFormVideo(p => ({...p, titulo: e.target.value}))}
                      placeholder="ex: Como usar capacete corretamente" />
                  </div>
                  <div className="tv-row">
                    <div className="tv-field">
                      <label className="tv-label">Fonte / Produtora</label>
                      <input className="tv-input" value={formVideo.fonte}
                        onChange={e => setFormVideo(p => ({...p, fonte: e.target.value}))}
                        placeholder="ex: SENAI, MTE" />
                    </div>
                    <div className="tv-field">
                      <label className="tv-label">Descrição</label>
                      <input className="tv-input" value={formVideo.descricao}
                        onChange={e => setFormVideo(p => ({...p, descricao: e.target.value}))}
                        placeholder="Breve descrição" />
                    </div>
                  </div>
                </div>
              </div>

              {!videoEditando && (
                <div className="tv-section">
                  <div className="tv-section__label"><FileVideo size={13}/> Origem do vídeo</div>
                  <div className="tv-section__body">
                    <div className="tv-tabs">
                      <button className={`tv-tab ${abaVideo === 'url' ? 'tv-tab--active' : ''}`} onClick={() => setAbaVideo('url')}>
                        <Link2 size={14}/> Link (URL)
                      </button>
                      <button className={`tv-tab ${abaVideo === 'upload' ? 'tv-tab--active' : ''}`} onClick={() => setAbaVideo('upload')}>
                        <Upload size={14}/> Upload de arquivo
                      </button>
                    </div>

                    {abaVideo === 'url' && (
                      <div className="tv-field">
                        <label className="tv-label">URL do vídeo *</label>
                        <input className="tv-input" value={formVideo.url}
                          onChange={e => setFormVideo(p => ({...p, url: e.target.value}))}
                          placeholder="https://youtube.com/watch?v=..." />
                      </div>
                    )}

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
                            <input ref={fileInputRef} type="file"
                              accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
                              onChange={e => handleArquivo(e.target.files[0])} />
                            <div className="tv-dropzone__icon"><FileVideo size={32} /></div>
                            <p className="tv-dropzone__text"><strong>Clique para selecionar</strong> ou arraste o arquivo aqui</p>
                            <p className="tv-dropzone__hint">MP4, WebM, OGG, MOV, AVI · Máx. 500 MB</p>
                          </div>
                        ) : (
                          <div>
                            <div className="tv-file-selected">
                              <FileVideo size={16} className="tv-file-selected__icon" />
                              <span className="tv-file-selected__name">{arquivo.name}</span>
                              <span className="tv-file-selected__size">{(arquivo.size / 1024 / 1024).toFixed(1)} MB</span>
                              <button className="tv-file-selected__remove" onClick={() => setArquivo(null)}><X size={14}/></button>
                            </div>
                            {uploadPct > 0 && (
                              <div className="tv-progress">
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

              {videoEditando && (
                <div className="tv-section">
                  <div className="tv-section__label"><Link2 size={13}/> Link do vídeo</div>
                  <div className="tv-section__body">
                    <div className="tv-field">
                      <label className="tv-label">URL *</label>
                      <input className="tv-input" value={formVideo.url}
                        onChange={e => setFormVideo(p => ({...p, url: e.target.value}))}
                        placeholder="https://youtube.com/watch?v=..." />
                    </div>
                  </div>
                </div>
              )}

              <div className="tv-section">
                <div className="tv-section__label"><Settings2 size={13}/> Configurações</div>
                <div className="tv-section__body">
                  <div className="tv-row">
                    <div className="tv-field">
                      <label className="tv-label">Prioridade (maior = aparece primeiro)</label>
                      <input type="number" className="tv-input" value={formVideo.prioridade}
                        onChange={e => setFormVideo(p => ({...p, prioridade: Number(e.target.value)}))} />
                    </div>
                    <div className="tv-field tv-field--center">
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
