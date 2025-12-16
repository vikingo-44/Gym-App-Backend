import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
    StyleSheet, Text, View, ScrollView, SafeAreaView, Button, 
    ActivityIndicator, FlatList, TouchableOpacity, Alert, Modal,
    TextInput, Platform, Image // 🚨 AGREGADO Image para cargar el GIF
} from 'react-native';
import axios from 'axios';
import { AuthContext } from '../App'; 
import { useTheme } from '../ThemeContext'; 
// Iconos actualizados para Menu y para la demo
import { Trash2, Edit, RefreshCcw, Settings, Key, LogOut, Menu, ChevronDown, ChevronUp, PlayCircle } from 'lucide-react-native'; 

// URL de la API (Asegúrate que esta URL coincida con la de tu App.js/Backend)
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 

// ----------------------------------------------------------------------
// 🚨 Mapeo de Demos (Para implementar sin modificar el backend)
// 🚨 ATENCION: Reemplaza estas URLs con las de tus GIFs/Videos subidos.
// ----------------------------------------------------------------------
const EXERCISE_DEMO_MAP = {
    // Clave: Parte del nombre del ejercicio (la búsqueda es parcial)
    "Press Banca": "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN29jMGFwNWFhb2J3d3E4cmlkaHVscTBhOGU1d2R5cDV6ajRldzF6bSZlcD12MV9pbnRlcm5hbF9naWYmY3Q9Zw/k3g0Q8W1rYhS0/giphy.gif",
    "Sentadilla": "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZjFvazUwNmp0aXl1cGhkajR3OWR5bmM5Nmg4NWFmZDM1Z2EzZ282byZlcD12MV9pbnRlcm5hbF9naWYmY3Q9Zw/ycf0oQoO3n3oA/giphy.gif",
    "Peso Muerto": "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYWZ3ZHZ1MTJtY25zbjV0bW5qN2xoa3M0ZmliYjZ3dDJrNHc4cW90cyZlcD12MV9pbnRlcm5hbF9naWYmY3Q9Zw/3oKIPcfwW188H4EwW4/giphy.gif",
    "Jalón": "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOXA4d3J1eDV4dXRzNWd1ZzZ6dm50NHV5c2Z6NW01Z21wbnZ6cW9mcyZlcD12MV9pbnRlcm5hbF9naWYmY3Q9Zw/xT39JXZ1WpU/giphy.gif",
    "Bíceps": "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmVncmUycmV6ZnM3eGtwa296ejA4ZWRxNmN6aWRvNWc5d3l5ZzF3aiZlcD12MV9pbnRlcm5hbF9naWYmY3Q9Zw/l0O9w1c9l43kS6T9S/giphy.gif",
    "Zancada": "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnk1bHZ1cGVyMGt6c2c1czR0aHV0bDRoOHQ5eXp6Z3Z5cmZqajR0MyZlcD12MV9pbnRlcm5hbF9naWYmY3Q9Zw/l0O5T44gW3Nf2/giphy.gif",
};

