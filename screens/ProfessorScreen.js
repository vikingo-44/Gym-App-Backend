import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
    StyleSheet, Text, View, ScrollView, SafeAreaView, Button, 
    ActivityIndicator, FlatList, TouchableOpacity, Alert, Modal,
    TextInput 
} from 'react-native';
import axios from 'axios';
import { AuthContext } from '../App'; 
import { useTheme } from '../ThemeContext'; 
// ?? Importamos TODOS los iconos necesarios (Lucide)
import { Trash2, Edit, RefreshCcw, Settings, Key, LogOut, Minus, Plus } from 'lucide-react-native'; 

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
// NOTA: Se mantiene la estructura original por si la usas para otras funciones
function AssignmentView({ student, routines, onAssignmentComplete, onCancel, navigation }) {
    
    const { colors: themeColors, isDark } = useTheme(); 
    const assignmentStyles = getAssignmentStyles(themeColors);

    const availableRoutines = Array.isArray(routines) ? routines : []; 
    
    // Asignacion (Mantenida por si acaso, aunque ya no se usa el select en ProfesorScreen)
    const [selectedRoutine, setSelectedRoutine] = useState(availableRoutines.length > 0 ? availableRoutines[0].id : null); 
    const [isAssigning, setIsAssigning] = useState(false);
    
    // Gestion de Asignaciones
    const [currentAssignments, setCurrentAssignments] = useState([]);
    const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(true);

    const { getToken } = useContext(AuthContext);

    // [.. FUNCIONES DE FETCH, EDIT, DELETE, TOGGLE ACTIVAS ... ] (Se mantienen intactas del codigo original)

    const fetchCurrentAssignments = async () => {
        setIsAssignmentsLoading(true);
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            const response = await axios.get(
                `${API_URL}/professor/assignments/student/${student.id}`, 
                { headers }
            );
            
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
    
    const handleEditAssignment = (routineId) => {
        if (navigation) {
            navigation.navigate('RoutineCreation', { 
                routineId: routineId
            });
        } else {
            Alert.alert("Error de Navegacion", "No se pudo acceder a la pantalla de edicion.");
        }
    };

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

    const handleToggleActive = async (assignmentId, currentStatus) => {
        const newStatus = !currentStatus;
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            await axios.patch(`${API_URL}/assignments/${assignmentId}/active?is_active=${newStatus}`, null, { headers });

            Alert.alert("Exito", `Rutina ${newStatus ? 'activada' : 'inactivada'} correctamente.`);
            
            fetchCurrentAssignments();

        } catch (e) {
            console.error("Error cambiando estado:", e.response ? e.response.data : e.message);
            Alert.alert("Error", "Fallo al cambiar el estado de la asignacion.");
        }
    };

    useEffect(() => {
        fetchCurrentAssignments();
    }, [student.id, isDark]); 

    const handleAssign = async () => { /* Logica de asignacion... */ };
    
    // --- VISTA DE RENDERIZADO (Se mantiene intacta la vista de asignacion) ---
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
                                    
                                    <View style={assignmentStyles.assignmentActions}>
                                        <TouchableOpacity 
                                            style={assignmentStyles.editButton} 
                                            onPress={() => handleEditAssignment(assignment.routine_id)}
                                        >
                                            <Edit size={20} color={themeColors.card} />
                                        </TouchableOpacity>

                                        <TouchableOpacity 
                                            style={[
                                                assignmentStyles.toggleButton, 
                                                { backgroundColor: assignment.is_active ? themeColors.warning : themeColors.success } 
                                            ]} 
                                            onPress={() => handleToggleActive(assignment.id, assignment.is_active)}
                                        >
                                            <Text style={{ color: themeColors.card, fontWeight: 'bold', fontSize: 12 }}>
                                                {assignment.is_active ? 'INACTIVAR' : 'ACTIVAR'}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity 
                                            style={assignmentStyles.deleteButton} 
                                            onPress={() => handleDeleteAssignment(assignment.id)}
                                        >
                                            <Trash2 size={20} color={themeColors.card} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={assignmentStyles.warning}>Este alumno no tiene rutinas asignadas.</Text>
                        )}
                    </View>
                )}


                {/* -------------------- 2. ASIGNAR NUEVA RUTINA (Seccion eliminada en el ultimo paso) -------------------- */}
                {/* Se mantiene la estructura para que el compilador no se rompa si se usa la prop `routines` y `onAssignmentComplete` */ }
                
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
    searchInput: {
        height: 45,
        backgroundColor: colors.card,
        borderColor: colors.divider,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
        marginBottom: 20,
        color: colors.textPrimary,
        marginHorizontal: 20, 
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
    // ?? ESTILOS NUEVOS PARA EL WIZARD
    wizardContainer: {
        flex: 1,
        padding: 20,
        paddingTop: 0,
        width: '100%',
    },
    wizardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 10,
        textAlign: 'center',
    },
    stepText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 20,
        textAlign: 'center',
        paddingBottom: 5,
        borderBottomWidth: 2,
        borderBottomColor: colors.highlight,
    },
    wizardInput: {
        height: 50,
        backgroundColor: colors.card,
        borderColor: colors.divider,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
        color: colors.textPrimary,
        marginBottom: 20,
    },
    dayCounter: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 15,
        marginBottom: 20,
    },
    dayButton: {
        padding: 10,
        backgroundColor: colors.primary,
        borderRadius: 8,
    },
    dayCountText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.textPrimary,
        width: 50,
        textAlign: 'center',
    },
    wizardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 30,
    }
});


