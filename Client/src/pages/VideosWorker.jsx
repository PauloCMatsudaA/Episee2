import { useState, useEffect } from 'react';
import { PlayCircle, Search, ChevronDown, ChevronUp, ExternalLink, BookOpen, ShieldCheck, AlertTriangle, Info, Tag, Wrench } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function extrairYoutubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch (_) {}
  return null;
}

function CardVideo({ video }) {
  const ytId = extrairYoutubeId(video.url);
  const [expandido, setExpandido] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm mb-3">
      {ytId ? (
        expandido ? (
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
              title={video.titulo}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <button onClick={() => setExpandido(true)}
            className="relative w-full group focus:outline-none" style={{ paddingTop: '56.25%' }}>
            <img
              src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
              alt={video.titulo}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
              <PlayCircle className="w-14 h-14 text-white drop-shadow-lg" />
            </div>
          </button>
        )
      ) : (
        <a href={video.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
          <ExternalLink className="w-5 h-5 text-gray-500 shrink-0" />
          <span className="text-gray-700 text-sm font-medium">Abrir vídeo externo</span>
        </a>
      )}
      <div className="px-4 py-3">
        <p className="font-semibold text-gray-800 text-sm leading-snug">{video.titulo}</p>
        {video.fonte && <p className="text-xs text-gray-400 mt-0.5">{video.fonte}</p>}
      </div>
    </div>
  );
}

function CardEpi({ epi }) {
  const [aberto, setAberto] = useState(false);
  const videosVisiveis = (epi.videos || []).filter(v => v.aprovado);
  const keywords = epi.palavras_chave
    ? epi.palavras_chave.split(',').map(k => k.trim()).filter(Boolean)
    : [];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm mb-4 overflow-hidden">
      <button onClick={() => setAberto(a => !a)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left focus:outline-none active:bg-gray-50">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-base leading-tight truncate">{epi.nome}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {videosVisiveis.length} vídeo{videosVisiveis.length !== 1 ? 's' : ''} disponível{videosVisiveis.length !== 1 ? 'is' : ''}
          </p>
        </div>
        {aberto ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
      </button>

      {aberto && (
        <div className="border-t border-gray-100 px-4 pb-4">

          {}
          {(epi.descricao || epi.quando_usar || epi.como_usar || epi.erros_comuns || epi.nr6_ref) && (
            <div className="mt-3 rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">Sobre este EPI</p>
              </div>
              <div className="px-4 py-3 space-y-3">

                {epi.descricao && (
                  <div className="flex gap-2">
                    <Info className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Descrição</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{epi.descricao}</p>
                    </div>
                  </div>
                )}

                {epi.quando_usar && (
                  <div className="flex gap-2">
                    <ShieldCheck className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Quando usar</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{epi.quando_usar}</p>
                    </div>
                  </div>
                )}

                {epi.como_usar && (
                  <div className="flex gap-2">
                    <Wrench className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Como usar</p>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{epi.como_usar}</p>
                    </div>
                  </div>
                )}

                {epi.erros_comuns && (
                  <div className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Erros comuns</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{epi.erros_comuns}</p>
                    </div>
                  </div>
                )}

                {epi.nr6_ref && (
                  <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">📋 {epi.nr6_ref}</p>
                )}
              </div>
            </div>
          )}

          {}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              <Tag className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
              {keywords.map(k => (
                <span key={k} className="text-xs text-gray-500">{k}</span>
              ))}
            </div>
          )}

          {}
          {videosVisiveis.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🎬 Vídeos de treinamento</p>
              {videosVisiveis.sort((a, b) => b.prioridade - a.prioridade).map(v => (
                <CardVideo key={v.id} video={v} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum vídeo disponível ainda.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function VideosWorker() {
  const [epis, setEpis]       = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca]     = useState('');

  useEffect(() => {
    const token = localStorage.getItem('episee_token');
    fetch(`${API_BASE}/api/training/worker/epis`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => setEpis(Array.isArray(data) ? data : []))
      .catch(() => setEpis([]))
      .finally(() => setCarregando(false));
  }, []);

  const episFiltrados = epis.filter(e => {
    const q = busca.toLowerCase();
    if (!q) return true;
    if (e.nome.toLowerCase().includes(q)) return true;
    if (e.palavras_chave && e.palavras_chave.toLowerCase().includes(q)) return true;
    return false;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-gray-800 px-4 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-1">
          <PlayCircle className="w-7 h-7 text-white" />
          <h1 className="text-xl font-bold text-white">Meus Treinamentos</h1>
        </div>
        <p className="text-gray-300 text-sm">Vídeos e instruções sobre uso correto dos EPIs</p>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="search" placeholder="Buscar EPI ou sinônimo..."
            value={busca} onChange={e => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-3 rounded-xl text-sm bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
      </div>

      <div className="px-4 -mt-4">
        {carregando ? (
          <div className="space-y-3 mt-4">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-white shadow-sm animate-pulse" />)}
          </div>
        ) : episFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldCheck className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">
              {busca ? `Nenhum EPI encontrado para "${busca}"` : 'Nenhum treinamento disponível ainda.'}
            </p>
            {busca && <button onClick={() => setBusca('')} className="mt-2 text-sm text-gray-500 underline">Limpar busca</button>}
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-3">
              {episFiltrados.length} EPI{episFiltrados.length !== 1 ? 's' : ''} encontrado{episFiltrados.length !== 1 ? 's' : ''}
            </p>
            {episFiltrados.map(epi => <CardEpi key={epi.id} epi={epi} />)}
          </div>
        )}
      </div>
    </div>
  );
}
