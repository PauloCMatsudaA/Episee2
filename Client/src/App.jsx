import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import NavDrawer from './components/NavDrawer';
import Cabecalho from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Ocorrencias from './pages/Occurrences';
import Relatorios from './pages/Reports';
import SolicitacoesEpi from './pages/EpiRequests';
import Cameras from './pages/Cameras';
import Setores from './pages/Sectors';
import Configuracoes from './pages/Settings';
import PerfilUsuario from './pages/PerfilUsuario';
import Usuarios from './pages/Usuarios';
import TrainingVideos from './pages/TrainingVideos';
import VideosWorker from './pages/VideosWorker';

const titulosPagina = {
  '/dashboard':         'Dashboard',
  '/occurrences':       'Ocorrências',
  '/reports':           'Relatórios',
  '/epi-requests':      'Solicitações EPI',
  '/cameras':           'Câmeras',
  '/sectors':           'Setores',
  '/settings':          'Configurações',
  '/users':             'Usuários',
  '/perfil':            'Meu Perfil',
  '/training-videos':   'Vídeos Educativos',
  '/meus-treinamentos': 'Meus Treinamentos',
};

function Protegida({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

function Layout() {
  const { pathname } = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar fixa em desktop */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        height: '100vh',
        overflowY: 'auto',
        background: 'var(--color-sidebar, #0f172a)',
        display: 'flex',
        flexDirection: 'column',
      }} className="sidebar-desktop">
        <NavDrawer aberto={true} aoFechar={() => {}} />
      </aside>

      {/* Drawer mobile */}
      <NavDrawer aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />

      {/* Conteúdo principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Cabecalho
          titulo={titulosPagina[pathname] || 'Dashboard'}
          aoAbrirMenu={() => setMenuAberto(true)}
        />
        <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <Routes>
            <Route path="/dashboard"          element={<Dashboard />}        />
            <Route path="/occurrences"        element={<Ocorrencias />}      />
            <Route path="/reports"            element={<Relatorios />}       />
            <Route path="/epi-requests"       element={<SolicitacoesEpi />}  />
            <Route path="/cameras"            element={<Cameras />}          />
            <Route path="/sectors"            element={<Setores />}          />
            <Route path="/settings"           element={<Configuracoes />}    />
            <Route path="/users"              element={<Usuarios />}         />
            <Route path="/perfil"             element={<PerfilUsuario />}    />
            <Route path="/training-videos"    element={<TrainingVideos />}   />
            <Route path="/meus-treinamentos"  element={<VideosWorker />}     />
            <Route path="*"                   element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<Protegida><Layout /></Protegida>} />
    </Routes>
  );
}
