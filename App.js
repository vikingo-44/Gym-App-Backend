import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { 
    StyleSheet, Text, View, ActivityIndicator, 
    SafeAreaView, ScrollView, StatusBar, TouchableOpacity, Modal, 
    useColorScheme, // ?? IMPORTACI車N CLAVE: Para detectar el modo del sistema
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
// ?? IMPORTACI車N CLAVE: Importamos el ThemeProvider y el hook (Asumiendo ThemeContext.js est芍 al mismo nivel)
import { ThemeProvider, useTheme } from './ThemeContext'; 

// ----------------------------------------------------------------------
// Funci車n para decodificar el token y obtener el rol
const decodeToken = (token) => {
    try {
        const decoded = jwtDecode(token);
        return decoded.rol;
    } catch (e) {
        console.error("Error decodificando token:", e);
        return null;
    }
}
// ----------------------------------------------------------------------
// ???IMPORTANTE!!!
// Pega tu URL p迆blica de Ngrok aqu赤 (la que termina en .ngrok.io)
// ----------------------------------------------------------------------
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 
// ----------------------------------------------------------------------

// 1. Creamos un Contexto de Autenticaci車n
export const AuthContext = createContext();

// --- PANTALLA DE LOGIN (Llama al componente personalizado) ---
function LoginScreen() {
    // ?? El tema se usar芍 dentro de CustomLoginScreen para sus estilos
    const { signIn } = useContext(AuthContext); 
    
    return (
        <CustomLoginScreen signIn={signIn} API_URL={API_URL} />
    );
}

// ----------------------------------------------------------------------
// GENERADOR DE ESTILOS DIN芍MICOS PARA ALUMNO (StudentRoutineScreen)
// ----------------------------------------------------------------------
const getStudentStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background, 
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    errorText: {
        color: colors.danger,
        fontWeight: '600',
        marginTop: 10,
        textAlign: 'center',
        backgroundColor: colors.card,
        padding: 10,
        borderRadius: 8,
    },
    // Estilos de la cabecera
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.primary,
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 15,
    },
    iconButton: {
        padding: 8,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.highlight,
    },
    refreshIcon: {
        color: colors.primaryDark,
        fontSize: 22,
        fontWeight: 'normal',
    },
    menuIcon: {
        color: colors.textPrimary,
        fontSize: 22, 
        fontWeight: 'normal',
    },
    // Contenido principal
    mainContentHeader: {
        marginBottom: 20,
        paddingHorizontal: 15,
        paddingTop: 20,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 5,
    },
    // Tarjeta de Rutina Maestra
    routineMainCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 20,
        marginHorizontal: 15,
        marginBottom: 25,
        shadowColor: colors.isDark ? '#000' : '#444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: colors.isDark ? 0.4 : 0.1,
        shadowRadius: 5,
        elevation: 5,
        borderLeftWidth: 6,
        borderLeftColor: colors.primary, // Azul primario
    },
    routineTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.primaryDark,
        marginBottom: 5,
    },
    routineDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 10,
    },
    assignedBy: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 15,
        fontStyle: 'italic',
    },
    exerciseListContainer: {
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        paddingTop: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 10,
    },
    // Tarjeta de Ejercicio
    exerciseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background, 
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: colors.success, 
        paddingRight: 5,
    },
    exerciseOrder: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.success,
        marginRight: 15,
        width: 25,
        textAlign: 'center',
    },
    exerciseContent: {
        flex: 1,
    },
    exerciseName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    exerciseDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    exerciseReps: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    exerciseGroup: {
        fontSize: 12,
        color: colors.textPrimary,
        backgroundColor: colors.divider, 
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    // Contenedor sin rutinas
    noRoutineContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: colors.card,
        marginHorizontal: 15,
        borderRadius: 12,
        marginTop: 50,
        borderWidth: 1,
        borderColor: colors.warning,
    },
    noRoutineText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.warning,
        marginBottom: 10,
        textAlign: 'center',
    },
    noRoutineSubText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    // Estilos del Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 80, 
        paddingRight: 10,
    },
    menuContainer: {
        width: 250,
        backgroundColor: colors.card,
        borderRadius: 10,
        padding: 10,
        shadowColor: colors.isDark ? '#000' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: colors.isDark ? 0.4 : 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        paddingBottom: 10,
        marginBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        color: colors.textPrimary,
    },
    menuItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    menuItemClose: {
        borderBottomWidth: 0,
        marginTop: 10,
        backgroundColor: colors.divider,
        borderRadius: 8,
        alignItems: 'center',
    },
    menuItemText: {
        fontSize: 15,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    menuItemTextLogout: {
        fontSize: 15,
        color: colors.danger, 
        fontWeight: '600',
    },
    menuItemTextClose: {
        fontSize: 15,
        color: colors.textPrimary,
        fontWeight: '600',
        padding: 5,
    },
});

