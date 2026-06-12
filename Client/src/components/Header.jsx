import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Bell, Search, Menu } from 'lucide-react';
import { notificacoesApi } from '../api/api';

const POLLING_MS = 15_000; // busca a cada 15 segundos

export default function Cabecalho({ titulo, aoAbrirMenu }) {
  const { usuario }  = useAuth();
  const navegar      = useNavigate();

  const [notifAberta, setNotifAberta]   = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [naoLidas, setNaoLidas]         = useState(0);
  const intervalRef = useRef(null);

  // ── Busca notificações reais da API ───────────────────────────────────────
  const buscarNotificacoes = useCallback(async () => {
    try {
      const res  = await notificacoesApi.listar(); // GET /api/notifications/
      const lista = res.data || [];
      setNotificacoes(lista);
      setNaoLidas(lista.filter(n => !n.lida).length);
   } catch (err) {
  console.warn('[Notificações] Erro ao buscar:', err);
  console.warn('Response:', err?.response);
  console.warn('Message:', err?.message);
  console.warn('Code:', err?.code);
}
  }, []);

  // Polling automático enquanto o usuário está logado
  useEffect(() => {
    if (!usuario) return;

    buscarNotificacoes(); // busca imediata ao montar

    intervalRef.current = setInterval(buscarNotificacoes, POLLING_MS);
    return () => clearInterval(intervalRef.current);
  }, [usuario, buscarNotificacoes]);

  // ── Abre painel e marca todas como lidas ──────────────────────────────────
  const abrirPainel = async () => {
    const abrindo = !notifAberta;
    setNotifAberta(abrindo);

    if (abrindo && naoLidas > 0) {
      try {
        await notificacoesApi.marcarTodasLidas(); // PATCH /api/notifications/read-all
        setNaoLidas(0);
        setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
      } catch {
        // silencia
      }
    }
  };

  // ── Tempo relativo ────────────────────────────────────────────────────────
  const tempoRelativo = (criado_em) => {
    const diff = Math.floor((Date.now() - new Date(criado_em).getTime()) / 1000);
    if (diff < 60)    return `há ${diff}s`;
    if (diff < 3600)  return `há ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
    return `há ${Math.floor(diff / 86400)}d`;
  };

  // ── Cor do ponto por tipo ─────────────────────────────────────────────────
  const corTipo = {
    err:  '#ef4444',
    warn: '#f59e0b',
    info: '#3b82f6',
  };

  const inicial      = usuario?.nome?.charAt(0) || usuario?.name?.charAt(0) || 'U';
  const primeiroNome = (usuario?.nome || usuario?.name || '').split(' ')[0];

  return (
    <header className="header">
      <div className="header-left">
        <button onClick={aoAbrirMenu} className="btn-icon" aria-label="Abrir menu">
          <Menu size={20} />
        </button>
        <h1 className="header-title">{titulo}</h1>
      </div>

      <div className="header-right">
        <div className="header-search">
          <Search size={15} style={{ color: 'var(--text-faint)' }} />
          <input type="text" placeholder="Buscar..." />
        </div>

        {/* ── Sino de notificações ── */}
        <div className="notif-wrapper">
          <button
            onClick={abrirPainel}
            className="btn-icon"
            aria-label="Notificações"
          >
            <Bell size={20} />
            {naoLidas > 0 && (
              <span className="notif-badge">
                {naoLidas > 99 ? '99+' : naoLidas}
              </span>
            )}
          </button>

          {notifAberta && (
            <>
              {/* Overlay para fechar ao clicar fora */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                onClick={() => setNotifAberta(false)}
              />

              <div className="notif-dropdown card fade-in" style={{ padding: '0.5rem' }}>
                <p className="notif-heading">Notificações</p>

                {notificacoes.length === 0 ? (
                  <p style={{
                    textAlign: 'center',
                    padding: '1.5rem 1rem',
                    color: 'var(--text-faint)',
                    fontSize: '0.85rem',
                  }}>
                    Nenhuma notificação
                  </p>
                ) : (
                  <ul>
                    {notificacoes.slice(0, 10).map(n => (
                      <li
                        key={n.id}
                        className="notif-item"
                        style={{ opacity: n.lida ? 0.5 : 1 }}
                      >
                        <span
                          className="notif-item-dot"
                          style={{ background: corTipo[n.tipo] || '#6b7280' }}
                        />
                        <div style={{ flex: 1 }}>
                          <p className="notif-item-text">{n.texto}</p>
                          <p className="notif-item-time">
                            {tempoRelativo(n.criado_em)}
                          </p>
                        </div>
                        {/* Bolinha azul = não lida */}
                        {!n.lida && (
                          <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#3b82f6',
                            flexShrink: 0,
                          }} />
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="notif-footer">
                  <button
                    className="notif-footer-btn"
                    onClick={() => {
                      setNotifAberta(false);
                      navegar('/notificacoes');
                    }}
                  >
                    Ver todas
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Avatar / Perfil ── */}
        <button
          className="header-avatar-btn"
          onClick={() => navegar('/perfil')}
          title="Ver meu perfil"
        >
          <div className="header-avatar">{inicial}</div>
          <span className="header-avatar-name">{primeiroNome}</span>
        </button>
      </div>
    </header>
  );
}