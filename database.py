import os
from typing import Generator
from sqlmodel import Session, create_engine, SQLModel
from dotenv import load_dotenv

# Cargar variables de entorno del archivo .env (si existe)
load_dotenv()

# La URL de conexión a tu base de datos PostgreSQL.
DATABASE_URL = os.environ.get("DATABASE_URL")

# Bloque de fallback simplificado y limpio
if not DATABASE_URL:
    print("WARNING: DATABASE_URL no configurada. Usando fallback.")
    # Asegúrate que esta URL sea correcta si no usas .env
    DATABASE_URL = "postgresql://neondb_owner:npg_Ddj8GkQLhf9C@ep-dark-shadow-ag99jz87-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"


# Configuración del motor de conexión.
engine = create_engine(
    DATABASE_URL, 
    pool_recycle=300, 
    echo=True, # Puedes quitar esto en producción
    connect_args={"options": "-c timezone=utc"},
    encoding="utf8" 
)

# ----------------------------------------------------------------------
# Funciones de Utilidad
# ----------------------------------------------------------------------

def create_db_and_tables():
    """
    Elimina y luego recrea todas las tablas. (Necesario para la columna DNI)
    ADVERTENCIA: Borra todos los datos.
    """
    
    # Crea la base de datos y todas las tablas definidas en models.py.
    SQLModel.metadata.create_all(engine)
    print("DB: Tablas eliminadas y recreadas con la nueva estructura (DNI).")

def get_session() -> Generator[Session, None, None]:
    """Función de dependencia para obtener una sesión."""
    with Session(engine) as session:
        yield session