// --- PANTALLA DE RUTINA (ALUMNO) - ESTILIZADA Y FUNCIONAL ---
function StudentRoutineScreen({ navigation }) {
    // ?? Obtener el tema y los colores
    const { colors: themeColors, isDark } = useTheme(); 
    const styles = getStudentStyles(themeColors); // ?? Generar estilos din芍micos

    const [activeAssignments, setActiveAssignments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMenuVisible, setIsMenuVisible] = useState(false); 

    const { signOut, getToken } = useContext(AuthContext);
    
    // Funci車n de ayuda para la tarjeta de ejercicio
    const ExerciseCard = ({ link }) => (
        <View style={styles.exerciseCard}>
            <Text style={styles.exerciseOrder}>{link.order?.toString()}</Text>
            <View style={styles.exerciseContent}>
                <Text style={styles.exerciseName}>{link.exercise?.nombre ?? 'Ejercicio Desconocido'}</Text>
                <View style={styles.exerciseDetails}>
                    <Text style={styles.exerciseReps}>
                        {link.sets?.toString()} series de {link.repetitions} reps
                    </Text>
                    <Text style={styles.exerciseGroup}>{link.exercise?.grupo_muscular ?? 'N/A'}</Text>
                </View>
            </View>
        </View>
    );

    const fetchRoutine = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getToken();
            if (!token) {
                signOut();
                return;
            }

            const response = await axios.get(`${API_URL}/students/me/routine`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const assignments = response.data; 

            if (assignments && assignments.length > 0) {
                // Asegurar que solo procesamos asignaciones con rutina
                const validAssignments = assignments.filter(a => a.routine !== null);
                setActiveAssignments(validAssignments);
                if (validAssignments.length === 0) {
                     setError("No tienes ninguna rutina activa asignada.");
                }
            } else {
                setActiveAssignments([]);
                setError("No tienes ninguna rutina activa asignada."); 
            }

        } catch (e) {
            console.error("Error al cargar la rutina del alumno:", e.response ? e.response.data : e.message);
            
            if (e.response && (e.response.status === 404 || e.response.data?.detail === "No tienes ninguna rutina activa asignada.")) {
                setError("No tienes ninguna rutina activa asignada.");
            } else {
                setError("Error al cargar la rutina. Verifica la conexi車n o backend.");
            }
        } finally {
            setTimeout(() => setIsLoading(false), 300); 
        }
    };

    const handleChangePassword = () => {
        setIsMenuVisible(false); // Cierra el modal
        if (navigation) {
            navigation.navigate('ChangePassword'); 
        }
    };
    
    const handleLogout = () => {
        setIsMenuVisible(false);
        signOut();
    };


    useEffect(() => {
        fetchRoutine();
        
        if (navigation) {
            // Recarga la rutina cada vez que se enfoca la pantalla
            const unsubscribe = navigation.addListener('focus', fetchRoutine);
            return unsubscribe;
        }
    }, [navigation, isDark]); // Incluir isDark para actualizar estilos si el tema cambia

    const handleRefresh = () => {
        fetchRoutine();
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={themeColors.primary} />
                <Text style={{ marginTop: 10, color: themeColors.textSecondary }}>Cargando tus rutinas...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            
            {/* CABECERA ESTILIZADA CON 赤CONOS */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Tus Rutinas</Text>
                <View style={styles.headerButtons}>
                    {/* Bot車n de Actualizar: SOLO 赤CONO */}
                    <TouchableOpacity 
                        onPress={handleRefresh} 
                        style={styles.iconButton}
                        disabled={isLoading}
                    >
                        {/* ?? es usado aqu赤 para simpleza, pero podr赤as usar Lucide icon */}
                        <Text style={styles.refreshIcon}>??</Text>
                    </TouchableOpacity>
                    {/* Bot車n de Men迆/Opciones */}
                    <TouchableOpacity 
                        onPress={() => setIsMenuVisible(true)} 
                        style={styles.iconButton}
                    >
                        <Text style={styles.menuIcon}>??</Text>
                    </TouchableOpacity>
                </View>
            </View>
            
            <ScrollView style={{ flex: 1 }}>
                
                {/* T赤tulo de la secci車n de contenido */}
                <View style={styles.mainContentHeader}>
                    <Text style={styles.mainTitle}>Rutinas Activas ({activeAssignments.length})</Text>
                    {error && error !== "No tienes ninguna rutina activa asignada." && <Text style={styles.errorText}>{error}</Text>}
                </View>

                {/* ITERACI車N SOBRE TODAS LAS ASIGNACIONES ACTIVAS */}
                {activeAssignments.length > 0 ? (
                    activeAssignments.map((assignment, assignmentIndex) => (
                        <View key={assignment.id?.toString() ?? assignmentIndex.toString()} style={styles.routineMainCard}>
                            
                            {/* 1. Informaci車n de la Rutina (Acceso Defensivo) */}
                            <Text style={styles.routineTitle}>
                                {assignment.routine?.nombre ?? 'Rutina Sin T赤tulo'}
                            </Text>
                            <Text style={styles.routineDescription}>
                                {assignment.routine?.descripcion ?? 'Sin descripci車n.'}
                            </Text>
                            <Text style={styles.assignedBy}>
                                Asignada por: {assignment.professor?.nombre ?? 'Profesor Desconocido'}
                            </Text>
                            
                            {/* Lista de Ejercicios */}
                            <View style={styles.exerciseListContainer}>
                                <Text style={styles.sectionTitle}>Ejercicios:</Text>
                                {/* Ordenamos los ejercicios por el campo 'order' */}
                                {assignment.routine?.exercise_links?.sort((a, b) => a.order - b.order).map((link, index) => (
                                    <ExerciseCard key={link.exercise?.id?.toString() ?? index.toString()} link={link} />
                                ))}
                            </View>
                        </View>
                    ))
                ) : (
                    // Mensaje cuando no hay rutina activa
                    <View style={styles.noRoutineContainer}>
                        <Text style={styles.noRoutineText}>?Libre de Rutinas!</Text>
                        <Text style={styles.noRoutineSubText}>P赤dele a tu profesor que te asigne un nuevo plan.</Text>
                    </View>
                )}
            </ScrollView>

            {/* ?? MODAL DE OPCIONES DE USUARIO */}
            <Modal 
                animationType="fade"
                transparent={true}
                visible={isMenuVisible}
                onRequestClose={() => setIsMenuVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPressOut={() => setIsMenuVisible(false)} // Cierra al tocar fuera
                >
                    <View style={styles.menuContainer}>
                        <Text style={styles.menuTitle}>Ajustes de Cuenta</Text>
                        
                        {/* Opci車n 1: Cambiar Contrase?a */}
                        <TouchableOpacity style={styles.menuItem} onPress={handleChangePassword}>
                            <Text style={styles.menuItemText}>?? Cambiar Contrase?a</Text>
                        </TouchableOpacity>
                        
                        {/* Opci車n 2: Cerrar Sesi車n */}
                        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                            <Text style={styles.menuItemTextLogout}>?? Cerrar Sesi車n</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={[styles.menuItem, styles.menuItemClose]} onPress={() => setIsMenuVisible(false)}>
                            <Text style={styles.menuItemTextClose}>Cerrar Men迆</Text>
                        </TouchableOpacity>

                    </View>
                </TouchableOpacity>
            </Modal>
            {/* Ajusta el color de la barra de estado seg迆n el tema */}
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={themeColors.card} />
        </SafeAreaView>
    );
}

// --- NAVEGADOR PRINCIPAL ---
const Stack = createNativeStackNavigator();

export default function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [userToken, setUserToken] = useState(null);
    const [userRole, setUserRole] = useState(null);

    // ?? Hook para determinar el esquema de color y ajustar el color del Header/Loader
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    // Colores del tema base para el cargador y la barra de navegaci車n fuera del ThemeProvider
    const primaryColor = isDark ? '#60A5FA' : '#007AFF';
    const cardColor = isDark ? '#1F2937' : '#FFFFFF';
    const backgroundColor = isDark ? '#121212' : '#F0F4F8';


    const authContext = useMemo(() => ({
        signIn: async (token) => {
            try {
                await AsyncStorage.setItem('user_token', token);
                const role = decodeToken(token);
                setUserRole(role);
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
        }
    }), []);

    useEffect(() => {
        const checkToken = async () => {
            let token = null;
            try {
                token = await AsyncStorage.getItem('user_token');
            } catch (e) {
                console.error("Error leyendo token", e);
            }
            
            if (token) {
                const role = decodeToken(token);
                setUserRole(role);
            }
            setUserToken(token);
            setIsLoading(false);
        };
        checkToken();
    }, []);

    if (isLoading) {
        return (
            // Usamos colores din芍micos para el cargador inicial
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: backgroundColor }}>
                <ActivityIndicator size="large" color={primaryColor} />
            </View>
        );
    }

    // L車gica de navegaci車n basada en roles
    const initialRouteName = userToken == null ? "Login" : (userRole === "Profesor" ? "ProfessorPanel" : "StudentRoutine");

    // El cerebro de la navegaci車n
    return (
        <AuthContext.Provider value={authContext}>
            {/* ?? ENVOLVEMOS EL NAVEGADOR CON EL CONTEXTO DE TEMA */}
            <ThemeProvider> 
                <NavigationContainer>
                    {/* ?? Usamos colores din芍micos para el header global */}
                    <Stack.Navigator screenOptions={{ 
                        headerShown: true, 
                        headerTintColor: primaryColor, // Color del texto y flecha
                        headerStyle: { backgroundColor: cardColor }, // Fondo del header
                        headerTitleStyle: { color: primaryColor }
                    }} 
                    initialRouteName={initialRouteName}>
                        {userToken == null ? (
                            <Stack.Screen 
                                name="Login" 
                                component={LoginScreen} 
                                options={{ title: 'Ingresar', headerShown: false }}
                            />
                        ) : userRole === "Profesor" ? (
                            <>
                                <Stack.Screen 
                                    name="ProfessorPanel" 
                                    component={ProfessorScreen} 
                                    // ?? CAMBIO CLAVE: Quitamos el header por defecto para usar el custom header con 赤conos
                                    options={{ title: 'Panel Profesor', headerShown: false }} 
                                />
                                <Stack.Screen 
                                    name="RoutineCreation" 
                                    component={RoutineCreationScreen} 
                                    options={{ title: 'Crear Rutina' }}
                                />
                                <Stack.Screen 
                                    name="ChangePassword" 
                                    component={ChangePasswordScreen} 
                                    options={{ title: 'Cambiar Contrase?a' }}
                                />
                            </>
                        ) : (
                            // ?? Rutas del Alumno
                            <>
                                <Stack.Screen 
                                    name="StudentRoutine" 
                                    component={StudentRoutineScreen} 
                                    options={{ title: 'Mi Rutina', headerShown: false }}
                                />
                                <Stack.Screen 
                                    name="ChangePassword" 
                                    component={ChangePasswordScreen} 
                                    options={{ title: 'Cambiar Contrase?a' }}
                                />
                            </>
                        )}
                    </Stack.Navigator>
                </NavigationContainer>
            </ThemeProvider>
        </AuthContext.Provider>
    );
}