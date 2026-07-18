-- Transporte: cierra la cadena bodega -> camion -> albergue.
-- Un despacho lleva asignaciones de la bodega al albergue de destino.
-- La entrega confirmada distingue lo "asignado" de lo "entregado".

USE red_emergencias;

-- Marca de entrega en la asignacion: el deficit solo se cubre de verdad
-- cuando lo asignado llega fisicamente al albergue.
ALTER TABLE asignacion ADD COLUMN entregado TINYINT(1) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS despacho (
    id_despacho     INT AUTO_INCREMENT PRIMARY KEY,
    id_transportista INT NOT NULL,
    id_albergue     INT NOT NULL,
    vehiculo        VARCHAR(80) NOT NULL,
    capacidad_kg    INT NULL,
    estado          ENUM('OFRECIDO','EN_RUTA','ENTREGADO','CANCELADO') NOT NULL DEFAULT 'OFRECIDO',
    foto_entrega    LONGTEXT NULL,
    fecha_ofrecido  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega   DATETIME NULL,
    CONSTRAINT fk_despacho_transportista FOREIGN KEY (id_transportista)
        REFERENCES usuario(id_usuario),
    CONSTRAINT fk_despacho_albergue FOREIGN KEY (id_albergue)
        REFERENCES albergue(id_albergue)
);

-- Que asignaciones viajan en cada despacho (N:M despacho <-> asignacion)
CREATE TABLE IF NOT EXISTS despacho_carga (
    id_carga     INT AUTO_INCREMENT PRIMARY KEY,
    id_despacho  INT NOT NULL,
    id_asignacion INT NOT NULL,
    CONSTRAINT fk_carga_despacho FOREIGN KEY (id_despacho)
        REFERENCES despacho(id_despacho),
    CONSTRAINT fk_carga_asignacion FOREIGN KEY (id_asignacion)
        REFERENCES asignacion(id_asignacion),
    CONSTRAINT uq_asignacion_en_despacho UNIQUE (id_asignacion)
);

DROP TRIGGER IF EXISTS aud_despacho_estado;
CREATE TRIGGER aud_despacho_estado
AFTER UPDATE ON despacho FOR EACH ROW
INSERT INTO auditoria (tabla_afectada, id_registro, accion, detalle, usuario_app)
SELECT 'despacho', NEW.id_despacho, 'CAMBIO_ESTADO',
       CONCAT(OLD.estado, ' a ', NEW.estado, ' (albergue ', NEW.id_albergue, ')'), @usuario_app
WHERE NEW.estado <> OLD.estado;
