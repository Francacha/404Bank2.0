-- ==========================================
-- 1. DATOS MAESTROS (Sin dependencias)
-- ==========================================

-- Insertar Monedas
INSERT INTO Monedas (nombre, simbolo, codigo_iso) VALUES 
('Pesos Argentinos', '$', 'ARS'),
('Dólar Estadounidense', 'U$S', 'USD'),
('Euro', '€', 'EUR');

-- Insertar Tipos de Cuentas
INSERT INTO Tipo_Cuentas (nombre, descripcion) VALUES 
('Caja de Ahorro', 'Cuenta básica para ahorros y uso diario sin costos de mantenimiento.'),
('Cuenta Corriente', 'Cuenta operativa que permite emitir cheques y girar en descubierto.'),
('Cuenta Sueldo', 'Cuenta destinada exclusivamente a la recepción de haberes.');

-- Insertar Roles del Sistema
INSERT INTO Roles (nombre_rol, descripcion, activo, fecha_creacion) VALUES 
('Cliente', 'Usuario estándar que opera sus propias cuentas.', true, CURRENT_TIMESTAMP),
('Administrador', 'Personal del banco con acceso a gestión de usuarios.', true, CURRENT_TIMESTAMP),
('Auditor', 'Usuario con permisos de solo lectura para revisar logs.', true, CURRENT_TIMESTAMP);

-- Insertar Estados de Transacción
INSERT INTO Estado_Transaccion (nombre) VALUES 
('Pendiente'),
('Aprobada'),
('Rechazada'),
('Reversada');

-- Insertar Tipos de Transacción
INSERT INTO Tipo_Transaccion (nombre) VALUES 
('Transferencia Saliente'),
('Transferencia Entrante'),
('Depósito Efectivo'),
('Extracción Cajero'),
('Pago de Servicios');

-- ==========================================
-- 2. DATOS DE PERSONAS Y SEGURIDAD
-- ==========================================

-- Crear dos personas (Un cliente normal y un Admin)
INSERT INTO Personas (Nombre, Apellido, Dni, Direccion, Email, Telefono, FechaNac) VALUES 
('Juan', 'Pérez', '30123456', 'Calle Falsa 123, CABA', 'juan.perez@email.com', '1155551234', '1985-10-15'),
('María', 'Gómez', '28654321', 'Av. Siempreviva 742, Córdoba', 'admin.maria@404bank.com', '3514449876', '1982-05-20');

-- Asignar perfiles (límites de transferencia distintos)
INSERT INTO Perfil (id_Personas, idioma, notificaciones_email, limite_transferencia) VALUES 
(1, 'es-AR', true, 500000.00), -- Límite de 500k para Juan
(2, 'es-AR', false, 9999999.00); -- Límite muy alto para la Admin

-- Asignar roles a las personas (Juan es Cliente, María es Admin)
INSERT INTO Roles_Personas (id_Personas, id_rol) VALUES 
(1, 1), 
(2, 2);

-- Crear credenciales de acceso (IMPORTANTE: En un entorno real, la password DEBE estar hasheada con bcrypt/argon2. Aquí usamos texto plano solo como prueba temporal)
INSERT INTO Seguridad (id_Personas, nombre_user, password, intentos_ingreso) VALUES 
(1, 'jperez85', 'password123', 0),
(2, 'mariag_admin', 'admin1234', 0);

-- ==========================================
-- 3. DATOS BANCARIOS (Cuentas y Titulares)
-- ==========================================

-- Crear dos cuentas bancarias
INSERT INTO Cuentas_Bancarias (id_tipo_cuenta, id_moneda, cbu, alias, saldo, fecha_apertura, estado) VALUES 
(1, 1, '0000003100000000000011', 'MATE.TERMO.YERBA', 150000.50, CURRENT_DATE, 'Activa'), -- Caja de ahorro en ARS
(2, 2, '0000003100000000000022', 'AGUILA.BLANCA.VUELO', 5000.00, CURRENT_DATE, 'Activa'); -- Cuenta corriente en USD

-- Asignar los titulares a las cuentas
INSERT INTO Titulares_Cuenta (id_persona, id_cuenta, rol_titular, fecha_alta) VALUES 
(1, 1, 'Titular Principal', CURRENT_TIMESTAMP), -- Juan es dueño de la cuenta en Pesos
(1, 2, 'Titular Principal', CURRENT_TIMESTAMP); -- Juan también es dueño de la cuenta en Dólares

-- ==========================================
-- 4. MOVIMIENTOS Y AUDITORÍA
-- ==========================================

-- Insertar una transacción de prueba (Un depósito inicial a la cuenta de Juan)
INSERT INTO Transacciones (id_cuenta_destino, id_tipo_transaccion, id_estado, monto, id_moneda, descripcion_user, codigo_operacion) VALUES 
(1, 3, 2, 150000.50, 1, 'Acreditación sueldo', 'TX-987654321');