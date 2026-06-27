import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Bell, Search, Menu } from 'lucide-react';
import { ocorrenciasApi } from '../api/api';

const POLLING_MS = 30_000;

export default function Cabecalho({ titulo, aoAbrirMenu }) {
  const { usuario }  = useAuth();
  const navegar      = useNavigate();

  const [notifAberta, setNotifAberta] = useState(false);
  const [alertas, setAlertas]         = useState([]);
  const [naoLidas, setNaoLidas]       = useState(0);
  const ultimaChecagem = useRef(new Date().toISOString());
  const intervalRef    = useRef(null);

  const buscarOcorrenciasNovas = useCallback(async () => {
    try {
      const res  = await ocorrenciasApi.listar({ limit: 10 });
      const lista = res.data ?? [];

      const novas = lista.filter(
        o => o.status === 'nao_conforme' && new Date(o.timestamp) > new Date(ultimaChecagem.current)
      );

      if (novas.length > 0) {
        setAlertas(prev => [...novas, ...prev].slice(0, 20));
        setNaoLidas(prev => prev + novas.length);
        ultimaChecagem.current = new Date().toISOString();
      }
    } catch (err) {
      console.warn('[Alertas] Erro:', err?.message);
    }
  }, []);

  useEffect(() => {
    if (!usuario) return;
    buscarOcorrenciasNovas();
    intervalRef.current = setInterval(buscarOcorrenciasNovas, POLLING_MS);
    return () => clearInterval(intervalRef.current);
  }, [usuario, buscarOcorrenciasNovas]);

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
                <p className="notif-heading">Detecções recentes</p>

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
                    {alertas.slice(0, 10).map(n => (
                      <li
                        key={n.id}
                        className="notif-item"
                      >
                        <span
                          className="notif-item-dot"
                          style={{ background: '#ef4444' }}
                        />
                        <div style={{ flex: 1 }}>
                          <p className="notif-item-text">
                            ⚠️ {n.epi_detected ?? 'Não conformidade'} — {n.camera_name ?? n.sector_name ?? 'Câmera'}
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