// --- ?? NUEVO COMPONENTE: Asistente de Creacion de Rutina (Steps 1-4) ---
function RoutineCreationWizard({ students, onCancel, navigation }) {
    
    const { colors: themeColors } = useTheme();
    const styles = getMainScreenStyles(themeColors); // Estilos dinamicos

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        student: null, // Step 1
        objective: '',  // Step 2
        name: '',      // Step 3
        days: 3,       // Step 4: Inicializamos en 3 dias (un valor comun)
    });

    // Filtra los alumnos solo para la seleccion inicial (Step 1)
    const [searchTerm, setSearchTerm] = useState('');
    const filteredStudents = useMemo(() => {
        if (!searchTerm) {
            return students;
        }
        const lowerCaseSearch = searchTerm.toLowerCase();
        return students.filter(student => 
            student.nombre.toLowerCase().includes(lowerCaseSearch) ||
            student.email.toLowerCase().includes(lowerCaseSearch)
        );
    }, [students, searchTerm]);

    const handleSelectStudent = (student) => {
        setFormData(prev => ({ ...prev, student }));
        setStep(2); // Avanzar automaticamente al Step 2
    };

    const nextStep = () => {
        if (step === 1 && !formData.student) {
            Alert.alert("Error", "Debes seleccionar un alumno para continuar.");
            return;
        }
        if (step === 2 && !formData.objective.trim()) {
            Alert.alert("Error", "El objetivo no puede estar vacio.");
            return;
        }
        if (step === 3 && !formData.name.trim()) {
            Alert.alert("Error", "El nombre de la rutina no puede estar vacio.");
            return;
        }

        if (step === 4) {
            // FIN DEL WIZARD: Navegamos a RoutineCreationScreen para Steps 5 y 6
            navigation.navigate('RoutineCreation', { 
                mode: 'new',
                studentId: formData.student.id,
                studentName: formData.student.nombre,
                routineMetadata: {
                    nombre: formData.name,
                    descripcion: formData.objective,
                    days: formData.days
                }
                // RoutineCreationScreen manejara la creacion de ejercicios (Step 5) y la fecha final (Step 6)
            });
            onCancel(); // Cerramos el wizard en ProfessorScreen
            return;
        }

        setStep(step + 1);
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <>
                        <Text style={styles.stepText}>Step 1 de 4: Selecciona un Alumno</Text>
                        <TextInput
                            style={styles.searchInput} 
                            placeholder="Buscar alumno por nombre o email..."
                            placeholderTextColor={themeColors.textSecondary}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                        <ScrollView style={{ maxHeight: 400, marginBottom: 20 }}>
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map((item) => (
                                    <TouchableOpacity 
                                        key={item.id.toString()}
                                        style={[
                                            styles.studentCard,
                                            formData.student && formData.student.id === item.id && { borderColor: themeColors.primary, borderWidth: 2 }
                                        ]}
                                        onPress={() => handleSelectStudent(item)}
                                    >
                                        <View>
                                            <Text style={styles.studentName}>{item.nombre}</Text>
                                            <Text style={styles.studentEmail}>{item.email}</Text>
                                        </View>
                                        <Text style={{...styles.assignButtonText, color: themeColors.success}}>SELECCIONAR</Text>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={styles.warningTextCenter}>No se encontraron alumnos.</Text>
                            )}
                        </ScrollView>
                        {formData.student && (
                            <Text style={[styles.studentName, {textAlign: 'center', marginTop: 10}]}>
                                Seleccionado: {formData.student.nombre}
                            </Text>
                        )}
                    </>
                );
            case 2:
                return (
                    <>
                        <Text style={styles.stepText}>Step 2 de 4: Objetivo de la Rutina</Text>
                        <TextInput
                            style={[styles.wizardInput, { height: 100 }]}
                            placeholder="Ej: Aumento de masa muscular, Definicion, Resistencia..."
                            placeholderTextColor={themeColors.textSecondary}
                            value={formData.objective}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, objective: text }))}
                            multiline
                            textAlignVertical="top"
                            autoFocus
                        />
                        <Text style={styles.studentEmail}>Alumno: {formData.student.nombre}</Text>
                    </>
                );
            case 3:
                return (
                    <>
                        <Text style={styles.stepText}>Step 3 de 4: Nombre de la Rutina</Text>
                        <TextInput
                            style={styles.wizardInput}
                            placeholder="Ej: Full Body Nivel Intermedio"
                            placeholderTextColor={themeColors.textSecondary}
                            value={formData.name}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                            autoFocus
                        />
                        <Text style={styles.studentEmail}>Objetivo: {formData.objective}</Text>
                    </>
                );
            case 4:
                return (
                    <>
                        <Text style={styles.stepText}>Step 4 de 4: Cantidad de Dias de Entrenamiento</Text>
                        <View style={styles.dayCounter}>
                            <TouchableOpacity 
                                style={[styles.dayButton, { backgroundColor: themeColors.danger }]}
                                onPress={() => setFormData(prev => ({ ...prev, days: Math.max(1, prev.days - 1) }))}
                            >
                                <Minus size={24} color={themeColors.card} />
                            </TouchableOpacity>

                            <Text style={styles.dayCountText}>{formData.days}</Text>

                            <TouchableOpacity 
                                style={[styles.dayButton, { backgroundColor: themeColors.success }]}
                                onPress={() => setFormData(prev => ({ ...prev, days: prev.days + 1 }))}
                            >
                                <Plus size={24} color={themeColors.card} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.studentEmail, {textAlign: 'center'}]}>
                            Esto generara {formData.days} secciones de ejercicios.
                        </Text>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerSelection}>
                <Text style={styles.wizardTitle}>Crear Rutina Paso a Paso</Text>
                <Button title="Cancelar" onPress={onCancel} color={themeColors.danger} />
            </View>
            
            <ScrollView contentContainerStyle={styles.wizardContainer}>
                {renderStep()}

                <View style={styles.wizardActions}>
                    <Button 
                        title="< Atras" 
                        onPress={() => setStep(step - 1)} 
                        disabled={step === 1}
                        color={themeColors.textSecondary}
                    />
                    <Button 
                        title={step === 4 ? "Continuar a Ejercicios >>" : "Siguiente >"} 
                        onPress={nextStep} 
                        color={step === 4 ? themeColors.success : themeColors.primary}
                        // Deshabilitar siguiente si faltan datos obligatorios
                        disabled={
                            (step === 1 && !formData.student) ||
                            (step === 2 && !formData.objective.trim()) ||
                            (step === 3 && !formData.name.trim()) ||
                            (step === 4 && formData.days < 1)
                        }
                    />
                </View>
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

    // ?? ANADIDO: Estado para el campo de busqueda (Mantenido)
    const [searchTerm, setSearchTerm] = useState('');

    const { signOut, getToken } = useContext(AuthContext);

    // [.. FUNCIONES fetchData, handleChangePassword, handleLogout ... ] (Se mantienen intactas del codigo original)
    const fetchData = async () => {
        setIsLoading(true);
        setDataError(null); 
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            const studentsResponse = await axios.get(`${API_URL}/users/students`, { headers });
            setStudents(Array.isArray(studentsResponse.data) ? studentsResponse.data : []);

            // Asumo que la carga de rutinas se elimino en el paso anterior y no la reintroduzco.

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
    
    const handleChangePassword = () => {
        setIsMenuVisible(false); // Cierra el modal
        navigation.navigate('ChangePassword'); 
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
    
    const filteredStudents = useMemo(() => {
        if (!searchTerm) {
            return students;
        }
        const lowerCaseSearch = searchTerm.toLowerCase();
        // Filtra por nombre O por email
        return students.filter(student => 
            student.nombre.toLowerCase().includes(lowerCaseSearch) ||
            student.email.toLowerCase().includes(lowerCaseSearch)
        );
    }, [students, searchTerm]);
    
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
    
    // Paso 1: Modo Wizard de Creacion de Rutina (Reemplaza StudentSelectionForCreation)
    if (creatingForStudent) {
        return (
            <RoutineCreationWizard
                navigation={navigation}
                students={students}
                onCancel={() => setCreatingForStudent(false)}
            />
        );
    }

    // Paso 2: Modo Gestionar Asignacion de Alumno existente
    if (selectedStudent) {
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
                        title="Crear Nueva Rutina Paso a Paso" // ?? MODIFICADO EL TEXTO
                        onPress={() => setCreatingForStudent(true)} 
                        color={themeColors.success} 
                    />
                </View>

                {/* -------------------- SECCION DE GESTION DE RUTINAS MAESTRAS ELIMINADA -------------------- */}
                {/* [Bloque de gestion de Rutinas Maestras] */}


                <Text style={styles.listTitle}>Alumnos ({filteredStudents.length})</Text> 

                {/* ?? ANADIDO: Input de busqueda */}
                <TextInput
                    style={styles.searchInput} 
                    placeholder="Buscar alumno por nombre o email..."
                    placeholderTextColor={themeColors.textSecondary}
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                />
                
                <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 }}>
                    {filteredStudents.length > 0 ? (
                        filteredStudents.map((item) => (
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
                            <Text style={{ color: themeColors.textSecondary }}>No se encontraron alumnos.</Text>
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