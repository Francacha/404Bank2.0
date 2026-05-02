-- Otorgar permisos en las tablas principales
GRANT SELECT, INSERT, UPDATE, DELETE ON personas TO bank_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON monedas TO bank_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON roles TO bank_user;
-- Agrega más tablas si es necesario (revisa tus controladores para ver cuáles usas)

-- Otorgar permisos en las secuencias (para INSERT con SERIAL)
GRANT USAGE ON SEQUENCE personas_id_seq TO bank_user;
GRANT USAGE ON SEQUENCE monedas_id_seq TO bank_user;
GRANT USAGE ON SEQUENCE roles_id_rol_seq TO bank_user;
-- Agrega secuencias para otras tablas si las hay