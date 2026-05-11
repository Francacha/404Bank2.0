-- 1. CREACIÓN DE TIPOS (ENUMS)
CREATE TYPE estado_cuenta AS ENUM ('Activa', 'Cerrada', 'Bloqueada', 'Suspendida');
CREATE TYPE tipo_mfa AS ENUM ('SMS', 'EMAIL', 'APP_TOKEN', 'BIOMETRIA');

-- 2. CREACIÓN DE TABLAS MAESTRAS (Sin dependencias)
CREATE TABLE Personas (
	id SERIAL PRIMARY KEY,
	clerk_id VARCHAR(255) UNIQUE,
	Nombre VARCHAR(255),
	Apellido VARCHAR(255),
	Dni VARCHAR(255) UNIQUE,
	Direccion VARCHAR(255) UNIQUE,
	Email VARCHAR(255),
	Telefono VARCHAR(255),
	FechaNac DATE
);

CREATE TABLE Roles (
	id_rol SERIAL PRIMARY KEY,
	nombre_rol VARCHAR(255),
	descripcion VARCHAR(255),
	activo BOOLEAN,
	fecha_creacion TIMESTAMP
);

CREATE TABLE Permisos (
	id SERIAL PRIMARY KEY,
	nombre_permiso VARCHAR(100),
	codigo_sistema VARCHAR(50),
	modulo VARCHAR(50),
	descripcion VARCHAR(255)
);


CREATE TABLE Estado_Transaccion (
	id_estado SERIAL PRIMARY KEY,
	nombre VARCHAR(255)
);

CREATE TABLE Tipo_Transaccion (
	id SERIAL PRIMARY KEY,
	nombre VARCHAR(255)
);

CREATE TABLE Tipo_Evento (
	id SERIAL PRIMARY KEY,
	nombre VARCHAR(255),
	nivel_evento VARCHAR(255)
);

-- 3. CREACIÓN DE TABLAS CON DEPENDENCIAS (Cuentas, Transacciones, Seguridad)
CREATE TABLE Cuentas_Bancarias (
	id_cuenta SERIAL PRIMARY KEY,
	cbu VARCHAR(22),
	alias VARCHAR(255),
	saldo DECIMAL(15, 2),
	fecha_apertura DATE,
	estado estado_cuenta
);

CREATE TABLE Transacciones (
	id BIGSERIAL PRIMARY KEY,
	id_cuenta_origen INTEGER REFERENCES Cuentas_Bancarias(id_cuenta),
	id_cuenta_destino INTEGER REFERENCES Cuentas_Bancarias(id_cuenta),
	id_tipo_transaccion INTEGER REFERENCES Tipo_Transaccion(id),
	id_estado INTEGER REFERENCES Estado_Transaccion(id_estado),
	monto DECIMAL(15, 2),
	descripcion_user VARCHAR(30),
	codigo_operacion VARCHAR(255) UNIQUE,
	fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Seguridad (
	id SERIAL PRIMARY KEY,
	id_Personas INTEGER REFERENCES Personas(id),
	nombre_user VARCHAR(255) UNIQUE,
	password VARCHAR(255),
	ultimo_ingreso TIMESTAMP,
	intentos_ingreso INTEGER
);

CREATE TABLE Perfil (
	id_usuario SERIAL PRIMARY KEY,
	id_Personas INTEGER REFERENCES Personas(id),
	idioma VARCHAR(255),
	notificaciones_email BOOLEAN,
	limite_transferencia DECIMAL(15, 2)
);

CREATE TABLE Log_Movimientos (
	id_log BIGSERIAL PRIMARY KEY,
	id_persona INTEGER REFERENCES Personas(id),
	id_tipo_evento INTEGER REFERENCES Tipo_Evento(id),
	fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	ip_adress VARCHAR(255),
	user_agent TEXT,
	descripcion TEXT
);

CREATE TABLE Credenciales (
	id_credencial SERIAL PRIMARY KEY,
	id_persona INTEGER REFERENCES Personas(id),
	nombre_usuario VARCHAR(255),
	password VARCHAR(255),
	salt VARCHAR(255),
	requiere_cambio BOOLEAN,
	fecha_expiriacion DATE
);

CREATE TABLE Autenticacion_Segundo_Factor_MFA (
	id_mfa SERIAL PRIMARY KEY,
	id_persona INTEGER REFERENCES Personas(id),
	tipo tipo_mfa,
	secreto_mfa VARCHAR(255),
	activo BOOLEAN,
	ultimo_uso TIMESTAMP
);

CREATE TABLE Sesiones (
	id_sesion SERIAL PRIMARY KEY,
	id_persona INTEGER REFERENCES Personas(id),
	fecha_inicio TIMESTAMP,
	fecha_expiracion TIMESTAMP,
	ip_acceso VARCHAR(45),
	dispositivo VARCHAR(100),
	revocada BOOLEAN
);

-- 4. TABLAS INTERMEDIAS (Con Claves Foráneas y Primarias Compuestas)
CREATE TABLE Roles_Personas (
	id_Personas INTEGER REFERENCES Personas(id),
	id_rol INTEGER REFERENCES Roles(id_rol),
    PRIMARY KEY (id_Personas, id_rol)
);

CREATE TABLE Roles_Permisos (
	id_rol INTEGER REFERENCES Roles(id_rol),
	id_permiso INTEGER REFERENCES Permisos(id),
	fecha_asignado TIMESTAMP,
    PRIMARY KEY (id_rol, id_permiso)
);

CREATE TABLE Titulares_Cuenta (
	id_persona INTEGER REFERENCES Personas(id),
	id_cuenta INTEGER REFERENCES Cuentas_Bancarias(id_cuenta),
	rol_titular VARCHAR(20),
	fecha_alta TIMESTAMP,
    PRIMARY KEY (id_persona, id_cuenta)
);