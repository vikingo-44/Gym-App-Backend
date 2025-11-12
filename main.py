import os
from datetime import datetime, timedelta, timezone
from typing import Annotated, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials 
from sqlmodel import Session, select
# Importamos selectinload para forzar la carga de relaciones anidadas
from sqlalchemy.orm import selectinload 
from sqlalchemy import desc 

from passlib.context import CryptContext
from jose import JWTError, jwt
from dotenv import load_dotenv

# Importaciones de tu estructura y esquemas
from database import create_db_and_tables, get_session
from models import (
    User, UserCreate, UserRead, UserReadSimple, UserRole, UserLogin, Token,
    Exercise, ExerciseCreate, ExerciseRead, ExerciseUpdate, MuscleGroup,
    Routine, RoutineCreate, RoutineRead, RoutineUpdate,
    RoutineExercise, RoutineAssignment, 
    RoutineAssignmentCreate, RoutineAssignmentRead,
    ChangePassword,
    RoutineCreateOrUpdate # 🚨 Importamos el nuevo esquema de edición
)


load_dotenv()

# ----------------------------------------------------------------------
# Configuración de Seguridad y JWT
# ----------------------------------------------------------------------
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
SECRET_KEY = os.environ.get("SECRET_KEY", "CLAVE_SECRETA_DEFAULT_DEBES_CAMBIARLA")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # Token de 1 día

http_bearer = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "sub": data["dni"]})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# ----------------------------------------------------------------------
# Eventos de la Aplicación (Startup/Shutdown)
# ----------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Crea todas las tablas al iniciar."""
    print("Iniciando la aplicación y creando tablas de DB...")
    create_db_and_tables() 
    yield
    print("Apagando la aplicación...")

# ----------------------------------------------------------------------
# Inicialización de la Aplicación
# ----------------------------------------------------------------------

app = FastAPI(
    title="Gym Routine Manager API",
    version="1.0.0",
    lifespan=lifespan
)

# ----------------------------------------------------------------------
# Dependencias de Autenticación y Autorización
# ----------------------------------------------------------------------

def get_current_user(
    session: Annotated[Session, Depends(get_session)], 
    auth: Annotated[HTTPAuthorizationCredentials, Depends(http_bearer)]
) -> User:
    """Decodifica el JWT y devuelve el objeto User autenticado."""
    token = auth.credentials 
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # El DNI está en el campo 'sub'
        dni: str = payload.get("sub")
        if dni is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Buscar usuario por DNI
    user = session.exec(select(User).where(User.dni == dni)).first()
    if user is None:
        raise credentials_exception
    
    return user

def get_current_professor(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """Dependencia que verifica si el usuario actual es un Profesor."""
    if current_user.rol != UserRole.PROFESSOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de Profesor para acceder a este recurso."
        )
    return current_user

def get_current_student(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """Dependencia que verifica si el usuario actual es un Alumno."""
    if current_user.rol != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de Alumno para acceder a este recurso."
        )
    return current_user

# ----------------------------------------------------------------------
# Rutas Públicas (Health Check y Autenticación)
# ----------------------------------------------------------------------

@app.get("/", tags=["General"])
def read_root():
    """Endpoint de bienvenida y verificación de salud de la API."""
    return {"message": "API del Gestor de Rutinas de Gimnasio activa."}

# NUEVA RUTA: Registro solo de Alumnos
@app.post("/register/student", response_model=UserRead, status_code=status.HTTP_201_CREATED, tags=["Autenticación"])
def register_student(
    user_data: UserCreate, # Se usa UserCreate, pero el rol se fuerza a Alumno
    session: Annotated[Session, Depends(get_session)]
):
    """Permite el registro de nuevos usuarios con rol forzado a Alumno."""
    
    # 1. Verificar si DNI ya existe
    existing_dni = session.exec(select(User).where(User.dni == user_data.dni)).first()
    if existing_dni:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El DNI ya está registrado."
        )
    
    # 2. Verificar si Email ya existe
    existing_email = session.exec(select(User).where(User.email == user_data.email)).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado."
        )

    # 🚨 NOTA: Se asume que el backend maneja el límite de 72 bytes para el password hash
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        dni=user_data.dni, # Almacenar DNI
        password_hash=hashed_password,
        nombre=user_data.nombre,
        rol=UserRole.STUDENT # Forzar rol a Alumno
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user