// Función para buscar la URL de demostración
const getDemoUrl = (exerciseName) => {
    const nameLower = exerciseName.toLowerCase();
    for (const key in EXERCISE_DEMO_MAP) {
        if (nameLower.includes(key.toLowerCase())) {
            return EXERCISE_DEMO_MAP[key];
        }
    }
    return null;
};
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// COMPONENTE: MODAL DE DEMOSTRACIÓN (NUEVO)
// ----------------------------------------------------------------------
const DemoModal = ({ isVisible, onClose, exerciseName, demoUrl, styles, themeColors }) => {
    return (
        <Modal
            animationType="fade" // Usamos fade o slide
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={styles.demoModalOverlay}>
                <View style={styles.demoModalContainer}>
                    <Text style={styles.demoTitle}>Demostración: {exerciseName}</Text>
                    
                    {demoUrl ? (
                        // Usamos Image de React Native para cargar el GIF/Video
                        <Image
                            source={{ uri: demoUrl }}
                            style={styles.demoImage}
                            resizeMode="contain"
                            // Añadimos un fallback visual simple si la imagen no carga
                            onError={() => console.error("Error al cargar GIF desde:", demoUrl)}
                        />
                    ) : (
                        <Text style={styles.demoErrorText}>Demostración no disponible.</Text>
                    )}

                    <TouchableOpacity 
                        style={[styles.demoCloseButton, {backgroundColor: themeColors.primary}]}
                        onPress={onClose}
                    >
                        <Text style={styles.demoCloseButtonText}>Cerrar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};


// ----------------------------------------------------------------------
// COMPONENTE: MENÚ LATERAL (DRAWER) DE AJUSTES Y CUENTA (SIN CAMBIOS)
// ----------------------------------------------------------------------
const AccountSettingsModal = ({ isVisible, onClose, navigation, signOut, themeColors, styles }) => {
    // Los estilos ya vienen pre-generados y adaptados para el drawer

    const handleChangePassword = () => {
        onClose();
        navigation.navigate('ChangePassword');
    };

    const handleLogout = () => {
        Alert.alert(
            "Cerrar Sesión",
            "¿Estás seguro que quieres cerrar sesión?",
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Cerrar", onPress: signOut, style: "destructive" },
            ]
        );
    };

    return (
        <Modal
            animationType="fade" // Usamos fade o none para evitar animaciones extrañas en la superposición
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <TouchableOpacity 
                style={styles.modalOverlay} 
                activeOpacity={1} 
                onPressOut={onClose} // Cierra al tocar el fondo
            >
                {/* 🚨 Contenedor del Drawer (posicionado a la izquierda) */}
                <View style={styles.menuContainer}>
                    {/* 🚨 SafeAreaView para respetar la barra de estado del celular */}
                    <SafeAreaView style={{ flex: 1, backgroundColor: '#1C1C1E' }}> {/* 🚨 PEAKFIT: Fondo oscuro */}
                        <ScrollView contentContainerStyle={styles.menuScroll}>
                            
                            <Text style={[styles.menuTitle, {color: '#3ABFBC', borderBottomColor: themeColors.divider}]}> {/* 🚨 PEAKFIT: Título Verde */}
                                Menú de Alumno
                            </Text>
                            
                            {/* Opcion 1: Cambiar Contraseña */}
                            <TouchableOpacity 
                                style={[styles.menuItem, {borderBottomColor: themeColors.divider}]} 
                                onPress={handleChangePassword}
                            >
                                <Key size={18} color={'white'} /> {/* 🚨 PEAKFIT: Icono Blanco */}
                                <Text style={[styles.menuItemText, {color: 'white'}]}>Cambiar Contraseña</Text> {/* 🚨 PEAKFIT: Texto Blanco */}
                            </TouchableOpacity>
                            
                            {/* Opcion 2: Cerrar Sesion */}
                            <TouchableOpacity 
                                style={[styles.menuItem, {borderBottomColor: themeColors.divider}]} 
                                onPress={handleLogout}
                            >
                                <LogOut size={18} color={themeColors.danger} />
                                <Text style={[styles.menuItemTextLogout, {color: themeColors.danger}]}>Cerrar Sesión</Text>
                            </TouchableOpacity>
                            
                        </ScrollView>
                    </SafeAreaView>
                    
                    {/* Botón de Cerrar (Fijo en la parte inferior del Drawer) */}
                    <TouchableOpacity 
                        style={[styles.menuItemClose, {backgroundColor: themeColors.divider}]} 
                        onPress={onClose}
                    >
                        <Text style={styles.menuItemTextClose}>Cerrar Menú</Text>
                    </TouchableOpacity>

                </View>
            </TouchableOpacity>
        </Modal>
    );
};


