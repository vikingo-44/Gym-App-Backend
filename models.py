from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
# AGREGADO: Importamos date para la fecha de vencimiento
from datetime import datetime, timezone, date 
from enum import Enum
from pydantic import BaseModel # Necesario para los Schemas de lectura

# ----------------------------------------------------------------------
# Enums
# ----------------------------------------------------------------------

class UserRole(str, Enum):
    """Define los roles posibles para un usuario."""
    PROFESSOR = "Profesor"
    STUDENT = "Alumno"

class MuscleGroup(str, Enum):
    """Define los grupos musculares principales para los ejercicios."""
    PECTORAL = "Pectoral"
    ESPALDA = "Espalda"
    PIERNAS = "Piernas"
    HOMBRO = "Hombro"
    BRAZOS = "Brazos"
    ABDOMEN = "Abdomen" # CORREGIDO/CONFIRMADO
    GLUTEOS = "Gluteos" # NUEVA INCORPORACIÓN
    CARDIO = "Cardio"

# ----------------------------------------------------------------------
# Modelos de Base de Datos (Tablas)
# ----------------------------------------------------------------------

# --- TABLA DE ENLACE (Rutina <-> Ejercicio) ---
class RoutineExercise(SQLModel, table=True):
    """Tabla de enlace Muchos-a-Muchos entre Rutinas y Ejercicios."""
    __tablename__ = "ROUTINE_EXERCISES"
    
    # CRITICO: ID autoincremental para evitar NotNullViolation
    id: Optional[int] = Field(default=None, primary_key=True)
    routine_id: int = Field(foreign_key="ROUTINES.id", index=True)
    exercise_id: int = Field(foreign_key="EXERCISES.id", index=True)
    
    sets: int
    repetitions: str
    # NUEVO CAMPO: Almacena el peso o tipo de resistencia 
    peso: str = Field(default="N/A", max_length=50) 
    order: int
    
    routine: "Routine" = Relationship(back_populates="exercise_links")
    exercise: "Exercise" = Relationship(back_populates="routine_links")

# --- TABLA DE ASIGNACION (Alumno <-> Rutina) ---
class RoutineAssignment(SQLModel, table=True):
    """Tabla de asignacion. Conecta a un Alumno (User) con una Rutina (Routine) y almacena quien la asigno (Profesor) y cuando."""
    __tablename__ = "ROUTINE_ASSIGNMENTS"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # --- Relaciones (Claves Foraneas) ---
    student_id: int = Field(foreign_key="USERS.id", index=True)
    routine_id: int = Field(foreign_key="ROUTINES.id", index=True)
    professor_id: int = Field(foreign_key="USERS.id", index=True) # El profesor que la asigno
    
    # --- Datos de la Asignacion ---
    assigned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    is_active: bool = Field(default=True) # Para activar/desactivar rutinas

    # --- Objetos de Relacion ---
    student: "User" = Relationship(
        back_populates="assignments_as_student",
        sa_relationship_kwargs={"foreign_keys": "[RoutineAssignment.student_id]"}
    )
    routine: "Routine" = Relationship(back_populates="assignments")
    professor: "User" = Relationship(
        back_populates="assignments_as_professor",
        sa_relationship_kwargs={"foreign_keys": "[RoutineAssignment.professor_id]"}
    )


# --- TABLA DE AGRUPACION DE RUTINAS (ROUTINES_GROUP) ---
class RoutineGroup(SQLModel, table=True):
    __tablename__ = "ROUTINES_GROUP"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(index=True, max_length=100)
    # ELIMINA: descripcion: Optional[str] = Field(default=None, max_length=500) 
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    fecha_vencimiento: Optional[date] 
    professor_id: int = Field(foreign_key="USERS.id")
    
    routines: List["Routine"] = Relationship(back_populates="routine_group")
    professor: "User" = Relationship(back_populates="routine_groups")


