import { useAuth, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";

type Usuario = {
  id: number
  clerk_id: string
  email: string
  saldo: number | string | null
}

const API_URL = 'http://localhost:3000/api'

function Home() {
  const {user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) {
      return
    }
    const cargarDatos = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = await getToken()

        if (!token) {
          throw new Error('No se pudo obtener el token de Clerk')
        }

        const cargarUsuarioActual = async () => {
          const response = await fetch(`${API_URL}/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
           if (response.status === 404 && user) {
            const syncResponse = await fetch(`${API_URL}/usuarios/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: user.id,
                email:
                  user.primaryEmailAddress?.emailAddress ??
                  user.emailAddresses[0]?.emailAddress ??
                  '',
              }),
            })
            if (!syncResponse.ok) {
              throw new Error('No se pudo sincronizar el usuario con la base de datos')
            }
            return cargarUsuarioActual()
          }
          if (!response.ok) {
            throw new Error(`Error al obtener el usuario autenticado: ${response.status}`)
          }
          return response.json() as Promise<Usuario>
        }
        const [meData, usuariosResponse] = await Promise.all([
          cargarUsuarioActual(),
          fetch(`${API_URL}/usuarios`),
        ])
        if (!usuariosResponse.ok) {
          throw new Error(`Error al obtener usuarios: ${usuariosResponse.status}`)
        }
        const usuariosData = (await usuariosResponse.json()) as Usuario[]
        setUsuarioActual(meData)
        setUsuarios(usuariosData)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Ocurrió un error inesperado'
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    void cargarDatos()
  }, [getToken, isLoaded, user])
  if (!isLoaded || loading) {
    return <div style={{ padding: '40px' }}>Cargando datos...</div>
  }
  return (
    
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1>404Bank</h1>
      <p>Usuario logueado: {user?.primaryEmailAddress?.emailAddress ?? 'Sin email'}</p>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {usuarioActual && (
        <div style={{ margin: '24px 0' }}>
          <h2>Mi usuario</h2>
          <p>ID en base de datos: {usuarioActual.id}</p>
          <p>Clerk ID: {usuarioActual.clerk_id}</p>
          <p>Email: {usuarioActual.email}</p>
          <p>Saldo: ${usuarioActual.saldo ?? 0}</p>
        </div>
      )}

      <div>
        <h2>Tabla de usuarios</h2>
        {usuarios.length === 0 ? (
          <p>No hay usuarios cargados.</p>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '16px',
            }}
          >
            <thead>
              <tr>
                <th style={cellHeaderStyle}>ID</th>
                <th style={cellHeaderStyle}>Clerk ID</th>
                <th style={cellHeaderStyle}>Email</th>
                <th style={cellHeaderStyle}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr
                  key={usuario.id}
                  style={{
                    backgroundColor:
                      usuario.clerk_id === usuarioActual?.clerk_id ? '#eef6ff' : '#ffffff',
                  }}
                >
                  <td style={cellStyle}>{usuario.id}</td>
                  <td style={cellStyle}>{usuario.clerk_id}</td>
                  <td style={cellStyle}>{usuario.email}</td>
                  <td style={cellStyle}>${usuario.saldo ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const cellHeaderStyle = {
  border: '1px solid #d0d7de',
  padding: '12px',
  textAlign: 'left' as const,
  backgroundColor: '#f6f8fa',
}

const cellStyle = {
  border: '1px solid #d0d7de',
  padding: '12px',
}
export default Home