-- Fondo Transparente: campanas monetarias con libro mayor publico.
-- Cada movimiento encadena el hash del anterior (SHA-256): alterar un
-- registro antiguo rompe la cadena completa y queda en evidencia.

USE red_emergencias;

CREATE TABLE IF NOT EXISTS campana (
    id_campana   INT AUTO_INCREMENT PRIMARY KEY,
    nombre       VARCHAR(120) NOT NULL,
    descripcion  VARCHAR(500),
    meta_monto   INT NOT NULL,
    id_emergencia INT NOT NULL,
    estado       ENUM('ACTIVA','CERRADA') NOT NULL DEFAULT 'ACTIVA',
    fecha_inicio DATE NOT NULL,
    CONSTRAINT fk_campana_emergencia FOREIGN KEY (id_emergencia)
        REFERENCES emergencia(id_emergencia),
    CONSTRAINT chk_meta_positiva CHECK (meta_monto > 0)
);

CREATE TABLE IF NOT EXISTS movimiento_fondo (
    id_movimiento INT AUTO_INCREMENT PRIMARY KEY,
    id_campana    INT NOT NULL,
    tipo          ENUM('APORTE','EGRESO') NOT NULL,
    monto         INT NOT NULL,
    descripcion   VARCHAR(300),
    proveedor     VARCHAR(120) NULL,
    foto          LONGTEXT NULL,
    hash_foto     CHAR(64) NULL,
    hash_previo   CHAR(64) NOT NULL,
    hash_actual   CHAR(64) NOT NULL,
    id_usuario    INT NOT NULL,
    id_donacion   INT NULL,
    fecha         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mov_campana FOREIGN KEY (id_campana) REFERENCES campana(id_campana),
    CONSTRAINT fk_mov_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    CONSTRAINT fk_mov_donacion FOREIGN KEY (id_donacion) REFERENCES donacion(id_donacion),
    CONSTRAINT chk_monto_positivo CHECK (monto > 0)
);

DROP TRIGGER IF EXISTS aud_movimiento_fondo;
CREATE TRIGGER aud_movimiento_fondo
AFTER INSERT ON movimiento_fondo FOR EACH ROW
INSERT INTO auditoria (tabla_afectada, id_registro, accion, detalle, usuario_app)
VALUES ('movimiento_fondo', NEW.id_movimiento, NEW.tipo,
        CONCAT('Campana ', NEW.id_campana, ', monto $', NEW.monto), @usuario_app);
