import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import MenuGaveta from './components/NavDrawer';
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
  '/occurrences':       'Ocorr\u00eancias',
  '/reports':           'Relat\u00f3rios',
  '/epi-requests':      'Solicita\u00e7\u00f5es EPI',
  '/cameras':           'C\u00e2meras',
  '/sectors':           'Setores',
  '/settings':          'Configura\u00e7\u00f5es',
  '/users':             'Usu\u00e1rios',
  '/perfil':            'Meu Perfil',
  '/training-videos':   'V\u00eddeos Educativos',
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
    <div className="flex h-screen flex-col overflow-hidden bg-light">
      <MenuGaveta aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />
      <Cabecalho
        titulo={titulosPagina[pathname] || 'Dashboard'}
        aoAbrirMenu={() => setMenuAberto(true)}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="page-enter">
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
        </div>
      </main>
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
