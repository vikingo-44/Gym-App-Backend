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
    ChangePassword, # ?? Importamos el esquema ChangePassword
    RoutineCreateOrUpdate # Ya estaba importado, pero lo mantenemos
)


load_dotenv()

# ----------------------------------------------------------------------
# Configuraci車n de Seguridad y JWT
# ----------------------------------------------------------------------
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
SECRET_KEY = os.environ.get("SECRET_KEY", "CLAVE_SECRETA_DEFAULT_DEBES_CAMBIARLA")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # Token de 1 d赤a

http_bearer = HTTPBearer()


# ----------------------------------------------------------------------
# Funciones de Utilidad de Seguridad
# ----------------------------------------------------------------------

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # El expire time debe estar en UTC
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # ?? CORRECCI車N CLAVE: Aseguramos que el rol se incluya correctamente en el token.
    to_encode.update({"exp": expire, "sub": str(data["id"]), "rol": data["role"].value})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def authenticate_user(session: Session, user_login: UserLogin) -> Optional[User]:

    user = session.exec(select(User).where(User.email == user_login.email)).first()
    if user and pwd_context.verify(user_login.password, user.hashed_password):
        return user
    return None

oauth2_scheme = HTTPBearer()

async def get_current_user(
    session: Annotated[Session, Depends(get_session)],
    token: Annotated[HTTPAuthorizationCredentials, Depends(oauth2_scheme)]
) -> User:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar la credencial",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub") # El 'sub' contiene el ID del usuario
        
        if user_id is None:
            raise credentials_exception
        
        user = session.get(User, int(user_id))
        if user is None:
            raise credentials_exception
        
        return user
    except JWTError:
        raise credentials_exception
    except Exception:
        raise credentials_exception

def get_current_professor(current_user: Annotated[User, Depends(get_current_user)]) -> User:

    if current_user.role != UserRole.PROFESSOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado: Se requiere rol de Profesor.")
    return current_user

def get_current_student(current_user: Annotated[User, Depends(get_current_user)]) -> User:

    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado: Se requiere rol de Alumno.")
    return current_user


# ----------------------------------------------------------------------
# Configuraci車n de FastAPI
# ----------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializa la base de datos al inicio de la aplicaci車n
    create_db_and_tables()
    yield
    # No hay c車digo de cierre por ahora

app = FastAPI(
    title="Gym App API",
    version="0.1.0",
    lifespan=lifespan
)


# ----------------------------------------------------------------------
# Rutas de Autenticaci車n y Usuarios Comunes (Login/Registro/Perfil)
# ----------------------------------------------------------------------

@app.post("/users/register", response_model=UserRead, tags=["Usuarios"])
def create_user(*, session: Annotated[Session, Depends(get_session)], user_create: UserCreate):

    # 1. Verificar si el email ya existe
    existing_user = session.exec(select(User).where(User.email == user_create.email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El email ya esta registrado."
        )

    # 2. Hashear la contrase?a
    hashed_password = pwd_context.hash(user_create.password)
    
    # 3. Crear el nuevo objeto User
    user = User.model_validate(user_create, update={"hashed_password": hashed_password})
    
    # 4. Guardar en DB
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@app.post("/users/login", response_model=Token, tags=["Usuarios"])
def login_for_access_token(
    session: Annotated[Session, Depends(get_session)],
    user_login: UserLogin
):

    user = authenticate_user(session, user_login)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contrase?a incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # ?? CR赤TICO: Incluir ID y ROL en el token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"id": user.id, "role": user.role}, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")


@app.get("/users/me", response_model=UserRead, tags=["Usuarios"])
def read_users_me(current_user: Annotated[User, Depends(get_current_user)]):

    return current_user

@app.put("/users/me/password", status_code=status.HTTP_204_NO_CONTENT, tags=["Usuarios"])
def change_password(
    password_data: ChangePassword,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)]
):

    # 1. Verificar la contrase?a actual
    if not pwd_context.verify(password_data.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contrase?a actual incorrecta."
        )

    # 2. Validar que la nueva contrase?a no sea la misma (Opcional, pero buena pr芍ctica)
    if pwd_context.verify(password_data.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contrase?a no puede ser igual a la anterior."
        )

    # 3. Hashear la nueva contrase?a y actualizar
    hashed_new_password = pwd_context.hash(password_data.new_password)
    current_user.hashed_password = hashed_new_password

    # 4. Guardar en DB
    session.add(current_user)
    session.commit()
    return


