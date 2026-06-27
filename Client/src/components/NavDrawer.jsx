import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  LayoutDashboard,
  AlertTriangle,
  FileBarChart,
  ClipboardList,
  Camera,
  Building2,
  Settings,
  LogOut,
  X,
  Users,
  Video,
} from "lucide-react";

const itensMenu = [
  { rota: "/dashboard",        rotulo: "Dashboard",             Icone: LayoutDashboard },
  { rota: "/occurrences",      rotulo: "Ocorr\u00eancias",            Icone: AlertTriangle },
  { rota: "/reports",          rotulo: "Relat\u00f3rios",              Icone: FileBarChart },
  { rota: "/epi-requests",     rotulo: "Solicita\u00e7\u00f5es EPI",       Icone: ClipboardList },
  { rota: "/cameras",          rotulo: "C\u00e2meras",                 Icone: Camera },
  { rota: "/sectors",          rotulo: "Setores",                Icone: Building2 },
  { rota: "/users",            rotulo: "Usu\u00e1rios",               Icone: Users },
  { rota: "/training-videos",  rotulo: "Treinamentos",           Icone: Video },
  { rota: "/settings",         rotulo: "Configura\u00e7\u00f5es",          Icone: Settings },
];

export default function MenuGaveta({ aberto, aoFechar }) {
  const { user, logout } = useAuth();

  const inicial = user?.name?.charAt(0) || "U";
  const nome    = user?.name  || "";
  const cargo   = user?.role  || "";

  return (
    <>
      <div
        aria-hidden="true"
        onClick={aoFechar}
        className={`nav-overlay ${aberto ? "open" : "closed"}`}
      />

      <nav
        aria-label="Menu de navega\u00e7\u00e3o"
        className={`nav-drawer ${aberto ? "open" : "closed"}`}
      >
        <div className="nav-header">
          <div className="nav-logo">
            <span className="nav-logo-text">EPI<span>see</span></span>
          </div>
          <button
            onClick={aoFechar}
            className="nav-close"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <ul className="nav-links">
          {itensMenu.map(({ rota, rotulo, Icone }) => (
            <li key={rota}>
              <NavLink
                to={rota}
                onClick={aoFechar}
                className={({ isActive }) =>
                  `nav-link${isActive ? " active" : ""}`
                }
              >
                <Icone size={18} />
                {rotulo}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="nav-footer">
          {user && (
            <div className="nav-user">
              <div className="nav-user-avatar">{inicial}</div>
              <div style={{ minWidth: 0 }}>
                <p className="nav-user-name">{nome}</p>
                <p className="nav-user-role">{cargo}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => { logout(); aoFechar(); }}
            className="nav-logout"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </nav>
    </>
  );
}
