import React, { useState, useEffect, useContext, createContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
    User, Mail, Lock, CheckCircle, ArrowLeft, CreditCard, Eye, EyeOff, Loader2, 
    Plus, LogOut, ChevronRight, UserPlus, Search, X, 
    RefreshCcw, Key, Save, PlusCircle, Trash2, Zap, Calendar, List,
    Dumbbell, Filter, Minus, Info, Clipboard, Settings
} from 'lucide-react';

// ----------------------------------------------------------------------
// 1. CONFIGURACIÓN GLOBAL
// ----------------------------------------------------------------------

// CRÍTICO: La URL de la API (Asegúrate de que el backend de Render esté activo)
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 

// Colores base de la interfaz (Peakfit)
const colors = {
  primary: '#3ABFBC', // Verde Brillante
  inputBackground: '#1C1C1E', // Fondo de Input/Tarjeta
  textPrimary: 'white',
  textSecondary: '#A9A9A9', // Gris claro para placeholders/iconos
  error: '#B91C1C', // Rojo oscuro
  success: '#22C55E', // Añadido para acciones positivas
  danger: '#EF4444', // Añadido para cerrar sesión
  softAlert: '#1A1A1A', // Fondo para mensajes de error suaves (gris oscuro)
};

// --- Lista de Grupos Musculares (Para el selector en ExerciseCreationPage) ---
const MUSCLE_GROUPS = [
    { label: 'Seleccionar Grupo', value: '' },
    { label: 'Pectoral', value: 'Pectoral' },
    { label: 'Espalda', value: 'Espalda' },
    { label: 'Piernas', value: 'Piernas' },
    { label: 'Hombro', value: 'Hombro' },
    { label: 'Brazos', value: 'Brazos' },
    { label: 'Abdomen', value: 'Abdomen' },
    { label: 'Glúteos', value: 'Gluteos' },
    { label: 'Cardio', value: 'Cardio' },
];

// ----------------------------------------------------------------------
// 1.1 UTILIDADES
// ----------------------------------------------------------------------

/**
 * Corrige el problema de desplazamiento de un día común en los campos de fecha de HTML 
 * cuando el valor proviene de una fecha de la API. Convierte la fecha ISO de la API 
 * ('YYYY-MM-DDTXX:XX:XX') al formato de campo de entrada ('YYYY-MM-DD') asegurando
 * que la zona horaria local no reste un día.
 * @param {string | Date} dateInput 
 * @returns {string} Fecha en formato 'YYYY-MM-DD'
 */
const formatDateForInput = (dateInput) => {
    if (!dateInput) return '';

    // Si ya es un objeto Date o una fecha ISO con hora (de la API)
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

    // Si la fecha es inválida, devuelve vacío
    if (isNaN(date)) return '';

    // Obtenemos los componentes en la zona horaria UTC
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    // Retorna la fecha en formato YYYY-MM-DD (Universalmente aceptado por input type="date")
    return `${year}-${month}-${day}`;
};

// ----------------------------------------------------------------------
// 1.2 COMPONENTE DE MENSAJE DE REDIRECCIÓN/CARGA (AÑADIDO)
// ----------------------------------------------------------------------
const RedirectMessage = ({ message }) => (
    <div className="min-h-screen flex items-center justify-center p-4 text-center" style={{ backgroundColor: 'black' }}>
        <p className="text-xl font-bold" style={{ color: colors.textSecondary }}>{message}</p>
    </div>
);


// ----------------------------------------------------------------------
// 2. CONTEXTO DE AUTENTICACIÓN (AuthContext)
// ----------------------------------------------------------------------
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
    const [authToken, setAuthToken] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const parseToken = (token) => {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                dni: payload.sub,
                rol: payload.rol,
                nombre: payload.nombre,
                id: payload.user_id 
            };
        } catch (e) {
            console.error("Error al decodificar token:", e);
            return null;
        }
    };

    const signIn = useCallback((token) => {
        const userData = parseToken(token);
        if (userData) {
            setAuthToken(token);
            setUserRole(userData.rol);
            localStorage.setItem('userToken', token);
            localStorage.setItem('userRole', userData.rol);
        } else {
            console.error("Token inválido recibido.");
        }
    }, []);

    const signOut = useCallback(() => {
        setAuthToken(null);
        setUserRole(null); 
        localStorage.removeItem('userToken');
        localStorage.removeItem('userRole');
        window.location.reload(); 
    }, []);
    
    const getUserId = useCallback(() => {
        const token = localStorage.getItem('userToken');
        if (token) {
            const userData = parseToken(token);
            return userData ? userData.id : null;
        }
        return null;
    }, []);

    useEffect(() => {
        const storedToken = localStorage.getItem('userToken');
        const storedRole = localStorage.getItem('userRole');
        if (storedToken && storedRole) {
            setAuthToken(storedToken);
            setUserRole(storedRole);
        }
        setIsLoading(false);
    }, []);

    const contextValue = {
        authToken,
        userRole,
        isLoading,
        signIn,
        signOut,
        API_URL,
        isAuthenticated: !!authToken,
        isProfessor: userRole === 'Profesor',
        getUserId,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook para usar la autenticación
const useAuth = () => useContext(AuthContext);

// ----------------------------------------------------------------------
// 3. COMPONENTE DE INPUT REUTILIZABLE (Estilo Peakfit)
// ----------------------------------------------------------------------
const Input = ({ placeholder, value, onChange, type = 'text', Icon, isPassword = false, ...props }) => {
    const [showPassword, setShowPassword] = useState(false);
    
    return (
        <div className="mb-5">
            <div 
                className="flex items-center rounded-xl h-12 px-4 border transition-all duration-200"
                style={{ backgroundColor: colors.inputBackground, borderColor: colors.inputBackground }}
            >
                {Icon && <Icon size={20} style={{ color: colors.textSecondary }} className="mr-3" />}
                <input
                    className="flex-1 h-full text-white text-base focus:outline-none placeholder-peakfit-secondary bg-transparent"
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    type={isPassword ? (showPassword ? 'text' : 'password') : type}
                    {...props}
                />
                {isPassword && (
                    <span 
                        className="cursor-pointer" 
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ color: colors.textSecondary }}
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </span>
                )}
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 4. COMPONENTE MODAL DE REGISTRO
// ----------------------------------------------------------------------
const RegisterModal = ({ isVisible, onClose, navigate }) => {
    const { API_URL } = useAuth();
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [dni, setDni] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const isFormValid = nombre && email && dni && password;

    if (!isVisible) return null;

    const handleRegister = async () => {
        if (!isFormValid) {
            setError("Todos los campos son obligatorios.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            await axios.post(`${API_URL}/register/student`, [{
                nombre, email, dni, password,
                rol: "Alumno"
            }]);

            setSuccess(true);
            setNombre(''); setEmail(''); setDni(''); setPassword('');
            setTimeout(onClose, 3000);
            
        } catch (e) {
            console.error("Error en el registro:", e.response ? e.response.data : e.message);
            const detail = e.response?.data?.detail;
            let msg = detail && typeof detail === 'string' ? detail : "Fallo desconocido en el servidor.";

            if (msg.includes("DNI ya esta registrado")) { msg = "El DNI proporcionado ya se encuentra registrado."; } 
            else if (msg.includes("El email ya esta registrado")) { msg = "El Email proporcionado ya se encuentra registrado."; } 
            else if (e.message === 'Network Error') { msg = `Error de conexión con la API.`; }

            setError(`Error: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 transition-opacity p-4">
            <div className="bg-black p-8 rounded-xl w-full max-w-lg shadow-2xl border border-gray-800">
                
                <h2 className="text-2xl font-bold text-white text-center mb-6">Registro de Alumno</h2>
                
                {error && (
                    <p className="mb-4 p-3 text-sm font-semibold text-white text-center rounded-lg bg-red-700/70">
                        {error}
                    </p>
                )}
                {success && (
                    <div className="mb-4 p-3 text-sm font-bold text-center rounded-lg text-peakfit-primary bg-peakfit-primary/20">
                        <CheckCircle size={20} className="inline mr-2" style={{ color: colors.primary }} />
                        <span style={{ color: colors.primary }}>¡Registro exitoso! Ya puedes ingresar.</span>
                    </div>
                )}

                <Input placeholder="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} Icon={User} />
                <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} Icon={Mail} type="email" />
                <Input placeholder="Documento (DNI)" value={dni} onChange={(e) => setDni(e.target.value)} Icon={CreditCard} type="text" />
                <Input placeholder="Contraseña (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} Icon={Lock} isPassword />
                
                <button
                    className="w-full mt-8 p-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl"
                    style={{ backgroundColor: colors.primary, opacity: isLoading || !isFormValid ? 0.6 : 1 }}
                    onClick={handleRegister}
                    disabled={isLoading || !isFormValid}
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin inline mr-2 text-black" size={20} />
                    ) : (
                        <span className="text-black">REGISTRARSE</span>
                    )}
                </button>
                
                <div className="mt-4 text-center">
                    <button
                        className="w-full p-4 rounded-xl font-bold text-white bg-peakfit-input transition-colors duration-200 border border-gray-700 hover:bg-gray-700"
                        onClick={onClose}
                    >
                        VOLVER A INGRESAR
                    </button>
                </div>
            </div>
        </div>
    );
};


// ----------------------------------------------------------------------
// 5. PANTALLA DE LOGIN
// ----------------------------------------------------------------------

const LoginPage = ({ navigate }) => {
    const { signIn, API_URL } = useAuth();
    const [dniOrEmail, setDniOrEmail] = useState(''); 
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isRegisterVisible, setIsRegisterVisible] = useState(false); 

    const handleLogin = async () => {
        if (!dniOrEmail || !password) {
            setError("Por favor, ingresa DNI o Email y contraseña.");
            return;
        }
        
        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.post(`${API_URL}/login`, {
                dni: dniOrEmail,
                password: password
            });

            await signIn(response.data.access_token); 
            
        } catch (e) {
            console.error("Error de Login:", e.response ? e.response.data : e.message);
            
            let errorMessage = "DNI o contraseña incorrectos.";
            if (e.message === 'Network Error') {
                errorMessage = `Error de conexión con la API (${API_URL}).`; 
            } else if (e.response && e.response.status !== 401) {
                errorMessage = `Error del servidor (${e.response.status}). Intenta más tarde.`;
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const isFormValid = dniOrEmail.trim() && password.trim();

    return (
        <div 
            className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
            style={{ 
                backgroundImage: `url(https://placehold.co/1920x1080/000000/3ABFBC?text=Peakfit+Background)`, 
            }}
        >
            <div className="absolute inset-0 bg-black opacity-70"></div> 

            <RegisterModal 
                isVisible={isRegisterVisible} 
                onClose={() => setIsRegisterVisible(false)} 
                navigate={navigate}
            />

            <div 
                className="w-full max-w-sm p-8 rounded-xl z-10"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(5px)' }}
            >
                <div className="flex flex-col items-center mb-6">
                    <img 
                        src="https://placehold.co/150x150/3ABFBC/000000?text=LOGO+PF" 
                        alt="Peakfit Logo" 
                        className="w-36 h-36 object-contain mb-[-10px]"
                        onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/150x150/3ABFBC/000000?text=PF" }}
                    />
                    <p className="text-sm italic mb-4" style={{ color: colors.textSecondary }}>
                        Es hora de llegar muy lejos
                    </p>
                </div>

                <h1 className="text-3xl font-bold text-white mb-6">Iniciar Sesión</h1>
                
                {error && (
                    <p className="mb-4 p-3 text-sm font-semibold text-white text-center rounded-lg" style={{ backgroundColor: colors.error }}>
                        {error}
                    </p>
                )}
                
                <label className="text-sm font-medium mb-2 block" style={{ color: colors.textSecondary }}>Email o DNI</label>
                <Input
                    placeholder="Email o DNI"
                    value={dniOrEmail} 
                    onChange={(e) => setDniOrEmail(e.target.value)}
                    Icon={User}
                />
                
                <label className="text-sm font-medium mb-2 block" style={{ color: colors.textSecondary }}>Contraseña</label>
                <Input
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    isPassword
                    Icon={Lock}
                />

                <button
                    className="w-full mt-6 p-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl"
                    style={{ 
                        backgroundColor: colors.primary, 
                        opacity: isLoading || !isFormValid ? 0.6 : 1,
                        boxShadow: `0 4px 8px ${colors.primary}80` 
                    }}
                    onClick={handleLogin}
                    disabled={isLoading || !isFormValid}
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin inline mr-2 text-black" size={20} />
                    ) : (
                        <span className="text-black">INICIAR SESIÓN</span>
                    )}
                </button>
                
                <div className="flex justify-center mt-8">
                    <p className="text-sm" style={{ color: colors.textSecondary }}>¿No tienes una cuenta? </p>
                    <button 
                        className="text-sm font-bold ml-1 hover:underline"
                        style={{ color: colors.primary }}
                        onClick={() => setIsRegisterVisible(true)}
                    >
                        Registrarse
                    </button>
                </div>
                
                <div className="mt-4 text-center">
                    <button 
                        className="text-xs font-medium hover:underline"
                        style={{ color: colors.textSecondary }}
                        onClick={() => navigate('forgotPassword')}
                    >
                        <Key size={16} className="inline mr-1" /> ¿Olvidaste tu Contraseña?
                    </button>
                </div>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 6. PANTALLA OLVIDÉ CONTRASEÑA
