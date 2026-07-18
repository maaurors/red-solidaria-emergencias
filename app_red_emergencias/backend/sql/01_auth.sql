-- Extension del modelo para la aplicacion: credenciales de acceso.
-- Ejecutar DESPUES de red_emergencias.sql
-- El hash bcrypt nunca permite recuperar la contrasena original.

USE red_emergencias;

ALTER TABLE usuario ADD COLUMN password_hash VARCHAR(100) NULL;
ALTER TABLE usuario ADD COLUMN avatar LONGTEXT NULL;
