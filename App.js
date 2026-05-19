import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { 
    StyleSheet, Text, View, ActivityIndicator, 
    SafeAreaView, ScrollView, StatusBar, TouchableOpacity, Modal, 
    useColorScheme, // Importación clave: Para detectar el modo del sistema
    Button
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

import ProfessorScreen from './screens/ProfessorScreen'; 
import CustomLoginScreen from './screens/CustomLoginScreen';
import RoutineCreationScreen from './screens/RoutineCreationScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen'; 
import StudentDetailsScreen from './screens/StudentDetailsScreen';
// Rutas de Profesor
import AddStudentScreen from './screens/AddStudentScreen'; 
import ExercisesAdd from './screens/ExercisesAdd';
import RoutineEditScreen from './screens/RoutineEditScreen'; 
// Rutas de Alumno
import StudentRoutineScreen from './screens/StudentRoutineScreen'; 
// Importación clave: Importamos el ThemeProvider y el hook 
import { ThemeProvider, useTheme } from './ThemeContext'; 

// 🚨 NUEVA IMPORTACIÓN: Pantalla de recuperación de contraseña
import ForgotPasswordScreen from './screens/ForgotPasswordScreen'; 


// ----------------------------------------------------------------------
// Función para decodificar el token y obtener el rol
const decodeToken = (token) => {
    try {
        const decoded = jwtDecode(token);
        // Si el token tiene el nombre, podemos devolverlo también para el contexto
        return { rol: decoded.rol, nombre: decoded.nombre };
    } catch (e) {
        console.error("Error decodificando token:", e);
        return { rol: null, nombre: null };
    }
}
// ----------------------------------------------------------------------
// URL pública del backend
// ----------------------------------------------------------------------
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 
// ----------------------------------------------------------------------

// 1. Creamos un Contexto de Autenticación
export const AuthContext = createContext();

// --- PANTALLA DE LOGIN (Llama al componente personalizado) ---
function LoginScreen() {
    // El useTheme no es necesario aquí si solo se usa en CustomLoginScreen
    const { signIn } = useContext(AuthContext); 
    
    return (
        <CustomLoginScreen signIn={signIn} API_URL={API_URL} />
    );
}

// --- NAVEGADOR PRINCIPAL ---
const Stack = createNativeStackNavigator();

export default function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [userToken, setUserToken] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userProfile, setUserProfile] = useState(null); // Nuevo estado para perfil

    // Hook para determinar el esquema de color y ajustar el color del Header/Loader
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    // Colores del tema base para el cargador inicial
    const primaryColor = isDark ? '#60A5FA' : '#007AFF';
    const cardColor = isDark ? '#1F2937' : '#FFFFFF';
    const backgroundColor = isDark ? '#121212' : '#F0F4F8';


    const authContext = useMemo(() => ({
        signIn: async (token) => {
            try {
                await AsyncStorage.setItem('user_token', token);
                const { rol, nombre } = decodeToken(token);
                setUserRole(rol);
                setUserProfile({ nombre: nombre });
                setUserToken(token);
            } catch (e) {
                console.error("Error guardando token o decodificando:", e);
            }
        },
        signOut: async () => {
            try {
                await AsyncStorage.removeItem('user_token');
                setUserToken(null);
                setUserRole(null);
                setUserProfile(null);
            } catch (e) {
                console.error("Error borrando token", e);
            }
        },
        getToken: async () => {
            try {
                return await AsyncStorage.getItem('user_token');
            } catch (e) {
                console.error("Error obteniendo token", e);
                return null;
            }
        },
        userProfile: userProfile, // Exportar el perfil
    }), [userToken, userProfile]);

    useEffect(() => {
        const checkToken = async () => {
            let token = null;
            try {
                token = await AsyncStorage.getItem('user_token');
            } catch (e) {
                console.error("Error leyendo token", e);
            }
            
            if (token) {
                const { rol, nombre } = decodeToken(token);
                setUserRole(rol);
                setUserProfile({ nombre: nombre });
            }
            setUserToken(token);
            setIsLoading(false);
        };
        checkToken();
    }, []);

    if (isLoading) {
        return (
            // Usamos colores dinámicos para el cargador inicial
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: backgroundColor }}>
                <ActivityIndicator size="large" color={primaryColor} />
            </View>
        );
    }

    // Lógica de navegación basada en roles
    const initialRouteName = userToken == null ? "Login" : (userRole === "Profesor" ? "ProfessorPanel" : "StudentRoutine");

    // El cerebro de la navegación
    return (
        <AuthContext.Provider value={authContext}>
            {/* ENVOLVEMOS EL NAVEGADOR CON EL CONTEXTO DE TEMA */}
            <ThemeProvider> 
                <NavigationContainer>
                    {/* Usamos colores dinámicos para el header global */}
                    <Stack.Navigator screenOptions={{ 
                        headerShown: true, 
                        headerTintColor: primaryColor, // Color del texto y flecha
                        headerStyle: { backgroundColor: cardColor }, // Fondo del header
                        headerTitleStyle: { color: primaryColor }
                    }} 
                    initialRouteName={initialRouteName}>
                        {userToken == null ? (
                            <>
                                <Stack.Screen 
                                    name="Login" 
                                    component={LoginScreen} 
                                    options={{ title: 'Ingresar', headerShown: false }}
                                />
                                {/* 🚨 RUTA AGREGADA: Olvidaste Contraseña */}
                                <Stack.Screen 
                                    name="ForgotPassword" 
                                    component={ForgotPasswordScreen} 
                                    options={{ title: 'Olvidé mi Contraseña', headerShown: false }}
                                />
                            </>
                        ) : userRole === "Profesor" ? (
                            <>
                                <Stack.Screen 
                                    name="ProfessorPanel" 
                                    component={ProfessorScreen} 
                                    options={{ title: 'Panel Profesor', headerShown: false }} 
                                />
                                <Stack.Screen 
                                    name="RoutineCreation" 
                                    component={RoutineCreationScreen} 
                                    options={{ title: 'Crear Rutina' }}
                                />
                                <Stack.Screen 
                                    name="StudentDetails" 
                                    component={StudentDetailsScreen} 
                                    options={{ title: 'Detalles del Alumno' }}
                                />
                                <Stack.Screen 
                                    name="ChangePassword" 
                                    component={ChangePasswordScreen} 
                                    options={{ title: 'Cambiar Contraseña' }}
                                />
                                <Stack.Screen 
                                    name="AddStudent" 
                                    component={AddStudentScreen} 
                                    options={{ title: 'Registrar Alumno', headerShown: false }} // Usamos el header interno
                                />
                                <Stack.Screen 
                                    name="ExercisesAdd" 
                                    component={ExercisesAdd} 
                                    options={{ title: 'Añadir Ejercicio', headerShown: false }} // Usamos el header interno del componente
                                />
                                {/* <--- ¡RUTA DE EDICIÓN DE RUTINA AÑADIDA! ---> */}
                                <Stack.Screen 
                                    name="RoutineEditScreen" 
                                    component={RoutineEditScreen} 
                                    // Esta pantalla probablemente usa los mismos parámetros de creación para editar
                                    options={{ title: 'Editar Rutina', headerShown: false }} 
                                />
                            </>
                        ) : (
                            // Rutas del Alumno
                            <>
                                <Stack.Screen 
                                    name="StudentRoutine" 
                                    component={StudentRoutineScreen} 
                                    options={{ title: 'Mi Rutina', headerShown: false }} // Usamos el header interno
                                />
                                <Stack.Screen 
                                    name="ChangePassword" 
                                    component={ChangePasswordScreen} 
                                    options={{ title: 'Cambiar Contraseña' }}
                                />
                            </>
                        )}
                    </Stack.Navigator>
                </NavigationContainer>
            </ThemeProvider>
        </AuthContext.Provider>
    );
}

// ----------------------------------------------------------------------
// Estilos vacíos. La lógica de estilo del alumno ahora está en StudentRoutineScreen.js
// ----------------------------------------------------------------------
const styles = StyleSheet.create({});