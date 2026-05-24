import './App.css';
import Login from './pages/Login';
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

function App() {
  return (
    <>
      <Routes>
        <Route path="/login/*" element={<Login />} />
        <Route path="/register/*" element={<Register />} />
        <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
        <Route path="/home" element={<PrivateRoute><OnboardingGuard><Home /></OnboardingGuard></PrivateRoute>} />
        <Route path="/transferir" element={<PrivateRoute><OnboardingGuard><Transferir /></OnboardingGuard></PrivateRoute>} />
        <Route path="/historial" element={<PrivateRoute><OnboardingGuard><Historial /></OnboardingGuard></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><RoleGuard role="admin"><Admin /></RoleGuard></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}

export default App
