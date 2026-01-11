import os
from datetime import datetime, timedelta, timezone, date # CRITICO: Importar 'date'
from typing import Annotated, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
# ¡IMPORTACIoN CRiTICA AnADIDA para CORS!
from fastapi.middleware.cors import CORSMiddleware 
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials 
from sqlmodel import Session, select
# Importamos selectinload para forzar la carga de relaciones anidadas
from sqlalchemy.orm import selectinload 
from sqlalchemy import desc 
from sqlalchemy import func # NECESARIO para usar func.lower() en validacion de email
from sqlalchemy import delete # <--- ¡IMPORTACIoN CRiTICA AnADIDA!

from passlib.context import CryptContext
from jose import JWTError, jwt
from dotenv import load_dotenv

# Importaciones de tu estructura y esquemas
from database import create_db_and_tables, get_session
from models import (
    User, UserCreate, UserRead, UserReadSimple, UserRole, UserLogin, Token,
    # Importaciones de EJERCICIOS
    Exercise, ExerciseCreate, ExerciseRead, ExerciseUpdate, MuscleGroup,
    Routine, RoutineCreate, RoutineRead, RoutineUpdate,
    RoutineExercise, RoutineAssignment, 
    RoutineAssignmentCreate, RoutineAssignmentRead,
    # Esquemas necesarios
    RoutineAssignmentUpdate, 
    ChangePassword,
    RoutineCreateOrUpdate, 
    # CRITICO: Importaciones de Grupo y Transaccional
    RoutineGroup, RoutineGroupCreate, RoutineGroupRead, RoutineGroupCreateAndRoutines,
    RoutineGroupUpdate, # <--- AnADIDO PARA EDICIoN DE GRUPO
    UserUpdateByProfessor,
    RoutineCreateForTransactional,
    # <--- AnADIDO: Esquema de reset publico --->
    UserPasswordResetPublic
)


load_dotenv()

# ----------------------------------------------------------------------
# Configuracion de Seguridad y JWT
# ----------------------------------------------------------------------
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
SECRET_KEY = os.environ.get("SECRET_KEY", "CLAVE_SECRETA_DEFAULT_DEBES_CAMBIARLA")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # Token de 1 dia

http_bearer = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(plain_password: str) -> str:
    return pwd_context.hash(plain_password)

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Usamos 'dni' como 'sub' (subject) en el token
    to_encode.update({"exp": expire, "sub": data["dni"]}) 
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# ----------------------------------------------------------------------
# Eventos de la Aplicacion (Startup/Shutdown)
# ----------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Crea todas las tablas al iniciar."""
    print("Iniciando la aplicacion y creando tablas de DB...")
    create_db_and_tables() 
    yield
    print("Apagando la aplicacion...")

# ----------------------------------------------------------------------
# Inicializacion de la Aplicacion Y CONFIGURACIoN CORS
# ----------------------------------------------------------------------

app = FastAPI(
    title="Gym Routine Manager API",
    version="1.0.0",
    lifespan=lifespan
)

# ----------------------------------------------------
# Bloque AnADIDO: Configuracion CORS
# ----------------------------------------------------
# 1. Definir los Origenes Permitidos (CORS)
origins = [
    # **CRiTICO PARA EL PREVIEW:** Permite el origen "null" (usado por entornos embebidos)
    "null", 
    # **IMPORTANTE:** Permitimos cualquier origen por ahora para asegurar la conectividad
    # hasta que publiques tu frontend en un dominio fijo.
    "*", 
    # Tu dominio de Render (Aunque con '*' ya estaria cubierto)
    "https://gym-app-backend-e9bn.onrender.com",
    "http://localhost",
    "http://localhost:3000",
]

# 2. Aplicar el Middleware a la aplicacion
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # Lista de dominios permitidos
    allow_credentials=True,         # Permite cookies/tokens
    allow_methods=["*"],            # Permite todos los metodos (GET, POST, etc.)
    allow_headers=["*"],            # Permite todos los encabezados (incluyendo Authorization)
)
# ----------------------------------------------------


# ----------------------------------------------------------------------
# Dependencias de Autenticacion y Autorizacion
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
        # El DNI esta en el campo 'sub'
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

def get_current_student(current_user: Annotated[User, Depends(get_current_student)]) -> User:
    """Dependencia que verifica si el usuario actual es un Alumno."""
    if current_user.rol != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de Alumno para acceder a este recurso."
        )
    return current_user

