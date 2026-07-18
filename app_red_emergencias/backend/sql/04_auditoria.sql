-- Auditoria inmutable de operaciones criticas.
-- Los triggers registran cada cambio directamente en el motor:
-- ninguna via de escritura puede saltarse el registro.

USE red_emergencias;

CREATE TABLE IF NOT EXISTS auditoria (
    id_auditoria   INT AUTO_INCREMENT PRIMARY KEY,
    tabla_afectada VARCHAR(30) NOT NULL,
    id_registro    INT NOT NULL,
    accion         VARCHAR(30) NOT NULL,
    detalle        VARCHAR(255),
    usuario_app    VARCHAR(100) NULL,
    fecha_hora     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS aud_donacion_creada;
CREATE TRIGGER aud_donacion_creada
AFTER INSERT ON donacion FOR EACH ROW
INSERT INTO auditoria (tabla_afectada, id_registro, accion, detalle, usuario_app)
VALUES ('donacion', NEW.id_donacion, 'CREADA',
        CONCAT('Donante ', NEW.id_donante, ', estado ', NEW.estado), @usuario_app);

DROP TRIGGER IF EXISTS aud_donacion_estado;
CREATE TRIGGER aud_donacion_estado
AFTER UPDATE ON donacion FOR EACH ROW
INSERT INTO auditoria (tabla_afectada, id_registro, accion, detalle, usuario_app)
SELECT 'donacion', NEW.id_donacion, 'CAMBIO_ESTADO',
       CONCAT(OLD.estado, ' a ', NEW.estado), @usuario_app
WHERE NEW.estado <> OLD.estado;

DROP TRIGGER IF EXISTS aud_asignacion_creada;
CREATE TRIGGER aud_asignacion_creada
AFTER INSERT ON asignacion FOR EACH ROW
INSERT INTO auditoria (tabla_afectada, id_registro, accion, detalle, usuario_app)
VALUES ('asignacion', NEW.id_asignacion, 'ASIGNADA',
        CONCAT('Detalle ', NEW.id_detalle, ' cubre necesidad ', NEW.id_necesidad,
               ' con ', NEW.cantidad_asignada, ' unidades'), @usuario_app);

DROP TRIGGER IF EXISTS aud_necesidad_creada;
CREATE TRIGGER aud_necesidad_creada
AFTER INSERT ON necesidad FOR EACH ROW
INSERT INTO auditoria (tabla_afectada, id_registro, accion, detalle, usuario_app)
VALUES ('necesidad', NEW.id_necesidad, 'PUBLICADA',
        CONCAT('Albergue ', NEW.id_albergue, ' solicita ', NEW.cantidad_solicitada,
               ' del item ', NEW.id_item, ', prioridad ', NEW.prioridad), @usuario_app);

DROP TRIGGER IF EXISTS aud_necesidad_estado;
CREATE TRIGGER aud_necesidad_estado
AFTER UPDATE ON necesidad FOR EACH ROW
INSERT INTO auditoria (tabla_afectada, id_registro, accion, detalle, usuario_app)
SELECT 'necesidad', NEW.id_necesidad, 'CAMBIO_ESTADO',
       CONCAT(OLD.estado, ' a ', NEW.estado), @usuario_app
WHERE NEW.estado <> OLD.estado;