# --- TABLA DE USUARIOS ---
class User(SQLModel, table=True):
    """Representa la tabla 'USERS'."""
    __tablename__ = "USERS" 

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True, max_length=100)
    
    dni: str = Field(index=True, unique=True, max_length=50) # DNI para Login
    
    password_hash: str = Field(max_length=255)
    nombre: str = Field(max_length=100)
    rol: UserRole
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    
    # --- Relaciones del Usuario ---
    created_routines: List["Routine"] = Relationship(back_populates="owner")
    
    assignments_as_student: List[RoutineAssignment] = Relationship(
        back_populates="student",
        sa_relationship_kwargs={"foreign_keys": "[RoutineAssignment.student_id]"}
    )
    
    assignments_as_professor: List[RoutineAssignment] = Relationship(
        back_populates="professor",
        sa_relationship_kwargs={"foreign_keys": "[RoutineAssignment.professor_id]"}
    )
    # NUEVA RELACION: Grupos de Rutinas creados por el profesor
    routine_groups: List[RoutineGroup] = Relationship(back_populates="professor")


# --- TABLA DE EJERCICIOS ---
class Exercise(SQLModel, table=True):
    """Representa la tabla 'EXERCISES' (Catalogo)."""
    __tablename__ = "EXERCISES"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(index=True, unique=True, max_length=100)
    descripcion: str = Field(default="", max_length=500)
    grupo_muscular: MuscleGroup = Field(index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)

    routine_links: List[RoutineExercise] = Relationship(back_populates="exercise")


