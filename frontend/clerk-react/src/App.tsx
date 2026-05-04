import './App.css';
import Login from './pages/Login';
import { Routes, Route, Navigate } from 'react-router-dom'
import Register from './pages/Registro';
import PrivateRoute from './components/ProtectRouter'
import Home from './pages/home'

function App() {
  return (
    <>
      <Routes>
        ///El * permite que haya rutas hijas, por ejemplo en el login, para el forgot password
        <Route path="/login/*" element={<Login />} />
        <Route path="/register/*" element={<Register />} />
        //valida que el usuario este logueado para acceder a la ruta, si no lo esta lo redirige al login
        <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}

export default App