-- Soporte para usuarios que ingresan con Google:
-- no tienen RUT al registrarse (se puede completar despues) y se
-- identifican por el sub de Google, unico e inmutable.

USE red_emergencias;

ALTER TABLE usuario MODIFY rut VARCHAR(12) NULL;
ALTER TABLE usuario ADD COLUMN google_sub VARCHAR(64) NULL;
ALTER TABLE usuario ADD CONSTRAINT uq_google_sub UNIQUE (google_sub);