# --- TABLA DE RUTINAS ---
class Routine(SQLModel, table=True):
    """Representa la tabla 'ROUTINES' (Rutina Maestra)."""
    __tablename__ = "ROUTINES"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(index=True, max_length=100)
    descripcion: str = Field(default="", max_length=500)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)

    owner_id: int = Field(foreign_key="USERS.id")
    owner: User = Relationship(back_populates="created_routines")
    
    # NUEVO CAMPO: Foreign Key a RoutineGroup (opcional para rutinas antiguas)
    routine_group_id: Optional[int] = Field(default=None, foreign_key="ROUTINES_GROUP.id", index=True) 

    # Relaciones con cascada para limpieza automatica
    exercise_links: List[RoutineExercise] = Relationship(
        back_populates="routine",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    
    assignments: List[RoutineAssignment] = Relationship(
        back_populates="routine",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    # NUEVA RELACION: Relacion inversa con RoutineGroup
    routine_group: Optional[RoutineGroup] = Relationship(back_populates="routines")


# ----------------------------------------------------------------------
# Esquemas Pydantic (Para la API)
# ----------------------------------------------------------------------

# --- Esquemas de RoutineGroup ---
class RoutineGroupCreate(BaseModel):
    nombre: str
    fecha_vencimiento: date 

class RoutineGroupRead(BaseModel):
    id: int
    nombre: str
    fecha_creacion: datetime
    # CRITICO: Debe ser Optional en la lectura para manejar el valor NULL de la DB
    fecha_vencimiento: Optional[date] 
    professor_id: int
    
    class Config:
        from_attributes = True

# --- Esquema Transaccional ---
class RoutineCreateForTransactional(BaseModel):
    """Esquema para una rutina individual dentro de la transaccion grupal."""
    nombre: str
    descripcion: Optional[str] = None
    exercises: List["RoutineExerciseCreate"] # Reusa el esquema de creacion de enlaces

class RoutineGroupCreateAndRoutines(RoutineGroupCreate): 
    """Esquema para crear el grupo y todas sus rutinas asociadas."""
    student_id: int # A quien se le asignara
    days: int # Cantidad de dias/rutinas a crear (del frontend, solo para validacion de esquema)
    routines: List[RoutineCreateForTransactional] # Lista de rutinas con ejercicios (del frontend)


# --- Esquemas de Usuario (Se mantienen) ---
class UserCreate(BaseModel):
    dni: str 
    email: str
    password: str
    nombre: str
    rol: UserRole

class UserRead(BaseModel):
    id: int
    nombre: str
    email: str
    dni: str
    rol: UserRole
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserReadSimple(BaseModel):
    id: int
    nombre: str
    email: str
    
    class Config: 
        from_attributes = True # Asegura que SQLModel pueda leerlo

class UserLogin(BaseModel):
    dni: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    dni: str 
    rol: Optional[UserRole] = None

# NUEVO: Esquema para el cambio de contrasena
class ChangePassword(BaseModel):
    old_password: str
    new_password: str

# --- Esquemas de Actualizacion de Usuario (Profesor) ---
class UserUpdateByProfessor(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    dni: Optional[str] = None


# --- Esquemas de Ejercicio (Se mantienen) ---
class ExerciseCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    grupo_muscular: MuscleGroup

class ExerciseRead(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    grupo_muscular: MuscleGroup
    created_at: datetime
    
    class Config:
        from_attributes = True

class ExerciseUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    grupo_muscular: Optional[MuscleGroup] = None

# --- Esquemas de Rutina ---

# Schema para la relacion N:M (usado dentro de RoutineRead)
class RoutineExerciseRead(BaseModel):
    # Campos del enlace (series, repeticiones, orden)
    sets: int
    repetitions: str
    # NUEVO: Campo para el peso
    peso: str 
    order: int
    
    # El ejercicio real al que enlaza (anidado)
    exercise: ExerciseRead # Debe usar el schema ExerciseRead
    
    # CRITICO: Pydantic necesita la configuracion del ORM para este objeto anidado
    class Config:
        from_attributes = True


class RoutineExerciseCreate(BaseModel):
    exercise_id: int
    sets: int
    repetitions: str
    # NUEVO: Campo para el peso (Input)
    peso: str
    order: int

class RoutineCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    exercises: List[RoutineExerciseCreate]

# NUEVO: Esquema para la creacion/actualizacion COMPLETA de una rutina
class RoutineCreateOrUpdate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    exercises: List[RoutineExerciseCreate] # Se envia la lista completa para reemplazar la anterior

class RoutineUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None

# CRITICO: La lectura de la rutina ahora incluye los enlaces y la configuracion del ORM
class RoutineRead(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    created_at: datetime
    owner_id: int
    
    # AGREGADO: Incluir el grupo de rutina (CRITICO para la visualizacion en el profesor)
    routine_group: Optional[RoutineGroupRead] = None
    
    # CRITICO: Incluir los links de ejercicio para la serializacion de la asignacion
    exercise_links: List[RoutineExerciseRead]
    
    # Configuracion de Pydantic para manejar objetos ORM
    class Config: 
        from_attributes = True

# --- Esquemas de Asignacion (Se mantienen) ---
class RoutineAssignmentCreate(BaseModel):
    """Esquema para ASIGNAR una rutina a un alumno."""
    routine_id: int
    student_id: int
    is_active: bool = True

# SOLUCION: Esquema de ACTUALIZACION de Asignacion 
class RoutineAssignmentUpdate(BaseModel):
    """Esquema para ACTUALIZAR el estado activo/inactivo de una asignacion."""
    is_active: Optional[bool] = None

# CRITICO: Esquema para LEER las asignaciones (Alumno)
class RoutineAssignmentRead(BaseModel):
    """Esquema para LEER las asignaciones (Alumno)."""
    id: int
    routine_id: int
    student_id: int
    professor_id: int
    assigned_at: datetime
    is_active: bool
    
    # CRITICO: Incluir la rutina completa, serializada con el esquema RoutineRead (con ejercicios y grupo)
    routine: RoutineRead 
    
    # El alumno que la recibe y el profesor que la asigno
    student: UserReadSimple 
    professor: UserReadSimple 
    
    class Config: 
        from_attributes = True

# Necesario para que la relacion recursiva funcione en RoutineGroupCreateAndRoutines
RoutineGroupCreateAndRoutines.model_rebuild()