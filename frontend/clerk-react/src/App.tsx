import './App.css';
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthRedirect from './components/AuthRedirect';
import PrivateRoute from './components/ProtectRouter';
import Login from './pages/Login';
import Register from './pages/Registro';
import Home from './pages/home';
import UserForm from './pages/UserForm';

function App() {
  return (
    <Routes>
      <Route path="/login/*" element={<Login />} />
      <Route path="/register/*" element={<Register />} />
      <Route path="/completar-perfil" element={<PrivateRoute><UserForm /></PrivateRoute>} />
      <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
      <Route path="/" element={<AuthRedirect />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
