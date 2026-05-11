import './App.css';
import Login from './pages/Login';
import { Routes, Route, Navigate } from 'react-router-dom'
import Register from './pages/Registro';
import PrivateRoute from './components/ProtectRouter'
import Home from './pages/home'
import Onboarding from './pages/Onboarding'
import OnboardingGuard from './components/OnboardingGuard'

function App() {
  return (
    <>
      <Routes>
        {/* El * permite que haya rutas hijas, por ejemplo en el login, para el forgot password */}
        <Route path="/login/*" element={<Login />} />
        <Route path="/register/*" element={<Register />} />
        {/* /onboarding: solo requiere estar logueado */}
        <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
        {/* /home: requiere estar logueado Y haber completado el onboarding */}
        <Route path="/home" element={<PrivateRoute><OnboardingGuard><Home /></OnboardingGuard></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}

export default App