// ----------------------------------------------------------------------
const ForgotPasswordPage = ({ navigate }) => {
    const { API_URL } = useAuth();
    const [identifier, setIdentifier] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    const handleResetPassword = async () => {
        if (!identifier.trim()) {
            setError("Por favor, ingrese su DNI o Email.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            await axios.post(`${API_URL}/forgot-password`, {
                identifier: identifier.trim(),
            });

            setSuccess(true);
            setError(null);
            setIdentifier('');
            setTimeout(() => navigate('login'), 5000);

        } catch (e) {
            console.error("Error al solicitar reseteo:", e.response ? e.response.data : e.message);
            const detail = e.response?.data?.detail;
            let msg = detail && typeof detail === 'string' ? detail : "Fallo desconocido en el servidor.";

            if (msg.includes("Usuario no encontrado")) { msg = "No se encontró un usuario con ese DNI o Email."; } 
            else if (e.message === 'Network Error') { msg = `Error de conexión con la API.`; }

            setError(`Error: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: 'black' }}>
            <div className="w-full max-w-sm p-8 rounded-xl shadow-2xl" style={{ backgroundColor: colors.inputBackground }}>
                
                <h1 className="text-3xl font-bold text-white text-center mb-2">Restablecer Contraseña</h1>
                <p className="text-sm text-center mb-6" style={{ color: colors.textSecondary }}>
                    Ingresa tu DNI o Email para recibir instrucciones.
                </p>
                
                {error && (<p className="mb-4 p-3 text-sm font-semibold text-white text-center rounded-lg bg-red-700/70">{error}</p>)}
                {success && (
                    <div className="mb-4 p-3 text-sm font-bold text-center rounded-lg text-peakfit-primary bg-peakfit-primary/20">
                        <CheckCircle size={20} className="inline mr-2" style={{ color: colors.primary }} />
                        <span style={{ color: colors.primary }}>Instrucciones enviadas. Revisa tu correo.</span>
                    </div>
                )}
                
                <Input
                    placeholder="DNI o Email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    Icon={User}
                    type="text"
                    disabled={isLoading}
                />
                
                <button
                    className="w-full mt-6 p-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl"
                    style={{ backgroundColor: colors.primary, opacity: isLoading || !identifier.trim() ? 0.5 : 1 }}
                    onClick={handleResetPassword}
                    disabled={isLoading || !identifier.trim()}
                >
                    {isLoading ? (<Loader2 className="animate-spin inline mr-2 text-black" size={20} />) : (<span className="text-black">Restablecer Contraseña</span>)}
                </button>
                
                <div className="mt-4 text-center">
                    <button 
                        className="text-sm font-medium hover:underline"
                        style={{ color: colors.textSecondary }}
                        onClick={() => navigate('login')}
                    >
                        <ArrowLeft size={16} className="inline mr-1" /> Volver al Inicio de Sesión
                    </button>
                </div>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 7. PANTALLA CAMBIAR CONTRASEÑA
// ----------------------------------------------------------------------
const ChangePasswordPage = ({ navigate }) => {
    const { authToken, API_URL, getUserId } = useAuth();
    const userId = getUserId(); 

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    const isFormValid = oldPassword.length > 0 && newPassword.length >= 6 && newPassword === confirmPassword;

    const handleChangePassword = async () => {
        if (!isFormValid) {
            setError("Asegúrate de que las nuevas contraseñas coincidan y que la nueva tenga al menos 6 caracteres.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            await axios.put(`${API_URL}/users/${userId}/password`, {
                old_password: oldPassword,
                new_password: newPassword,
            }, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            setSuccess(true);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            
            setTimeout(() => navigate('dashboard'), 3000);

        } catch (e) {
            console.error("Error al cambiar contraseña:", e.response ? e.response.data : e.message);
            const detail = e.response?.data?.detail;
            let msg = detail && typeof detail === 'string' ? detail : "Fallo desconocido en el servidor.";

            if (msg.includes("Contraseña antigua incorrecta")) { msg = "La Contraseña actual ingresada es incorrecta."; } 
            else if (e.message === 'Network Error') { msg = `Error de conexión con la API.`; }

            setError(`Error al cambiar contraseña: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'black' }}>
            <div className="flex items-center p-4 shadow-lg border-b" style={{ backgroundColor: colors.inputBackground }}>
                <button onClick={() => navigate('dashboard')} className="p-2 rounded-lg hover:bg-gray-700">
                    <ArrowLeft size={24} color={'white'} />
                </button>
                <h1 className="text-xl font-bold ml-4" style={{ color: colors.primary }}>Cambiar Contraseña</h1>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
                <div className="w-full max-w-sm p-8 rounded-xl shadow-2xl" style={{ backgroundColor: colors.inputBackground }}>
                    
                    <h2 className="text-2xl font-bold text-white text-center mb-6">Actualizar Contraseña</h2>
                    
                    {error && (<p className="mb-4 p-3 text-sm font-semibold text-white text-center rounded-lg bg-red-700/70">{error}</p>)}
                    {success && (
                        <div className="mb-4 p-3 text-sm font-bold text-center rounded-lg text-peakfit-primary bg-peakfit-primary/20">
                            <CheckCircle size={20} className="inline mr-2" style={{ color: colors.primary }} />
                            <span style={{ color: colors.primary }}>Contraseña cambiada con éxito.</span>
                        </div>
                    )}
                    
                    <Input placeholder="Contraseña Actual" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} Icon={Lock} isPassword />
                    <Input placeholder="Nueva Contraseña (mínimo 6 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} Icon={Key} isPassword />
                    <Input placeholder="Confirmar Nueva Contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} Icon={Key} isPassword />
                    
                    <button
                        className="w-full mt-6 p-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl"
                        style={{ backgroundColor: colors.primary, opacity: isLoading || !isFormValid ? 0.5 : 1 }}
                        onClick={handleChangePassword}
                        disabled={isLoading || !isFormValid}
                    >
                        {isLoading ? (<Loader2 className="animate-spin inline mr-2 text-black" size={20} />) : (<span className="text-black">GUARDAR CAMBIOS</span>)}
                    </button>
                    
                </div>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 8. PANTALLA DE ALTA DE ALUMNO
