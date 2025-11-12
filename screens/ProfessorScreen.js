import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
    StyleSheet, Text, View, ScrollView, SafeAreaView, Button, 
    ActivityIndicator, FlatList, TouchableOpacity, Alert, Modal 
} from 'react-native';
import axios from 'axios';
import { AuthContext } from '../App'; 
import { useTheme } from '../ThemeContext'; 
// ?? Importamos TODOS los iconos necesarios (Lucide)
import { Trash2, Edit, RefreshCcw, Settings, Key, LogOut } from 'lucide-react-native'; 

// ----------------------------------------------------------------------
// URL de la API (DEBE COINCIDIR con la de App.js)
// ----------------------------------------------------------------------
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// GENERADOR DE ESTILOS PARA ASIGNACION (AssignmentView)
// ----------------------------------------------------------------------
const getAssignmentStyles = (colors) => StyleSheet.create({
    scrollContainer: {
        flex: 1, 
        backgroundColor: colors.background,
    },
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: colors.background,
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        color: colors.primaryDark,
        width: '100%',
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.primary,
        marginTop: 20,
        marginBottom: 15,
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        paddingBottom: 5,
    },
    routineListContainer: {
        width: '100%',
        marginBottom: 30,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 10,
    },
    routineItem: {
        backgroundColor: colors.card,
        padding: 15,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    routineItemSelected: {
        backgroundColor: colors.highlight,
        borderColor: colors.primary,
    },
    routineNameItem: {
        fontSize: 16,
        color: colors.textPrimary,
    },
    warning: {
        fontSize: 16,
        color: colors.warning,
        textAlign: 'center',
        padding: 10,
    },
    backButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    // --- Estilos de Gestion de Asignaciones ---
    currentAssignmentList: {
        width: '100%',
        marginBottom: 20,
    },
    assignmentCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        borderLeftWidth: 4, 
        borderLeftColor: colors.warning, // Se sobreescribe por activo/inactivo
        shadowColor: colors.isDark ? '#000' : '#444',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: colors.isDark ? 0.3 : 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    assignmentDetails: {
        flex: 1,
    },
    assignmentActions: { // ?? Nuevo contenedor para los 3 iconos
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginLeft: 15,
    },
    assignmentDate: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    deleteButton: {
        padding: 10,
        backgroundColor: colors.danger, 
        borderRadius: 8,
    },
    editButton: { // ?? Estilo para el nuevo boton de Editar
        padding: 10,
        backgroundColor: colors.primary, 
        borderRadius: 8,
    },
    toggleButton: {
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    routineName: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
    }
});