@app.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED, tags=["Autenticación"])
def register_user(
    user_data: UserCreate,
    session: Annotated[Session, Depends(get_session)]
):
    """Permite el registro de nuevos usuarios (Profesores o Alumnos)."""
    
    # 1. Verificar si DNI ya existe
    existing_dni = session.exec(select(User).where(User.dni == user_data.dni)).first()
    if existing_dni:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El DNI ya está registrado."
        )
        
    # 2. Verificar si Email ya existe
    existing_user = session.exec(select(User).where(User.email == user_data.email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado."
        )

    # 🚨 NOTA: Se asume que el backend maneja el límite de 72 bytes para el password hash
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        dni=user_data.dni, # Almacenar DNI
        password_hash=hashed_password,
        nombre=user_data.nombre,
        rol=user_data.rol
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user

@app.post("/login", response_model=Token, tags=["Autenticación"])
def login_for_access_token(
    form_data: UserLogin, # form_data tiene .dni y .password
    session: Annotated[Session, Depends(get_session)]
):
    """Verifica credenciales (Email/DNI y Password) y devuelve un JWT para la sesión."""
    
    # 🔑 Búsqueda por EMAIL (asumiendo que el campo 'dni' en el payload del frontend es el Email)
    user = session.exec(select(User).where(User.email == form_data.dni)).first()
    
    # Si la búsqueda por email falla, intentar por DNI (fallback)
    if not user:
        user = session.exec(select(User).where(User.dni == form_data.dni)).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="DNI o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    # 🚨 CORRECCIÓN CLAVE: Incluimos el nombre del usuario en el token.
    access_token = create_access_token(
        data={"dni": user.dni, "rol": user.rol.value, "nombre": user.nombre}, 
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# ----------------------------------------------------------------------
# Rutas Protegidas (Usuarios)
# ----------------------------------------------------------------------

@app.get("/users/me", response_model=UserRead, tags=["Usuarios"])
def read_users_me(
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Obtiene la información del usuario actualmente autenticado."""
    return current_user

# 🚨 RUTA: CAMBIO DE CONTRASEÑA
@app.post("/users/change-password", tags=["Usuarios"])
def change_password(
    password_data: ChangePassword, # Usamos el nuevo esquema ChangePassword
    session: Annotated[Session, Depends(get_session)],
    # Permite a profesores y alumnos cambiar su contraseña
    current_user: Annotated[User, Depends(get_current_user)]
):
    """
    Permite a un usuario (Profesor o Alumno) cambiar su contraseña.
    Requiere la contraseña antigua para la verificación.
    """
    
    # 1. Verificar la contraseña antigua
    if not verify_password(password_data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña antigua incorrecta."
        )

    # 2. Verificar la longitud de la nueva contraseña (buena práctica)
    if len(password_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe tener al menos 6 caracteres."
        )

    # 3. Generar el nuevo hash y actualizar el usuario
    new_hashed_password = get_password_hash(password_data.new_password)
    current_user.password_hash = new_hashed_password
    
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    return {"message": "Contraseña actualizada exitosamente."}


@app.get("/users/students", response_model=List[UserReadSimple], tags=["Usuarios"])
def read_students_list(
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """Obtiene una lista de todos los usuarios con rol 'Alumno' (para asignar rutinas)."""
    students = session.exec(select(User).where(User.rol == UserRole.STUDENT)).all()
    return students

# ----------------------------------------------------------------------
# Rutas de visualizacion para Profesor de todas las rutinas
# ----------------------------------------------------------------------

@app.get("/professor/assignments/student/{student_id}", response_model=List[RoutineAssignmentRead], tags=["Asignaciones"])
def get_student_assignments_for_professor(
    student_id: int, # Tomamos el ID del alumno desde la URL
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)] # 🔑 Requiere rol de Profesor
):
    """
    (Profesor) Obtiene TODAS las asignaciones (activas e inactivas) de un alumno por su ID.
    """
    
    # 1. Verificar que el alumno exista
    student = session.get(User, student_id)
    if not student or student.rol != UserRole.STUDENT:
        raise HTTPException(status_code=404, detail="Alumno no encontrado.")
        
    statement = (
        select(RoutineAssignment)
        .where(RoutineAssignment.student_id == student_id) # Filtramos por el ID del alumno
        .order_by(desc(RoutineAssignment.assigned_at)) 
        .options(selectinload(RoutineAssignment.routine).selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise))
        .options(selectinload(RoutineAssignment.student))
        .options(selectinload(RoutineAssignment.professor))
    )
    
    assignments = session.exec(statement).all()
    
    if not assignments:
        # Devuelve 200 con lista vacía, que el frontend espera
        return []
        
    return assignments

# ----------------------------------------------------------------------
# Rutas de Ejercicios (CRUD)
# ----------------------------------------------------------------------

@app.post("/exercises/", response_model=List[ExerciseRead], status_code=status.HTTP_201_CREATED, tags=["Ejercicios"])
def create_exercise_batch(
    exercises: List[ExerciseCreate],
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """Crea múltiples ejercicios a la vez. Solo accesible para Profesores."""
    
    created_exercises = []
    for exercise_data in exercises:
        existing_exercise = session.exec(select(Exercise).where(Exercise.nombre == exercise_data.nombre)).first()
        if existing_exercise:
            print(f"Advertencia: Ejercicio '{exercise_data.nombre}' ya existe, omitiendo.")
            continue 

        db_exercise = Exercise.model_validate(exercise_data)
        session.add(db_exercise)
        created_exercises.append(db_exercise)
        
    session.commit()

    for db_exercise in created_exercises:
        session.refresh(db_exercise)
        
    return created_exercises

@app.get("/exercises/", response_model=List[ExerciseRead], tags=["Ejercicios"])
def read_exercises(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Obtiene una lista de todos los ejercicios. Accesible para todos los usuarios autenticados."""
    exercises = session.exec(select(Exercise)).all()
    return exercises

@app.get("/exercises/{exercise_id}", response_model=ExerciseRead, tags=["Ejercicios"])
def read_exercise(
    exercise_id: int,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Obtiene un ejercicio por su ID."""
    exercise = session.get(Exercise, exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
    return exercise

@app.patch("/exercises/{exercise_id}", response_model=ExerciseRead, tags=["Ejercicios"])
def update_exercise(
    exercise_id: int,
    exercise_data: ExerciseUpdate,
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """Actualiza un ejercicio existente por ID. Solo accesible para Profesores."""
    db_exercise = session.get(Exercise, exercise_id)
    if not db_exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
        
    exercise_dict = exercise_data.model_dump(exclude_unset=True)
    for key, value in exercise_dict.items():
        setattr(db_exercise, key, value)

    session.add(db_exercise)
    session.commit()
    session.refresh(db_exercise)
    return db_exercise

@app.delete("/exercises/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Ejercicios"])
def delete_exercise(
    exercise_id: int,
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """Elimina un ejercicio por ID. Solo accesible para Profesores."""
    exercise = session.get(Exercise, exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
        
    session.delete(exercise)
    session.commit()
    return

# ----------------------------------------------------------------------
# Rutas de Rutinas (CRUD - Muchos-a-Muchos)
# ----------------------------------------------------------------------

@app.post("/routines/", response_model=RoutineRead, status_code=status.HTTP_201_CREATED, tags=["Rutinas"])
def create_routine(
    routine_data: RoutineCreate,
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """Crea una nueva rutina (plantilla) y la asocia con ejercicios."""
    
    db_routine = Routine(
        nombre=routine_data.nombre,
        descripcion=routine_data.descripcion,
        owner_id=current_professor.id
    )
    
    # 1. Creamos la rutina y hacemos commit INMEDIATO para que la DB le asigne el ID.
    session.add(db_routine)
    session.commit()
    session.refresh(db_routine)
    
    # 2. Ahora creamos los enlaces usando el db_routine.id (que ya NO es null)
    for exercise_link_data in routine_data.exercises:
        exercise = session.get(Exercise, exercise_link_data.exercise_id)
        if not exercise:
            session.rollback() 
            raise HTTPException(
                status_code=404, 
                detail=f"Ejercicio con id {exercise_link_data.exercise_id} no encontrado. Creación cancelada."
            )
            
        link = RoutineExercise(
            routine_id=db_routine.id, 
            exercise_id=exercise.id,
            sets=exercise_link_data.sets,
            repetitions=exercise_link_data.repetitions,
            order=exercise_link_data.order
        )
        session.add(link)

    # 3. Commit final para los enlaces
    try:
        session.commit()
        # Recargamos la rutina con las relaciones anidadas
        statement = (
            select(Routine)
            .where(Routine.id == db_routine.id)
            .options(selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise))
        )
        final_routine = session.exec(statement).first()
        
        return final_routine

    except Exception as e:
        session.rollback()
        print(f"ERROR: Fallo al guardar los enlaces de ejercicios: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error en la base de datos al crear enlaces de rutina: {str(e)}")

@app.get("/routines/", response_model=List[RoutineRead], tags=["Rutinas"])
def read_routines(
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """
    Obtiene una lista de todas las rutinas maestras creadas por el profesor.
    """
    try:
        # 🚨 CORRECCIÓN/MEJORA: Forzamos la carga de relaciones anidadas (links + detalles del ejercicio)
        statement = (
            select(Routine)
            .where(Routine.owner_id == current_professor.id)
            .options(selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise)) 
        )
        
        routines = session.exec(statement).all()
        
        if not routines:
            return []
            
        return routines
        
    except Exception as e:
        print(f"ERROR: Fallo al leer /routines/. Causa: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno: Fallo al cargar la lista de rutinas. {e}"
        )

@app.get("/routines/{routine_id}", response_model=RoutineRead, tags=["Rutinas"])
def read_routine(
    routine_id: int,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Obtiene una rutina específica por su ID, incluyendo todos sus ejercicios."""
    # 🚨 CORRECCIÓN/MEJORA: Forzamos la carga de relaciones anidadas (links + detalles del ejercicio)
    statement = (
        select(Routine)
        .where(Routine.id == routine_id)
        .options(selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise))
    )
    routine = session.exec(statement).first()
    
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    
    return routine

# 🚨 RUTA ACTUALIZADA: EDICIÓN COMPLETA (Metadata y Ejercicios)
@app.patch("/routines/{routine_id}", response_model=RoutineRead, tags=["Rutinas"])
def update_routine_full(
    routine_id: int,
    routine_data: RoutineCreateOrUpdate, # 🔑 Usamos el esquema de actualización completa
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """Actualiza completamente una rutina maestra (nombre, descripción y REEMPLAZA la lista de ejercicios)."""
    db_routine = session.get(Routine, routine_id)
    if not db_routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
        
    if db_routine.owner_id != current_professor.id:
        raise HTTPException(status_code=403, detail="No autorizado para editar esta rutina")

    # 1. Actualizar metadata (Nombre/Descripción)
    db_routine.nombre = routine_data.nombre
    db_routine.descripcion = routine_data.descripcion
    
    # 2. Eliminar todos los enlaces de ejercicios existentes para reemplazarlos
    session.exec(select(RoutineExercise).where(RoutineExercise.routine_id == routine_id)).delete()
    
    # 3. Crear los nuevos enlaces
    for exercise_link_data in routine_data.exercises:
        exercise = session.get(Exercise, exercise_link_data.exercise_id)
        if not exercise:
            session.rollback() 
            raise HTTPException(
                status_code=404, 
                detail=f"Ejercicio con id {exercise_link_data.exercise_id} no encontrado. Edición cancelada."
            )
            
        link = RoutineExercise(
            routine_id=db_routine.id, 
            exercise_id=exercise.id,
            sets=exercise_link_data.sets,
            repetitions=exercise_link_data.repetitions,
            order=exercise_link_data.order
        )
        session.add(link)

    # 4. Commit final
    try:
        session.add(db_routine)
        session.commit()
        
        # Recargamos la rutina con todas las relaciones anidadas para devolver el objeto completo
        statement = (
            select(Routine)
            .where(Routine.id == routine_id)
            .options(selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise))
        )
        updated_routine = session.exec(statement).first()
        
        if not updated_routine:
            raise HTTPException(status_code=500, detail="Fallo al recargar la rutina actualizada.")
            
        return updated_routine
        
    except Exception as e:
        session.rollback()
        print(f"ERROR: Fallo al actualizar los enlaces de ejercicios: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error en la base de datos al actualizar rutina: {str(e)}")


@app.delete("/routines/{routine_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Rutinas"])
def delete_routine(
    routine_id: int,
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """Elimina una rutina maestra. Esto también eliminará los enlaces en RoutineExercise y asignaciones."""
    db_routine = session.get(Routine, routine_id)
    if not db_routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    
    if db_routine.owner_id != current_professor.id:
        raise HTTPException(status_code=403, detail="No autorizado para eliminar esta rutina")

    # Eliminamos enlaces y asignaciones antes de eliminar la rutina
    session.exec(select(RoutineExercise).where(RoutineExercise.routine_id == routine_id)).delete()
    session.exec(select(RoutineAssignment).where(RoutineAssignment.routine_id == routine_id)).delete()
        
    session.delete(db_routine)
    session.commit()
    return

# ----------------------------------------------------------------------
# Rutas de Asignación (Profesor y Alumno)
# ----------------------------------------------------------------------

# --- Rutas del Profesor ---

@app.post("/assignments/", response_model=RoutineAssignmentRead, tags=["Asignaciones"])
def assign_routine_to_student(
    assignment_data: RoutineAssignmentCreate,
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """(Profesor) Asigna una rutina a un alumno. Permite múltiples asignaciones (no desactiva las antiguas)."""
    
    # 1. Verificar que la rutina exista
    routine = session.get(Routine, assignment_data.routine_id)
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
        
    # 2. Verificar que el alumno exista
    student = session.get(User, assignment_data.student_id)
    if not student or student.rol != UserRole.STUDENT:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
        
    # 3. Crear la nueva asignación
    db_assignment = RoutineAssignment(
        student_id=student.id,
        routine_id=routine.id,
        professor_id=current_professor.id,
        is_active=True # Todas las rutinas asignadas se consideran 'activas' por defecto.
    )
    
    session.add(db_assignment)
    
    try:
        session.commit()
        session.refresh(db_assignment)
    except Exception as e:
        session.rollback()
        print(f"ERROR DB ASIGNACIÓN: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Fallo al guardar la asignación en DB. {e}"
        )
        
    return db_assignment

# 🚨 RUTA EXISTENTE: PATCH para cambiar el estado de activación de una asignación
@app.patch("/assignments/{assignment_id}/active", response_model=RoutineAssignmentRead, tags=["Asignaciones"])
def set_assignment_active_status(
    assignment_id: int,
    is_active: bool, # Nuevo parámetro booleano para el estado
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """(Profesor) Cambia el estado de activación (is_active) de una asignación de rutina específica."""
    
    assignment = session.get(RoutineAssignment, assignment_id)
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Asignación no encontrada.")
        
    assignment.is_active = is_active # 🚨 Aplica el nuevo estado
        
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    return assignment

@app.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Asignaciones"])
def delete_assignment(
    assignment_id: int,
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """(Profesor) Elimina una asignación de rutina específica por ID."""
    
    assignment = session.get(RoutineAssignment, assignment_id)
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Asignación no encontrada.")
        
    session.delete(assignment)
    session.commit()
    return


# --- Rutas del Alumno ---

@app.get("/students/me/routine", response_model=List[RoutineAssignmentRead], tags=["Alumnos"])
def get_my_active_routine(
    session: Annotated[Session, Depends(get_session)],
    current_student: Annotated[User, Depends(get_current_student)]
):
    """
    (Alumno) Obtiene SOLAMENTE las rutinas asignadas que están marcadas como activas (is_active=True).
    """
    statement = (
        select(RoutineAssignment)
        .where(
            RoutineAssignment.student_id == current_student.id,
            RoutineAssignment.is_active == True # 🚨 FILTRO CRÍTICO: Solo rutinas activas
        )
        # 🔑 Ordenamos por fecha de asignación descendente.
        .order_by(desc(RoutineAssignment.assigned_at)) 
        # Cargamos las relaciones anidadas
        .options(selectinload(RoutineAssignment.routine).selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise))
        .options(selectinload(RoutineAssignment.student))
        .options(selectinload(RoutineAssignment.professor))
    )
    
    active_assignments = session.exec(statement).all()
    
    # 🚨 CORRECCIÓN APLICADA: Devolvemos una lista vacía en lugar de un error 404.
    if not active_assignments:
        return []
        
    return active_assignments