# ----------------------------------------------------------------------
# Rutas Publicas (Health Check y Autenticacion)
# ----------------------------------------------------------------------

@app.get("/", tags=["General"])
def read_root():
    """Endpoint de bienvenida y verificacion de salud de la API."""
    return {"message": "API del Gestor de Rutinas de Gimnasio activa."}

# NUEVA RUTA: Registro solo de Alumnos
@app.post(
    # response_model ahora es una LISTA de UserRead
    "/register/student", 
    response_model=List[UserRead], 
    status_code=status.HTTP_201_CREATED, 
    tags=["Autenticacion"]
)
def register_student(
    # user_data ahora espera una LISTA de objetos UserCreate
    user_data: List[UserCreate], 
    session: Annotated[Session, Depends(get_session)]
):
    """Permite el registro de uno o mas usuarios con rol forzado a Alumno."""
    
    # ----------------------------------------------------------------------
    # LISTA PARA ALMACENAR LOS USUARIOS CREADOS
    # ----------------------------------------------------------------------
    created_users = []
    
    # BUCLE PARA PROCESAR CADA USUARIO DE LA LISTA
    for single_user_data in user_data:
        
        # 1. Verificar si DNI ya existe
        existing_dni = session.exec(select(User).where(User.dni == single_user_data.dni)).first()
        if existing_dni:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El DNI ya esta registrado."
            )
        
        # 2. Verificar si Email ya existe
        existing_email = session.exec(select(User).where(User.email == single_user_data.email)).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya esta registrado."
            )

        # NOTA: Se asume que el backend maneja el limite de 72 bytes para el password hash
        hashed_password = get_password_hash(single_user_data.password)
        new_user = User(
            email=single_user_data.email,
            dni=single_user_data.dni, # Almacenar DNI
            password_hash=hashed_password,
            nombre=single_user_data.nombre,
            rol=UserRole.STUDENT # Forzar rol a Alumno
        )
        
        session.add(new_user)
        created_users.append(new_user) # Almacenamos el nuevo usuario para la respuesta de lista
        
    # ----------------------------------------------------------------------
    # COMMIT Y REFRESH (Se realiza una unica vez para toda la transaccion)
    # ----------------------------------------------------------------------
    session.commit()
    
    # Refrescar los usuarios creados y devolver la lista
    for user in created_users:
        session.refresh(user)
        
    # AJUSTE OBLIGATORIO: Ya que el endpoint ahora acepta y procesa una lista,
    # debe devolver una lista para satisfacer el contrato (response_model=List[UserRead]).
    # De lo contrario, FastAPI fallara al intentar convertir un solo objeto a una lista.
    return created_users