// ----------------------------------------------------------------------
const AddStudentPage = ({ navigate }) => {
    const { isProfessor, API_URL } = useAuth();
    
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [dni, setDni] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState(null);
    
    const resetForm = () => {
        setNombre(''); setEmail(''); setDni(''); setPassword('');
        setIsSuccess(false);
        setError(null);
    };
    
    // Si no es profesor o la autenticación está mal, simplemente redirige.
    if (!isProfessor) return <RedirectMessage message="Acceso denegado. Redirigiendo..." />; 
    
    const isFormValid = nombre.trim() && email.trim() && dni.trim() && password.trim() && password.length >= 6;
    
    const handleRegisterStudent = async () => {
        setError(null);
        if (!isFormValid) {
            setError("Verifica que todos los campos estén completos y la contraseña tenga 6 caracteres.");
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setError("El formato del correo electrónico es inválido.");
            return;
        }
        if (!/^\d+$/.test(dni.trim())) {
            setError("El DNI solo debe contener números.");
            return;
        }
        
        setIsLoading(true);

        try {
            await axios.post(
                `${API_URL}/register/student`,
                [{
                    nombre: nombre.trim(),
                    email: email.trim(),
                    dni: dni.trim(),
                    password: password.trim(),
                    rol: "Alumno"
                }]
            );
            setIsSuccess(true);
            setTimeout(() => {
                navigate('dashboard');
                resetForm();
            }, 3000);
        } catch (e) {
            console.error("Error al registrar alumno:", e.response ? e.response.data : e.message);
            const detail = e.response?.data?.detail;
            let msg = detail && typeof detail === 'string' ? detail : "Fallo desconocido en el servidor.";
            if (msg.includes("DNI ya esta registrado")) { msg = "El DNI ya se encuentra registrado."; } 
            else if (msg.includes("El email ya esta registrado")) { msg = "El Email ya se encuentra registrado."; } 
            else if (e.message === 'Network Error') { msg = `Error de conexión con la API.`; }
            setError(`Fallo al dar de alta el alumno. Detalle: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'black' }}>
            <div className="flex items-center p-4 shadow-lg border-b" style={{ backgroundColor: colors.inputBackground, borderColor: colors.inputBackground }}>
                <button onClick={() => navigate('dashboard')} className="p-2 rounded-lg hover:bg-gray-700" disabled={isLoading}>
                    <ArrowLeft size={24} color={'white'} />
                </button>
                <h1 className="text-xl font-bold ml-4" style={{ color: colors.primary }}>Alta de Nuevo Alumno</h1>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                {isSuccess ? (
                    <div className="flex flex-col items-center justify-center flex-grow p-10 mt-10">
                        <CheckCircle size={80} style={{ color: colors.primary }} />
                        <p className="text-xl font-bold text-center mt-6" style={{ color: colors.primary }}>¡Alumno '{nombre}' dado de alta con éxito!</p>
                        <p className="text-base mt-2" style={{ color: colors.textSecondary }}>Volviendo al panel...</p>
                    </div>
                ) : (
                    <div className="w-full max-w-md">
                         {error && (<p className="mb-6 p-3 text-sm font-semibold text-white text-center rounded-lg" style={{ backgroundColor: colors.error }}>{error}</p>)}
                        <div className="space-y-6">
                            <label className="text-base font-semibold block" style={{ color: colors.textPrimary }}>Nombre Completo:</label>
                            <Input placeholder="Nombre y apellido del alumno" value={nombre} onChange={(e) => setNombre(e.target.value)} Icon={User} type="text" disabled={isLoading}/>
                            <label className="text-base font-semibold block" style={{ color: colors.textPrimary }}>Correo Electrónico (Email):</label>
                            <Input placeholder="ejemplo@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} Icon={Mail} type="email" disabled={isLoading}/>
                            <label className="text-base font-semibold block" style={{ color: colors.textPrimary }}>DNI (Documento Nacional de Identidad):</label>
                            <Input placeholder="Solo números" value={dni} onChange={(e) => setDni(e.target.value)} Icon={CreditCard} type="text" disabled={isLoading} inputMode="numeric"/>
                            <label className="text-base font-semibold block" style={{ color: colors.textPrimary }}>Contraseña Inicial:</label>
                            <Input placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} isPassword Icon={Lock} disabled={isLoading}/>
                        </div>
                        <div className="mt-8">
                            <button
                                className="w-full p-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl"
                                style={{ backgroundColor: colors.primary, opacity: isLoading || !isFormValid ? 0.5 : 1, boxShadow: `0 4px 8px ${colors.primary}80` }}
                                onClick={handleRegisterStudent}
                                disabled={isLoading || !isFormValid}
                            >
                                {isLoading ? (<Loader2 className="animate-spin inline mr-2 text-black" size={20} />) : (<span className="text-black">Registrar Alumno</span>)}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 9.1 MODAL DE INFORMACIÓN DEL ALUMNO
// ----------------------------------------------------------------------
const StudentInfoModal = ({ isVisible, onClose, student, onResetPassword }) => {
    if (!isVisible || !student) return null;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 transition-opacity p-4">
            <div className="bg-black p-8 rounded-xl w-full max-w-md shadow-2xl border border-gray-800">
                <div className="flex justify-between items-center mb-6 border-b pb-3 border-gray-800">
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        <Info size={24} style={{ color: colors.primary }} className="mr-3" />
                        Detalles de {student.nombre}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700">
                        <X size={24} color={'white'} />
                    </button>
                </div>

                <div className="space-y-4 text-white">
                    <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: colors.inputBackground }}>
                        <span className="font-semibold" style={{ color: colors.textSecondary }}>ID Interno:</span>
                        <span className="text-sm">{student.id}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: colors.inputBackground }}>
                        <span className="font-semibold" style={{ color: colors.textSecondary }}>DNI:</span>
                        <span className="text-sm">{student.dni || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: colors.inputBackground }}>
                        <span className="font-semibold" style={{ color: colors.textSecondary }}>Email:</span>
                        <span className="text-sm">{student.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: colors.inputBackground }}>
                        <span className="font-semibold" style={{ color: colors.textSecondary }}>Rol:</span>
                        <span className="text-sm">{student.rol || 'Alumno'}</span>
                    </div>
                </div>

                <button 
                    onClick={() => { onResetPassword(student); onClose(); }} // Llama a la función de reseteo y cierra el modal
                    className="w-full mt-6 p-3 rounded-xl font-bold text-lg transition-all duration-300"
                    style={{ backgroundColor: colors.danger + '40', color: colors.danger, border: `1px solid ${colors.danger}` }}
                >
                    <Key size={18} className="inline mr-2" />
                    Restablecer Contraseña
                </button>
                
            </div>
        </div>
    );
};


// ----------------------------------------------------------------------
// 9. PANTALLA DASHBOARD DEL PROFESOR
// ----------------------------------------------------------------------

// Componente para botones de acción de Alumno (Textual)
const StudentActionBtn = ({ icon: Icon, text, color, onClick, title, isDanger = false, disabled = false }) => (
    <button
        title={title}
        className={`flex items-center justify-center px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold ${isDanger ? 'hover:bg-red-900/50' : 'hover:bg-gray-700/50'}`}
        style={{ color: color, border: `1px solid ${color}`, opacity: disabled ? 0.5 : 1 }}
        onClick={onClick}
        disabled={disabled}
    >
        <Icon size={16} className="mr-1" color={color} />
        {text}
    </button>
);


const ProfessorPage = ({ navigate }) => {
    const { authToken, API_URL, signOut, isProfessor } = useAuth();
    
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    
    // Si no es profesor o la autenticación está mal, simplemente redirige.
    if (!isProfessor) return <RedirectMessage message="Acceso denegado. Redirigiendo..." />;

    const fetchStudents = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/users/students`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            setStudents(response.data);
        } catch (e) {
            console.error("Error fetching students:", e.response ? e.response.data : e.message);
            setError("Error al cargar la lista de alumnos. Asegúrate de que tu API está funcionando.");
        } finally {
            setIsLoading(false);
        }
    }, [API_URL, authToken]);

    useEffect(() => {
        if (authToken) { 
            fetchStudents(); 
        }
    }, [authToken, fetchStudents]);

    const filteredStudents = students.filter(student =>
        student.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.dni?.toString().includes(searchTerm)
    );
    
    // Función para manejar el Reset de Contraseña
    const handleResetPassword = async (student) => {
        // FIX: Usamos window.confirm ya que alert/confirm está restringido en iframes.
        const confirmReset = window.confirm(`¿Estás seguro de que deseas restablecer la contraseña para ${student.nombre}? Se enviará un email con las instrucciones de cambio de contraseña.`);
        if (!confirmReset) return;

        console.log(`Intentando reseteo de contraseña para alumno ID: ${student.id}`);
        
        try {
            // Nota: El endpoint real no está expuesto en main.py, por lo que se simula.
            // await axios.post(`${API_URL}/professor/reset-student-password`, { student_id: student.id }, { headers: { Authorization: `Bearer ${authToken}` } });
            
            // Simulación de éxito
            alert(`✅ Contraseña de ${student.nombre} restablecida con éxito (Simulación). El alumno recibirá instrucciones por email.`);
            console.log(`Reset Password Succeeded for Student ID: ${student.id}`);
        } catch (e) {
             console.error("Error resetting password:", e);
             alert(`❌ ERROR: No se pudo restablecer la contraseña para ${student.nombre}. Verifique el backend.`);
        }
    };

    const StudentItem = ({ student }) => (
        <div 
            className="flex items-center justify-between p-4 mb-2 rounded-xl"
            style={{ backgroundColor: colors.inputBackground }}
        >
            <div className="flex items-center flex-1 min-w-0">
                <div className="rounded-full w-10 h-10 flex items-center justify-center mr-3" style={{backgroundColor: colors.primary}}>
                    <User size={20} color={'black'} />
                </div>
                <div className="truncate">
                    <p className="text-white font-semibold truncate">{student.nombre || 'Sin Nombre'}</p>
                    <p className="text-sm truncate" style={{color: colors.textSecondary}}>DNI: {student.dni || 'N/A'}</p>
                </div>
            </div>
            
            <div className="flex space-x-2 ml-4">
                {/* Botón INFO (Texto) */}
                <StudentActionBtn
                    title="Ver Info"
                    text="Info"
                    icon={Info}
                    color={colors.textSecondary}
                    onClick={() => { setSelectedStudent(student); setIsInfoModalVisible(true); }}
                />

                {/* Botón RESET CONTRASEÑA (Texto - FIX) */}
                <StudentActionBtn
                    title="Restablecer Contraseña"
                    text="Resetear"
                    icon={Key}
                    color={colors.danger}
                    isDanger
                    onClick={() => handleResetPassword(student)}
                />

                 {/* Botón VER RUTINA (Texto - FIX) */}
                <StudentActionBtn
                    title="Ver Rutina Asignada"
                    text="Rutina"
                    icon={List}
                    color={colors.primary}
                    onClick={() => navigate('viewRoutineGroup', { studentId: student.id, studentName: student.nombre })}
                />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'black' }}>
            
            <StudentInfoModal 
                isVisible={isInfoModalVisible}
                onClose={() => setIsInfoModalVisible(false)}
                student={selectedStudent}
                // Pasamos la función de reseteo al modal
                onResetPassword={handleResetPassword}
            />

            {/* Header / Barra Superior */}
            <div 
                className="flex items-center justify-between p-4 shadow-lg sticky top-0 z-30 flex-wrap" 
                style={{ backgroundColor: colors.inputBackground }}
            >
                <h1 className="text-xl font-bold mb-2 md:mb-0" style={{ color: colors.primary }}>
                    Peakfit Alumnos
                </h1>
                
                <div className="flex items-center space-x-2">
                    {/* Botón Alta Alumno (Texto - FIX) */}
                    <button 
                        className="flex items-center p-2 rounded-lg transition-colors hover:bg-gray-700 text-sm"
                        style={{ color: colors.success, border: `1px solid ${colors.success}` }}
                        onClick={() => navigate('addStudent')}
                    >
                        <UserPlus size={18} className="mr-1" /> Alta Alumno
                    </button>
                    
                    {/* Botón Contraseña (Texto - FIX) */}
                    <button 
                        className="flex items-center p-2 rounded-lg transition-colors hover:bg-gray-700 text-sm"
                        style={{ color: colors.textSecondary, border: `1px solid ${colors.textSecondary}` }}
                        onClick={() => navigate('changePassword')}
                    >
                        <Key size={18} className="mr-1" /> Cambiar Contraseña
                    </button>
                    
                    {/* Botón Cerrar Sesión (Texto - FIX) */}
                    <button 
                        className="flex items-center p-2 rounded-lg transition-colors hover:bg-red-900/50 text-sm"
                        style={{ color: colors.danger, border: `1px solid ${colors.danger}` }}
                        onClick={signOut}
                    >
                        <LogOut size={18} className="mr-1" /> Salir
                    </button>
                    
                    {/* Botón Recargar (Texto - FIX) */}
                    <button 
                        className="flex items-center p-2 rounded-lg transition-colors hover:bg-gray-700 text-sm"
                        style={{ color: colors.textSecondary, border: `1px solid ${colors.textSecondary}` }}
                        onClick={fetchStudents}
                        disabled={isLoading}
                    >
                        <RefreshCcw size={18} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} /> 
                        Recargar Lista
                    </button>
                </div>
            </div>
            
            {/* Contenido Principal */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                
                {/* Barra de Búsqueda */}
                <div className="flex items-center rounded-xl h-12 px-4 mb-6" style={{ backgroundColor: colors.inputBackground }}>
                    <Search size={20} style={{ color: colors.textSecondary }} className="mr-3" />
                    <input
                        className="flex-1 h-full text-white text-base focus:outline-none placeholder-peakfit-secondary bg-transparent"
                        placeholder="Buscar alumno (Nombre, DNI, Email...)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        type="text"
                    />
                    {searchTerm.length > 0 && (
                        <button 
                            className="ml-2 p-1 rounded-full hover:bg-gray-700"
                            onClick={() => setSearchTerm('')}
                        >
                            <X size={18} color={colors.textSecondary} />
                        </button>
                    )}
                </div>
                
                {/* Indicadores de estado */}
                {error && (
                    <p className="mb-4 p-3 text-sm font-semibold text-white text-center rounded-lg" style={{ backgroundColor: colors.error }}>
                        {error}
                    </p>
                )}
                
                {isLoading && students.length === 0 ? (
                    <div className="min-h-[50vh] flex items-center justify-center p-4">
                        <div className="flex flex-col items-center">
                            <Loader2 className="animate-spin text-peakfit-primary mb-4" size={32} style={{ color: colors.primary }} />
                            <h1 className="text-xl font-bold text-white text-center">Cargando lista de alumnos...</h1>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Lista de Alumnos */}
                        {filteredStudents.length > 0 ? (
                            <div className="space-y-3">
                                {filteredStudents.map(student => (
                                    <StudentItem key={student.dni} student={student} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-center mt-10" style={{color: colors.textSecondary}}>
                                {searchTerm ? `No se encontraron alumnos para "${searchTerm}".` : "No hay alumnos registrados en la base de datos."}
                            </p>
                        )}
                        
                        {/* Botón Flotante (FAB) para CREAR GRUPO DE RUTINAS */}
                        <button
                            className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-200 hover:scale-105"
                            style={{ backgroundColor: colors.primary }}
                            onClick={() => navigate('createRoutineGroup')}
                        >
                            <Plus size={28} color={'black'} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};


// ----------------------------------------------------------------------
// 10.1 PANTALLA CREAR EJERCICIO
// ----------------------------------------------------------------------

const ExerciseCreationPage = ({ navigate, onExerciseCreated }) => {
    const { authToken, API_URL, isProfessor } = useAuth();
    if (!isProfessor) return <RedirectMessage message="Acceso denegado. Redirigiendo..." />;

    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [grupoMuscular, setGrupoMuscular] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const isFormValid = nombre.trim() && grupoMuscular.trim();

    const handleAddExercise = async () => {
        if (!isFormValid) {
            setError("El nombre y el grupo muscular son obligatorios.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await axios.post(`${API_URL}/exercises`, {
                nombre: nombre.trim(),
                descripcion: descripcion.trim(),
                grupo_muscular: grupoMuscular.trim(),
            }, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            setSuccess(true);
            setNombre('');
            setDescripcion('');
            setGrupoMuscular('');
            
            onExerciseCreated(response.data); 
            
            setTimeout(() => navigate('back'), 1500); 
            
        } catch (e) {
            console.error("Error al crear ejercicio:", e.response ? e.response.data : e.message);
            setError(`Error: Ya existe un ejercicio con ese nombre o hubo un fallo en la API.`);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Componente Selector (Web)
    const SelectGroup = ({ value, onChange, disabled }) => (
        <select
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`w-full p-3 rounded-xl border appearance-none focus:ring-2 text-base`}
            style={{ 
                backgroundColor: colors.inputBackground, 
                borderColor: colors.inputBackground, 
                color: value === '' ? colors.textSecondary : 'white'
            }}
        >
            {MUSCLE_GROUPS.map(group => (
                <option 
                    key={group.value} 
                    value={group.value} 
                    style={{ backgroundColor: colors.inputBackground, color: 'white' }}
                >
                    {group.label}
                </option>
            ))}
        </select>
    );

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'black' }}>
            <div className="flex items-center p-4 shadow-lg border-b" style={{ backgroundColor: colors.inputBackground }}>
                <button onClick={() => navigate('back')} className="p-2 rounded-lg hover:bg-gray-700" disabled={isLoading}>
                    <ArrowLeft size={24} color={'white'} />
                </button>
                <h1 className="text-xl font-bold ml-4" style={{ color: colors.primary }}>Crear Nuevo Ejercicio</h1>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                <div className="w-full max-w-md">
                    {error && (<p className="mb-4 p-3 text-sm font-semibold text-white text-center rounded-lg bg-red-700/70">{error}</p>)}
                    {success && (
                        <div className="mb-4 p-3 text-sm font-bold text-center rounded-lg text-peakfit-primary bg-peakfit-primary/20">
                            <CheckCircle size={20} className="inline mr-2" style={{ color: colors.primary }} />
                            <span style={{ color: colors.primary }}>¡Ejercicio creado con éxito!</span>
                        </div>
                    )}
                    <div className="space-y-6">
                        <label className="text-base font-semibold block" style={{ color: colors.textPrimary }}>Nombre:</label>
                        <Input placeholder="Ej: Press de Banca" value={nombre} onChange={(e) => setNombre(e.target.value)} Icon={Dumbbell} disabled={isLoading}/>
                        
                        <label className="text-base font-semibold block" style={{ color: colors.textPrimary }}>Descripción (Opcional):</label>
                        <Input 
                            placeholder="Instrucciones breves o variantes" 
                            value={descripcion} 
                            onChange={(e) => setDescripcion(e.target.value)} 
                            Icon={List} 
                            disabled={isLoading} 
                        />
                        
                        <label className="text-base font-semibold block" style={{ color: colors.textPrimary }}>Grupo Muscular:</label>
                        <SelectGroup 
                            value={grupoMuscular}
                            onChange={(e) => setGrupoMuscular(e.target.value)}
                            disabled={isLoading}
                        />
                        
                        <button
                            className="w-full mt-8 p-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl"
                            style={{ backgroundColor: colors.primary, opacity: isLoading || !isFormValid ? 0.5 : 1, boxShadow: `0 4px 8px ${colors.primary}80` }}
                            onClick={handleAddExercise}
                            disabled={isLoading || !isFormValid}
                        >
                            {isLoading ? (<Loader2 className="animate-spin inline mr-2 text-black" size={20} />) : (<span className="text-black">CREAR EJERCICIO</span>)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// ----------------------------------------------------------------------
// 10.2 COMPONENTE: EDITOR DE PARÁMETROS (SERIES/REPS/PESO)
// ----------------------------------------------------------------------

const SelectedExerciseEditor = ({ selectedExercises, onConfirm, onBack, onRemove }) => {
    // Usamos useMemo para evitar recrear el estado editable en cada render
    const [editableExercises, setEditableExercises] = useState(selectedExercises);

    // Actualiza un campo específico (sets, reps) de un ejercicio
    const updateExerciseParam = (index, field, value) => {
        setEditableExercises(prev => prev.map((ex, i) => 
            i === index ? { ...ex, [field]: parseInt(value) || 0 } : ex
        ));
    };
    
    // Actualiza un campo de texto (weight, notes) de un ejercicio
    const updateExerciseTextParam = (index, field, value) => {
        setEditableExercises(prev => prev.map((ex, i) => 
            i === index ? { ...ex, [field]: field === 'weight' ? (parseFloat(value) || 0) : value } : ex
        ));
    };

    // Botón de incremento/decremento
    const NumberControl = ({ value, onChange, min = 0, max = 99 }) => (
        <div className="flex items-center space-x-1">
            <button
                onClick={() => onChange(Math.max(min, value - 1))}
                className="p-1 rounded-full hover:bg-gray-700/50 transition-colors"
                disabled={value <= min}
            >
                <Minus size={18} color={value <= min ? colors.textSecondary : colors.primary} />
            </button>
            <span className="text-lg font-bold text-white w-8 text-center">{value}</span>
            <button
                onClick={() => onChange(Math.min(max, value + 1))}
                className="p-1 rounded-full hover:bg-gray-700/50 transition-colors"
                disabled={value >= max}
            >
                <Plus size={18} color={value >= max ? colors.textSecondary : colors.primary} />
            </button>
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 border-b pb-3 border-gray-800">
                <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-700">
                    <ArrowLeft size={24} color={'white'} />
                </button>
                <h2 className="text-2xl font-bold flex-1 text-center" style={{ color: colors.primary }}>
                    Definir Parámetros
                </h2>
                <div className="w-12"></div> {/* Espaciador */}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 p-2">
                {editableExercises.length === 0 ? (
                    <p className="text-center p-4" style={{ color: colors.textSecondary }}>No hay ejercicios seleccionados para editar.</p>
                ) : (
                    editableExercises.map((ex, index) => (
                        <div 
                            key={ex.id} 
                            className="p-4 rounded-xl shadow-lg border-l-4" 
                            style={{ backgroundColor: colors.inputBackground, borderColor: colors.primary }}
                        >
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-bold text-white">{ex.nombre}</h3>
                                <button onClick={() => onRemove(ex.id)} className="p-1 rounded-full hover:bg-red-700/50">
                                    <Trash2 size={20} color={colors.danger} />
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mt-2">
                                {/* Control de Series */}
                                <div>
                                    <label className="text-xs block mb-1" style={{ color: colors.textSecondary }}>Series (Sets)</label>
                                    <NumberControl 
                                        value={ex.sets} 
                                        onChange={(v) => updateExerciseParam(index, 'sets', v)} 
                                        min={1} 
                                        max={10}
                                    />
                                </div>
                                
                                {/* Control de Repeticiones */}
                                <div>
                                    <label className="text-xs block mb-1" style={{ color: colors.textSecondary }}>Repeticiones</label>
                                    <NumberControl 
                                        value={ex.reps} 
                                        onChange={(v) => updateExerciseParam(index, 'reps', v)} 
                                        min={1} 
                                        max={30}
                                    />
                                </div>
                                
                                {/* Input de Peso (Editable) */}
                                <div>
                                    <label className="text-xs block mb-1" style={{ color: colors.textSecondary }}>Peso (Kg)</label>
                                    <input 
                                        type="number"
                                        value={ex.weight.toString()}
                                        onChange={(e) => updateExerciseTextParam(index, 'weight', e.target.value)}
                                        className="w-full p-2 rounded-lg text-white text-center font-bold"
                                        style={{ backgroundColor: 'black', border: `1px solid ${colors.textSecondary}` }}
                                        min="0"
                                        max="500"
                                    />
                                </div>
                            </div>
                            
                            {/* Notas (Opcional) */}
                             <div className="mt-4">
                                <label className="text-xs block mb-1" style={{ color: colors.textSecondary }}>Notas (Ej: Drop Set, Descanso 30s)</label>
                                <textarea
                                    value={ex.notes}
                                    onChange={(e) => updateExerciseTextParam(index, 'notes', e.target.value)}
                                    className="w-full p-2 rounded-lg text-white"
                                    style={{ backgroundColor: 'black', border: `1px solid ${colors.textSecondary}`, minHeight: '40px' }}
                                    rows="1"
                                    placeholder="Notas específicas del ejercicio (Opcional)"
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <button
                className="w-full mt-4 p-3 rounded-xl font-bold text-lg transition-all duration-300"
                style={{ backgroundColor: colors.primary, opacity: editableExercises.length === 0 ? 0.5 : 1 }}
                onClick={() => onConfirm(editableExercises)}
                disabled={editableExercises.length === 0}
            >
                GUARDAR PARÁMETROS Y CERRAR
            </button>
        </div>
    );
};


// ----------------------------------------------------------------------
// 10.3 MODAL SELECTOR DE EJERCICIOS
// ----------------------------------------------------------------------

const ExerciseSelectorModal = ({ isVisible, onClose, onSelectExercises, navigate, initialSelectedExercises }) => {
    const { authToken, API_URL } = useAuth();
    
    // Vista: 'list' (selección) o 'editor' (series/reps/peso)
    const [view, setView] = useState('list');
    
    const [exercises, setExercises] = useState([]);
    const [selectedExercises, setSelectedExercises] = useState(initialSelectedExercises || []); 
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterGroup, setFilterGroup] = useState('');

    if (!isVisible) return null;

    // Sincronizar selectedExercises y resetear vista al abrir/cambiar rutina
    useEffect(() => {
        if (isVisible) {
            // Clonamos los ejercicios iniciales para poder editarlos en el modal sin afectar el estado principal
            setSelectedExercises(initialSelectedExercises ? JSON.parse(JSON.stringify(initialSelectedExercises)) : []);
            setView('list'); // Siempre empezar en la lista de selección
        }
    }, [isVisible, initialSelectedExercises]);


    const fetchExercises = useCallback(async () => {
        if (!isVisible) return; 

        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/exercises`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            setExercises(response.data);
        } catch (e) {
            console.error("Error fetching exercises:", e);
            if (e.message === 'Network Error') {
                setError("Error de conexión con la API. No se pudieron cargar los ejercicios.");
            } else {
                setError("Error al cargar ejercicios. Verifique si hay ejercicios en su base de datos.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [API_URL, authToken, isVisible]);

    useEffect(() => {
        // Se ejecuta solo cuando el modal se hace visible (isVisible) o el token cambia
        if (isVisible && authToken) {
            fetchExercises();
        }
    }, [isVisible, authToken, fetchExercises]);
    
    // Función de callback para cuando se crea un ejercicio desde el modal
    const handleNewExerciseCreated = (newExercise) => {
        // 1. Añade a la lista de ejercicios disponibles
        setExercises(prev => [newExercise, ...prev]);
        
        // 2. Seleccionarlo automáticamente e incluir los valores por defecto
        setSelectedExercises(prev => [...prev, {
            ...newExercise,
            sets: 3, 
            reps: 10, 
            weight: 0, 
            notes: '', 
        }]);
    };

    const filteredExercises = useMemo(() => {
        return exercises.filter(ex => {
            const matchesSearch = ex.nombre.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesGroup = filterGroup === '' || ex.grupo_muscular === filterGroup;
            return matchesSearch && matchesGroup;
        });
    }, [exercises, searchTerm, filterGroup]);


    const toggleExercise = (exercise) => {
        setSelectedExercises(prev => {
            const existing = prev.find(e => e.id === exercise.id);
            if (existing) {
                return prev.filter(e => e.id !== exercise.id);
            } else {
                // Seleccionar: Añadir con la estructura de link (sets/reps/weight)
                return [...prev, {
                    ...exercise,
                    sets: 3, 
                    reps: 10, 
                    weight: 0, 
                    notes: '', 
                }];
            }
        });
    };

    const handleConfirmSelection = () => {
        // Al confirmar la SELECCIÓN, pasamos a la vista de EDICIÓN
        setView('editor');
    };
    
    const handleConfirmParameters = (finalExercises) => {
        // Al confirmar los PARÁMETROS, cerramos el modal y enviamos los datos
        onSelectExercises(finalExercises);
        onClose();
    };
    
    const handleRemoveFromEditor = (idToRemove) => {
         setSelectedExercises(prev => prev.filter(ex => ex.id !== idToRemove));
    };

    // --- Renderizado de Vistas ---
    
    const renderSelectionList = () => (
        <>
            <div className="flex justify-between items-center mb-4 border-b pb-3 border-gray-800">
                <h2 className="text-2xl font-bold" style={{ color: colors.primary }}>Seleccionar Ejercicios</h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700">
                    <X size={24} color={'white'} />
                </button>
            </div>
            
            {/* Barra de búsqueda y filtros */}
            <div className="flex space-x-3 mb-4 flex-wrap">
                <div className="flex-1 min-w-[200px]" style={{ backgroundColor: colors.inputBackground, borderRadius: '10px' }}>
                     <input
                        className="w-full p-3 text-white focus:outline-none placeholder-peakfit-secondary bg-transparent"
                        placeholder="Buscar por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="min-w-[150px] relative">
                    <select
                        value={filterGroup}
                        onChange={(e) => setFilterGroup(e.target.value)}
                        className={`w-full p-3 rounded-xl border appearance-none focus:ring-2 text-base`}
                        style={{ 
                            backgroundColor: colors.inputBackground, 
                            borderColor: colors.inputBackground, 
                            color: filterGroup === '' ? colors.textSecondary : 'white'
                        }}
                    >
                        {MUSCLE_GROUPS.map(group => (
                            <option key={group.value} value={group.value} style={{ backgroundColor: colors.inputBackground, color: 'white' }}>
                                {group.label === 'Seleccionar Grupo' ? 'Filtrar por Grupo' : group.label}
                            </option>
                        ))}
                    </select>
                    <Filter size={18} color={colors.textSecondary} className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
                 <button 
                    className="p-3 rounded-xl flex items-center transition-colors"
                    style={{ backgroundColor: colors.success + '30', border: `1px solid ${colors.success}` }}
                    // Navegamos a la pantalla de creación, pasando el callback como data temporal
                    onClick={() => navigate('createExercise', { onExerciseCreated: handleNewExerciseCreated })}
                >
                    <Dumbbell size={18} color={colors.success} className="mr-1" /> Nuevo Ejercicio
                </button>
            </div>

            {/* Lista de Ejercicios */}
            <div className="flex-1 overflow-y-auto space-y-2 p-2" style={{ backgroundColor: colors.inputBackground, borderRadius: '10px' }}>
                
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full p-10">
                        <Loader2 className="animate-spin mb-4" size={32} style={{ color: colors.primary }} />
                        <p className="text-white text-center">Cargando ejercicios disponibles...</p>
                    </div>
                ) : (
                    <>
                        {error && <p className="text-red-500 text-center p-4">{error}</p>}
                        
                        {filteredExercises.length === 0 && !error && (
                            <p className="text-center p-4" style={{ color: colors.textSecondary }}>No se encontraron ejercicios. Puedes crear uno nuevo arriba.</p>
                        )}

                        {filteredExercises.map(exercise => {
                            const isSelected = selectedExercises.some(e => e.id === exercise.id);
                            return (
                                <div 
                                    key={exercise.id} 
                                    className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors border ${isSelected ? 'border-peakfit-primary' : 'border-gray-800'}`}
                                    style={{ backgroundColor: isSelected ? colors.primary + '30' : 'transparent' }}
                                    onClick={() => toggleExercise(exercise)}
                                >
                                    <div>
                                        <p className="text-white font-semibold">{exercise.nombre}</p>
                                        <p className="text-xs" style={{ color: colors.textSecondary }}>Grupo: {exercise.grupo_muscular}</p>
                                    </div>
                                    {isSelected ? (
                                        <CheckCircle size={20} color={colors.primary} />
                                    ) : (
                                        <PlusCircle size={20} color={colors.success} />
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

            {/* Botón de Confirmación de Selección */}
            <button
                className="w-full mt-4 p-3 rounded-xl font-bold text-lg transition-all duration-300"
                style={{ backgroundColor: colors.primary, opacity: selectedExercises.length === 0 ? 0.5 : 1 }}
                onClick={handleConfirmSelection}
                disabled={selectedExercises.length === 0}
            >
                PASAR A DEFINIR PARÁMETROS ({selectedExercises.length})
            </button>
        </>
    );

    const renderEditor = () => (
        <SelectedExerciseEditor
            selectedExercises={selectedExercises}
            onConfirm={handleConfirmParameters}
            onBack={() => setView('list')}
            onRemove={handleRemoveFromEditor}
        />
    );
    
    return (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 transition-opacity p-4">
             <div className="bg-black p-8 rounded-xl w-full max-w-4xl shadow-2xl border border-gray-800 h-[90vh] flex flex-col">
                 {view === 'list' ? renderSelectionList() : renderEditor()}
             </div>
         </div>
     );
};

// ----------------------------------------------------------------------
// 11.1 COMPONENTE DE CONTROL NUMÉRICO PARA RUTINAS
// ----------------------------------------------------------------------

const RoutineCountControl = ({ value, onChange, min = 1, max = 5, disabled }) => {
    const increment = () => onChange(Math.min(max, value + 1));
    const decrement = () => onChange(Math.max(min, value - 1));

    return (
        <div className="flex items-center space-x-3 w-full p-2 rounded-xl" style={{ backgroundColor: colors.inputBackground }}>
            <button
                onClick={decrement}
                disabled={disabled || value <= min}
                className={`p-2 rounded-full transition-colors ${value <= min || disabled ? 'bg-gray-700/50' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
                <Minus size={20} color={value <= min || disabled ? colors.textSecondary : colors.primary} />
            </button>
            
            <div className="flex-1 text-center">
                <span className="text-2xl font-bold" style={{ color: colors.primary }}>
                    {value}
                </span>
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                    Rutina{value !== 1 ? 's' : ''}
                </p>
            </div>

            <button
                onClick={increment}
                disabled={disabled || value >= max}
                className={`p-2 rounded-full transition-colors ${value >= max || disabled ? 'bg-gray-700/50' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
                <Plus size={20} color={value >= max || disabled ? colors.textSecondary : colors.primary} />
            </button>
        </div>
    );
};


// ----------------------------------------------------------------------
// 11. PANTALLA CREAR GRUPO DE RUTINAS (FLUJO DE 3 PASOS)
// ----------------------------------------------------------------------

const RoutineGroupCreationPage = ({ navigate }) => {
    const { isProfessor, authToken, API_URL } = useAuth();
    if (!isProfessor) return <RedirectMessage message="Acceso denegado. Redirigiendo..." />;

    const [step, setStep] = useState(1);
    
    // Estado de Rutina
    const [groupName, setGroupName] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [numRoutines, setNumRoutines] = useState(1);
    const [routines, setRoutines] = useState(Array.from({ length: 1 }, (_, i) => ({ 
        id: i + 1, 
        name: `Rutina ${i + 1}`, 
        exercises: [] 
    })));
    
    // Estado de Asignación
    const [availableStudents, setAvailableStudents] = useState([]);
    const [isStudentsLoading, setIsStudentsLoading] = useState(false); 
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    
    // Estado de Modales
    const [isSelectorVisible, setIsSelectorVisible] = useState(false);
    const [currentRoutineIndex, setCurrentRoutineIndex] = useState(null); // Índice de la rutina a editar

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // CRÍTICO: Efecto para ajustar la lista de rutinas si cambia la cantidad (numRoutines)
    useEffect(() => {
        const currentLength = routines.length;
        const newNum = numRoutines;

        if (newNum > 0 && newNum !== currentLength) {
            const newRoutinesArray = Array.from({ length: newNum }, (_, i) => {
                const existingRoutine = routines.find(r => r.id === i + 1);
                return existingRoutine 
                    ? existingRoutine 
                    : { id: i + 1, name: `Rutina ${i + 1}`, exercises: [] };
            });
            setRoutines(newRoutinesArray);
        }
    }, [numRoutines, routines.length]);

    // Función para el Paso 3: Cargar alumnos disponibles
    const fetchStudents = useCallback(async () => {
        setIsStudentsLoading(true); 
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/users/students`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            // La API debe devolver una lista de objetos de usuario (alumnos)
            setAvailableStudents(response.data);
            if (response.data.length === 0) {
                 setError("La API no devolvió alumnos. Asegúrate de que tienes alumnos registrados.");
            } else {
                 setError(null);
            }
        } catch (e) {
            console.error("Error fetching students:", e.response ? e.response.data : e.message);
            setError("Error al cargar la lista de alumnos. Verifique la conexión con la API o la autenticación.");
            setAvailableStudents([]);
        } finally {
            setIsStudentsLoading(false); 
        }
    }, [authToken, API_URL]); 

    // Llama al fetch solo si pasamos al paso 3
    useEffect(() => {
        if (step === 3 && authToken) {
            fetchStudents();
        }
    }, [step, authToken, fetchStudents]);
    
    // --- Manejo del Selector de Ejercicios ---
    
    const handleAddExerciseClick = (index) => {
        setCurrentRoutineIndex(index);
        setIsSelectorVisible(true);
    };

    const handleExercisesSelected = (selectedEx) => {
        if (currentRoutineIndex !== null) {
            setRoutines(prevRoutines => prevRoutines.map((r, i) => 
                i === currentRoutineIndex ? { ...r, exercises: selectedEx } : r
            ));
        }
        setIsSelectorVisible(false);
        setCurrentRoutineIndex(null);
    };

    const removeRoutine = (idToRemove) => {
        setRoutines(prevRoutines => {
            const filtered = prevRoutines.filter(r => r.id !== idToRemove);
            
            if (filtered.length > 0) {
                // Reindexar IDs y nombres
                const reindexed = filtered.map((r, index) => ({
                    ...r,
                    id: index + 1,
                    name: `Rutina ${index + 1}`
                }));
                 // Actualizar el contador de rutinas
                setNumRoutines(reindexed.length);
                return reindexed;
            }
            // Si se borran todas, dejar al menos una vacía
            setNumRoutines(1);
            return [{ id: 1, name: 'Rutina 1', exercises: [] }];
        });
    };


    // --- Validación y Navegación de Pasos ---
    const handleNextStep = () => {
        setError(null);
        if (step === 1) {
            if (!groupName.trim() || !dueDate.trim()) {
                setError("Por favor, completa correctamente el nombre y la fecha de vencimiento.");
                return;
            }
            setStep(2);
        } else if (step === 2) {
            // Validación de Step 2: Todas deben tener nombre Y al menos un ejercicio
            const routinesValid = routines.every(r => r.name.trim().length > 0 && r.exercises.length > 0);
            
            if (!routinesValid) {
                setError("Todas las rutinas deben tener un nombre y al menos un ejercicio asignado.");
                return;
            }
            setStep(3);
        }
    };
    
    // Función final de guardado/asignación
    const handleSaveGroupAndAssign = async () => {
        if (selectedStudentIds.length === 0) {
            setError("Debes seleccionar al menos un alumno para asignar el grupo.");
            return;
        }

        const payload = {
            routine_group: {
                name: groupName,
                // CRÍTICO: Enviamos el string YYYY-MM-DD directamente, el backend debe manejarlo
                due_date: dueDate,
                routines: routines.map(r => ({
                    name: r.name,
                    exercises: r.exercises.map(ex => ({
                        exercise_id: ex.id, 
                        sets: ex.sets,
                        reps: ex.reps,
                        weight: ex.weight,
                        notes: ex.notes,
                    }))
                }))
            },
            student_ids: selectedStudentIds
        };

        setIsLoading(true);
        setError(null);

        try {
            console.log("Enviando Payload para Asignación:", payload);
            // Simulación de API para asignación
            // await axios.post(`${API_URL}/routine-groups/assign`, payload, { headers: { Authorization: `Bearer ${authToken}` } });

            alert(`Grupo "${groupName}" asignado a ${selectedStudentIds.length} alumnos (Simulación Exitosa).`);
            setTimeout(() => navigate('dashboard'), 1500);

        } catch (e) {
            console.error("Error al asignar grupo de rutinas:", e);
            setError("Error al guardar o asignar el grupo de rutinas. Verifique el backend.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Componente de Alumno para Asignación ---
    const AssignmentStudentItem = ({ student }) => {
        const isSelected = selectedStudentIds.includes(student.id);

        const toggleSelection = () => {
            setSelectedStudentIds(prev => 
                isSelected 
                    ? prev.filter(id => id !== student.id)
                    : [...prev, student.id]
            );
        };

        return (
            <div 
                className={`flex items-center justify-between p-3 mb-2 rounded-xl cursor-pointer transition-colors border ${isSelected ? 'border-peakfit-primary' : 'border-gray-800'}`}
                style={{ backgroundColor: isSelected ? colors.primary + '30' : colors.inputBackground }}
                onClick={toggleSelection}
            >
                <div className="flex items-center">
                    <User size={20} color={isSelected ? colors.primary : colors.textSecondary} className="mr-3" />
                    <p className="text-white font-semibold">{student.nombre || 'Sin Nombre'}</p>
                </div>
                {isSelected ? (
                    <CheckCircle size={20} color={colors.primary} />
                ) : (
                    <PlusCircle size={20} color={colors.textSecondary} />
                )}
            </div>
        );
    };

    // --- Renderizado de Pasos ---

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold" style={{ color: colors.primary }}>Paso 1: Configuración del Grupo</h2>
                        
                        <label className="text-base font-semibold block" style={{ color: colors.textPrimary }}>Nombre del Grupo:</label>
                        <Input
                            placeholder="Ej: Mes 1 - Adaptación"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            Icon={Zap}
                            disabled={isLoading}
                        />
                        
                        <label className="text-base font-semibold block" style={{ color: colors.textPrimary }}>Fecha de Vencimiento:</label>
                        <Input
                            placeholder="DD/MM/AAAA"
                            // El valor del input type date es la única parte que no necesita corrección si no viene de la API.
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            Icon={Calendar}
                            type="date"
                            disabled={isLoading}
                        />
                        
                        <label className="text-base font-semibold block" style={{ color: colors.textPrimary }}>Cantidad de Rutinas (1-5 Días):</label>
                        {/* CRÍTICO: Control Numérico para agregar/quitar rutinas */}
                        <RoutineCountControl
                            value={numRoutines}
                            onChange={setNumRoutines}
                            disabled={isLoading}
                        />
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold mb-4" style={{ color: colors.primary }}>Paso 2: Definición de Rutinas ({routines.length}/5)</h2>
                        
                        {routines.map((routine, index) => (
                            <div key={routine.id} className="p-4 rounded-xl shadow-lg" style={{ backgroundColor: colors.inputBackground, borderLeft: `4px solid ${colors.primary}` }}>
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>Rutina {index + 1}</h3>
                                    <button 
                                        onClick={() => removeRoutine(routine.id)}
                                        className="p-1 rounded-full hover:bg-red-700/50"
                                        disabled={routines.length <= 1 || isLoading}
                                    >
                                        <Trash2 size={18} color={routines.length <= 1 ? colors.textSecondary : colors.danger} />
                                    </button>
                                </div>
                                
                                <div className="mb-4">
                                    <input
                                        className="w-full p-2 text-white text-base focus:outline-none placeholder-peakfit-secondary bg-transparent border-b border-gray-700 focus:border-peakfit-primary"
                                        placeholder={`Nombre de Rutina ${index + 1} (Ej: Lunes - Pecho/Tríceps)`}
                                        value={routine.name}
                                        onChange={(e) => {
                                            const newRoutines = [...routines];
                                            newRoutines[index].name = e.target.value;
                                            setRoutines(newRoutines);
                                        }}
                                        disabled={isLoading}
                                    />
                                </div>

                                <button 
                                    className="w-full p-3 mt-3 rounded-lg flex items-center justify-center font-bold transition-colors"
                                    style={{backgroundColor: colors.primary, color: 'black'}}
                                    onClick={() => handleAddExerciseClick(index)}
                                    disabled={isLoading}
                                >
                                    <Dumbbell size={18} color={'black'} className="mr-2" />
                                    <span className="text-black">Seleccionar/Editar Ejercicios ({routine.exercises.length})</span>
                                </button>
                                
                                {routine.exercises.length > 0 && (
                                    <div className="mt-3 p-2 rounded-lg" style={{backgroundColor: colors.inputBackground}}>
                                        <p className="text-xs font-semibold mb-1" style={{color: colors.primary}}>Ejercicios Seleccionados:</p>
                                        <ul className="list-disc list-inside text-sm">
                                            {routine.exercises.slice(0, 3).map(ex => (
                                                <li key={ex.id} className="text-white truncate" style={{color: colors.textSecondary}}>
                                                    {ex.nombre} (Sets: {ex.sets}, Reps: {ex.reps})
                                                </li>
                                            ))}
                                            {routine.exercises.length > 3 && (
                                                <li className="text-white text-xs" style={{color: colors.textSecondary}}>
                                                    ... y {routine.exercises.length - 3} más.
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold" style={{ color: colors.primary }}>Paso 3: Asignar a Alumnos ({selectedStudentIds.length} seleccionados)</h2>
                        
                        {isStudentsLoading ? (
                            <div className="flex flex-col items-center justify-center h-48">
                                <Loader2 className="animate-spin mb-4" size={32} style={{ color: colors.primary }} />
                                <p className="text-white text-center">Cargando lista de alumnos...</p>
                            </div>
                        ) : (
                            <div className="max-h-96 overflow-y-auto p-2 rounded-lg" style={{backgroundColor: colors.inputBackground}}>
                                {/* CRÍTICO: Mostramos el error si no hay alumnos disponibles */}
                                {error && availableStudents.length === 0 ? (
                                     <p className="text-red-500 text-center p-4">Error al cargar alumnos: {error}</p>
                                ) : availableStudents.length > 0 ? (
                                    availableStudents.map(student => (
                                        <AssignmentStudentItem key={student.id} student={student} />
                                    ))
                                ) : (
                                    <p className="text-center p-4" style={{color: colors.textSecondary}}>No hay alumnos registrados en la base de datos para asignar.</p>
                                )}
                            </div>
                        )}
                        
                        {availableStudents.length > 0 && (
                            <p className="text-sm pt-2" style={{ color: colors.textSecondary }}>
                                Seleccionados: {selectedStudentIds.length} alumnos
                            </p>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    // Barra de progreso del paso
    const StepIndicator = ({ current }) => (
        <div className="flex justify-between w-full max-w-sm mx-auto mb-6">
            {[1, 2, 3].map((s) => (
                <div key={s} className="flex flex-col items-center">
                    <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${s <= current ? 'bg-peakfit-primary text-black' : 'bg-gray-700 text-white'}`}
                        style={{ border: s > current ? `2px solid ${colors.textSecondary}` : 'none' }}
                    >
                        {s}
                    </div>
                    <p className={`text-xs mt-1 ${s === current ? 'font-bold' : ''}`} style={{ color: s <= current ? colors.primary : colors.textSecondary }}>
                        {s === 1 ? 'Config' : s === 2 ? 'Rutinas' : 'Asignar'}
                    </p>
                </div>
            ))}
        </div>
    );
    
    // Validaciones para deshabilitar el botón "SIGUIENTE"
    const isStep2Valid = routines.every(r => r.name.trim().length > 0 && r.exercises.length > 0);
    const isStep3Valid = selectedStudentIds.length > 0;
    
    // El botón Siguiente se deshabilita si está cargando, o si el paso actual no es válido.
    const isNextDisabled = isLoading || (step === 1 && (!groupName.trim() || !dueDate.trim() || numRoutines < 1)) || (step === 2 && !isStep2Valid) || (step === 3 && !isStep3Valid);

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'black' }}>
             
             {/* Modal Selector de Ejercicios */}
             {isSelectorVisible && currentRoutineIndex !== null && (
                <ExerciseSelectorModal 
                    // Pasa el ID de la rutina para forzar el remount y reset del estado interno del modal
                    key={`selector-${currentRoutineIndex}`}
                    isVisible={isSelectorVisible}
                    onClose={() => setIsSelectorVisible(false)}
                    onSelectExercises={handleExercisesSelected}
                    // Pasa los ejercicios YA seleccionados para la rutina actual
                    initialSelectedExercises={routines[currentRoutineIndex]?.exercises || []}
                    navigate={navigate}
                />
             )}
             
             <div className="flex items-center justify-between p-4 shadow-lg border-b" style={{ backgroundColor: colors.inputBackground }}>
                <button onClick={() => step > 1 ? setStep(step - 1) : navigate('dashboard')} className="p-2 rounded-lg hover:bg-gray-700" disabled={isLoading}>
                    <ArrowLeft size={24} color={'white'} />
                </button>
                <h1 className="text-xl font-bold ml-4 flex-1" style={{ color: colors.primary }}>Crear Grupo (Paso {step}/3)</h1>
                
                {/* Botón de GUARDAR/SIGUIENTE */}
                <button 
                    className="p-2 rounded-xl flex items-center transition-colors"
                    style={{ backgroundColor: colors.primary, opacity: isNextDisabled ? 0.6 : 1 }}
                    onClick={step < 3 ? handleNextStep : handleSaveGroupAndAssign}
                    disabled={isNextDisabled}
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin inline mr-2 text-black" size={20} />
                    ) : (
                        <span className="text-black font-semibold mr-1">
                            {step === 3 ? 'GUARDAR Y ASIGNAR' : 'SIGUIENTE'}
                        </span>
                    )}
                    
                    {step === 3 ? <Save size={20} className="text-black" /> : <ChevronRight size={20} className="text-black" />}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="w-full max-w-2xl mx-auto">
                    
                    <StepIndicator current={step} />
                    
                    {error && (<p className="mb-4 p-3 text-sm font-semibold text-white text-center rounded-lg bg-red-700/70">{error}</p>)}
                    
                    {renderStepContent()}
                    
                </div>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 12. NUEVA PANTALLA: GRUPO DE RUTINAS DEL ALUMNO
// ----------------------------------------------------------------------

const StudentRoutineGroupPage = ({ navigate, studentId, studentName }) => {
    const { authToken, API_URL, isProfessor } = useAuth();
    if (!isProfessor) return <RedirectMessage message="Acceso denegado." />;
    if (!studentId) return <RedirectMessage message="ID de Alumno no proporcionado. Redirigiendo..." />;

    const [routineGroup, setRoutineGroup] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchRoutineGroup = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setRoutineGroup(null);
        
        try {
            const response = await axios.get(`${API_URL}/routine-assignments/student/${studentId}/active`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            
            const assignments = response.data;
            
            // CRITICO: LOGGING DETALLADO PARA DIAGNÓSTICO
            console.log("--- API Response Data for Student Routines (ID: " + studentId + ") ---");
            console.log(`Endpoint: ${API_URL}/routine-assignments/student/${studentId}/active`);
            console.log("Assignments Full Data:", assignments); // Log all data
            
            // **IMPORTANTE**: Si el array está vacío, significa que NO hay asignación activa.
            if (!Array.isArray(assignments) || assignments.length === 0) {
                 setError(`El alumno ${studentName} **NO** tiene un grupo de rutinas activo asignado. Si el alumno sí tiene una asignación, el backend está devolviendo una lista vacía. (ID Alumno: ${studentId})`);
                 setIsLoading(false); // <--- Aseguramos que se detenga la carga aquí
                 return;
            }
            
            const firstAssignment = assignments[0];
            
            // CRÍTICO: Uso de encadenamiento opcional para obtener datos del grupo de forma segura
            const groupName = firstAssignment?.routine?.routine_group?.name || 'Grupo Desconocido (Datos Incompletos)';
            const dueDate = firstAssignment?.routine?.routine_group?.due_date || 'N/A';
            
            setRoutineGroup({
                name: groupName,
                due_date: dueDate,
                routines: assignments.reduce((acc, current) => {
                    const routineId = current?.routine_id;
                    const routine = current?.routine; // Objeto de Rutina (puede ser null/parcial)
                    
                    if (routineId && routine) {
                        // Evitar duplicados en la vista si el backend devuelve varias asignaciones con el mismo routine_id
                        if (acc[routineId]) return acc; 

                        acc[routineId] = {
                            name: routine.name || `Rutina ID ${routineId} (Nombre Faltante)`,
                            // Safely access exercises, default to empty array if missing
                            exercises: Array.isArray(routine.exercises) ? routine.exercises : [] 
                        };
                    }
                    return acc;
                }, {})
            });
            
        } catch (e) {
            console.error("Error fetching routine group:", e.response ? e.response.data : e.message);
            
            let msg = "Error de conexión con la API o el servidor no respondió correctamente.";
            if (e.response && e.response.status === 404) {
                msg = `El alumno ${studentName} no tiene un grupo de rutinas activo asignado. (Error 404)`;
            } else if (e.response && e.response.data && typeof e.response.data.detail === 'string') {
                msg = e.response.data.detail;
            }
            // Mensaje genérico de error que sugiere la revisión.
            setError(`Fallo al cargar la rutina: ${msg}. Por favor, revisa la consola para ver los datos recibidos (Assignments Full Data).`);
        } finally {
            setIsLoading(false);
        }
    }, [studentId, authToken, API_URL, studentName]);

    useEffect(() => {
        fetchRoutineGroup();
    }, [fetchRoutineGroup]);
    
    
    // Helper para renderizar los ejercicios de una rutina
    const RoutineCard = ({ name, exercises }) => (
        <div className="p-4 rounded-xl shadow-lg border-l-4 mb-4" style={{ backgroundColor: colors.inputBackground, borderColor: colors.primary }}>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center">
                <Dumbbell size={18} style={{color: colors.primary}} className="mr-2" />
                {name} ({exercises.length} ejercicios)
            </h3>
            {exercises.length === 0 ? (
                 <p className="text-sm italic" style={{color: colors.textSecondary}}>No hay ejercicios definidos para esta rutina.</p>
            ) : (
                <ul className="list-disc list-inside space-y-2 text-sm pl-4">
                    {exercises.map((ex, index) => {
                        // CRÍTICO: Uso de encadenamiento opcional para el nombre del ejercicio
                        const exerciseName = ex.exercise?.nombre || 'Ejercicio Desconocido (Datos Faltantes)';
                        // Usamos el ID del exercise (si existe) o el índice del link para la clave
                        const key = ex.exercise ? ex.exercise.id : index; 
                        
                        return (
                            <li key={key} className="text-white" style={{color: colors.textSecondary}}>
                                <span className="font-semibold" style={{color: colors.textPrimary}}>{exerciseName}</span>: {ex.sets} Sets x {ex.reps} Reps.
                                {ex.notes && <span className="text-xs italic ml-2">({ex.notes})</span>}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );

    // CRITICO: La fecha viene del routineGroup anidado, que se guarda en el estado
    const formattedDueDate = routineGroup?.due_date ? formatDateForInput(routineGroup.due_date) : 'N/A';

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'black' }}>
            <div className="flex items-center p-4 shadow-lg border-b" style={{ backgroundColor: colors.inputBackground }}>
                <button onClick={() => navigate('dashboard')} className="p-2 rounded-lg hover:bg-gray-700">
                    <ArrowLeft size={24} color={'white'} />
                </button>
                <h1 className="text-xl font-bold ml-4" style={{ color: colors.primary }}>
                    Rutinas de {studentName}
                </h1>
                 <button 
                    className="ml-auto p-2 rounded-full hover:bg-gray-700 transition-colors"
                    onClick={fetchRoutineGroup}
                    disabled={isLoading}
                >
                    <RefreshCcw size={20} color={colors.textSecondary} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                <div className="w-full max-w-2xl">
                    
                    {isLoading ? (
                        <div className="text-center mt-20">
                            <Loader2 className="animate-spin mb-4 inline" size={32} style={{ color: colors.primary }} />
                            <p className="text-white">Cargando grupo de rutinas...</p>
                        </div>
                    ) : error ? (
                        // Estilo de error más moderado (tarjeta gris con borde de color primario/alerta)
                        <p 
                            className="mb-4 p-3 text-sm font-semibold text-white text-left rounded-xl border" 
                            style={{ 
                                backgroundColor: colors.softAlert, 
                                borderColor: colors.primary + '80' 
                            }}
                        >
                            <Info size={16} className="inline mr-2" color={colors.primary} />
                            **Error de Asignación:** {error}
                            <span className="block mt-2 text-xs" style={{color: colors.textSecondary}}>
                                Si sabes que el alumno tiene rutinas, por favor, revisa la consola de tu navegador (`F12`) y el apartado **Assignments Full Data** para diagnosticar el problema de la estructura de la API.
                            </span>
                        </p>
                    ) : (
                        routineGroup && (
                            <div className="space-y-6">
                                <div className="p-4 rounded-xl shadow-lg" style={{ backgroundColor: colors.inputBackground }}>
                                    <h2 className="text-2xl font-bold mb-2" style={{ color: colors.primary }}>{routineGroup.name}</h2>
                                    <p className="text-sm" style={{color: colors.textSecondary}}>
                                        <Calendar size={14} className="inline mr-1" /> Vencimiento: {formattedDueDate}
                                    </p>
                                    <p className="text-sm" style={{color: colors.textSecondary}}>
                                        <Settings size={14} className="inline mr-1" /> Rutinas definidas: {Object.keys(routineGroup.routines).length}
                                    </p>
                                </div>
                                
                                <h2 className="text-xl font-bold" style={{ color: colors.primary }}>Detalle de Rutinas:</h2>

                                {Object.values(routineGroup.routines).map((routine, index) => (
                                    <RoutineCard 
                                        key={index} 
                                        name={routine.name} 
                                        exercises={routine.exercises}
                                    />
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};


// ----------------------------------------------------------------------
// 13. COMPONENTE PRINCIPAL (Ruteador)
// ----------------------------------------------------------------------
const App = () => {
    const [currentScreen, setCurrentScreen] = useState('login');
    // Usamos state en lugar de tempData en el hook `useCallback`
    const [temporaryData, setTemporaryData] = useState({});

    const { isAuthenticated, isProfessor, isLoading: authLoading, signOut } = useAuth();

    const navigate = useCallback((screen, data = {}) => {
        if (screen === 'back') {
            setCurrentScreen(prev => {
                if (prev === 'createExercise' || prev === 'viewRoutineGroup') {
                    return 'createRoutineGroup';
                }
                if (['addStudent', 'changePassword', 'createRoutineGroup', 'viewRoutineGroup'].includes(prev)) {
                    return 'dashboard';
                }
                return 'login';
            });
            return;
        } else {
            // CRÍTICO: Usamos el estado para pasar datos (ej. el callback, studentId/Name)
            setTemporaryData(data); 
            setCurrentScreen(screen);
        }
    }, []);

    // Lógica de Redirección (Sincroniza la URL con el estado de auth)
    useEffect(() => {
        if (authLoading) return;

        if (isAuthenticated) {
            if (currentScreen === 'login' || currentScreen === 'forgotPassword') {
                setCurrentScreen('dashboard');
            } else if ((currentScreen === 'addStudent' || currentScreen === 'createRoutineGroup' || currentScreen === 'createExercise') && !isProfessor) {
                // Si intenta acceder a pantallas de profesor sin serlo
                setCurrentScreen('dashboard');
            }
        } else {
            if (currentScreen !== 'login' && currentScreen !== 'forgotPassword') {
                setCurrentScreen('login');
            }
        }
    }, [isAuthenticated, isProfessor, authLoading, currentScreen]);

    if (authLoading) {
        return <RedirectMessage message="Cargando autenticación..." />;
    }
    
    let ScreenComponent;
    
    switch (currentScreen) {
        case 'login':
            ScreenComponent = <LoginPage navigate={navigate} />;
            break;
        case 'forgotPassword':
            ScreenComponent = <ForgotPasswordPage navigate={navigate} />;
            break;
        case 'changePassword':
            ScreenComponent = isAuthenticated ? <ChangePasswordPage navigate={navigate} /> : <RedirectMessage message="Acceso requerido para cambiar contraseña. Redirigiendo..." />;
            break;
        case 'addStudent':
            ScreenComponent = isAuthenticated && isProfessor ? <AddStudentPage navigate={navigate} /> : <RedirectMessage message="Acceso no autorizado. Redirigiendo..." />;
            break;
        case 'createExercise':
            // Pasamos el callback `onExerciseCreated` de los datos temporales
            ScreenComponent = isAuthenticated && isProfessor ? (
                <ExerciseCreationPage 
                    navigate={navigate} 
                    onExerciseCreated={temporaryData.onExerciseCreated || (() => console.log('Callback not set'))} 
                />
            ) : <RedirectMessage message="Acceso no autorizado. Redirigiendo..." />;
            break;
        case 'createRoutineGroup':
            ScreenComponent = isAuthenticated && isProfessor ? <RoutineGroupCreationPage navigate={navigate} /> : <RedirectMessage message="Acceso no autorizado. Redirigiendo..." />;
            break;
        case 'viewRoutineGroup':
            ScreenComponent = isAuthenticated && isProfessor ? (
                <StudentRoutineGroupPage 
                    navigate={navigate} 
                    studentId={temporaryData.studentId}
                    studentName={temporaryData.studentName}
                />
            ) : <RedirectMessage message="Acceso no autorizado. Redirigiendo..." />;
            break;
        case 'dashboard':
            if (isAuthenticated) {
                if (isProfessor) {
                    ScreenComponent = <ProfessorPage navigate={navigate} />; 
                } else {
                    // Dashboard de Alumno (Simulación)
                    ScreenComponent = (
                        <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: 'black' }}>
                            <h1 className="text-3xl font-bold mb-4" style={{ color: colors.primary }}>Dashboard de Alumno</h1>
                            <p className="text-white mb-8">Aquí verías tus rutinas asignadas. (Simulación)</p>
                            <button className="p-3 rounded-xl font-bold transition-colors border" style={{ borderColor: colors.textSecondary, color: colors.textSecondary }} onClick={signOut}>Cerrar Sesión</button>
                        </div>
                    );
                }
            } else {
                ScreenComponent = <RedirectMessage message="Acceso requerido. Redirigiendo..." />;
            }
            break;
        default:
            ScreenComponent = <RedirectMessage message="Inicializando..." />;
            break;
    }

    return (
        <div id="peakfit-web-app" className="min-h-screen font-sans">
            {/* Estilos globales y de Tailwind (asumido cargado via CDN) */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
                :root {
                    --color-peakfit-primary: ${colors.primary};
                    --color-peakfit-secondary: ${colors.textSecondary};
                    --color-peakfit-input: ${colors.inputBackground};
                }
                body {
                    margin: 0;
                    font-family: 'Inter', sans-serif;
                    background-color: black;
                }
                .text-peakfit-primary { color: var(--color-peakfit-primary); }
                .bg-peakfit-primary { background-color: var(--color-peakfit-primary); }
                .bg-peakfit-input { background-color: var(--color-peakfit-input); }
                .placeholder-peakfit-secondary::placeholder { color: var(--color-peakfit-secondary); }
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none;
                    margin: 0;
                }
                select {
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23A9A9A9'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.23 8.27a.75.75 0 01.02-1.06z' clip-rule='evenodd' /%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 0.75rem center;
                    background-size: 1.5em 1.5em;
                }
            `}</style>
            {ScreenComponent}
        </div>
    );
};

// Componente Wrapper para el contexto
const AppWrapper = () => (
    <AuthProvider>
        <App />
    </AuthProvider>
);

export default AppWrapper;