# ----------------------------------------------------------------------
# Rutas del Profesor
# ----------------------------------------------------------------------

# --- Rutas de Gesti車n de Usuarios (Alumnos) ---

@app.get("/students", response_model=List[UserReadSimple], tags=["Profesores"])
def get_all_students(
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):

    # ?? CR赤TICO: Filtrar SOLAMENTE a los alumnos
    statement = select(User).where(User.role == UserRole.STUDENT).order_by(User.nombre)
    students = session.exec(statement).all()
    return students


# --- Rutas de Gesti車n de Ejercicios ---

@app.post("/exercises", response_model=ExerciseRead, tags=["Profesores"])
def create_exercise(
    *, 
    session: Annotated[Session, Depends(get_session)], 
    exercise_create: ExerciseCreate,
    current_professor: Annotated[User, Depends(get_current_professor)]
):

    # Validaci車n b芍sica (e.g., que el nombre no est谷 duplicado, aunque no es CR赤TICO)
    existing_exercise = session.exec(select(Exercise).where(Exercise.nombre == exercise_create.nombre)).first()
    if existing_exercise:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un ejercicio con ese nombre."
        )

    exercise = Exercise.model_validate(exercise_create)
    session.add(exercise)
    session.commit()
    session.refresh(exercise)
    return exercise

@app.get("/exercises", response_model=List[ExerciseRead], tags=["Profesores", "Alumnos"])
def get_all_exercises(session: Annotated[Session, Depends(get_session)]):

    exercises = session.exec(select(Exercise).order_by(Exercise.nombre)).all()
    return exercises

@app.put("/exercises/{exercise_id}", response_model=ExerciseRead, tags=["Profesores"])
def update_exercise(
    exercise_id: int, 
    exercise_update: ExerciseUpdate, 
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):

    exercise = session.get(Exercise, exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado.")
    
    update_data = exercise_update.model_dump(exclude_none=True)
    exercise.sqlmodel_update(update_data)
    
    session.add(exercise)
    session.commit()
    session.refresh(exercise)
    return exercise


@app.delete("/exercises/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Profesores"])
def delete_exercise(
    exercise_id: int, 
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):

    exercise = session.get(Exercise, exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado.")
    
    session.delete(exercise)
    session.commit()
    return


# --- Rutas de Gesti車n de Rutinas ---

@app.post("/routines", response_model=RoutineRead, tags=["Profesores"])
def create_routine(
    *,
    session: Annotated[Session, Depends(get_session)],
    routine_data: RoutineCreate,
    current_professor: Annotated[User, Depends(get_current_professor)]
):

    
    # 1. Crear la Rutina principal
    # Usamos .copy() para evitar modificar el objeto Pydantic si es necesario.
    routine_dict = routine_data.model_dump(exclude={"exercises"})
    routine_db = Routine.model_validate(
        routine_dict, 
        update={"owner_id": current_professor.id, "created_at": datetime.now(timezone.utc)}
    )
    
    session.add(routine_db)
    session.commit()
    session.refresh(routine_db)

    # 2. Crear los enlaces de ejercicios (RoutineExercise)
    exercise_links = []
    for exercise_link_data in routine_data.exercises:
        # ?? CR赤TICO: Validaci車n de existencia del ejercicio
        exercise_exists = session.get(Exercise, exercise_link_data.exercise_id)
        if not exercise_exists:
            # Si el ejercicio no existe, se revierte la rutina y se lanza una excepci車n.
            session.delete(routine_db)
            session.commit()
            raise HTTPException(status_code=404, detail=f"Ejercicio con ID {exercise_link_data.exercise_id} no encontrado.")
            
        link = RoutineExercise(
            **exercise_link_data.model_dump(), 
            routine_id=routine_db.id
        )
        exercise_links.append(link)
        
    session.add_all(exercise_links)
    session.commit()
    session.refresh(routine_db)

    # 3. Cargar las relaciones anidadas para la respuesta
    statement = (
        select(Routine)
        .where(Routine.id == routine_db.id)
        .options(selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise))
    )
    
    # Debe ser el primero, ya que se acaba de crear
    routine_with_links = session.exec(statement).first() 

    if not routine_with_links:
        # Caso de fallo inesperado
        raise HTTPException(status_code=500, detail="Error al recuperar la rutina creada.")
        
    return routine_with_links

@app.get("/routines", response_model=List[RoutineRead], tags=["Profesores"])
def get_my_routines(
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):

    statement = (
        select(Routine)
        .where(Routine.owner_id == current_professor.id)
        .order_by(desc(Routine.created_at))
        .options(selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise))
    )
    
    routines = session.exec(statement).all()
    return routines

