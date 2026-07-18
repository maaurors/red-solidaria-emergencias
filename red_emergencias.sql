-- ============================================================
-- RED SOLIDARIA DE EMERGENCIAS - Modelo Fisico (MySQL 8.0+)
-- Plataforma de coordinacion de albergues, donaciones y voluntarios
-- Base de Datos - Universidad Gabriela Mistral
-- ============================================================

DROP DATABASE IF EXISTS red_emergencias;
CREATE DATABASE red_emergencias CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;
USE red_emergencias;

-- ============================================================
-- SECCION 1: CREACION DE TABLAS (DDL)
-- Orden de creacion: primero tablas sin FK, luego dependientes
-- ============================================================

-- Personas que interactuan con la plataforma, diferenciadas por rol
CREATE TABLE usuario (
    id_usuario     INT AUTO_INCREMENT PRIMARY KEY,
    rut            VARCHAR(12) NOT NULL UNIQUE,
    nombre         VARCHAR(100) NOT NULL,
    email          VARCHAR(100) NOT NULL UNIQUE,
    telefono       VARCHAR(15),
    rol            ENUM('DONANTE','VOLUNTARIO','COORDINADOR') NOT NULL,
    fecha_registro DATE NOT NULL DEFAULT (CURRENT_DATE),
    -- Valida formato: 7 u 8 digitos, guion, digito verificador o K
    CONSTRAINT chk_rut_formato CHECK (rut REGEXP '^[0-9]{7,8}-[0-9K]$')
);

