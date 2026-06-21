import './App.css';
import Login from './pages/Login';
import Landing from './pages/Landing';
import { Routes, Route, Navigate } from 'react-router-dom'
import Register from './pages/Registro';
import PrivateRoute from './components/ProtectRouter'
import Home from './pages/home'
import Onboarding from './pages/Onboarding'
import OnboardingGuard from './components/OnboardingGuard'
import Transferir from './pages/Transferir';
import Historial from './pages/Historial';
import RoleGuard from './components/RoleGuard';
import Admin from './pages/Admin';
import Empleado from './pages/Empleado';
import Gerente from './pages/Gerente';
import Prestamos from './pages/Prestamos';
import Tarjetas from './pages/Tarjetas';
import { ViewModeProvider } from './context/ViewModeContext';



function App() {
  return (
    <ViewModeProvider>
      <Routes>
        <Route path="/login/*" element={<Login />} />
        <Route path="/register/*" element={<Register />} />
        <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
        <Route path="/home" element={<PrivateRoute><OnboardingGuard><Home /></OnboardingGuard></PrivateRoute>} />
        <Route path="/transferir" element={<PrivateRoute><OnboardingGuard><Transferir /></OnboardingGuard></PrivateRoute>} />
        <Route path="/historial" element={<PrivateRoute><OnboardingGuard><Historial /></OnboardingGuard></PrivateRoute>} />
        <Route path="/prestamos" element={<PrivateRoute><OnboardingGuard><Prestamos /></OnboardingGuard></PrivateRoute>} />
<Route path="/tarjetas" element={<PrivateRoute><OnboardingGuard><Tarjetas /></OnboardingGuard></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><RoleGuard role="admin"><Admin /></RoleGuard></PrivateRoute>} />
        <Route path="/empleado" element={<PrivateRoute><RoleGuard role="empleado"><Empleado /></RoleGuard></PrivateRoute>} />
        <Route path="/gerente" element={<PrivateRoute><RoleGuard role="gerente"><Gerente /></RoleGuard></PrivateRoute>} />
        <Route path="/" element={<Landing />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ViewModeProvider>
  )
}

export default App