@app.get("/routines/{routine_id}", response_model=RoutineRead, tags=["Profesores", "Alumnos"])
def get_routine_by_id(
    routine_id: int,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)]
):

    # 1. Cargar la rutina con las relaciones
    statement = (
        select(Routine)
        .where(Routine.id == routine_id)
        .options(selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise))
    )
    routine = session.exec(statement).first()
    
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada.")

    # 2. Verificar permisos
    # El Profesor debe ser el due?o
    if current_user.role == UserRole.PROFESSOR and routine.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acceso denegado: Esta rutina no fue creada por este profesor.")
    
    # El Alumno no necesita tener permisos aqu赤, ya que el front de Alumno usa otra ruta.
    # Pero si llegara aqu赤, solo necesita que exista.
    
    return routine


@app.put("/routines/{routine_id}", response_model=RoutineRead, tags=["Profesores"])
def update_routine(
    routine_id: int,
    routine_data: RoutineCreateOrUpdate, # Usamos el esquema que permite reemplazar ejercicios
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):

    
    # 1. Obtener y validar la rutina
    routine = session.get(Routine, routine_id)
    
    if not routine or routine.owner_id != current_professor.id:
        raise HTTPException(status_code=404, detail="Rutina no encontrada o no pertenece al profesor.")

    # 2. Actualizar metadatos (nombre, descripci車n)
    update_data = routine_data.model_dump(exclude={"exercises"}, exclude_none=True)
    routine.sqlmodel_update(update_data)

    # 3. Eliminar los enlaces de ejercicios existentes (si se pas車 una nueva lista)
    if routine_data.exercises is not None:
        # Eliminar todos los RoutineExercise vinculados a esta rutina
        delete_statement = select(RoutineExercise).where(RoutineExercise.routine_id == routine_id)
        links_to_delete = session.exec(delete_statement).all()
        for link in links_to_delete:
            session.delete(link)
        
        # 4. Crear los nuevos enlaces de ejercicios
        new_exercise_links = []
        for exercise_link_data in routine_data.exercises:
            # ?? CR赤TICO: Validaci車n de existencia del ejercicio
            exercise_exists = session.get(Exercise, exercise_link_data.exercise_id)
            if not exercise_exists:
                # Si el ejercicio no existe, se lanza una excepci車n.
                session.rollback() # Asegurar que los metadatos no se guarden si falla el enlace.
                raise HTTPException(status_code=404, detail=f"Ejercicio con ID {exercise_link_data.exercise_id} no encontrado.")

            link = RoutineExercise(
                **exercise_link_data.model_dump(),
                routine_id=routine_id
            )
            new_exercise_links.append(link)
        
        session.add_all(new_exercise_links)

    # 5. Guardar todos los cambios y refrescar
    session.add(routine)
    session.commit()
    session.refresh(routine)

    # 6. Cargar la rutina con las nuevas relaciones para la respuesta
    statement = (
        select(Routine)
        .where(Routine.id == routine.id)
        .options(selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise))
    )
    routine_with_links = session.exec(statement).first()
    
    if not routine_with_links:
        raise HTTPException(status_code=500, detail="Error al recuperar la rutina actualizada.")

    return routine_with_links


@app.delete("/routines/{routine_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Profesores"])
def delete_routine(
    routine_id: int,
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):

    routine = session.get(Routine, routine_id)
    
    if not routine or routine.owner_id != current_professor.id:
        raise HTTPException(status_code=404, detail="Rutina no encontrada o no pertenece al profesor.")
    
    session.delete(routine)
    session.commit()
    return


# --- Rutas de Asignaci車n de Rutinas ---

