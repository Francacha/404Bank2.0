# Explicacion de los archivos dentro de `pages`

Este documento explica que hace cada archivo dentro de la carpeta `src/pages` y que funcion cumple cada linea principal del codigo. La idea es que sirva como base de documentacion para entender el flujo de autenticacion con Clerk y la navegacion entre pantallas.

## Archivos incluidos

- `Login.tsx`
- `Registro.tsx`
- `home.tsx`

---

## `Login.tsx`

Este archivo define la pantalla de inicio de sesion. Su responsabilidad principal es:

- mostrar el componente de login de Clerk
- detectar si el usuario ya tiene una sesion iniciada
- redirigir al usuario al `home` si ya esta autenticado
- mostrar mensajes distintos segun el estado de carga de Clerk

### Codigo actual

```tsx
import { ClerkDegraded, ClerkFailed, ClerkLoaded, ClerkLoading, SignIn, useAuth } from "@clerk/react"
import { Navigate } from "react-router-dom"

function Login() {
  const { isLoaded, isSignedIn } = useAuth()

  if (isLoaded && isSignedIn) {
    return <Navigate to="/home" replace />
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
      <ClerkLoading>
        <div>Cargando Clerk...</div>
      </ClerkLoading>

      <ClerkFailed>
        <div style={{ maxWidth: '520px', textAlign: 'center' }}>
          <h2>Clerk no pudo iniciar</h2>
          <p>
            Si la pantalla se queda en blanco o recarga sola, el problema suele estar en la
            clave publishable, el dominio permitido o la inicializacion de Clerk.
          </p>
        </div>
      </ClerkFailed>

      <ClerkDegraded>
        <div>Clerk inicio en modo degradado.</div>
      </ClerkDegraded>

      <ClerkLoaded>
        <SignIn routing="path" path="/login" signUpUrl="/register" forceRedirectUrl="/home" fallbackRedirectUrl="/home" />
      </ClerkLoaded>
    </div>
  )
}

export default Login
```

### Explicacion linea por linea

- `import { ClerkDegraded, ClerkFailed, ClerkLoaded, ClerkLoading, SignIn, useAuth } from "@clerk/react"`
  Importa componentes y herramientas de Clerk.

- `ClerkLoading`
  Se usa para mostrar contenido mientras Clerk todavia esta inicializando.

- `ClerkLoaded`
  Renderiza contenido solo cuando Clerk ya termino de cargar correctamente.

- `ClerkFailed`
  Muestra contenido si Clerk falla al iniciar.

- `ClerkDegraded`
  Muestra contenido si Clerk inicia con funcionalidad reducida.

- `SignIn`
  Es el formulario de inicio de sesion provisto por Clerk.

- `useAuth`
  Es un hook que permite saber si el usuario esta autenticado y si Clerk ya termino de cargar.

- `import { Navigate } from "react-router-dom"`
  Importa el componente que redirige a otra ruta sin recargar la pagina.

- `function Login() {`
  Declara el componente funcional `Login`, que representa la pantalla de inicio de sesion.

- `const { isLoaded, isSignedIn } = useAuth()`
  Extrae dos propiedades importantes del estado de autenticacion.
  `isLoaded` indica si Clerk ya verifico la sesion.
  `isSignedIn` indica si existe un usuario autenticado.

- `if (isLoaded && isSignedIn) {`
  Comprueba si Clerk ya termino de cargar y si el usuario ya esta logueado.

- `return <Navigate to="/home" replace />`
  Redirige automaticamente al usuario autenticado a `/home`.
  La prop `replace` evita que la ruta `/login` quede guardada en el historial.

- `return (`
  Si el usuario no esta logueado, devuelve el contenido visual de la pantalla.

- `<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>`
  Es el contenedor principal.
  `minHeight: '100vh'` hace que ocupe toda la pantalla.
  `display: 'grid'` activa CSS Grid.
  `placeItems: 'center'` centra el contenido horizontal y verticalmente.
  `padding: '24px'` agrega espacio interno.

- `<ClerkLoading>`
  Define el bloque que se vera mientras Clerk esta cargando.

- `<div>Cargando Clerk...</div>`
  Muestra un mensaje temporal de carga.

- `<ClerkFailed>`
  Define el bloque visible cuando Clerk falla.

- `<div style={{ maxWidth: '520px', textAlign: 'center' }}>`
  Contenedor del mensaje de error.
  `maxWidth` limita el ancho del texto.
  `textAlign: 'center'` centra visualmente el contenido.

- `<h2>Clerk no pudo iniciar</h2>`
  Titulo principal del mensaje de error.