// ----------------------------------------------------------------------
// COMPONENTE: Tarjeta Colapsable de Rutina (Alumno)
// ----------------------------------------------------------------------
const CollapsibleRoutineCard = ({ assignment, styles, themeColors }) => {
    
    // Inicializa isExpanded con false para que las tarjetas estén cerradas por defecto
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDemoModalVisible, setIsDemoModalVisible] = useState(false); // 🚨 NUEVO: Estado del Modal Demo
    const [currentDemo, setCurrentDemo] = useState({ name: '', url: '' }); // 🚨 NUEVO: Ejercicio actual en demo

    const routine = assignment.routine;
    const linkCount = routine?.exercise_links ? routine.exercise_links.length : 0;
    
    // Logica de Estado (Barra Lateral)
    const statusColor = assignment.is_active ? '#3ABFBC' : themeColors.warning; // 🚨 PEAKFIT Success Green
    const statusText = assignment.is_active ? 'ACTIVA' : 'INACTIVA';

    // Formateo de fecha
    const formattedExpiryDate = routine?.routine_group?.fecha_vencimiento 
        ? `Vence: ${new Date(routine.routine_group.fecha_vencimiento).toLocaleDateString('es-AR')}` 
        : 'Vencimiento: N/A';

    // 🚨 Lógica para obtener el nombre limpio de la rutina
    const groupName = routine?.routine_group?.nombre;
    let displayRoutineName = routine?.nombre ?? 'Rutina Sin Titulo';
    
    if (groupName && displayRoutineName.startsWith(groupName)) {
        displayRoutineName = displayRoutineName.substring(groupName.length).trim();
        if (displayRoutineName.startsWith('-')) {
            displayRoutineName = displayRoutineName.substring(1).trim();
        }
        if (displayRoutineName === '') {
             displayRoutineName = routine?.descripcion?.match(/Día (\d+)/)?.[0] || 'Día de Entrenamiento';
        }
    }
    // 🚨 FIN LÓGICA DE TÍTULO
    
    // 🚨 NUEVO HANDLER: Abre el modal de demostración
    const handleShowDemo = (exerciseName) => {
        const demoUrl = getDemoUrl(exerciseName);
        if (demoUrl) {
            setCurrentDemo({ name: exerciseName, url: demoUrl });
            setIsDemoModalVisible(true);
        } else {
            Alert.alert("Demo no Disponible", `No se encontró una demostración para "${exerciseName}".`);
        }
    };

    const renderExercises = () => (
        <View style={styles.exerciseListContainer}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: 'white', marginBottom: 10 }}>Detalle de Ejercicios:</Text>
            {routine.exercise_links
                .sort((a, b) => a.order - b.order)
                .map((link, exIndex) => {
                    const exerciseName = link.exercise?.nombre ?? 'Ejercicio Desconocido';
                    const hasDemo = getDemoUrl(exerciseName) !== null; // 🚨 Verificar si hay demo

                    return (
                        // El estilo exerciseItem ya tiene el fondo oscuro corregido
                        <View key={link.id || exIndex} style={styles.exerciseItem}>
                            <View style={styles.exerciseHeader}>
                                <Text style={styles.exerciseName}>
                                    {link.order}. {exerciseName}
                                </Text>
                                {/* 🚨 BOTÓN VER DEMO (NUEVO) */}
                                {hasDemo && (
                                    <TouchableOpacity 
                                        style={styles.demoButton}
                                        onPress={() => handleShowDemo(exerciseName)}
                                    >
                                        <PlayCircle size={16} color={'black'} />
                                        <Text style={styles.demoButtonText}>Ver Demo</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            
                            <View style={styles.detailsRow}>
                                {/* Sets */}
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Sets:</Text>
                                    <Text style={[styles.detailValue, {color: '#3ABFBC'}]}>{link.sets}</Text>
                                </View>

                                {/* Reps */}
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Reps:</Text>
                                    <Text style={[styles.detailValue, {color: '#3ABFBC'}]}>{link.repetitions}</Text>
                                </View>

                                {/* Peso */}
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Peso:</Text>
                                    <Text style={[styles.detailValue, {color: '#3ABFBC'}]}>{link.peso || '-'}</Text>
                                </View>
                            </View>

                            {/* 🚨 NOTA DEL PROFESOR POR EJERCICIO (CORREGIDO: Usar link.notes) */}
                            {link.notes && link.notes.trim() !== '' && (
                                <View style={styles.professorNoteContainer}>
                                    <Text style={styles.professorNoteLabel}>Nota del Profesor:</Text>
                                    <Text style={styles.professorNoteText}>{link.notes}</Text>
                                </View>
                            )}
                            
                        </View>
                    );
                })}
        </View>
    );

    return (
        <View style={styles.routineCardContainer}>
            
            {/* 🚨 NUEVO MODAL DE DEMOSTRACIÓN */}
            <DemoModal
                isVisible={isDemoModalVisible}
                onClose={() => setIsDemoModalVisible(false)}
                exerciseName={currentDemo.name}
                demoUrl={currentDemo.url}
                styles={styles}
                themeColors={themeColors}
            />

            {/* 1. BARRA LATERAL DE ESTADO */}
            <View style={[styles.statusBar, { backgroundColor: statusColor }]}>
                {/* 🚨 StatusText Color: Negro si el fondo es claro (warning), blanco si es oscuro (success/danger) */}
                <Text style={[styles.statusText, {color: statusColor === themeColors.warning ? 'black' : 'white'}]}>{statusText}</Text>
            </View>

            {/* 🚨 2. CONTENIDO PRINCIPAL Y COLAPSABLE: Ahora es el área de toque */}
            <TouchableOpacity 
                style={styles.assignmentContent}
                onPress={() => setIsExpanded(!isExpanded)} // <--- Toggle moved here
                activeOpacity={0.8}
            >
                
                {/* CABECERA (Contiene todos los detalles y el icono de flecha) */}
                <View style={styles.cardHeader}>
                    <View style={{flex: 1}}>
                        
                        {/* Nombre de la Rutina Limpio (ES EL ÚNICO TÍTULO DENTRO DE LA TARJETA) */}
                        <Text style={styles.routineTitle}>
                            {displayRoutineName}
                        </Text>
                        
                        {/* Vencimiento */}
                        <Text style={styles.routineGroup}>{formattedExpiryDate}</Text>
                        
                        {/* Indicador de Profesor */}
                        <Text style={styles.assignedBy}>
                            Profesor: {assignment.professor?.nombre ?? 'Desconocido'}
                        </Text>
                        
                        {/* Indicador de cantidad de ejercicios (TEXTO SIN FLECHAS) */}
                        <Text style={{ marginTop: 5, color: '#A9A9A9', fontSize: 13, fontWeight: '500'}}>
                            {linkCount} EJERCICIOS
                        </Text>
                    </View>
                    
                    {/* 🚨 ICONO DE EXPANSION */}
                    {isExpanded ? 
                        <ChevronUp size={24} color={'#3ABFBC'} /> : 
                        <ChevronDown size={24} color={'#3ABFBC'} />
                    }
                </View>

                {/* Contenido Colapsable */}
                {isExpanded && renderExercises()}
            </TouchableOpacity>
        </View>
    );
}

