from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
# AGREGADO: Importamos date para la fecha de vencimiento
from datetime import datetime, timezone, date 
from enum import Enum
from pydantic import BaseModel, EmailStr # Importamos EmailStr para validación de email

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
    GLUTEOS = "Gluteos" 
    CARDIO = "Cardio"

# ----------------------------------------------------------------------
# Modelos de Usuario
# ----------------------------------------------------------------------

class UserBase(SQLModel):
    """Base para la creacion y lectura de usuario, sin ID ni hash."""
    # CRÍTICO: Usamos EmailStr para validación automática de formato
    email: EmailStr = Field(index=True, unique=True) # CRÍTICO: email ahora es único e indexado
    nombre: str
    # 🚨 DNI ELIMINADO
    rol: UserRole

class User(UserBase, table=True):
    """Modelo de Base de Datos para el Usuario."""
    __tablename__ = "USERS"
    id: Optional[int] = Field(default=None, primary_key=True)
    password_hash: str # Solo para el hash de la contraseña (se mantiene)
    
    # Relaciones (Se mantienen)
    assigned_routines: List["RoutineAssignment"] = Relationship(back_populates="student") # Si es Alumno
    created_routines: List["Routine"] = Relationship(back_populates="owner") # Si es Profesor
    created_assignments: List["RoutineAssignment"] = Relationship(back_populates="professor") # Si es Profesor
    created_routine_groups: List["RoutineGroup"] = Relationship(back_populates="professor") # Si es Profesor
    
# Esquemas para interaccion con la API

class UserCreate(UserBase):
    """Esquema para crear un nuevo usuario. Requiere password."""
    password: str # Contrasena en texto plano (se hashea en el backend)

class UserLogin(BaseModel):
    """Esquema de login. Usa email/password."""
    email: EmailStr # CRÍTICO: Cambiado de 'dni' a 'email'
    password: str

class UserRead(UserBase):
    """Esquema para leer datos completos del usuario."""
    id: int
    
class UserReadSimple(BaseModel):
    """Esquema para la lista simple de alumnos (Profesor)."""
    id: int
    email: EmailStr # CRÍTICO: Incluir Email
    nombre: str
    # 🚨 DNI ELIMINADO
    
class UserUpdateByProfessor(BaseModel):
    """Esquema para que el Profesor actualice datos del Alumno (Nombre/Email)."""
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None # CRÍTICO: Cambiado de 'dni' a 'email'

class Token(BaseModel):
    """Esquema para el token de acceso JWT."""
    access_token: str
    token_type: str

class ChangePassword(BaseModel):
    """Esquema para el cambio de contraseña."""
    old_password: str
    new_password: str

# ----------------------------------------------------------------------
# Modelos de Ejercicios (Exercise)
# ----------------------------------------------------------------------

class ExerciseBase(SQLModel):
    """Base para la creacion de Ejercicios."""
    nombre: str
    descripcion: Optional[str] = None
    grupo_muscular: MuscleGroup # Usamos el Enum

class Exercise(ExerciseBase, table=True):
    """Modelo de Base de Datos para el Ejercicio."""
    __tablename__ = "EXERCISES"
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Relaciones Muchos-a-Muchos a través de RoutineExercise
    routine_links: List["RoutineExercise"] = Relationship(back_populates="exercise") 

class ExerciseCreate(ExerciseBase):
    pass
    
class ExerciseUpdate(BaseModel):
    """Esquema de actualizacion para el ejercicio."""
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    grupo_muscular: Optional[MuscleGroup] = None
    
class ExerciseRead(ExerciseBase):
    """Esquema de lectura para el ejercicio."""
    id: int

# ----------------------------------------------------------------------
# Modelos de Rutinas (Routine)
# ----------------------------------------------------------------------

class RoutineBase(SQLModel):
    """Base para la creacion de Rutinas."""
    nombre: str
    descripcion: Optional[str] = None
    owner_id: int = Field(foreign_key="USERS.id") # ID del Profesor que la creo
    routine_group_id: Optional[int] = Field(default=None, foreign_key="ROUTINE_GROUPS.id") # Nuevo: ID del grupo

# Esquema para el enlace de ejercicios dentro de una rutina (creacion/edicion)
class ExerciseLinkCreate(BaseModel):
    """Define los detalles de un ejercicio dentro de una rutina."""
    exercise_id: int
    sets: int
    repetitions: int
    peso: float # Nuevo campo para el peso
    order: int = Field(default=1) # Orden del ejercicio en la rutina

# Esquema para la creacion de una rutina (incluye enlaces)
class RoutineCreate(RoutineBase):
    """Esquema para crear una rutina maestra, incluyendo su lista de ejercicios."""
    # Lista de objetos que definen el enlace (ID del ejercicio + sets/reps/peso)
    exercises: List[ExerciseLinkCreate]
    
# Nuevo esquema para la transaccion de creacion de grupo (no incluye owner_id ni group_id)
class RoutineCreateForTransactional(BaseModel):
    """Esquema simplificado para creacion dentro de una transaccion de grupo."""
    nombre: str
    descripcion: Optional[str] = None
    exercises: List[ExerciseLinkCreate]

