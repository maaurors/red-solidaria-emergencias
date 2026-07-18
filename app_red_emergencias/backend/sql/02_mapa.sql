-- Coordenadas geograficas de los albergues para el mapa semaforo.
-- Ejecutar despues de 01_auth.sql. Es seguro re-ejecutar el UPDATE.

USE red_emergencias;

ALTER TABLE albergue ADD COLUMN latitud DECIMAL(9,6) NULL;
ALTER TABLE albergue ADD COLUMN longitud DECIMAL(9,6) NULL;

-- Coordenadas reales aproximadas de las direcciones de ejemplo
UPDATE albergue SET latitud = -33.045900, longitud = -71.606000 WHERE id_albergue = 1; -- Gimnasio Municipal, Av. Argentina, Valparaiso
UPDATE albergue SET latitud = -33.047500, longitud = -71.622000 WHERE id_albergue = 2; -- Escuela Republica, Valparaiso
UPDATE albergue SET latitud = -33.523000, longitud = -70.599000 WHERE id_albergue = 3; -- Sede Vecinal, La Florida