// ----------------------------------------------------------------------
// PANTALLA DE RUTINA (ALUMNO) PRINCIPAL
// ----------------------------------------------------------------------
export default function StudentRoutineScreen({ navigation }) {
    
    const { colors: themeColors } = useTheme();
    const styles = getStudentStyles(themeColors);
    
    const { signOut, getToken, userProfile } = useContext(AuthContext);

    const [activeAssignments, setActiveAssignments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMenuVisible, setIsMenuVisible] = useState(false); // Estado del Modal

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
                const validAssignments = assignments.filter(a => a.routine !== null);
                
                // Ordenamos por el ID de la rutina para asegurar el orden (Dia 1, Dia 2, etc.)
                validAssignments.sort((a, b) => a.routine.id - b.routine.id);

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
                Alert.alert("Error de Conexión", "Fallo al cargar la rutina. Verifica tu conexión o backend.");
                setError("Error al cargar la rutina. Revisa tu conexión.");
            }
        } finally {
            setTimeout(() => setIsLoading(false), 300); 
        }
    };

    useEffect(() => {
        // Recarga la rutina al enfocarse la pantalla
        const unsubscribeFocus = navigation.addListener('focus', () => {
             fetchRoutine();
        });
        fetchRoutine();
        return unsubscribeFocus;
    }, []);

    const handleRefresh = () => {
        fetchRoutine();
    };
    
    // 🚨 PASO 1: Agrupar asignaciones por grupo (routine_group.id)
    const groupedAssignments = useMemo(() => {
        const groups = {};
        activeAssignments.forEach(assignment => {
            const routine = assignment.routine;
            const groupId = routine?.routine_group?.id || 'NoGroup';
            const groupName = routine?.routine_group?.nombre || 'Rutinas Individuales';
            
            if (!groups[groupId]) {
                groups[groupId] = {
                    groupName: groupName,
                    assignments: []
                };
            }
            groups[groupId].assignments.push(assignment);
        });
        return groups;
    }, [activeAssignments]);


    if (isLoading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={'#3ABFBC'} />
                <Text style={{ marginTop: 10, color: themeColors.textSecondary }}>Cargando tus rutinas...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            
            {/* 🚨 MODAL DE OPCIONES DE USUARIO (REIMPLEMENTADO COMO DRAWER) */}
            <AccountSettingsModal 
                isVisible={isMenuVisible}
                onClose={() => setIsMenuVisible(false)}
                navigation={navigation}
                signOut={signOut} 
                themeColors={themeColors}
                styles={styles} // Pasamos los estilos para consistencia
            />
            
            {/* CABECERA ESTILIZADA con botones */}
            <View style={styles.header}>
                {/* 🚨 Boton de Menu/Drawer (Izquierda) */}
                <TouchableOpacity 
                    onPress={() => setIsMenuVisible(true)} 
                    style={styles.iconButton}
                >
                    <Menu size={24} color={'white'} /> 
                </TouchableOpacity>

                {/* TITULO DINAMICO */}
                <Text style={styles.headerTitle}>
                    Bienvenido/a {userProfile?.nombre?.split(' ')[0] || 'Alumno/a'}
                </Text>

                <View style={styles.headerButtons}>
                    {/* Boton Refrescar (Se mantiene a la derecha) */}
                    <TouchableOpacity 
                        onPress={handleRefresh} 
                        style={styles.iconButton}
                        disabled={isLoading}
                    >
                        <RefreshCcw size={24} color={'#3ABFBC'} /> 
                    </TouchableOpacity>
                    {/* Boton de Ajustes ELIMINADO */}
                </View>
            </View>
            
            <ScrollView contentContainerStyle={styles.content}>
                
                <View style={styles.mainContentHeader}>
                    <Text style={styles.mainTitle}>Mi Plan de Entrenamiento</Text>
                    <Text style={{color: '#A9A9A9'}}>Rutinas Activas ({activeAssignments.length})</Text>
                    {error && error !== "No tienes ninguna rutina activa asignada." && <Text style={styles.errorText}>{error}</Text>}
                </View>

                {activeAssignments.length > 0 ? (
                    // 🚨 PASO 2: Iterar sobre los grupos
                    Object.entries(groupedAssignments).map(([groupId, groupData]) => (
                        <View key={groupId}>
                            {/* TÍTULO DEL GRUPO (UNA SOLA VEZ, GRANDE) */}
                            <Text style={styles.groupHeaderTitle}>
                                {groupData.groupName} ({groupData.assignments.length} Rutinas)
                            </Text>
                            
                            {/* Rutinas dentro del grupo */}
                            {groupData.assignments.map((assignment, assignmentIndex) => (
                                <CollapsibleRoutineCard 
                                    key={assignment.id?.toString() ?? assignmentIndex.toString()} 
                                    assignment={assignment}
                                    styles={styles}
                                    themeColors={themeColors}
                                />
                            ))}
                        </View>
                    ))
                ) : (
                    // Mensaje cuando no hay rutina activa
                    <View style={styles.noRoutineContainer}>
                        <Text style={styles.noRoutineText}>¡Libre de Rutinas!</Text>
                        <Text style={styles.noRoutineSubText}>Pídele a tu profesor que te asigne un nuevo plan.</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// ----------------------------------------------------------------------
// GENERADOR DE ESTILOS DINÁMICOS (PEAKFIT)
// ----------------------------------------------------------------------
const getStudentStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black', // 🚨 PEAKFIT: Fondo Negro
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black', // 🚨 PEAKFIT: Fondo Negro
    },
    // --- Cabecera ---
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        paddingTop: Platform.OS === 'android' ? 40 : 15,
        backgroundColor: 'black', // 🚨 PEAKFIT: Header Negro
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        elevation: 0, // Quitamos sombra en fondo oscuro
    },
    headerTitle: {
        fontSize: 18, 
        fontWeight: 'bold',
        color: 'white', // 🚨 PEAKFIT: Título Blanco
        flex: 1, 
        textAlign: 'center',
        paddingHorizontal: 10,
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
        backgroundColor: '#1C1C1E', // 🚨 PEAKFIT: Botón Dark Gray
    },
    content: {
        flexGrow: 1, 
        padding: 20,
    },
    mainContentHeader: {
        marginBottom: 10,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white', // 🚨 PEAKFIT: Título Blanco
        marginBottom: 5,
    },
    groupHeaderTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#3ABFBC', // 🚨 PEAKFIT: Título Verde
        marginTop: 20,
        marginBottom: 10,
        borderBottomWidth: 1, 
        borderBottomColor: colors.divider,
        paddingBottom: 5,
    },
    errorText: {
        color: colors.danger,
        fontWeight: '600',
        marginTop: 10,
        textAlign: 'center',
        backgroundColor: colors.danger + '30',
        padding: 10,
        borderRadius: 8,
        marginBottom: 20,
    },
    noRoutineContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#1C1C1E', // 🚨 PEAKFIT: Card Dark Gray
        borderRadius: 10,
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
        color: '#A9A9A9',
        textAlign: 'center',
    },
    // --- Estilos de la Tarjeta Colapsable ---
    routineCardContainer: {
        flexDirection: 'row',
        backgroundColor: '#1C1C1E', // 🚨 PEAKFIT: Card Dark Gray
        borderRadius: 10,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
        elevation: 5,
        overflow: 'hidden',
    },
    statusBar: {
        width: 30, 
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
    },
    statusText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'white', // Color que se ajusta en el componente
        transform: [{ rotate: '-90deg' }], 
        width: 100, 
        textAlign: 'center',
    },
    assignmentContent: {
        flex: 1,
    },
    cardHeader: {
        padding: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flex: 1,
    },
    routineTitle: {
        fontSize: 18, 
        fontWeight: 'bold',
        color: 'white', // 🚨 PEAKFIT: Texto Blanco
        marginBottom: 5,
    },
    routineGroup: {
        fontSize: 13, 
        color: '#A9A9A9', // 🚨 PEAKFIT: Texto Secundario Gris
        marginBottom: 2,
    },
    assignedBy: {
        fontSize: 12,
        color: '#A9A9A9',
        fontStyle: 'italic',
        marginTop: 5,
    },
    exerciseListContainer: {
        paddingTop: 15,
        paddingHorizontal: 15,
        paddingBottom: 15,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        backgroundColor: 'black', // 🚨 PEAKFIT: Contenido Interno Negro
    },
    exerciseItem: {
        paddingLeft: 10,
        paddingVertical: 8,
        borderLeftWidth: 2,
        borderLeftColor: '#3ABFBC', // 🚨 PEAKFIT: Línea de acento verde
        marginBottom: 8,
        backgroundColor: '#1C1C1E', // 🚨 PEAKFIT: Fondo de ítem (más claro que el fondo)
        borderRadius: 5, 
    },
    exerciseHeader: { // 🚨 NUEVO: Para alinear nombre y botón demo
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    exerciseName: {
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
        flexShrink: 1,
        paddingRight: 10,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 15,
        marginTop: 5,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'black', // 🚨 PEAKFIT: Fondo del detalle más oscuro
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    detailLabel: {
        fontSize: 12,
        color: '#A9A9A9', 
        marginRight: 4,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#3ABFBC', // 🚨 PEAKFIT: Valor verde
    },
    // 🚨 ESTILOS AÑADIDOS PARA LA NOTA DEL PROFESOR 🚨
    professorNoteContainer: {
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.divider + '60', // Un divisor sutil
        backgroundColor: 'black', // Fondo Negro
        borderRadius: 5,
        paddingHorizontal: 5,
        paddingBottom: 5,
    },
    professorNoteLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.warning, // Color destacado (amarillo)
        marginBottom: 4,
    },
    professorNoteText: {
        fontSize: 14,
        color: '#D4D4D4', // Gris claro para el texto de la nota
        fontStyle: 'italic',
    },
    // 🚨 ESTILOS AÑADIDOS PARA EL BOTÓN Y MODAL DE DEMO 🚨
    demoButton: {
        backgroundColor: colors.primary, // Usamos el color primario (Verde) para el botón de acción
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    demoButtonText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 13,
    },
    demoModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)', // Fondo negro oscuro
        justifyContent: 'center',
        alignItems: 'center',
    },
    demoModalContainer: {
        width: '90%',
        backgroundColor: '#1C1C1E',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
    },
    demoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3ABFBC',
        marginBottom: 15,
        textAlign: 'center',
    },
    demoImage: {
        width: '100%',
        aspectRatio: 1, // Mantiene la relación de aspecto 1:1, ideal para GIFs
        borderRadius: 10,
        marginBottom: 20,
        backgroundColor: 'black',
        borderWidth: 1,
        borderColor: colors.divider,
    },
    demoErrorText: {
        color: colors.danger,
        textAlign: 'center',
        marginVertical: 20,
    },
    demoCloseButton: {
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 10,
    },
    demoCloseButtonText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // --- ESTILOS DEL DRAWER (Sin cambios) ---
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)', // Más oscuro
        justifyContent: 'flex-start', 
        alignItems: 'flex-start', 
    },
    menuContainer: {
        width: 280, 
        height: '100%', 
        backgroundColor: '#1C1C1E', // 🚨 PEAKFIT: Drawer Dark Gray
        position: 'absolute', 
        left: 0,          
        top: 0,           
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 }, 
        shadowOpacity: 1, // Sombra más fuerte para contraste
        shadowRadius: 5,
        elevation: 10,
    },
    menuScroll: {
        paddingBottom: 70, 
    },
    menuTitle: {
        fontSize: 18, 
        fontWeight: 'bold',
        paddingVertical: 10,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        color: '#3ABFBC', // 🚨 PEAKFIT: Título Verde
        paddingHorizontal: 15,
    },
    menuItem: {
        paddingVertical: 12,
        paddingHorizontal: 15, 
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10, 
    },
    menuItemClose: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 15,
        backgroundColor: colors.divider,
        alignItems: 'center',
    },
    menuItemText: {
        fontSize: 15,
        fontWeight: '600',
        color: 'white', // 🚨 PEAKFIT: Texto Blanco
    },
    menuItemTextLogout: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.danger,
    },
    menuItemTextClose: {
        fontSize: 15,
        fontWeight: '600',
        color: 'white', // 🚨 PEAKFIT: Texto Blanco
    },
});