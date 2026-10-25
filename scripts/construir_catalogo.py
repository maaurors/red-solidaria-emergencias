"""Construye data/empresas.json a partir de la nomina de empresas del SII.

Fuente: https://www.sii.cl/sobre_el_sii/nominapersonasjuridicas.html
Archivo: PUB_EMPRESAS_PJ_2020_A_2024.zip (se usa el anio comercial mas reciente).

Criterios:
  - Solo empresas activas (sin fecha de termino de giro).
  - Solo empleadores con 50 trabajadores dependientes o mas (mediana y gran
    empresa, Ley 20.416): es donde postula la mayoria y donde el ghosting es masivo.
  - Se excluyen EIRL y sociedades de hecho, que suelen llevar el nombre de una
    persona natural: reportarlas seria exponer a una persona, no a una empresa.

Uso:
  python3 scripts/construir_catalogo.py ruta/PUB_EMPRESAS_PJ_2020_A_2024.zip
"""
import csv
import datetime
import io
import json
import re
import sys
import zipfile

ANIO = "2024"
MIN_TRABAJADORES = 50
SUBTIPOS_EXCLUIDOS = {"EMPR. INDIVIDUAL RESP. LTDA.", "SOCIEDADES DE HECHO"}

# Orden y nombres iguales a REGIONS en js/app.js. La clave es un fragmento unico del nombre que usa el SII.
REGIONES = [
    ("ARICA", "Arica y Parinacota"), ("TARAPACA", "Tarapacá"), ("ANTOFAGASTA", "Antofagasta"), ("ATACAMA", "Atacama"),
    ("COQUIMBO", "Coquimbo"), ("VALPARAISO", "Valparaíso"), ("METROPOLITANA", "Metropolitana"), ("HIGGINS", "O'Higgins"),
    ("MAULE", "Maule"), ("ÑUBLE", "Ñuble"), ("BIO BIO", "Biobío"), ("ARAUCANIA", "La Araucanía"), ("LOS RIOS", "Los Ríos"),
    ("LOS LAGOS", "Los Lagos"), ("AYSEN", "Aysén"), ("MAGALLANES", "Magallanes"),
]

# Marcas conocidas -> RUT de la razon social con mas trabajadores. Verificadas contra la misma nomina.
# Marcas conocidas -> RUT de la razon social con mas trabajadores. Verificadas contra la misma nomina.
# La primera marca de cada RUT es la que se muestra; las demas solo sirven para buscar.
ALIAS = {
    "BCI": "97006000-6", "Banco de Chile": "97004000-5", "BancoEstado": "97030000-7", "Banco Estado": "97030000-7",
    "Santander": "97036000-K", "Itaú": "97023000-9", "Scotiabank": "97018000-1", "Falabella": "77261280-K",
    "Ripley": "83382700-6", "Cencosud (Jumbo, Paris)": "81201000-K", "Jumbo": "81201000-K", "Paris": "81201000-K",
    "Lider (Walmart)": "76134941-4", "Lider": "76134941-4", "Walmart": "76134941-4", "Tottus": "78627210-6",
    "Unimarc": "81537600-5", "SMU": "76012676-4", "Sodimac": "96792430-K", "Entel": "92580000-7",
    "Movistar": "76086148-0", "Telefónica": "76086148-0", "Claro": "96799250-K", "LATAM": "89862200-2",
    "Arauco": "93458000-1", "CCU": "90413000-1", "Enel": "96800570-7",
}

MINUSCULAS = {"de", "del", "la", "las", "los", "el", "y", "e", "en", "para", "por", "con", "a"}
SUFIJOS = {"S.A.": "S.A.", "SA": "S.A.", "S.A": "S.A.", "SPA": "SpA", "LTDA": "Ltda.", "LTDA.": "Ltda.", "LIMITADA": "Limitada"}


def titulo(nombre):
    """BANCO DE CREDITO E INVERSIONES -> Banco de Credito e Inversiones. Respeta siglas cortas como CCU."""
    limpio = re.sub(r"\s+", " ", nombre.strip())
    limpio = re.sub(r"\bS\.? ?A\.?$", "S.A.", limpio)  # "BCI FACTORING S A" -> "... S.A."
    palabras = limpio.split(" ")
    out = []
    for i, p in enumerate(palabras):
        if p in SUFIJOS:
            out.append(SUFIJOS[p])
        elif i > 0 and p.lower() in MINUSCULAS:
            out.append(p.lower())
        elif len(p) <= 3 and p.isalpha() and p not in {"SAN", "SUR", "MAR", "SOL", "LUZ", "RED", "PAN", "ORO"}:
            out.append(p)  # Probable sigla: CCU, AFP, BCI.
        else:
            out.append("-".join(x[:1] + x[1:].lower() for x in p.split("-")))  # Santander-Chile, no Santander-chile.
    return " ".join(out)


def region_idx(nombre_sii):
    n = nombre_sii.upper()
    for i, (clave, _) in enumerate(REGIONES):
        if clave in n:
            return i
    return -1


def tamano(t):
    return 1 if t < 200 else 2 if t < 1000 else 3


def main(ruta_zip):
    z = zipfile.ZipFile(ruta_zip)
    lector = csv.reader(io.TextIOWrapper(z.open(f"PUB_EMPRESAS_PJ_{ANIO}.txt"), encoding="utf-8", newline=""), delimiter="\t")
    cab = next(lector)
    ix = {h: i for i, h in enumerate(cab)}
    rubros, empresas = [], []
    for fila in lector:
        if len(fila) < len(cab) or fila[ix["Fecha término de giro"]].strip():
            continue
        if fila[ix["Subtipo de contribuyente"]] in SUBTIPOS_EXCLUIDOS:
            continue
        try:
            trabajadores = int(fila[ix["Número de trabajadores dependie"]] or 0)
        except ValueError:
            continue
        if trabajadores < MIN_TRABAJADORES:
            continue
        reg = region_idx(fila[ix["Región"]])
        rubro = fila[ix["Rubro económico"]].strip().capitalize() or "Sin rubro"
        if rubro not in rubros:
            rubros.append(rubro)
        rut = f"{int(fila[ix['RUT']])}-{fila[ix['DV']].strip().upper()}"
        empresas.append([rut, titulo(fila[ix["Razón social"]]), rubros.index(rubro), reg, tamano(trabajadores)])

    ruts = {e[0] for e in empresas}
    faltan = {a: r for a, r in ALIAS.items() if r not in ruts}
    if faltan:
        sys.exit(f"Alias sin empresa en la nomina, revisalos: {faltan}")
    empresas.sort(key=lambda e: (-e[4], e[1]))
    salida = {
        "version": 1,
        "fuente": f"SII, nómina de empresas personas jurídicas, año comercial {ANIO}",
        "generado": datetime.date.today().isoformat(),
        "criterio": f"Activas, {MIN_TRABAJADORES} trabajadores o más, sin EIRL ni sociedades de hecho",
        "rubros": rubros,
        "campos": ["rut", "nombre", "rubro", "region", "tamano"],
        "empresas": empresas,
        "alias": ALIAS,
    }
    with open("data/empresas.json", "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(empresas)} empresas, {len(rubros)} rubros, {len(ALIAS)} alias")


if __name__ == "__main__":
    main(sys.argv[1])