# Esquema para la edicion COMPLETA de una rutina maestra (incluye metadata y reemplaza ejercicios)
class RoutineCreateOrUpdate(RoutineBase):
    """Esquema para la actualizacion completa de una rutina (reemplaza links)."""
    # Excluye owner_id y routine_group_id si viene de la DB
    exercises: List[ExerciseLinkCreate]
    
class Routine(RoutineBase, table=True):
    """Modelo de Base de Datos para el Rutina."""
    __tablename__ = "ROUTINES"
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Relaciones
    owner: "User" = Relationship(back_populates="created_routines") # Profesor Creador
    # Relaciones Muchos-a-Muchos a través de RoutineExercise
    # 🚨 CORRECCIÓN DE ERROR: Eliminado 'sa_kwargs'
    exercise_links: List["RoutineExercise"] = Relationship(
        back_populates="routine", 
        order_by="RoutineExercise.order" # Usamos 'order_by' directamente
    ) 
    # Relacion con el grupo
    routine_group: Optional["RoutineGroup"] = Relationship(back_populates="routines")
    # Relacion con asignaciones
    assignments: List["RoutineAssignment"] = Relationship(back_populates="routine")

# Esquema de lectura para el enlace de ejercicios (incluye el objeto Exercise)
class ExerciseLinkRead(BaseModel):
    """Define los detalles de lectura de un ejercicio dentro de una rutina."""
    id: int
    routine_id: int
    exercise_id: int
    sets: int
    repetitions: int
    peso: float
    order: int
    exercise: ExerciseRead # CRITICO: Incluir los datos completos del ejercicio

class RoutineRead(RoutineBase):
    """Esquema para leer la rutina, incluyendo su ID, owner y ejercicios."""
    id: int
    # El grupo asociado (Puede ser None)
    routine_group: Optional["RoutineGroupRead"] = None 
    # Lista de enlaces (con el detalle del ejercicio)
    exercise_links: List[ExerciseLinkRead]
    
    class Config:
        from_attributes = True

# ----------------------------------------------------------------------
# Modelos de Grupos de Rutinas (RoutineGroup)
# ----------------------------------------------------------------------

class RoutineGroupBase(SQLModel):
    """Base para la creación de un grupo de rutinas."""
    nombre: str
    # La fecha de vencimiento es la fecha de FIN de la rutina/grupo
    fecha_vencimiento: date 
    professor_id: int = Field(foreign_key="USERS.id") # Profesor que creó el grupo

class RoutineGroup(RoutineGroupBase, table=True):
    """Modelo de Base de Datos para el Grupo de Rutinas."""
    __tablename__ = "ROUTINE_GROUPS"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relaciones
    professor: User = Relationship(back_populates="created_routine_groups")
    routines: List[Routine] = Relationship(back_populates="routine_group")

class RoutineGroupCreate(RoutineGroupBase):
    pass

class RoutineGroupRead(RoutineGroupBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
        
# Esquema que viene del frontend para la transaccion de creacion de grupo
class RoutineGroupCreateAndRoutines(RoutineGroupCreate):
    """Esquema que agrupa el metadata del grupo y la lista de rutinas a crear."""
    student_id: int # A quien se le asignara
    routines: List[RoutineCreateForTransactional] # Las N rutinas (Dia 1, Dia 2...)


# --- Esquemas de Asignacion (RoutineAssignment) ---

class RoutineAssignmentCreate(BaseModel):
    """Esquema para ASIGNAR una rutina a un alumno."""
    routine_id: int
    student_id: int
    is_active: bool = True

# SOLUCION: Esquema de ACTUALIZACION de Asignacion 
class RoutineAssignmentUpdate(BaseModel):
    """Esquema para ACTUALIZAR el estado activo/inactivo de una asignacion."""
    is_active: Optional[bool] = None

# CRITICO: Esquema para LEER las asignaciones
class RoutineAssignmentRead(BaseModel):
    """Esquema para LEER las asignaciones (Alumno)."""
    id: int
    routine_id: int
    student_id: int
    professor_id: int
    assigned_at: datetime
    is_active: bool
    
    # CRITICO: Incluir la rutina completa, serializada con el esquema RoutineRead
    routine: RoutineRead 
    
    # CRITICO: Incluir los datos de Usuario simples (sin password hash)
    student: UserReadSimple
    professor: UserReadSimple

    class Config:
        from_attributes = True

# --- Tabla de Enlace de Asignacion ---
class RoutineAssignment(SQLModel, table=True):
    """Tabla de asignacion de Rutinas a Alumnos (relacion N:M)."""
    __tablename__ = "ROUTINE_ASSIGNMENTS"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    routine_id: int = Field(foreign_key="ROUTINES.id")
    student_id: int = Field(foreign_key="USERS.id")
    professor_id: int = Field(foreign_key="USERS.id") # El profesor que hizo la asignacion
    assigned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    is_active: bool = Field(default=True) # Solo una asignacion debe estar activa por alumno

    # Relaciones
    routine: Routine = Relationship(back_populates="assignments")
    student: User = Relationship(back_populates="assigned_routines")
    professor: User = Relationship(back_populates="created_assignments") # El profesor que asignó
    
# Necesario para que las referencias de tipo funcionen
RoutineRead.model_rebuild()
ExerciseLinkRead.model_rebuild()
RoutineGroupRead.model_rebuild()
RoutineAssignmentRead.model_rebuild()