- `<p> ... </p>`
  Explica posibles causas del fallo, como la clave publica o el dominio permitido.

- `<ClerkDegraded>`
  Define el bloque mostrado si Clerk inicia en modo degradado.

- `<div>Clerk inicio en modo degradado.</div>`
  Informa ese estado al usuario.

- `<ClerkLoaded>`
  Solo muestra su contenido cuando Clerk ya esta completamente listo.

- `<SignIn routing="path" path="/login" signUpUrl="/register" forceRedirectUrl="/home" fallbackRedirectUrl="/home" />`
  Renderiza el formulario de inicio de sesion.
  `routing="path"` le indica a Clerk que use rutas en la URL para controlar el flujo.
  `path="/login"` define la ruta base del login.
  `signUpUrl="/register"` indica a donde ir si el usuario quiere registrarse.
  `forceRedirectUrl="/home"` obliga a redirigir al home cuando el login termina correctamente.
  `fallbackRedirectUrl="/home"` actua como respaldo si no hay otra redireccion definida.

- `export default Login`
  Exporta el componente para usarlo desde el router.

### Funcion general de `Login.tsx`

Este archivo controla toda la pantalla de acceso. Si el usuario ya tiene sesion, lo manda a `home`. Si no la tiene, muestra el login de Clerk y distintos mensajes segun el estado de carga del sistema de autenticacion.

---

## `Registro.tsx`

Este archivo define la pantalla de registro de nuevos usuarios. Su funcion principal es:

- mostrar el formulario de alta de Clerk
- permitir que un usuario cree una cuenta
- redirigirlo al `home` despues del registro

### Codigo actual

```tsx
import {
  ClerkFailed,
  ClerkLoaded,
  ClerkLoading,
  SignUp,
} from '@clerk/react'

function Register() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
      <ClerkLoading>
        <div>Cargando Clerk...</div>
      </ClerkLoading>

      <ClerkFailed>
        <div>Clerk no pudo iniciar.</div>
      </ClerkFailed>

      <ClerkLoaded>
        <SignUp routing="path" path="/register" signInUrl="/login" fallbackRedirectUrl="/home" />
      </ClerkLoaded>
    </div>
  )
}

export default Register
```

### Explicacion linea por linea

- `import { ClerkFailed, ClerkLoaded, ClerkLoading, SignUp } from '@clerk/react'`
  Importa componentes de Clerk necesarios para mostrar el registro y controlar estados de carga.

- `function Register() {`
  Declara el componente funcional `Register`.

- `return (`
  Devuelve el contenido visual de la pantalla.

- `<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>`
  Crea el contenedor principal de la pantalla, centrado y ocupando toda la altura.

- `<ClerkLoading>`
  Muestra un bloque temporal mientras Clerk esta cargando.

- `<div>Cargando Clerk...</div>`
  Mensaje mostrado durante la carga.

- `<ClerkFailed>`
  Muestra contenido en caso de fallo de Clerk.

- `<div>Clerk no pudo iniciar.</div>`
  Mensaje de error simple.

- `<ClerkLoaded>`
  Solo muestra el formulario cuando Clerk ya esta listo.

- `<SignUp routing="path" path="/register" signInUrl="/login" fallbackRedirectUrl="/home" />`
  Renderiza el formulario de registro de Clerk.
  `routing="path"` indica que el flujo se maneja mediante rutas.
  `path="/register"` define la ruta base del registro.
  `signInUrl="/login"` lleva al usuario al login si ya tiene cuenta.
  `fallbackRedirectUrl="/home"` define la ruta de redireccion luego de registrarse correctamente.

- `export default Register`
  Exporta el componente para poder usarlo desde `App.tsx`.

### Funcion general de `Registro.tsx`

Este archivo muestra la pantalla donde el usuario crea su cuenta. Tambien gestiona los estados de carga y error de Clerk para que el formulario solo aparezca cuando la libreria este lista.

---

## `home.tsx`

Este archivo representa la pantalla privada de la aplicacion. A esta vista solo deberia acceder un usuario autenticado. Su funcion principal es:

- mostrar un mensaje de bienvenida
- confirmar visualmente que la autenticacion funciono
- permitir cerrar sesion

### Codigo actual

