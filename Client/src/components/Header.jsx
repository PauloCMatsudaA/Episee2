import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Bell, Search, Menu } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Cabecalho({ titulo, aoAbrirMenu }) {
  const { user } = useAuth();
  const navegar  = useNavigate();

  const [notifAberta, setNotifAberta] = useState(false);
  const [alertas, setAlertas]         = useState([]);
  const [naoLidas, setNaoLidas]       = useState(0);
  const esRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('episee_token');
    if (!token) return;

    const conectar = () => {
      const url = `${BASE_URL}/api/detection/stream?token=${token}`;
      const es  = new EventSource(url);
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const dado = JSON.parse(e.data);
          if (dado.tipo === 'conectado') return;
          setAlertas(prev => [dado, ...prev].slice(0, 20));
          setNaoLidas(prev => prev + 1);
        } catch {}
      };

      es.onerror = () => {
        es.close();
        setTimeout(conectar, 5000);
      };
    };

    conectar();
    return () => esRef.current?.close();
  }, [user]);

  const abrirPainel = () => {
    setNotifAberta(prev => !prev);
    setNaoLidas(0);
  };

  const tempoRelativo = (ts) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60)    return `há ${diff}s`;
    if (diff < 3600)  return `há ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
    return `há ${Math.floor(diff / 86400)}d`;
  };

  const inicial      = user?.nome?.charAt(0) || user?.name?.charAt(0) || 'U';
  const primeiroNome = (user?.nome || user?.name || '').split(' ')[0];

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
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                onClick={() => setNotifAberta(false)}
              />
              <div className="notif-dropdown card fade-in" style={{ padding: '0.5rem' }}>
                <p className="notif-heading">Detecções em tempo real</p>

                {alertas.length === 0 ? (
                  <p style={{
                    textAlign: 'center',
                    padding: '1.5rem 1rem',
                    color: 'var(--text-faint)',
                    fontSize: '0.85rem',
                  }}>
                    Nenhuma não conformidade detectada
                  </p>
                ) : (
                  <ul>
                    {alertas.slice(0, 10).map((n, i) => (
                      <li key={n.id ?? i} className="notif-item">
                        <span
                          className="notif-item-dot"
                          style={{ background: '#ef4444' }}
                        />
                        <div style={{ flex: 1 }}>
                          <p className="notif-item-text">
                            ⚠️ Faltando: {n.epis_ausentes?.join(', ') || 'EPI'} — Câmera {n.camera_id}
                          </p>
                          <p className="notif-item-time">
                            {tempoRelativo(n.timestamp)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="notif-footer">
                  <button
                    className="notif-footer-btn"
                    onClick={() => {
                      setNotifAberta(false);
                      navegar('/ocorrencias');
                    }}
                  >
                    Ver todas
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

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
