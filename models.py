from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime, timezone
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
    ABDOMEN = "Abdomen"
    CARDIO = "Cardio"

# ----------------------------------------------------------------------
# Modelos de Base de Datos (Tablas)
# ----------------------------------------------------------------------

# --- TABLA DE ENLACE (Rutina <-> Ejercicio) ---
class RoutineExercise(SQLModel, table=True):
    """Tabla de enlace Muchos-a-Muchos entre Rutinas y Ejercicios."""
    __tablename__ = "ROUTINE_EXERCISES"
    
    # ?? CR赤TICO: ID autoincremental para evitar NotNullViolation
    id: Optional[int] = Field(default=None, primary_key=True)
    routine_id: int = Field(foreign_key="ROUTINES.id", index=True)
    exercise_id: int = Field(foreign_key="EXERCISES.id", index=True)
    
    sets: int
    repetitions: str
    order: int
    
    routine: "Routine" = Relationship(back_populates="exercise_links")
    exercise: "Exercise" = Relationship(back_populates="routine_links")

# --- TABLA DE ASIGNACI車N (Alumno <-> Rutina) ---
class RoutineAssignment(SQLModel, table=True):
    """Tabla de asignacion. Conecta a un Alumno (User) con una Rutina (Routine) y almacena quien la asigno (Profesor) y cuando."""
    __tablename__ = "ROUTINE_ASSIGNMENTS"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # --- Relaciones (Claves For芍neas) ---
    student_id: int = Field(foreign_key="USERS.id", index=True)
    routine_id: int = Field(foreign_key="ROUTINES.id", index=True)
    professor_id: int = Field(foreign_key="USERS.id", index=True) # El profesor que la asign車
    
    # --- Datos de la Asignaci車n ---
    assigned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    is_active: bool = Field(default=True) # Para activar/desactivar rutinas

    # --- Objetos de Relaci車n ---
    student: "User" = Relationship(
        back_populates="assignments_as_student",
        sa_relationship_kwargs={"foreign_keys": "[RoutineAssignment.student_id]"}
    )
    routine: "Routine" = Relationship(back_populates="assignments")
    professor: "User" = Relationship(
        back_populates="assignments_as_professor",
        sa_relationship_kwargs={"foreign_keys": "[RoutineAssignment.professor_id]"}
    )

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
    
    # Relaciones con cascada para limpieza autom芍tica
    exercise_links: List[RoutineExercise] = Relationship(
        back_populates="routine",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    
    assignments: List[RoutineAssignment] = Relationship(
        back_populates="routine",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


# ----------------------------------------------------------------------
# Esquemas Pydantic (Para la API)
# ----------------------------------------------------------------------

# --- Esquemas de Usuario ---
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

# ?? NUEVO: Esquema para el cambio de contrase?a
class ChangePassword(BaseModel):
    old_password: str
    new_password: str


# --- Esquemas de Ejercicio ---
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

# Schema para la relaci車n N:M (usado dentro de RoutineRead)
class RoutineExerciseRead(BaseModel):
    # Campos del enlace (series, repeticiones, orden)
    sets: int
    repetitions: str
    order: int
    
    # El ejercicio real al que enlaza (anidado)
    exercise: ExerciseRead # Debe usar el schema ExerciseRead
    
    # ?? CR赤TICO: Pydantic necesita la configuraci車n del ORM para este objeto anidado
    class Config:
        from_attributes = True


class RoutineExerciseCreate(BaseModel):
    exercise_id: int
    sets: int
    repetitions: str
    order: int

class RoutineCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    exercises: List[RoutineExerciseCreate]

# ?? NUEVO: Esquema para la creaci車n/actualizaci車n COMPLETA de una rutina
class RoutineCreateOrUpdate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    exercises: List[RoutineExerciseCreate] # Se env赤a la lista completa para reemplazar la anterior

class RoutineUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None

# ?? CR赤TICO: La lectura de la rutina ahora incluye los enlaces y la configuraci車n del ORM
class RoutineRead(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    created_at: datetime
    owner_id: int
    
    # ?? CR赤TICO: Incluir los links de ejercicio para la serializaci車n de la asignaci車n
    exercise_links: List[RoutineExerciseRead]
    
    # Configuraci車n de Pydantic para manejar objetos ORM
    class Config: 
        from_attributes = True


# --- Esquemas de Asignaci車n ---
class RoutineAssignmentCreate(BaseModel):
    """Esquema para ASIGNAR una rutina a un alumno."""
    routine_id: int
    student_id: int
    is_active: bool = True

# ?? CR赤TICO: Esquema para LEER las asignaciones (Alumno)
class RoutineAssignmentRead(BaseModel):
    """Esquema para LEER las asignaciones (Alumno)."""
    id: int
    routine_id: int
    student_id: int
    professor_id: int
    assigned_at: datetime
    is_active: bool
    
    # ?? CR赤TICO: Incluir la rutina completa, serializada con el esquema RoutineRead (con ejercicios)
    routine: RoutineRead 
    
    # El alumno que la recibe y el profesor que la asign車
    student: UserReadSimple 
    professor: UserReadSimple 
    
    class Config: 
        from_attributes = True