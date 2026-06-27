import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Mapeia roles do backend para roles internos
const ROLE_MAP = {
  gestor: 'manager',
  admin: 'admin',
  manager: 'manager',
  worker: 'worker',
  operador: 'worker',
};

const NAV_ITEMS = [
  { to: '/dashboard',         label: 'Dashboard',          icon: '📊', roles: ['admin', 'manager', 'worker'] },
  { to: '/cameras',           label: 'Câmeras',             icon: '📹', roles: ['admin', 'manager'] },
  { to: '/occurrences',       label: 'Ocorrências',         icon: '⚠️', roles: ['admin', 'manager'] },
  { to: '/epi-requests',      label: 'Solicitações EPI',    icon: '🧰', roles: ['admin', 'manager', 'worker'] },
  { to: '/sectors',           label: 'Setores',             icon: '🏭', roles: ['admin', 'manager'] },
  { to: '/users',             label: 'Usuários',            icon: '👥', roles: ['admin', 'manager'] },
  { to: '/training-videos',   label: 'Treinamentos',        icon: '🎬', roles: ['admin', 'manager', 'worker'] },
  { to: '/reports',           label: 'Relatórios',          icon: '📈', roles: ['admin', 'manager'] },
  { to: '/settings',          label: 'Configurações',       icon: '⚙️', roles: ['admin', 'manager'] },
];

// Aceita tanto { aberto, aoFechar } quanto { isOpen, onClose }
export default function NavDrawer({ aberto, aoFechar, isOpen, onClose }) {
  const open    = aberto    ?? isOpen    ?? false;
  const onCloseF = aoFechar ?? onClose   ?? (() => {});

  const { user, logout } = useAuth();
  const location = useLocation();

  const mappedRole = ROLE_MAP[user?.role] ?? user?.role ?? 'worker';

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(mappedRole)
  );

  return (
    <>
      {open && (
        <div
          className="nav-overlay"
          onClick={onCloseF}
          aria-hidden="true"
        />
      )}
      <nav className={`nav-drawer ${open ? 'open' : ''}`} aria-label="Menu principal">
        <div className="nav-header">
          <span className="nav-logo">EPIsee</span>
          <button className="nav-close" onClick={onCloseF} aria-label="Fechar menu">
            ✕
          </button>
        </div>
        <ul className="nav-list">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`nav-item ${location.pathname === item.to ? 'active' : ''}`}
                onClick={onCloseF}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="nav-footer">
          <Link to="/perfil" className="nav-profile" onClick={onCloseF}>
            👤 {user?.name || 'Perfil'}
          </Link>
          <button className="nav-logout" onClick={logout}>
            Sair
          </button>
        </div>
      </nav>
    </>
  );
}
