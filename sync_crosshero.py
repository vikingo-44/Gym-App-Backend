import requests
from sqlalchemy.orm import Session
from sqlmodel import select # Importamos select de sqlmodel
import os
from dotenv import load_dotenv

# Asegúrese de importar sus modelos de base de datos
# Asumo que database y models están en el mismo nivel o disponibles
from .database import SessionLocal 
from .models import User, get_password_hash # Importamos el modelo User y la funcion de hash

# Cargar variables de entorno
load_dotenv()

# -------------------------------------------------------------------
# CONFIGURACION DE LA API DE CROSSHERO (REEMPLAZAR CON SUS VALORES)
# -------------------------------------------------------------------
# Es mejor usar variables de entorno para la clave API
CROSSHERO_BASE_URL = os.environ.get("CROSSHERO_BASE_URL", "https://crosshero.com/api/v1/athletes")
CROSSHERO_API_KEY = os.environ.get("CROSSHERO_API_KEY", "SU_API_KEY_SECRETA_AQUI") 
# Esta API Key NUNCA debe ser compartida ni expuesta al frontend.

# -------------------------------------------------------------------
# LÓGICA DE SINCRONIZACIÓN
# -------------------------------------------------------------------

def get_crosshero_students():
    """Obtiene la lista de alumnos desde la API de CrossHero."""
    headers = {
        "Authorization": f"Bearer {CROSSHERO_API_KEY}",
        "Content-Type": "application/json"
    }
    # REEMPLAZAR: Usar el endpoint correcto para obtener usuarios o alumnos
    # Ejemplo genérico, necesitará el endpoint exacto de su API de CrossHero.
    url = f"{CROSSHERO_BASE_URL}/users/students" 
    
    print(f"Intentando conectar a: {url}")

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status() # Lanza un error para códigos 4xx/5xx
        
        # CrossHero a veces devuelve una lista directamente o un objeto con una clave 'data'
        data = response.json()
        
        # Asumiendo que la respuesta es una lista de estudiantes
        if isinstance(data, list):
            return data
        
        # Si la respuesta es un diccionario con una clave 'data'
        if isinstance(data, dict) and 'data' in data and isinstance(data['data'], list):
             return data['data']
             
        print("Advertencia: Respuesta de CrossHero no es una lista de estudiantes esperada.")
        return []

    except requests.exceptions.RequestException as e:
        print(f"Error CRÍTICO al conectar con CrossHero: {e}")
        return None

def sync_users_from_crosshero():
    """
    Sincroniza los usuarios obtenidos de CrossHero con la base de datos local.
    """
    print("--- INICIANDO SINCRONIZACIÓN CROSSHERO ---")
    crosshero_students = get_crosshero_students()
    
    if crosshero_students is None:
        print("Sincronización abortada debido a error de conexión.")
        return {"status": "error", "message": "Sincronización abortada. Error de conexión con CrossHero."}
        
    if not crosshero_students:
        print("Sincronización completa: No se encontraron alumnos en CrossHero.")
        return {"status": "success", "message": "Sincronización completa. 0 alumnos procesados."}

    db: Session = SessionLocal()
    new_users_count = 0
    updated_users_count = 0
    total_processed = 0

    try:
        for ch_student in crosshero_students:
            total_processed += 1
            
            # 1. Extraer los campos necesarios y Transformar nombres de campos
            # REEMPLAZAR con los nombres de campos REALES de CrossHero
            ch_id = str(ch_student.get("id")) 
            name = ch_student.get("name") or ch_student.get("full_name") # Ejemplo de fallback
            email = ch_student.get("email") 
            dni = ch_student.get("dni") or ch_student.get("identifier") # Campo para usar como DNI en su sistema
            
            if not ch_id or not name or not email or not dni:
                print(f"Advertencia: Alumno omitido por datos incompletos: ID={ch_id}, Name={name}, Email={email}, DNI={dni}")
                continue
            
            # 2. Buscar si el usuario ya existe por su ID de CrossHero
            local_user = db.exec(select(User).where(User.dni == dni)).first()
            
            if local_user:
                # 3. Actualizar (si es necesario)
                needs_update = False
                if local_user.nombre != name:
                    local_user.nombre = name
                    needs_update = True
                if local_user.email != email:
                    local_user.email = email
                    needs_update = True
                
                # Opcional: Marcar como activo si se actualiza y estaba inactivo (si tienen ese campo)
                # if local_user.is_active is False:
                #     local_user.is_active = True
                #     needs_update = True
                
                if needs_update:
                    db.add(local_user)
                    updated_users_count += 1
                
            else:
                # 3. Crear nuevo usuario (solo si es nuevo)
                # CRITICO: Debemos generar una contraseña temporal y un hash.
                # Se recomienda que al primer login se obligue al alumno a cambiarla.
                temp_password = f"CH@{dni}" # Contraseña temporal simple
                hashed_password = get_password_hash(temp_password)
                
                new_user = User(
                    dni=dni,
                    email=email,
                    password_hash=hashed_password,
                    nombre=name,
                    rol="Alumno", # Forzamos el rol al que debe tener en su DB (UserRole.STUDENT)
                    # Nota: La columna crosshero_id NO existe en su modelo User actual.
                    # Usamos 'dni' como clave de sincronización, que es único.
                )
                db.add(new_user)
                new_users_count += 1
        
        db.commit()
        print(f"--- SINCRONIZACIÓN EXITOSA ---")
        print(f"Total procesados: {total_processed}")
        print(f"Alumnos nuevos creados: {new_users_count}")
        print(f"Alumnos actualizados: {updated_users_count}")
        
        return {
            "status": "success", 
            "message": "Sincronización completa", 
            "new_users": new_users_count, 
            "updated_users": updated_users_count
        }

    except Exception as e:
        db.rollback()
        print(f"Error CRÍTICO durante la sincronización de la base de datos: {e}")
        return {"status": "error", "message": f"Error DB: {str(e)}"}
    finally:
        db.close()

# -------------------------------------------------------------------