@app.post("/assignments", response_model=RoutineAssignmentRead, tags=["Profesores"])
def create_routine_assignment(
    *, 
    session: Annotated[Session, Depends(get_session)],
    assignment_data: RoutineAssignmentCreate,
    current_professor: Annotated[User, Depends(get_current_professor)]
):

    
    # 1. Validar que la rutina exista y sea del profesor
    routine = session.get(Routine, assignment_data.routine_id)
    if not routine or routine.owner_id != current_professor.id:
        raise HTTPException(status_code=404, detail="Rutina no encontrada o no pertenece a este profesor.")

    # 2. Validar que el alumno exista
    student = session.get(User, assignment_data.student_id)
    if not student or student.role != UserRole.STUDENT:
        raise HTTPException(status_code=404, detail="Alumno no encontrado.")

    # 3. Si la nueva asignaci車n es activa, desactivar las anteriores del mismo alumno
    if assignment_data.is_active:
        # Buscar asignaciones activas anteriores para este alumno
        old_active_assignments = session.exec(
            select(RoutineAssignment)
            .where(
                RoutineAssignment.student_id == assignment_data.student_id,
                RoutineAssignment.is_active == True
            )
        ).all()
        
        # Desactivarlas
        for assignment in old_active_assignments:
            assignment.is_active = False
            session.add(assignment)

    # 4. Crear la nueva asignaci車n
    assignment = RoutineAssignment.model_validate(
        assignment_data, 
        update={
            "professor_id": current_professor.id, 
            "assigned_at": datetime.now(timezone.utc)
        }
    )
    
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    
    # 5. Cargar las relaciones para la respuesta
    statement = (
        select(RoutineAssignment)
        .where(RoutineAssignment.id == assignment.id)
        .options(selectinload(RoutineAssignment.routine).selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise))
        .options(selectinload(RoutineAssignment.student))
        .options(selectinload(RoutineAssignment.professor))
    )
    
    new_assignment = session.exec(statement).first()
    
    if not new_assignment:
        raise HTTPException(status_code=500, detail="Error al recuperar la asignacion creada.")
        
    return new_assignment


@app.get("/professor/assignments/student/{student_id}", response_model=List[RoutineAssignmentRead], tags=["Profesores"])
def get_student_assignments(
    student_id: int,
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):

    # 1. Validar que el alumno exista
    student = session.get(User, student_id)
    if not student or student.role != UserRole.STUDENT:
        raise HTTPException(status_code=404, detail="Alumno no encontrado.")

    # 2. Obtener las asignaciones
    statement = (
        select(RoutineAssignment)
        .where(RoutineAssignment.student_id == student_id)
        # ?? Ordenamos por fecha de asignaci車n descendente.
        .order_by(desc(RoutineAssignment.assigned_at)) 
        # Cargamos las relaciones anidadas
        .options(selectinload(RoutineAssignment.routine).selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise))
        .options(selectinload(RoutineAssignment.student))
        .options(selectinload(RoutineAssignment.professor))
    )
    
    assignments = session.exec(statement).all()
    return assignments

@app.patch("/assignments/{assignment_id}/active", status_code=status.HTTP_204_NO_CONTENT, tags=["Profesores"])
def toggle_assignment_active(
    assignment_id: int,
    is_active: bool,
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):

    assignment = session.get(RoutineAssignment, assignment_id)
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Asignacion no encontrada.")

    # 1. Si se intenta activar, desactivar la anterior del mismo alumno
    if is_active:
        old_active_assignments = session.exec(
            select(RoutineAssignment)
            .where(
                RoutineAssignment.student_id == assignment.student_id,
                RoutineAssignment.is_active == True
            )
        ).all()
        
        for old_assignment in old_active_assignments:
            if old_assignment.id != assignment_id:
                old_assignment.is_active = False
                session.add(old_assignment)

    # 2. Aplicar el nuevo estado
    assignment.is_active = is_active
    session.add(assignment)
    session.commit()
    return


@app.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Profesores"])
def delete_assignment(
    assignment_id: int,
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):

    assignment = session.get(RoutineAssignment, assignment_id)
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Asignacion no encontrada.")
        
    session.delete(assignment)
    session.commit()
    return


# --- Rutas del Alumno ---

@app.get("/students/me/routine", response_model=List[RoutineAssignmentRead], tags=["Alumnos"])
def get_my_active_routine(
    session: Annotated[Session, Depends(get_session)],
    current_student: Annotated[User, Depends(get_current_student)]
):

    statement = (
        select(RoutineAssignment)
        .where(
            RoutineAssignment.student_id == current_student.id,
            RoutineAssignment.is_active == True # ?? FILTRO CR赤TICO: Solo rutinas activas
        )
        # ?? Ordenamos por fecha de asignaci車n descendente.
        .order_by(desc(RoutineAssignment.assigned_at)) 
        # Cargamos las relaciones anidadas
        .options(selectinload(RoutineAssignment.routine).selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise))
        .options(selectinload(RoutineAssignment.student))
        .options(selectinload(RoutineAssignment.professor))
    )
    
    active_assignments = session.exec(statement).all()
    
    # Si no hay rutinas activas, devuelve una lista vac赤a.
    return active_assignments