```tsx
import { SignOutButton } from "@clerk/react";

function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        backgroundColor: '#f4f7fb',
        fontFamily: 'Arial, sans-serif',
        padding: '24px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          textAlign: 'center',
          maxWidth: '500px',
          width: '100%',
        }}
      >
        <h1 style={{ marginBottom: '12px', color: '#1f3b73' }}>
          Bienvenido a tu Homebanking
        </h1>
        <p style={{ margin: 0, color: '#4b5563' }}>
          La autenticacion funciona correctamente y ya estas dentro del area privada.
        </p>
      </div>
      <SignOutButton signOutOptions={{ redirectUrl: '/login' }} >
        <button style={{
          backgroundColor: '#d73a49',
          color: '#ffffff',
          border: 'none',
          padding: '10px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
        }}>
          Cerrar Sesion
        </button>
      </SignOutButton>
    </div>
  )
}

export default Home
```

### Explicacion linea por linea

- `import { SignOutButton } from "@clerk/react";`
  Importa el componente de Clerk que permite cerrar la sesion del usuario.

- `function Home() {`
  Declara el componente funcional `Home`.

- `return (`
  Devuelve el JSX de la pantalla privada.

- `<div style={{ ... }}>`
  Define el contenedor principal de la pagina.

- `minHeight: '100vh'`
  Hace que ocupe toda la altura de la ventana.

- `display: 'grid'`
  Usa CSS Grid para organizar el contenido.

- `placeItems: 'center'`
  Centra todos los elementos en el medio de la pantalla.

- `backgroundColor: '#f4f7fb'`
  Establece un color de fondo suave.

- `fontFamily: 'Arial, sans-serif'`
  Define la fuente del contenido.

- `padding: '24px'`
  Agrega espacio interior.

- `<div style={{ ... }}>`
  Crea una tarjeta visual interna donde se muestra el mensaje principal.

- `backgroundColor: '#ffffff'`
  Pone el fondo blanco de la tarjeta.

- `padding: '32px'`
  Agrega separacion interna.

- `borderRadius: '12px'`
  Redondea los bordes.

- `boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)'`
  Agrega una sombra para destacar la tarjeta.

- `textAlign: 'center'`
  Centra el texto.

- `maxWidth: '500px'`
  Limita el ancho maximo del bloque.

- `width: '100%'`
  Permite que el bloque use el ancho disponible hasta el maximo permitido.

- `<h1 style={{ marginBottom: '12px', color: '#1f3b73' }}>`
  Define el titulo principal con estilo visual propio.

- `Bienvenido a tu Homebanking`
  Texto principal de bienvenida.

- `<p style={{ margin: 0, color: '#4b5563' }}>`
  Parrafo descriptivo debajo del titulo.

- `La autenticacion funciona correctamente y ya estas dentro del area privada.`
  Explica que el usuario ya accedio a una ruta protegida.

- `<SignOutButton signOutOptions={{ redirectUrl: '/login' }} >`
  Envuelve el boton de cerrar sesion.
  `redirectUrl: '/login'` indica que al cerrar sesion se debe volver al login.

- `<button style={{ ... }}>`
  Crea el boton visual que el usuario presiona.

- `backgroundColor: '#d73a49'`
  Pinta el boton de rojo.

- `color: '#ffffff'`
  Coloca el texto en blanco.

- `border: 'none'`
  Quita el borde por defecto.

- `padding: '10px 16px'`
  Agrega espacio interno dentro del boton.

- `borderRadius: '4px'`
  Redondea suavemente las esquinas.

- `cursor: 'pointer'`
  Hace que el cursor cambie para indicar que el elemento es clickeable.

- `Cerrar Sesion`
  Texto visible del boton.

- `export default Home`
  Exporta el componente para que pueda ser utilizado desde el router y protegido por `PrivateRoute`.

### Funcion general de `home.tsx`

Este archivo actua como pantalla privada. Si el usuario llega aqui, significa que ya supero correctamente el proceso de autenticacion. Ademas, ofrece la accion de cerrar sesion y volver al login.

---

## Resumen del flujo entre paginas

1. El usuario entra a `/login`.
2. `Login.tsx` muestra el formulario de Clerk.
3. Si el usuario se autentica correctamente, Clerk lo redirige a `/home`.
4. Si el usuario todavia no tiene cuenta, puede ir a `/register`.
5. `Registro.tsx` muestra el formulario de registro.
6. Cuando termina el registro, el usuario tambien es redirigido a `/home`.
7. En `home.tsx`, el usuario puede cerrar sesion y volver a `/login`.

---

## Conclusion

La carpeta `pages` contiene las pantallas principales del sistema de autenticacion:

- `Login.tsx` administra el inicio de sesion
- `Registro.tsx` administra el registro
- `home.tsx` representa el area privada luego del acceso exitoso

Juntas forman el flujo base de autenticacion y navegacion del proyecto usando Clerk y React Router.