// --- Sub-componente para Asignar y Gestionar Rutinas ---
// ?? CAMBIO: Recibe 'navigation' para navegar a edicion
function AssignmentView({ student, routines, onAssignmentComplete, onCancel, navigation }) {
    
    const { colors: themeColors, isDark } = useTheme(); 
    const assignmentStyles = getAssignmentStyles(themeColors);

    const availableRoutines = Array.isArray(routines) ? routines : []; 
    
    // Asignacion
    const [selectedRoutine, setSelectedRoutine] = useState(availableRoutines.length > 0 ? availableRoutines[0].id : null); 
    const [isAssigning, setIsAssigning] = useState(false);
    
    // Gestion de Asignaciones
    const [currentAssignments, setCurrentAssignments] = useState([]);
    const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(true);

    const { getToken } = useContext(AuthContext);

    // ----------------------------------------------------------------
    // FUNCION 1: CARGAR ASIGNACIONES ACTUALES DEL ALUMNO (TODAS)
    // ----------------------------------------------------------------
    const fetchCurrentAssignments = async () => {
        setIsAssignmentsLoading(true);
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            const response = await axios.get(
                `${API_URL}/professor/assignments/student/${student.id}`, 
                { headers }
            );
            
            // Asumiendo que la respuesta incluye las rutinas completas para la edicion
            setCurrentAssignments(Array.isArray(response.data) ? response.data : []); 

        } catch (e) {
            if (e.response && e.response.status === 404) {
                setCurrentAssignments([]);
            } else {
                 console.error("Error al cargar asignaciones (Ruta Profesor):", e.response ? e.response.data : e.message);
            }
        } finally {
            setIsAssignmentsLoading(false);
        }
    };
    
    // ----------------------------------------------------------------
    // FUNCION: NAVEGAR A EDICION DE RUTINA ASIGNADA
    // ----------------------------------------------------------------
    const handleEditAssignment = (routineId) => {
        // Navega a RoutineCreationScreen, pasando el ID de la rutina maestra vinculada
        if (navigation) {
            navigation.navigate('RoutineCreation', { 
                routineId: routineId
            });
        } else {
            Alert.alert("Error de Navegacion", "No se pudo acceder a la pantalla de edicion.");
        }
    };

    // ----------------------------------------------------------------
    // FUNCION 2: ELIMINAR ASIGNACION
    // ----------------------------------------------------------------
    const handleDeleteAssignment = (assignmentId) => {
        Alert.alert(
            "Confirmar Eliminacion",
            "?Estas seguro de que quieres eliminar esta asignacion de rutina?",
            [
                {
                    text: "Cancelar",
                    style: "cancel"
                },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await getToken();
                            const headers = { 'Authorization': `Bearer ${token}` };
                            
                            await axios.delete(`${API_URL}/assignments/${assignmentId}`, { headers });
                            
                            Alert.alert("Exito", "Asignacion eliminada correctamente.");
                            
                            fetchCurrentAssignments();
                            
                        } catch (e) {
                            console.error("Error eliminando asignacion:", e.response ? e.response.data : e.message);
                            Alert.alert("Error", "Fallo al eliminar la asignacion.");
                        }
                    }
                }
            ]
        );
    };

    // ----------------------------------------------------------------
    // FUNCION 3: CAMBIAR ESTADO ACTIVO/INACTIVO
    // ----------------------------------------------------------------
    const handleToggleActive = async (assignmentId, currentStatus) => {
        const newStatus = !currentStatus;
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            // Llamada a la ruta PATCH /assignments/{assignment_id}/active?is_active=...
            await axios.patch(`${API_URL}/assignments/${assignmentId}/active?is_active=${newStatus}`, null, { headers });

            Alert.alert("Exito", `Rutina ${newStatus ? 'activada' : 'inactivada'} correctamente.`);
            
            // Refrescar la lista en la vista actual
            fetchCurrentAssignments();

        } catch (e) {
            console.error("Error cambiando estado:", e.response ? e.response.data : e.message);
            Alert.alert("Error", "Fallo al cambiar el estado de la asignacion.");
        }
    };


    // --- EFECTO: Cargar las asignaciones al cambiar de alumno ---
    useEffect(() => {
        fetchCurrentAssignments();
    }, [student.id, isDark]); 

    // --- ASIGNACION DE RUTINA (Logica original) ---
    const handleAssign = async () => {
        if (!selectedRoutine) {
            Alert.alert("Error", "No hay rutinas disponibles para asignar.");
            return;
        }

        setIsAssigning(true);
        try {
            const token = await getToken();
            await axios.post(`${API_URL}/assignments/`, {
                routine_id: selectedRoutine, 
                student_id: student.id,
                is_active: true
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            Alert.alert("Exito", `Rutina asignada a ${student.nombre}.`);
            fetchCurrentAssignments(); 
        } catch (e) {
            console.error("Error asignando rutina:", e.response ? e.response.data : e.message);
            let errorMessage = "Fallo al asignar la rutina. Verifica la conexion o backend.";
            if (e.response && e.response.data && e.response.data.detail) {
                // Muestra un mensaje mas amigable si es un error de validacion
                errorMessage = `Error de API: ${JSON.stringify(e.response.data.detail)}`;
            } else if (e.response && (e.response.status === 401 || e.response.status === 403)) {
                errorMessage = "Token expirado o no autorizado. Vuelve a iniciar sesion.";
            }
            Alert.alert("Error", errorMessage);
        } finally {
            setIsAssigning(false);
        }
    };
    
    // --- VISTA DE RENDERIZADO ---
    return (
        <ScrollView style={assignmentStyles.scrollContainer}>
            <View style={assignmentStyles.container}>
                <Text style={assignmentStyles.title}>Gestionar: {student.nombre}</Text>

                {/* -------------------- 1. GESTIONAR ASIGNACIONES (ACTIVAR/INACTIVAR/EDITAR) -------------------- */}
                <Text style={assignmentStyles.subtitle}>Rutinas Asignadas Actualmente ({currentAssignments.length})</Text>
                
                {isAssignmentsLoading ? (
                    <ActivityIndicator size="small" color={themeColors.primary} style={{marginBottom: 15}}/>
                ) : (
                    <View style={assignmentStyles.currentAssignmentList}>
                        {currentAssignments.length > 0 ? (
                            currentAssignments.map((assignment) => (
                                <View key={assignment.id.toString()} style={[
                                    assignmentStyles.assignmentCard, 
                                    // Estilo visual para estado activo/inactivo
                                    { borderLeftColor: assignment.is_active ? themeColors.success : themeColors.warning }
                                ]}>
                                    
                                    <View style={assignmentStyles.assignmentDetails}>
                                        <Text style={assignmentStyles.routineName}>{assignment.routine.nombre}</Text>
                                        <Text style={assignmentStyles.assignmentDate}>
                                            Estado: 
                                            <Text style={{fontWeight: 'bold', color: assignment.is_active ? themeColors.success : themeColors.warning}}>
                                                {assignment.is_active ? ' ACTIVA' : ' INACTIVA'}
                                            </Text>
                                        </Text>
                                    </View>
                                    
                                    {/* ?? NUEVO CONTENEDOR DE ACCIONES (3 botones) */}
                                    <View style={assignmentStyles.assignmentActions}>
                                    
                                        {/* BOTON 1: EDITAR (Dirige a la edicion de la rutina maestra) */}
                                        <TouchableOpacity 
                                            style={assignmentStyles.editButton} 
                                            onPress={() => handleEditAssignment(assignment.routine_id)}
                                        >
                                            <Edit size={20} color={themeColors.card} />
                                        </TouchableOpacity>

                                        {/* BOTON 2: ACTIVAR / INACTIVAR */}
                                        <TouchableOpacity 
                                            style={[
                                                assignmentStyles.toggleButton, 
                                                // Color opuesto al estado actual
                                                { backgroundColor: assignment.is_active ? themeColors.warning : themeColors.success } 
                                            ]} 
                                            onPress={() => handleToggleActive(assignment.id, assignment.is_active)}
                                        >
                                            <Text style={{ color: themeColors.card, fontWeight: 'bold', fontSize: 12 }}>
                                                {assignment.is_active ? 'INACTIVAR' : 'ACTIVAR'}
                                            </Text>
                                        </TouchableOpacity>

                                        {/* BOTON 3: ELIMINACION */}
                                        <TouchableOpacity 
                                            style={assignmentStyles.deleteButton} 
                                            onPress={() => handleDeleteAssignment(assignment.id)}
                                        >
                                            <Trash2 size={20} color={themeColors.card} />
                                        </TouchableOpacity>
                                    </View>
                                    {/* ?? FIN CONTENEDOR DE ACCIONES */}

                                </View>
                            ))
                        ) : (
                            <Text style={assignmentStyles.warning}>Este alumno no tiene rutinas asignadas.</Text>
                        )}
                    </View>
                )}

                <View style={assignmentStyles.backButton}>
                    <Button title="Volver al Panel" onPress={onCancel} color={themeColors.textSecondary} />
                </View>
            </View>
        </ScrollView>
    );
}

// ----------------------------------------------------------------------
// GENERADOR DE ESTILOS PARA LA PANTALLA PRINCIPAL
// ----------------------------------------------------------------------
const getMainScreenStyles = (colors) => StyleSheet.create({
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
    headerSelection: { // Estilo para el encabezado en la seleccion de alumno
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.primary,
    },
    titleSelection: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.success,
    },
    headerButtons: { // Nuevo contenedor para botones de icono
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
    actionSection: {
        padding: 20,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        alignItems: 'center',
        gap: 10,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 5,
    },
    listTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
        padding: 20,
        backgroundColor: colors.divider,
    },
    // --- Tarjeta de Alumno ---
    studentCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 10,
        padding: 15,
        marginHorizontal: 20,
        marginBottom: 10,
        shadowColor: colors.isDark ? '#000' : '#444',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: colors.isDark ? 0.4 : 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    studentName: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    studentEmail: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    assignButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.warning, 
    },
    // --- (Estilos eliminados de Rutinas Maestras) ---
    warningTextCenter: {
        color: colors.warning,
        textAlign: 'center',
        padding: 10,
    },
    errorView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: colors.background,
    },
    errorTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: colors.danger,
        marginBottom: 10,
    },
    errorDetail: {
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
        flexDirection: 'row', 
        alignItems: 'center',
        gap: 10,
    },
    menuItemClose: {
        borderBottomWidth: 0,
        marginTop: 10,
        backgroundColor: colors.divider,
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'column',
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


// --- VISTA DE SELECCION DE ALUMNO PARA CREAR RUTINA (NUEVO COMPONENTE) ---
function StudentSelectionForCreation({ navigation, students, onCancel }) {
    
    const { colors: themeColors } = useTheme();
    const styles = getMainScreenStyles(themeColors); // Estilos dinamicos

    const handleSelectStudent = (student) => {
        // Navega a RoutineCreationScreen pasando el ID del estudiante
        navigation.navigate('RoutineCreation', { 
            studentId: student.id,
            studentName: student.nombre
        });
    };
    
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerSelection}>
                <Text style={styles.titleSelection}>Selecciona un Alumno</Text>
                <Button title="Cancelar" onPress={onCancel} color={themeColors.danger} />
            </View>
            
            <Text style={styles.listTitle}>Alumnos para Nueva Rutina ({students.length})</Text>

            <ScrollView contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}>
                {students.length > 0 ? (
                    students.map((item) => (
                        <TouchableOpacity 
                            key={item.id.toString()}
                            style={styles.studentCard}
                            onPress={() => handleSelectStudent(item)}
                        >
                            <View>
                                <Text style={styles.studentName}>{item.nombre}</Text>
                                <Text style={styles.studentEmail}>{item.email}</Text>
                            </View>
                            <Text style={{...styles.assignButtonText, color: themeColors.success}}>CREAR >> </Text>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                         <Text style={{ color: themeColors.textSecondary }}>No hay alumnos registrados.</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}


// --- PANTALLA PRINCIPAL DEL PROFESOR ---
export default function ProfessorScreen({ navigation }) {
    
    const { colors: themeColors, isDark } = useTheme();
    const styles = getMainScreenStyles(themeColors); // Estilos dinamicos

    const [students, setStudents] = useState([]);
    // ?? CAMBIO: Eliminamos el estado 'routines' ya que no se necesitan en la vista principal
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null); // Alumno para asignar/gestionar
    const [creatingForStudent, setCreatingForStudent] = useState(false); // Modo: seleccionar alumno para crear
    const [dataError, setDataError] = useState(null); 
    const [isMenuVisible, setIsMenuVisible] = useState(false); // Estado para el modal de menu

    const { signOut, getToken } = useContext(AuthContext);

    // ----------------------------------------------------------------
    // FUNCION PRINCIPAL: CARGA DATOS
    // ----------------------------------------------------------------
    const fetchData = async () => {
        setIsLoading(true);
        setDataError(null); 
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            const studentsResponse = await axios.get(`${API_URL}/users/students`, { headers });
            setStudents(Array.isArray(studentsResponse.data) ? studentsResponse.data : []);

            // ?? CAMBIO: Eliminamos la llamada a la API de rutinas maestras de la vista principal
            // const routinesResponse = await axios.get(`${API_URL}/routines/`, { headers });
            // setRoutines(Array.isArray(routinesResponse.data) ? routinesResponse.data : []);

        } catch (e) {
            console.error("Error cargando datos del profesor:", e.response ? e.response.data : e.message);
            
            let errorMsg;
            
            if (e.message === 'Network Error') {
                errorMsg = "Error de Red. Verifica la URL de Render o la conexion del servidor.";
            } else if (e.response && (e.response.status === 401 || e.response.status === 403)) {
                errorMsg = "Sesion invalida o expirada. Saliendo...";
                signOut(); 
            } else if (e.response && e.response.status === 500) {
                 errorMsg = "Error interno del servidor (500) al cargar listas. Base de datos inconsistente.";
            } else {
                errorMsg = "Error al cargar datos. Token invalido o backend.";
            }
            
            setDataError(errorMsg); 
        } finally {
            setIsLoading(false);
        }
    };
    
    // ----------------------------------------------------------------
    // FUNCION: Cierre de Sesion y Contrasena (Modal)
    // ----------------------------------------------------------------
    const handleChangePassword = () => {
        setIsMenuVisible(false); // Cierra el modal
        navigation.navigate('ChangePassword'); // Debe existir en App.js
    };
    
    const handleLogout = () => {
        setIsMenuVisible(false);
        signOut();
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', fetchData);
        fetchData();
        return unsubscribe;
    }, [navigation, isDark]);
    
    const handleAssignmentComplete = () => {
        setSelectedStudent(null);
        fetchData(); 
    };
    
    // --- VISTAS DE ESTADO ---
    if (dataError && !isLoading && !selectedStudent && !creatingForStudent) {
        return (
             <SafeAreaView style={styles.container}>
                 <View style={styles.errorView}>
                     <Text style={styles.errorTitle}>!Error de Conexion!</Text>
                     <Text style={styles.errorDetail}>{dataError}</Text>
                     <View style={{marginTop: 20}}>
                         <Button title="Intentar de Nuevo" onPress={fetchData} color={themeColors.primary} />
                     </View>
                     {dataError !== "Sesion invalida o expirada. Saliendo..." && (
                         <View style={{marginTop: 10}}>
                             <Button title="Salir" onPress={signOut} color={themeColors.danger} />
                         </View>
                     )}
                 </View>
             </SafeAreaView>
         );
       }

    if (isLoading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={themeColors.primary} />
                <Text style={{ color: themeColors.textSecondary, marginTop: 10 }}>Cargando panel de gestion...</Text>
            </SafeAreaView>
        );
    }
    
    // Paso 1: Modo Seleccionar Alumno para CREAR Rutina
    if (creatingForStudent) {
        return (
            <StudentSelectionForCreation
                navigation={navigation}
                students={students}
                onCancel={() => setCreatingForStudent(false)}
            />
        );
    }

    // Paso 2: Modo Gestionar Asignacion de Alumno existente
    if (selectedStudent) {
        // En este punto, 'routines' no esta definido en el scope, pasamos un array vacio
        // y AssignmentView cargara las asignaciones.
        return (
            <SafeAreaView style={styles.container}>
                <AssignmentView 
                    student={selectedStudent} 
                    routines={[]} 
                    onAssignmentComplete={handleAssignmentComplete} 
                    onCancel={() => setSelectedStudent(null)} 
                    navigation={navigation}
                />
            </SafeAreaView>
        );
    }
    
    // --- VISTA PRINCIPAL ---
    return (
        <SafeAreaView style={styles.container}>
            {/* CABECERA ESTILIZADA CON ICONOS */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Panel Profesor</Text>
                <View style={styles.headerButtons}>
                    {/* Boton de Actualizar: USAMOS LUCIDE */}
                    <TouchableOpacity 
                        onPress={fetchData} 
                        style={styles.iconButton}
                        disabled={isLoading}
                    >
                        <RefreshCcw size={22} color={themeColors.primaryDark} />
                    </TouchableOpacity>
                    {/* Boton de Menu/Opciones */}
                    <TouchableOpacity 
                        onPress={() => setIsMenuVisible(true)} 
                        style={styles.iconButton}
                    >
                        <Settings size={22} color={themeColors.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>
            
            <ScrollView style={{ flex: 1 }}>
                
                <View style={styles.actionSection}>
                    <Text style={styles.subtitle}>Opciones del Profesor</Text>
                    
                    {/* BOTON CREAR RUTINA */}
                    <Button 
                        title="Crear Nueva Rutina y Asignar" 
                        onPress={() => setCreatingForStudent(true)} 
                        color={themeColors.success} 
                    />
                </View>

                {/* -------------------- SECCION DE GESTION DE RUTINAS MAESTRAS ELIMINADA -------------------- */}

                <Text style={styles.listTitle}>Alumnos ({students.length})</Text>

                <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 }}>
                    {students.length > 0 ? (
                        students.map((item) => (
                            <TouchableOpacity 
                                key={item.id.toString()}
                                style={styles.studentCard}
                                onPress={() => setSelectedStudent(item)} // Clic para GESTIONAR ASIGNACION
                            >
                                <View>
                                    <Text style={styles.studentName}>{item.nombre}</Text>
                                    <Text style={styles.studentEmail}>{item.email}</Text>
                                </View>
                                <Text style={styles.assignButtonText}>GESTIONAR {'>>'}</Text>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <Text style={{ color: themeColors.textSecondary }}>No hay alumnos registrados. Puedes registrarlos en tu backend.</Text>
                        </View>
                    )}
                </ScrollView>
            </ScrollView>
            
            {/* MODAL DE OPCIONES DE USUARIO */}
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
                        
                        {/* Opcion 1: Cambiar Contrasena */}
                        <TouchableOpacity style={styles.menuItem} onPress={handleChangePassword}>
                            <Key size={18} color={themeColors.textPrimary} /> 
                            <Text style={styles.menuItemText}>Cambiar Contrasena</Text>
                        </TouchableOpacity>
                        
                        {/* Opcion 2: Cerrar Sesion */}
                        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                            <LogOut size={18} color={themeColors.danger} />
                            <Text style={styles.menuItemTextLogout}>Cerrar Sesion</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={[styles.menuItem, styles.menuItemClose]} onPress={() => setIsMenuVisible(false)}>
                            <Text style={styles.menuItemTextClose}>Cerrar Menu</Text>
                        </TouchableOpacity>

                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}