import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['admin', 'manager', 'worker'] },
  { to: '/cameras', label: 'Câmeras', icon: '📹', roles: ['admin', 'manager'] },
  { to: '/occurrences', label: 'Ocorrências', icon: '⚠️', roles: ['admin', 'manager'] },
  { to: '/epi-requests', label: 'Solicitações EPI', icon: '🧲', roles: ['admin', 'manager', 'worker'] },
  { to: '/sectors', label: 'Setores', icon: '🏭', roles: ['admin'] },
  { to: '/users', label: 'Usuários', icon: '👥', roles: ['admin'] },
  { to: '/training', label: 'Treinamentos', icon: '🎬', roles: ['admin', 'manager', 'worker'] },
  { to: '/reports', label: 'Relatórios', icon: '📈', roles: ['admin', 'manager'] },
  { to: '/settings', label: 'Configurações', icon: '⚙️', roles: ['admin'] },
];

export default function NavDrawer({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !user?.role || item.roles.includes(user.role)
  );

  return (
    <>
      {isOpen && (
        <div
          className="nav-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <nav className={`nav-drawer ${isOpen ? 'open' : ''}`} aria-label="Menu principal">
        <div className="nav-header">
          <span className="nav-logo">EPIsee</span>
          <button className="nav-close" onClick={onClose} aria-label="Fechar menu">
            ✕
          </button>
        </div>
        <ul className="nav-list">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`nav-item ${location.pathname === item.to ? 'active' : ''}`}
                onClick={onClose}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="nav-footer">
          <Link to="/profile" className="nav-profile" onClick={onClose}>
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