@app.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED, tags=["Autenticacion"])
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
            detail="El DNI ya esta registrado."
        )
    
    # 2. Verificar si Email ya existe
    existing_user = session.exec(select(User).where(User.email == user_data.email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya esta registrado."
        )

    # NOTA: Se asume que el backend maneja el limite de 72 bytes para el password hash
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

@app.post("/login", response_model=Token, tags=["Autenticacion"])
def login_for_access_token(
    form_data: UserLogin, # form_data tiene .dni y .password
    session: Annotated[Session, Depends(get_session)]
):
    """Verifica credenciales (Email/DNI y Password) y devuelve un JWT para la sesion."""
    
    # Busqueda por EMAIL (asumiendo que el campo 'dni' en el payload del frontend es el Email)
    user = session.exec(select(User).where(User.email == form_data.dni)).first()
    
    # Si la busqueda por email falla, intentar por DNI (fallback)
    if not user:
        user = session.exec(select(User).where(User.dni == form_data.dni)).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="DNI o contrasena incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    # CORRECCION CLAVE: Incluimos el nombre del usuario en el token.
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
    """Obtiene la informacion del usuario actualmente autenticado."""
    return current_user

# RUTA: CAMBIO DE CONTRASEnA
@app.post("/users/change-password", tags=["Usuarios"])
def change_password(
    password_data: ChangePassword, # Usamos el nuevo esquema ChangePassword
    session: Annotated[Session, Depends(get_session)],
    # Permite a profesores y alumnos cambiar su contrasena
    current_user: Annotated[User, Depends(get_current_user)]
):
    """
    Permite a un usuario (Profesor o Alumno) cambiar su contrasena.
    Requiere la contrasena antigua para la verificacion.
    """
    
    # 1. Verificar la contrasena antigua
    if not verify_password(password_data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contrasena antigua incorrecta."
        )

    # 2. Verificar la longitud de la nueva contrasena (buena practica)
    if len(password_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contrasena debe tener al menos 6 caracteres."
        )

    # 3. Generar el nuevo hash y actualizar el usuario
    new_hashed_password = get_password_hash(password_data.new_password)
    current_user.password_hash = new_hashed_password
    
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    return {"message": "Contrasena actualizada exitosamente."}


@app.get("/users/students", response_model=List[UserReadSimple], tags=["Usuarios"])
def read_students_list(
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """Obtiene una lista de todos los usuarios con rol 'Alumno' (para asignar rutinas)."""
    students = session.exec(select(User).where(User.rol == UserRole.STUDENT)).all()
    return students

# RUTA ACTUALIZADA: Actualizar Datos del Alumno por el Profesor (CON RESET DE CLAVE)
@app.patch("/users/student/{student_id}", response_model=UserRead, tags=["Usuarios"])
def update_student_data(
    student_id: int,
    user_data: UserUpdateByProfessor, 
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """(Profesor) Permite actualizar el nombre, email o DNI de un alumno especifico, o resetear su clave."""
    
    # 1. Buscar al alumno
    student_to_update = session.get(User, student_id)
    
    if not student_to_update or student_to_update.rol != UserRole.STUDENT:
        raise HTTPException(status_code=404, detail="Alumno no encontrado.")
        
    # 2. Convertir el esquema a diccionario, excluyendo campos no seteados (omitidos)
    update_data = user_data.model_dump(exclude_unset=True)
    
    # 3. Aplicar los cambios al objeto de la DB
    for key, value in update_data.items():
        # --- Logica de Reset de Password (AnADIDO) ---
        if key == 'password' and value:
            student_to_update.password_hash = get_password_hash(value)
            continue
        # ---------------------------------------------

        # Validar si el DNI o Email ya existen en OTRO usuario
        if key == 'email' and value is not None and value.lower() != student_to_update.email.lower():
            existing_user = session.exec(select(User).where(func.lower(User.email) == value.lower())).first()
            if existing_user and existing_user.id != student_to_update.id: # Aseguramos que no sea el mismo
                raise HTTPException(status_code=400, detail="El nuevo email ya esta en uso por otro usuario.")
        
        if key == 'dni' and value is not None and value != student_to_update.dni:
            existing_user = session.exec(select(User).where(User.dni == value)).first()
            if existing_user and existing_user.id != student_to_update.id: # Aseguramos que no sea el mismo
                raise HTTPException(status_code=400, detail="El nuevo DNI ya esta en uso por otro usuario.")
                
        setattr(student_to_update, key, value)
        
    # 4. Guardar los cambios
    session.add(student_to_update)
    session.commit()
    session.refresh(student_to_update)
    
    return student_to_update

# <--- NUEVO ENDPOINT: RECUPERACIoN PuBLICA PARA ALUMNOS (Identificacion por DNI) --->
@app.patch("/users/student/reset-password/{dni}", response_model=UserRead, tags=["Usuarios"])
def public_reset_password_by_dni(
    dni: str,
    reset_data: UserPasswordResetPublic,
    session: Annotated[Session, Depends(get_session)]
):
    """(Publico) Permite a un alumno resetear su contrasena identificandose unicamente por DNI."""
    # Buscamos al usuario por su DNI string
    user = session.exec(select(User).where(User.dni == dni)).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="El DNI ingresado no corresponde a ningun usuario.")
    
    # Hasheamos la nueva contrasena y actualizamos
    user.password_hash = get_password_hash(reset_data.password)
    
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

# ----------------------------------------------------------------------
# Rutas de Ejercicios (CRUD - RESTAURADAS)
# ----------------------------------------------------------------------

@app.post("/exercises/", response_model=List[ExerciseRead], status_code=status.HTTP_201_CREATED, tags=["Ejercicios"])
def create_exercise_batch(
    exercises: List[ExerciseCreate],
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """Crea multiples ejercicios a la vez. Solo accesible para Profesores."""
    
    created_exercises = []
    for exercise_data in exercises:
        # Prevencion de duplicados basada en el nombre
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
# RUTA TRANSACCIONAL DE CREACION DE GRUPO Y RUTINAS (CORREGIDA PARA USAR PAYLOAD DEL FRONTEND)
# ----------------------------------------------------------------------

@app.post("/routines-group/create-transactional", response_model=List[RoutineAssignmentRead], tags=["Rutinas"])
def create_routine_group_and_routines(
    data: RoutineGroupCreateAndRoutines,
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """
    (Profesor) Crea un nuevo grupo de rutinas, crea las N rutinas individuales
    enviadas por el frontend (con ejercicios), y asigna CADA UNA al alumno.
    """
    try:
        # 1. Validar Alumno y Rutinas
        student = session.get(User, data.student_id)
        if not student or student.rol != UserRole.STUDENT:
            raise HTTPException(status_code=404, detail="Alumno no encontrado o rol incorrecto para la asignacion.")

        if not data.routines or len(data.routines) == 0:
            raise HTTPException(status_code=400, detail="Debe enviar al menos una rutina para crear.")
            
        # 2. Crear el Grupo de Rutinas (RoutineGroup)
        routine_group = RoutineGroup(
            nombre=data.nombre,
            fecha_vencimiento=data.fecha_vencimiento, 
            professor_id=current_professor.id
        )
        session.add(routine_group)
        session.flush() # Flush 1: Obtiene ID del grupo

        # 3. Crear las Rutinas individuales, asociarlas al grupo y asignarlas
        created_assignment_ids = []
        is_first_routine = True # Para marcar solo la primera asignacion como activa
        
        for routine_data in data.routines: # Itera sobre la lista de rutinas enviada por el frontend
            
            # 3a. Crear el modelo de Rutina
            routine_model = Routine(
                nombre=routine_data.nombre,
                descripcion=routine_data.descripcion,
                owner_id=current_professor.id,
                routine_group_id=routine_group.id # ASOCIAR AL GRUPO
            )
            session.add(routine_model)
            session.flush() # Flush 2: Obtiene ID de la rutina
            
            # 3b. Crear los enlaces de ejercicios (RoutineExercise)
            for index, exercise_link_data in enumerate(routine_data.exercises):
                exercise = session.get(Exercise, exercise_link_data.exercise_id)
                if not exercise:
                    session.rollback() 
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Ejercicio con id {exercise_link_data.exercise_id} no encontrado en la rutina '{routine_model.nombre}'. Creacion cancelada."
                    )
                    
                link = RoutineExercise(
                    routine_id=routine_model.id, 
                    exercise_id=exercise.id,
                    sets=exercise_link_data.sets,
                    repetitions=exercise_link_data.repetitions,
                    peso=exercise_link_data.peso, 
                    notas=exercise_link_data.notas, # <--- AnADIDO: Campo Notas
                    order=index + 1 # Usar el indice para el orden, asegurando que sea un entero
                )
                session.add(link)

            # 3c. Crear la asignacion
            assignment = RoutineAssignment(
                routine_id=routine_model.id,
                student_id=data.student_id,
                professor_id=current_professor.id,
                is_active=is_first_routine # Solo la primera rutina del grupo es activa
            )
            session.add(assignment)
            session.flush() # Flush 3: Obtiene ID de la asignacion

            created_assignment_ids.append(assignment.id) 
            is_first_routine = False # El resto de las asignaciones son inactivas por defecto

        # 4. COMMIT UNICO
        session.commit()

        # 5. Fetch todas las asignaciones recien creadas con las relaciones anidadas (codigo de lectura existente)
        statement_read = (
            select(RoutineAssignment)
            .where(RoutineAssignment.id.in_(created_assignment_ids))
            .options(
                selectinload(RoutineAssignment.routine)
                    .selectinload(Routine.routine_group),
                selectinload(RoutineAssignment.routine)
                    .selectinload(Routine.exercise_links)
                    .selectinload(RoutineExercise.exercise),
                selectinload(RoutineAssignment.student),
                selectinload(RoutineAssignment.professor)
            )
        )
        
        final_assignments = session.exec(statement_read).all()
        return final_assignments

    except HTTPException:
        # Re-lanza HTTPExceptions para que FastAPI las maneje correctamente
        session.rollback() 
        raise
    except Exception as e:
        session.rollback() 
        print(f"ERROR: Fallo transaccional al crear grupo de rutinas: {e}")
        # Muestra el error real para depuracion
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error transaccional al crear grupo: {str(e)}"
        )


# ----------------------------------------------------------------------
# Rutas de Rutinas (CRUD - Continuacion)
# ----------------------------------------------------------------------

@app.post("/routines/", response_model=RoutineRead, status_code=status.HTTP_201_CREATED, tags=["Rutinas"])
def create_routine(
    routine_data: RoutineCreate,
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """Crea una nueva rutina (plantilla) y la asocia con ejercicios."""
    
    # NOTA: Esta ruta no se utiliza con el nuevo flujo de creacion agrupada. 
    # Mantenemos la logica de asignacion que estaba para rutinas individuales.
    
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
                detail=f"Ejercicio con id {exercise_link_data.exercise_id} no encontrado. Creacion cancelada."
            )
            
        link = RoutineExercise(
            routine_id=db_routine.id, 
            exercise_id=exercise.id,
            sets=exercise_link_data.sets,
            repetitions=exercise_link_data.repetitions,
            peso=exercise_link_data.peso, # AGREGADO: Campo peso
            notas=exercise_link_data.notas, # <--- AnADIDO: Campo Notas
            order=exercise_link_data.order
        )
        session.add(link)

    # 3. Commit final para los enlaces
    try:
        session.commit()
        # Recargamos la rutina con las relaciones anidadas (Incluyendo el grupo si existe)
        statement = (
            select(Routine)
            .where(Routine.id == db_routine.id)
            .options(
                selectinload(Routine.routine_group),
                selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise) 
            )
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
        # CORRECCION/MEJORA: Forzamos la carga de relaciones anidadas (links + detalles del ejercicio + grupo)
        statement = (
            select(Routine)
            .where(Routine.owner_id == current_professor.id)
            .options(
                selectinload(Routine.routine_group),
                selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise) 
            )
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
    """Obtiene una rutina especifica por su ID, incluyendo todos sus ejercicios."""
    # CORRECCION/MEJORA: Forzamos la carga de relaciones anidadas (links + detalles del ejercicio + grupo)
    statement = (
        select(Routine)
        .where(Routine.id == routine_id)
        .options(
            selectinload(Routine.routine_group), # Cargar el grupo
            selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise)
        )
    )
    routine = session.exec(statement).first()
    
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    
    return routine

# RUTA CRITICA CORREGIDA: PATCH para cambiar el estado de activacion de una asignacion
@app.patch("/assignments/{assignment_id}", response_model=RoutineAssignmentRead, tags=["Asignaciones"])
def set_assignment_active_status(
    assignment_id: int,
    assignment_update: RoutineAssignmentUpdate, # Ahora recibe el modelo Pydantic del cuerpo JSON
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """(Profesor) Permite actualizar el estado (is_active) de una asignacion."""
    assignment = session.get(RoutineAssignment, assignment_id)
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Asignacion no encontrada.")

    # MODIFICACIoN: Eliminada validacion de propiedad para permitir edicion cruzada entre profesores
    # if assignment.professor_id != current_professor.id:
    #     raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta asignacion.")
        
    # Aplicar solo la actualizacion de is_active
    update_data = assignment_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(assignment, key, value)
    
    session.add(assignment)
    
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        print(f"ERROR DB PATCH ASIGNACION: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Fallo al confirmar el cambio de estado en la base de datos."
        )

    # CORRECCION CLAVE: Recargar la asignacion con todas las relaciones anidadas
    statement_read = (
        select(RoutineAssignment)
        .where(RoutineAssignment.id == assignment_id)
        .options(
            selectinload(RoutineAssignment.routine)
                .selectinload(Routine.routine_group),
            selectinload(RoutineAssignment.routine)
                .selectinload(Routine.exercise_links)
                .selectinload(RoutineExercise.exercise),
            selectinload(RoutineAssignment.student),
            selectinload(RoutineAssignment.professor)
        )
    )
    updated_assignment = session.exec(statement_read).first()

    if not updated_assignment:
          raise HTTPException(status_code=500, detail="Error interno: No se pudo recargar la asignacion actualizada.")
          
    return updated_assignment
    
# --- Ruta para eliminar un grupo de asignaciones para un alumno especifico ---
@app.delete("/assignments/group/{routine_group_id}/student/{student_id}", tags=["Profesor"])
def delete_assignment_group_for_student(
    routine_group_id: int,
    student_id: int,
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """(Profesor) Elimina todas las asignaciones de rutina de un RoutineGroup ID especifico para un ALUMNO especifico."""
    
    # 1. Encontrar todas las rutinas vinculadas a ese grupo
    routine_statement = select(Routine).where(Routine.routine_group_id == routine_group_id)
    routines = session.exec(routine_statement).all()
    
    if not routines:
        # Esto no deberia ocurrir si el frontend esta bien, pero es una proteccion
        raise HTTPException(status_code=404, detail="No hay rutinas vinculadas a este grupo.")

    routine_ids = [r.id for r in routines]

    # 2. Encontrar y eliminar las asignaciones especificas para este alumno y estas rutinas
    # MODIFICACIoN: Quitamos el filtro de professor_id para permitir que cualquier profesor borre el grupo
    assignment_statement = select(RoutineAssignment).where(
        RoutineAssignment.routine_id.in_(routine_ids),
        RoutineAssignment.student_id == student_id
        # RoutineAssignment.professor_id == current_professor.id # <--- Eliminado
    )
    assignments_to_delete = session.exec(assignment_statement).all()

    if not assignments_to_delete:
        raise HTTPException(status_code=404, detail="No se encontraron asignaciones para este grupo en el alumno.")

    # 3. Eliminar las asignaciones
    for assignment in assignments_to_delete:
        session.delete(assignment)
        
    session.commit()
    
    return {"message": f"Se eliminaron {len(assignments_to_delete)} asignaciones de grupo para el alumno."}

# <--- AnADIDO: RUTA PARA ACTUALIZAR METADATOS DEL GRUPO (PLAN) --->
@app.patch("/routines-group/{group_id}", response_model=RoutineGroupRead, tags=["Rutinas"])
def update_routine_group_metadata(
    group_id: int,
    group_data: RoutineGroupUpdate,
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """(Profesor) Actualiza el nombre y/o la fecha de vencimiento de un plan (grupo)."""
    db_group = session.get(RoutineGroup, group_id)
    if not db_group:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    # MODIFICACIoN: Eliminada validacion de propiedad para permitir edicion cruzada
    # if db_group.professor_id != current_professor.id:
    #     raise HTTPException(status_code=403, detail="No tienes permiso para modificar este grupo")

    update_dict = group_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(db_group, key, value)
    
    session.add(db_group)
    session.commit()
    session.refresh(db_group)
    return db_group

# RUTA ACTUALIZADA: EDICION COMPLETA (Metadata y Ejercicios)
@app.patch("/routines/{routine_id}", response_model=RoutineRead, tags=["Rutinas"])
def update_routine_full(
    routine_id: int,
    routine_data: RoutineCreateOrUpdate, # Usamos el esquema de actualizacion completa
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """Actualiza completamente una rutina maestra (nombre, descripcion y REEMPLAZA la lista de ejercicios)."""
    db_routine = session.get(Routine, routine_id)
    if not db_routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
        
    # MODIFICACIoN: Eliminada validacion de propiedad para permitir edicion cruzada
    # if db_routine.owner_id != current_professor.id:
    #     raise HTTPException(status_code=403, detail="No autorizado para editar esta rutina")

    # 1. Actualizar metadata (Nombre/Descripcion)
    db_routine.nombre = routine_data.nombre
    db_routine.descripcion = routine_data.descripcion
    
    # 2. Eliminar todos los enlaces de ejercicios existentes para reemplazarlos
    # CORRECCIoN CLAVE: Usamos la funcion delete() de SQLAlchemy
    session.exec(delete(RoutineExercise).where(RoutineExercise.routine_id == routine_id))
    
    # 3. Crear los nuevos enlaces
    for exercise_link_data in routine_data.exercises:
        exercise = session.get(Exercise, exercise_link_data.exercise_id)
        if not exercise:
            session.rollback() 
            raise HTTPException(
                status_code=404, 
                detail=f"Ejercicio con id {exercise_link_data.exercise_id} no encontrado. Edicion cancelada."
            )
            
        link = RoutineExercise(
            routine_id=db_routine.id, 
            exercise_id=exercise.id,
            sets=exercise_link_data.sets,
            repetitions=exercise_link_data.repetitions,
            peso=exercise_link_data.peso, # AGREGADO: Campo peso
            notas=exercise_link_data.notas, # <--- AnADIDO: Campo Notas
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
            .options(
                selectinload(Routine.routine_group), # Cargar el grupo
                selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise)
            )
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
    """Elimina una rutina maestra. Esto tambien eliminara los enlaces en RoutineExercise y asignaciones."""
    db_routine = session.get(Routine, routine_id)
    if not db_routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    
    # MODIFICACIoN: Eliminada validacion de propiedad para permitir eliminacion cruzada
    # if db_routine.owner_id != current_professor.id:
    #     raise HTTPException(status_code=403, detail="No autorizado para eliminar esta rutina")

    # Eliminamos enlaces y asignaciones antes de eliminar la rutina (CRITICO para evitar errores de Foreign Key)
    # CORRECCIoN: Usamos la funcion delete() de SQLAlchemy
    session.exec(delete(RoutineExercise).where(RoutineExercise.routine_id == routine_id))
    session.exec(delete(RoutineAssignment).where(RoutineAssignment.routine_id == routine_id))
        
    session.delete(db_routine)
    session.commit()
    return

# ----------------------------------------------------------------------
# Rutas de Asignacion (Profesor y Alumno)
# ----------------------------------------------------------------------

# --- Rutas del Profesor ---

@app.post("/assignments/", response_model=RoutineAssignmentRead, tags=["Asignaciones"])
def assign_routine_to_student(
    assignment_data: RoutineAssignmentCreate,
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """(Profesor) Asigna una rutina a un alumno. Permite multiples asignaciones (no desactiva las antiguas)."""
    
    # 1. Verificar que la rutina exista
    routine = session.get(Routine, assignment_data.routine_id)
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
        
    # 2. Verificar que el alumno exista
    student = session.get(User, assignment_data.student_id)
    if not student or student.rol != UserRole.STUDENT:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
        
    # 3. Crear la nueva asignacion
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
        print(f"ERROR DB ASIGNACION: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Fallo al guardar la asignacion en DB. {e}"
        )
        
    return db_assignment

# ----------------------------------------------------------------------
# RUTA DE LECTURA DE ASIGNACIONES (Filtro por profesor actual)
# ----------------------------------------------------------------------

@app.get("/professor/assignments/student/{student_id}", response_model=List[RoutineAssignmentRead], tags=["Asignaciones"])
def get_assignments_for_student_by_professor(
    student_id: int, 
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    """
    (Profesor) Obtiene asignaciones historicas del alumno CREADAS POR EL PROFESOR ACTUAL. 
    """
    # 1. Verificar que el alumno exista
    student = session.get(User, student_id)
    if not student or student.rol != UserRole.STUDENT:
        raise HTTPException(status_code=404, detail="Alumno no encontrado.")
        
    # 2. Fetch asignaciones filtradas por profesor
    statement = (
        select(RoutineAssignment)
        .where(
            RoutineAssignment.student_id == student_id,
            RoutineAssignment.professor_id == current_professor.id 
        )
        .order_by(desc(RoutineAssignment.assigned_at)) 
        .options(
            selectinload(RoutineAssignment.routine).selectinload(Routine.routine_group),
            selectinload(RoutineAssignment.routine).selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise),
            selectinload(RoutineAssignment.student),
            selectinload(RoutineAssignment.professor)
        )
    )
    all_assignments = session.exec(statement).all()
    return all_assignments

# ----------------------------------------------------------------------
# NUEVO: RUTA DE LECTURA GLOBAL (Sin filtro por profesor)
# ----------------------------------------------------------------------

@app.get("/professor/assignments/student/{student_id}/global", response_model=List[RoutineAssignmentRead], tags=["Asignaciones"])
def get_global_assignments_for_student(
    student_id: int, 
    session: Annotated[Session, Depends(get_session)],
    current_professor: Annotated[User, Depends(get_current_professor)]
):
    # 1. Verificar que el alumno exista
    student = session.get(User, student_id)
    if not student or student.rol != UserRole.STUDENT:
        raise HTTPException(status_code=404, detail="Alumno no encontrado.")
        
    # 2. Fetch todas las asignaciones (Quitamos el filtro de professor_id)
    statement = (
        select(RoutineAssignment)
        .where(RoutineAssignment.student_id == student_id)
        .order_by(desc(RoutineAssignment.assigned_at)) 
        .options(
            selectinload(RoutineAssignment.routine).selectinload(Routine.routine_group),
            selectinload(RoutineAssignment.routine).selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise),
            selectinload(RoutineAssignment.student),
            selectinload(RoutineAssignment.professor)
        )
    )
    all_assignments = session.exec(statement).all()
    
    if not all_assignments:
        return []
    
    # Lógica de agrupamiento para visualización coherente del plan actual
    active_anchor_assignment = next((a for a in all_assignments if a.is_active), None)

    if active_anchor_assignment and active_anchor_assignment.routine.routine_group_id:
        routine_group_id = active_anchor_assignment.routine.routine_group_id
        
        routine_statement = (
            select(Routine)
            .where(Routine.routine_group_id == routine_group_id)
            .order_by(Routine.id)
            .options(
                selectinload(Routine.routine_group),
                selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise)
            )
        )
        grouped_routines = session.exec(routine_statement).all()
        
        active_group_assignments = []
        active_group_routine_ids = {r.id for r in grouped_routines}
        
        for routine in grouped_routines:
            real_assignment = next((a for a in all_assignments if a.routine_id == routine.id), None)
            assignment_id_to_use = real_assignment.id if real_assignment else active_anchor_assignment.id
            
            pseudo_assignment_data = RoutineAssignmentRead(
                id=assignment_id_to_use, 
                routine_id=routine.id,
                student_id=active_anchor_assignment.student_id,
                professor_id=active_anchor_assignment.professor_id,
                assigned_at=active_anchor_assignment.assigned_at,
                is_active=real_assignment.is_active if real_assignment else True,
                routine=routine,
                student=active_anchor_assignment.student,
                professor=active_anchor_assignment.professor
            )
            active_group_assignments.append(pseudo_assignment_data)

        historical_assignments = [
            a for a in all_assignments 
            if a.routine_id not in active_group_routine_ids
        ]
        
        return active_group_assignments + historical_assignments
        
    return all_assignments

# --- Rutas del Alumno (Continuacion) ---

@app.get("/students/me/routine", response_model=List[RoutineAssignmentRead], tags=["Alumnos"])
def get_my_active_routine(
    session: Annotated[Session, Depends(get_session)],
    current_student: Annotated[User, Depends(get_current_student)]
):
    # 1. Buscar la asignacion activa (el "ancla")
    statement = (
        select(RoutineAssignment)
        .where(
            RoutineAssignment.student_id == current_student.id,
            RoutineAssignment.is_active == True 
        )
        .order_by(desc(RoutineAssignment.assigned_at)) 
        .options(
            # FIX LoGICO: Cargar la Rutina y su Grupo (CRiTICO) 
            selectinload(RoutineAssignment.routine)
                .selectinload(Routine.routine_group),
            selectinload(RoutineAssignment.routine)
                .selectinload(Routine.exercise_links)
                .selectinload(RoutineExercise.exercise),
            selectinload(RoutineAssignment.student),
            selectinload(RoutineAssignment.professor)
        )
    )
    # Solo necesitamos la mas reciente
    active_anchor_assignment = session.exec(statement).first()
    
    if not active_anchor_assignment:
        return []
        
    # 2. Verificar si pertenece a un grupo
    if active_anchor_assignment.routine.routine_group_id:
        routine_group_id = active_anchor_assignment.routine.routine_group_id
        
        # 3. Traer TODAS las rutinas de ese grupo (Dia 1, Dia 2, etc.)
        routine_statement = (
            select(Routine)
            .where(Routine.routine_group_id == routine_group_id)
            .order_by(Routine.id) 
            .options(
                selectinload(Routine.routine_group),
                selectinload(Routine.exercise_links).selectinload(RoutineExercise.exercise)
            )
        )
        grouped_routines = session.exec(routine_statement).all()
        
        # 4. Obtener las asignaciones reales para cada rutina del grupo
        routine_ids = [r.id for r in grouped_routines]
        real_assignments_statement = (
            select(RoutineAssignment)
            .where(RoutineAssignment.routine_id.in_(routine_ids))
        )
        real_assignments = session.exec(real_assignments_statement).all()
        real_assignments_map = {a.routine_id: a for a in real_assignments}

        # 5. Crear "pseudo-asignaciones" para devolver todas las rutinas del grupo
        expanded_assignments = []
        for routine in grouped_routines:
            
            real_assignment = real_assignments_map.get(routine.id)
            
            # Usamos los datos de la asignacion real o del ancla como fallback
            assignment_id_to_use = real_assignment.id if real_assignment else active_anchor_assignment.id
            is_active_status = real_assignment.is_active if real_assignment else True

            # Creamos un objeto RoutineAssignmentRead para cada rutina en el grupo
            pseudo_assignment_data = RoutineAssignmentRead(
                id=assignment_id_to_use,
                routine_id=routine.id,
                student_id=active_anchor_assignment.student_id,
                professor_id=active_anchor_assignment.professor_id,
                assigned_at=active_anchor_assignment.assigned_at,
                is_active=True, # Usamos TRUE para que el cliente sepa que esta rutina pertenece al grupo activo.
                routine=routine,
                student=active_anchor_assignment.student,
                professor=active_anchor_assignment.professor
            )
            expanded_assignments.append(pseudo_assignment_data)
            
        return expanded_assignments
        
    # 5. Si no hay grupo (rutina simple antigua), devuelve la asignacion original
    return [active_anchor_assignment]