-- Evento catastrofico que activa la plataforma
CREATE TABLE emergencia (
    id_emergencia INT AUTO_INCREMENT PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL,
    tipo          ENUM('INCENDIO','TERREMOTO','ALUVION','INUNDACION','OTRO') NOT NULL,
    region        VARCHAR(60) NOT NULL,
    fecha_inicio  DATE NOT NULL,
    fecha_fin     DATE NULL,          -- NULL mientras la emergencia siga activa
    estado        ENUM('ACTIVA','CERRADA') NOT NULL DEFAULT 'ACTIVA',
    -- Una emergencia no puede cerrar antes de comenzar
    CONSTRAINT chk_fechas_emergencia CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

-- Recinto habilitado durante una emergencia, a cargo de un coordinador
CREATE TABLE albergue (
    id_albergue    INT AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL,
    direccion      VARCHAR(150) NOT NULL,
    comuna         VARCHAR(60) NOT NULL,
    capacidad      INT NOT NULL,
    estado         ENUM('ABIERTO','CERRADO') NOT NULL DEFAULT 'ABIERTO',
    id_emergencia  INT NOT NULL,
    id_coordinador INT NOT NULL,
    CONSTRAINT fk_albergue_emergencia FOREIGN KEY (id_emergencia)
        REFERENCES emergencia(id_emergencia),
    CONSTRAINT fk_albergue_coordinador FOREIGN KEY (id_coordinador)
        REFERENCES usuario(id_usuario),
    CONSTRAINT chk_capacidad CHECK (capacidad > 0)
);

-- Clasificacion de los items (Agua, Alimentos, Abrigo, Higiene, etc.)
CREATE TABLE categoria_item (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre       VARCHAR(60) NOT NULL UNIQUE
);

-- Catalogo de bienes donables, con su unidad de medida
CREATE TABLE item (
    id_item       INT AUTO_INCREMENT PRIMARY KEY,
    nombre        VARCHAR(80) NOT NULL,
    unidad_medida VARCHAR(20) NOT NULL,   -- litros, unidades, kilos, cajas
    id_categoria  INT NOT NULL,
    CONSTRAINT fk_item_categoria FOREIGN KEY (id_categoria)
        REFERENCES categoria_item(id_categoria)
);

-- Requerimiento de un item por parte de un albergue
-- Resuelve el N:M entre albergue e item, con atributos propios
CREATE TABLE necesidad (
    id_necesidad        INT AUTO_INCREMENT PRIMARY KEY,
    id_albergue         INT NOT NULL,
    id_item             INT NOT NULL,
    cantidad_solicitada INT NOT NULL,
    prioridad           ENUM('ALTA','MEDIA','BAJA') NOT NULL DEFAULT 'MEDIA',
    estado              ENUM('PENDIENTE','PARCIAL','CUBIERTA') NOT NULL DEFAULT 'PENDIENTE',
    fecha_solicitud     DATE NOT NULL,
    CONSTRAINT fk_necesidad_albergue FOREIGN KEY (id_albergue)
        REFERENCES albergue(id_albergue),
    CONSTRAINT fk_necesidad_item FOREIGN KEY (id_item)
        REFERENCES item(id_item),
    CONSTRAINT chk_cantidad_solicitada CHECK (cantidad_solicitada > 0)
);

-- Entrega realizada por un donante (cabecera)
CREATE TABLE donacion (
    id_donacion INT AUTO_INCREMENT PRIMARY KEY,
    id_donante  INT NOT NULL,
    fecha       DATE NOT NULL,
    estado      ENUM('RECIBIDA','EN_BODEGA','DISTRIBUIDA') NOT NULL DEFAULT 'RECIBIDA',
    CONSTRAINT fk_donacion_donante FOREIGN KEY (id_donante)
        REFERENCES usuario(id_usuario)
);

-- Lineas de la donacion: que items y cuanto
-- Resuelve el N:M entre donacion e item
CREATE TABLE donacion_detalle (
    id_detalle  INT AUTO_INCREMENT PRIMARY KEY,
    id_donacion INT NOT NULL,
    id_item     INT NOT NULL,
    cantidad    INT NOT NULL,
    CONSTRAINT fk_detalle_donacion FOREIGN KEY (id_donacion)
        REFERENCES donacion(id_donacion),
    CONSTRAINT fk_detalle_item FOREIGN KEY (id_item)
        REFERENCES item(id_item),
    CONSTRAINT chk_cantidad_donada CHECK (cantidad > 0)
);

-- Corazon del modelo: que parte de cada donacion cubre que necesidad
-- Resuelve el N:M entre donacion_detalle y necesidad, con atributos
CREATE TABLE asignacion (
    id_asignacion     INT AUTO_INCREMENT PRIMARY KEY,
    id_detalle        INT NOT NULL,
    id_necesidad      INT NOT NULL,
    cantidad_asignada INT NOT NULL,
    fecha_asignacion  DATE NOT NULL,
    CONSTRAINT fk_asignacion_detalle FOREIGN KEY (id_detalle)
        REFERENCES donacion_detalle(id_detalle),
    CONSTRAINT fk_asignacion_necesidad FOREIGN KEY (id_necesidad)
        REFERENCES necesidad(id_necesidad),
    CONSTRAINT chk_cantidad_asignada CHECK (cantidad_asignada > 0)
);

-- Compromiso de trabajo de un voluntario en un albergue
-- Resuelve el N:M entre usuario (voluntario) y albergue, con atributos
CREATE TABLE turno (
    id_turno      INT AUTO_INCREMENT PRIMARY KEY,
    id_voluntario INT NOT NULL,
    id_albergue   INT NOT NULL,
    fecha         DATE NOT NULL,
    bloque        ENUM('MANANA','TARDE','NOCHE') NOT NULL,
    estado        ENUM('AGENDADO','REALIZADO','AUSENTE') NOT NULL DEFAULT 'AGENDADO',
    CONSTRAINT fk_turno_voluntario FOREIGN KEY (id_voluntario)
        REFERENCES usuario(id_usuario),
    CONSTRAINT fk_turno_albergue FOREIGN KEY (id_albergue)
        REFERENCES albergue(id_albergue),
    -- Regla de negocio: un voluntario no puede tener dos turnos
    -- el mismo dia en el mismo bloque
    CONSTRAINT uq_turno_unico UNIQUE (id_voluntario, fecha, bloque)
);

-- ============================================================
-- SECCION 2: DATOS DE EJEMPLO (DML)
-- ============================================================

INSERT INTO usuario (rut, nombre, email, telefono, rol, fecha_registro) VALUES
('12345678-5', 'Carla Soto',      'carla.soto@mail.cl',   '+56911111111', 'COORDINADOR', '2026-01-10'),
('9876543-2',  'Pedro Rojas',     'pedro.rojas@mail.cl',  '+56922222222', 'COORDINADOR', '2026-01-12'),
('11222333-4', 'Maria Fuentes',   'maria.f@mail.cl',      '+56933333333', 'DONANTE',     '2026-02-01'),
('14555666-K', 'Jorge Diaz',      'jorge.diaz@mail.cl',   '+56944444444', 'DONANTE',     '2026-02-03'),
('16777888-1', 'Ana Morales',     'ana.morales@mail.cl',  '+56955555555', 'VOLUNTARIO',  '2026-02-05'),
('17888999-6', 'Luis Carrasco',   'luis.c@mail.cl',       '+56966666666', 'VOLUNTARIO',  '2026-02-06');

INSERT INTO emergencia (nombre, tipo, region, fecha_inicio, estado) VALUES
('Incendio Cerro Cordillera', 'INCENDIO', 'Valparaiso', '2026-02-10', 'ACTIVA'),
('Aluvion Quebrada de Macul', 'ALUVION',  'Metropolitana', '2026-03-05', 'ACTIVA');

INSERT INTO albergue (nombre, direccion, comuna, capacidad, id_emergencia, id_coordinador) VALUES
('Gimnasio Municipal',   'Av. Argentina 1500', 'Valparaiso',   200, 1, 1),
('Escuela Republica',    'Calle Colon 234',    'Valparaiso',   120, 1, 2),
('Sede Vecinal La Florida', 'Av. Vicuna Mackenna 8000', 'La Florida', 80, 2, 1);

INSERT INTO categoria_item (nombre) VALUES
('Agua'), ('Alimentos'), ('Abrigo'), ('Higiene');

INSERT INTO item (nombre, unidad_medida, id_categoria) VALUES
('Agua embotellada 1.5L', 'litros',   1),
('Conservas',             'unidades', 2),
('Frazadas',              'unidades', 3),
('Kit de aseo',           'cajas',    4);

INSERT INTO necesidad (id_albergue, id_item, cantidad_solicitada, prioridad, estado, fecha_solicitud) VALUES
(1, 1, 500, 'ALTA',  'PARCIAL',   '2026-02-11'),   -- Gimnasio pide 500L de agua
(1, 3, 150, 'ALTA',  'PENDIENTE', '2026-02-11'),   -- Gimnasio pide 150 frazadas
(2, 1, 300, 'ALTA',  'PARCIAL',   '2026-02-12'),   -- Escuela pide 300L de agua
(2, 2, 400, 'MEDIA', 'PENDIENTE', '2026-02-12'),   -- Escuela pide 400 conservas
(3, 4,  60, 'MEDIA', 'PENDIENTE', '2026-03-06');   -- Sede pide 60 kits de aseo

INSERT INTO donacion (id_donante, fecha, estado) VALUES
(3, '2026-02-13', 'EN_BODEGA'),
(4, '2026-02-14', 'EN_BODEGA');

INSERT INTO donacion_detalle (id_donacion, id_item, cantidad) VALUES
(1, 1, 200),   -- Maria dona 200L de agua
(1, 2, 100),   -- Maria dona 100 conservas
(2, 1, 150),   -- Jorge dona 150L de agua
(2, 3,  50);   -- Jorge dona 50 frazadas

INSERT INTO asignacion (id_detalle, id_necesidad, cantidad_asignada, fecha_asignacion) VALUES
(1, 1, 200, '2026-02-14'),   -- los 200L de Maria van al Gimnasio
(3, 1, 100, '2026-02-15'),   -- 100L de Jorge tambien al Gimnasio
(3, 3,  50, '2026-02-15');   -- los otros 50L de Jorge a la Escuela

INSERT INTO turno (id_voluntario, id_albergue, fecha, bloque) VALUES
(5, 1, '2026-02-15', 'MANANA'),
(5, 1, '2026-02-15', 'TARDE'),
(6, 2, '2026-02-15', 'MANANA'),
(6, 3, '2026-03-07', 'TARDE');

-- ============================================================
-- SECCION 3: CONSULTAS DE PRUEBA (demuestran valor del modelo)
-- ============================================================

-- Q1: Deficit por albergue e item (la consulta estrella:
-- que falta y donde, en tiempo real)
SELECT a.nombre AS albergue,
       i.nombre AS item,
       n.cantidad_solicitada,
       COALESCE(SUM(asg.cantidad_asignada), 0) AS cantidad_recibida,
       n.cantidad_solicitada - COALESCE(SUM(asg.cantidad_asignada), 0) AS deficit,
       n.prioridad
FROM necesidad n
JOIN albergue a  ON a.id_albergue = n.id_albergue
JOIN item i      ON i.id_item = n.id_item
LEFT JOIN asignacion asg ON asg.id_necesidad = n.id_necesidad
GROUP BY n.id_necesidad, a.nombre, i.nombre, n.cantidad_solicitada, n.prioridad
HAVING deficit > 0
ORDER BY n.prioridad, deficit DESC;

-- Q2: Ranking de donantes por cantidad total donada
SELECT u.nombre AS donante,
       COUNT(DISTINCT d.id_donacion) AS num_donaciones,
       SUM(dd.cantidad) AS total_unidades
FROM usuario u
JOIN donacion d          ON d.id_donante = u.id_usuario
JOIN donacion_detalle dd ON dd.id_donacion = d.id_donacion
GROUP BY u.id_usuario, u.nombre
ORDER BY total_unidades DESC;

-- Q3: Cobertura de voluntarios por albergue y fecha
SELECT a.nombre AS albergue,
       t.fecha,
       t.bloque,
       COUNT(*) AS voluntarios
FROM turno t
JOIN albergue a ON a.id_albergue = t.id_albergue
GROUP BY a.nombre, t.fecha, t.bloque
ORDER BY t.fecha, a.nombre;

-- Q4: Demostracion de integridad referencial
-- Este INSERT debe FALLAR: el albergue 999 no existe
-- INSERT INTO necesidad (id_albergue, id_item, cantidad_solicitada, fecha_solicitud)
-- VALUES (999, 1, 100, '2026-02-20');
-- Error esperado: Cannot add or update a child row:
-- a foreign key constraint fails (fk_necesidad_albergue)

-- Q5: Demostracion del UNIQUE compuesto en turno
-- Este INSERT debe FALLAR: Ana ya tiene turno el 15/02 en la manana
-- INSERT INTO turno (id_voluntario, id_albergue, fecha, bloque)
-- VALUES (5, 2, '2026-02-15', 'MANANA');
-- Error esperado: Duplicate entry for key 'uq_turno_unico'
