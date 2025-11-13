import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
    StyleSheet, Text, View, ScrollView, SafeAreaView, Button, 
    ActivityIndicator, FlatList, TouchableOpacity, Alert, Modal,
    TextInput 
} from 'react-native';
import axios from 'axios';
import { AuthContext } from '../App'; 
import { useTheme } from '../ThemeContext'; 
// Importaciones de iconos
import { Trash2, Edit, RefreshCcw, Settings, Key, LogOut, Minus, Plus, ChevronDown, ChevronUp } from 'lucide-react-native'; 

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
    // ESTILOS DE AGRUPACION
    groupHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginTop: 20,
        marginBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: colors.primary,
        paddingBottom: 5,
        width: '100%',
    },
    // Estilo base de la tarjeta (para CollapsibleAssignmentCard)
    assignmentCard: {
        flexDirection: 'row', // Permite que la barra de estado este al lado
        backgroundColor: colors.card,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: colors.isDark ? '#000' : '#444',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: colors.isDark ? 0.3 : 0.1,
        shadowRadius: 2,
        elevation: 2,
        overflow: 'hidden', // Importante para que el borderRadius funcione bien con la barra
    },
    // NUEVO: Barra lateral de estado
    statusBar: {
        width: 40,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        // El color se asigna dinamicamente en el componente
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'white',
        transform: [{ rotate: '-90deg' }], // Texto vertical
        width: 80, // Asegura que el texto quepa girado
        textAlign: 'center',
    },
    // Contenido del header y acciones
    assignmentContent: {
        flex: 1,
        padding: 15,
    },
    assignmentHeader: { // Nuevo: El area que se toca para expandir
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flex: 1,
    },
    assignmentDetails: {
        flex: 1,
        paddingRight: 10,
    },
    assignmentActions: { 
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    assignmentDate: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 5,
    },
    deleteButton: {
        padding: 8, 
        backgroundColor: colors.danger, 
        borderRadius: 8,
    },
    editButton: { 
        padding: 8, 
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
    },
    // Estilos de la lista de ejercicios expandida
    exerciseListContainer: {
        marginTop: 15,
        paddingTop: 10,
        paddingHorizontal: 15,
        paddingBottom: 5,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    exerciseItem: {
        paddingLeft: 10,
        paddingVertical: 8, 
        borderLeftWidth: 2,
        borderLeftColor: colors.highlight,
        marginBottom: 8,
    },
    exerciseName: {
        fontSize: 15,
        fontWeight: '700', 
        color: colors.textPrimary,
        marginBottom: 5,
    },
    // --- Estilos para Sets/Reps/Peso (Mas visuales) ---
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 15, 
        marginTop: 5,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.isDark ? colors.highlight : colors.divider, 
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    detailLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginRight: 4,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.primaryDark,
    },
});

// ----------------------------------------------------------------------
// COMPONENTE: Tarjeta Colapsable de Asignacion (Modificado para barra lateral)
// ----------------------------------------------------------------------
const CollapsibleAssignmentCard = ({ assignment, assignmentStyles, themeColors, handleEditAssignment, handleDeleteAssignment, handleToggleActive }) => {
    
    const [isExpanded, setIsExpanded] = useState(false);
    const linkCount = assignment.routine.exercise_links ? assignment.routine.exercise_links.length : 0; 

    // Define el color y el texto del estado
    const statusColor = assignment.is_active ? themeColors.success : themeColors.warning;
    const statusText = assignment.is_active ? 'ACTIVA' : 'INACTIVA';

    // Renderiza la lista de ejercicios (solo cuando se expande)
    const renderExercises = () => (
        <View style={assignmentStyles.exerciseListContainer}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: themeColors.textPrimary, marginBottom: 5 }}>Detalle de Ejercicios:</Text>
            {assignment.routine.exercise_links
                .sort((a, b) => a.order - b.order)
                .map((link, exIndex) => (
                    <View key={link.id || exIndex} style={assignmentStyles.exerciseItem}>
                        <Text style={assignmentStyles.exerciseName}>
                            {link.order}. {link.exercise.nombre}
                        </Text>
                        
                        <View style={assignmentStyles.detailsRow}>
                            {/* Sets */}
                            <View style={assignmentStyles.detailItem}>
                                <Text style={assignmentStyles.detailLabel}>Sets:</Text>
                                <Text style={assignmentStyles.detailValue}>{link.sets}</Text>
                            </View>

                            {/* Reps */}
                            <View style={assignmentStyles.detailItem}>
                                <Text style={assignmentStyles.detailLabel}>Reps:</Text>
                                <Text style={assignmentStyles.detailValue}>{link.repetitions}</Text>
                            </View>

                            {/* Peso (usando '-' si es nulo) */}
                            <View style={assignmentStyles.detailItem}>
                                <Text style={assignmentStyles.detailLabel}>Peso:</Text>
                                <Text style={assignmentStyles.detailValue}>{link.peso || '-'}</Text>
                            </View>
                        </View>
                    </View>
                ))}
        </View>
    );

    return (
        <View style={assignmentStyles.assignmentCard}>
            
            {/* 1. BARRA LATERAL DE ESTADO */}
            <View style={[assignmentStyles.statusBar, { backgroundColor: statusColor }]}>
                <Text style={assignmentStyles.statusText}>{statusText}</Text>
            </View>

            {/* CONTENEDOR PRINCIPAL DEL CONTENIDO */}
            <View style={assignmentStyles.assignmentContent}>
                
                {/* 2. CABECERA: Area Colapsable (El area de clic) */}
                <TouchableOpacity 
                    style={assignmentStyles.assignmentHeader} 
                    onPress={() => setIsExpanded(!isExpanded)}
                    activeOpacity={0.8}
                >
                    <View style={assignmentStyles.assignmentDetails}>
                        <Text style={assignmentStyles.routineName}>{assignment.routine.nombre}</Text>
                        <Text style={assignmentStyles.assignmentDate}>
                            Vencimiento: {assignment.routine?.routine_group?.fecha_vencimiento || 'N/A'}
                        </Text>
                        {/* Indicador de expansion */}
                        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 5}}>
                            {isExpanded ? 
                                <ChevronUp size={18} color={themeColors.primary} /> : 
                                <ChevronDown size={18} color={themeColors.primary} />
                            }
                            <Text style={{marginLeft: 5, color: themeColors.primary, fontSize: 13, fontWeight: '500'}}>
                                {isExpanded ? 'TOCAR PARA COLAPSAR' : `VER ${linkCount} EJERCICIOS`}
                            </Text>
                        </View>
                    </View>

                    {/* 3. ACCIONES (Botones) */}
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
                            // Llamamos a la función de toggle con el ID y el estado actual
                            onPress={() => handleToggleActive(assignment.id, assignment.is_active)}
                        >
                            <Text style={{ color: themeColors.card, fontWeight: 'bold', fontSize: 12 }}>
                                {assignment.is_active ? 'INACTIVAR' : 'ACTIVAR'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={assignmentStyles.deleteButton} 
                            // 🚨 CAMBIO CLAVE: Pasamos el objeto completo para la nueva lógica de grupo
                            onPress={() => handleDeleteAssignment(assignment)} 
                        >
                            <Trash2 size={20} color={themeColors.card} />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>

                {/* 4. CONTENIDO COLAPSABLE (Ejercicios) */}
                {isExpanded && renderExercises()}
            </View>
        </View>
    );
}

// --- Sub-componente para Asignar y Gestionar Rutinas ---
function AssignmentView({ student, routines, onAssignmentComplete, onCancel, navigation }) {
    
    const { colors: themeColors, isDark } = useTheme(); 
    const assignmentStyles = getAssignmentStyles(themeColors);

    const availableRoutines = Array.isArray(routines) ? routines : []; 
    
    const [selectedRoutine, setSelectedRoutine] = useState(availableRoutines.length > 0 ? availableRoutines[0].id : null); 
    const [isAssigning, setIsAssigning] = useState(false);
    
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
        if (navigation) {
            navigation.navigate('RoutineCreation', { 
                routineId: routineId
            });
        } else {
            Alert.alert("Error de Navegacion", "No se pudo acceder a la pantalla de edicion.");
        }
    };

    // ----------------------------------------------------------------
    // FUNCION 2: ELIMINAR ASIGNACION (LÓGICA MEJORADA)
    // ----------------------------------------------------------------
    const handleDeleteAssignment = (assignment) => { 
        const assignmentId = assignment.id;
        // Obtenemos el ID del grupo si existe
        const routineGroupId = assignment.routine.routine_group?.id;
        const isGroupMember = !!routineGroupId;
        
        let deletionURL;
        let deletionMessage;
        let successMessage;

        if (isGroupMember) {
            // Eliminar el grupo completo para este alumno (Requiere ruta en backend)
            deletionURL = `${API_URL}/assignments/group/${routineGroupId}/student/${student.id}`;
            deletionMessage = "¿Estás seguro de que quieres **ELIMINAR ESTE GRUPO COMPLETO** de rutinas para **SOLO ESTE ALUMNO**? (Esto eliminará Día 1, Día 2, etc.)";
            successMessage = "Grupo de asignaciones eliminado correctamente.";
        } else {
            // Eliminar asignación individual
            deletionURL = `${API_URL}/assignments/${assignmentId}`;
            deletionMessage = "¿Estás seguro de que quieres eliminar esta asignación de rutina individual?";
            successMessage = "Asignación individual eliminada correctamente.";
        }

        Alert.alert(
            "Confirmar Eliminación",
            deletionMessage,
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
                            
                            await axios.delete(deletionURL, { headers });
                            
                            Alert.alert("Éxito", successMessage);
                            
                            // Refrescar la lista
                            fetchCurrentAssignments();
                            
                        } catch (e) {
                            console.error("Error eliminando asignación:", e.response ? e.response.data : e.message);
                            Alert.alert("Error", `Fallo al eliminar: ${e.response?.data?.detail || "Error de red/servidor."}`);
                        }
                    }
                }
            ]
        );
    };

    // ----------------------------------------------------------------
    // FUNCION 3: CAMBIAR ESTADO ACTIVO/INACTIVO (CORREGIDA)
    // ----------------------------------------------------------------
    const handleToggleActive = async (assignmentId, currentStatus) => {
        const newStatus = !currentStatus;
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            // 🚨 CORRECCIÓN: Usamos PATCH al endpoint principal y enviamos el estado en el BODY.
            // Esto soluciona el error "Fallo al cambiar el estado de la asignación".
            await axios.patch(
                `${API_URL}/assignments/${assignmentId}`, 
                { is_active: newStatus }, // Body con el nuevo estado (Requiere el esquema RoutineAssignmentUpdate en models.py)
                { headers }
            );

            Alert.alert("Éxito", `Rutina ${newStatus ? 'activada' : 'inactivada'} correctamente.`);
            
            fetchCurrentAssignments();

        } catch (e) {
            console.error("Error cambiando estado:", e.response ? e.response.data : e.message);
            Alert.alert("Error", `Fallo al cambiar el estado. Detalle: ${e.response?.data?.detail || "Error de red/servidor."}`);
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

            Alert.alert("Éxito", `Rutina asignada a ${student.nombre}.`);
            fetchCurrentAssignments(); 
        } catch (e) {
            console.error("Error asignando rutina:", e.response ? e.response.data : e.message);
            let errorMessage = "Fallo al asignar la rutina. Verifica la conexión o backend.";
            if (e.response && e.response.data && e.response.data.detail) {
                errorMessage = `Error de API: ${JSON.stringify(e.response.data.detail)}`;
            } else if (e.response && (e.response.status === 401 || e.response.status === 403)) {
                errorMessage = "Token expirado o no autorizado. Vuelve a iniciar sesión.";
            }
            Alert.alert("Error", errorMessage);
        } finally {
            setIsAssigning(false);
        }
    };
    
    // ----------------------------------------------------------------
    // FUNCION DE AGRUPACION (Por el nombre base de la rutina)
    // ----------------------------------------------------------------
    const getGroupedAssignments = () => {
        const groups = {};
        // Expresión regular para encontrar el patron " - Dia X"
        const dayPattern = / - Dia \d+$/;

        for (const assignment of currentAssignments) {
            const fullName = assignment.routine?.nombre || 'Rutina Sin Nombre';
            
            // Si la rutina tiene un grupo_id asociado (desde la API), usamos el nombre del grupo.
            let groupName;
            let groupExpiryDate = null;

            if (assignment.routine?.routine_group?.nombre) {
                groupName = assignment.routine.routine_group.nombre;
                groupExpiryDate = assignment.routine.routine_group.fecha_vencimiento;
            } else {
                // Si no hay grupo, usamos la lógica de detección por sufijo para rutinas antiguas.
                const match = fullName.match(dayPattern);
                if (match) {
                    groupName = fullName.substring(0, fullName.length - match[0].length).trim();
                } else {
                    groupName = fullName;
                }
            }

            if (!groups[groupName]) {
                groups[groupName] = {
                    assignments: [],
                    expiryDate: groupExpiryDate // Usamos la fecha del grupo si esta disponible
                };
            }
            groups[groupName].assignments.push(assignment);
        }

        return groups;
    };

    const groupedAssignments = getGroupedAssignments();
    
    // --- VISTA DE RENDERIZADO ---
    return (
        <ScrollView style={assignmentStyles.scrollContainer}>
            <View style={assignmentStyles.container}>
                <Text style={assignmentStyles.title}>Gestionar: {student.nombre}</Text>

                {/* -------------------- 1. GESTIONAR ASIGNACIONES (AGRUPADAS) -------------------- */}
                <Text style={assignmentStyles.subtitle}>Rutinas Asignadas Actualmente ({currentAssignments.length})</Text>
                
                {isAssignmentsLoading ? (
                    <ActivityIndicator size="small" color={themeColors.primary} style={{marginBottom: 15}}/>
                ) : (
                    <View style={assignmentStyles.currentAssignmentList}>
                        {Object.keys(groupedAssignments).length > 0 ? (
                            Object.keys(groupedAssignments).map((groupName) => (
                                <View key={groupName}>
                                    {/* Encabezado del grupo */}
                                    <Text style={assignmentStyles.groupHeader}>
                                        {groupName} ({groupedAssignments[groupName].assignments.length})
                                        {groupedAssignments[groupName].expiryDate && (
                                            <Text style={{fontSize: 14, fontWeight: 'normal', color: themeColors.textSecondary}}>
                                                {"\n"}Vence: {groupedAssignments[groupName].expiryDate}
                                            </Text>
                                        )}
                                    </Text>
                                    
                                    {/* Listado de rutinas dentro del grupo - Usamos el nuevo componente colapsable */}
                                    {groupedAssignments[groupName].assignments
                                        // Opcional: Ordenar las rutinas por el numero de dia (si existe)
                                        .sort((a, b) => {
                                            const aDayMatch = a.routine.nombre.match(/ - Dia (\d+)$/);
                                            const bDayMatch = b.routine.nombre.match(/ - Dia (\d+)$/);
                                            const aDay = aDayMatch ? parseInt(aDayMatch[1]) : 999;
                                            const bDay = bDayMatch ? parseInt(bDayMatch[1]) : 999;
                                            return aDay - bDay;
                                        })
                                        .map((assignment) => (
                                            <CollapsibleAssignmentCard 
                                                key={assignment.id.toString()}
                                                assignment={assignment}
                                                assignmentStyles={assignmentStyles}
                                                themeColors={themeColors}
                                                handleEditAssignment={handleEditAssignment}
                                                handleDeleteAssignment={handleDeleteAssignment}
                                                handleToggleActive={handleToggleActive}
                                            />
                                        ))}
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
    // ESTILO NUEVO: Campo de Busqueda
    searchInput: {
        height: 45,
        backgroundColor: colors.card,
        borderColor: colors.divider,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
        color: colors.textPrimary,
        marginHorizontal: 20, // Ajustar para padding
        marginBottom: 20,
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
        marginHorizontal: 0, // Eliminamos el margin horizontal para que se vea bien en FlatList
        marginBottom: 10,
        shadowColor: colors.isDark ? '#000' : '#444',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: colors.isDark ? 0.4 : 0.1,
        shadowRadius: 2,
        elevation: 2,
        width: '100%', // Aseguramos el ancho completo dentro del padding de ScrollView
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
    // NUEVOS ESTILOS PARA LOS BOTONES EN LA TARJETA
    studentCardActions: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 80, // Ancho mínimo para que quepa el texto
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: colors.card,
    },
    // FIN NUEVOS ESTILOS 
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
    // ESTILOS DEL WIZARD (se mantienen)
    wizardContainer: {
        flex: 1,
        padding: 20,
        width: '100%',
    },
    wizardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 20,
        textAlign: 'center',
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
        width: '100%',
    },
    stepText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 10,
        textAlign: 'center',
    },
    wizardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 30,
    },
    // ESTILOS DEL CONTADOR
    routineCounter: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        marginBottom: 20,
        paddingVertical: 10,
    },
    counterButton: {
        padding: 10,
        backgroundColor: colors.primary,
        borderRadius: 8,
    },
    counterCountText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.textPrimary,
        width: 60,
        textAlign: 'center',
    },
});


// --- COMPONENTE: Asistente de Creacion Simplificado (3 Pasos) ---
function CreationWizardSimplified({ students, onCancel, navigation }) {
    
    const { colors: themeColors } = useTheme();
    const styles = getMainScreenStyles(themeColors); // Estilos dinamicos

    const [step, setStep] = useState(1);
    const [routineName, setRoutineName] = useState(''); // Paso 1: Nombre de Agrupacion
    const [routinesCount, setRoutinesCount] = useState(1); // Paso 2: Cantidad de Rutinas
    const [expirationDate, setExpirationDate] = useState(''); // FECHA DE VENCIMIENTO
    const [searchTerm, setSearchTerm] = useState(''); // Filtro de alumnos

    // Filtra los alumnos solo para la seleccion (Step 3)
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
        // FIN DEL WIZARD: Navegamos a RoutineCreationScreen
        navigation.navigate('RoutineCreation', { 
            studentId: student.id,
            studentName: student.nombre,
            // Enviamos la metadata completa al frontend
            routineMetadata: {
                nombre: routineName.trim(),
                descripcion: `Agrupacion de ${routinesCount} rutinas.`, 
                days: routinesCount, // Cantidad de rutinas a crear
                expirationDate: expirationDate.trim() // FECHA DE VENCIMIENTO
            }
        });
        onCancel(); // Cerramos el wizard en ProfessorScreen
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <>
                        <Text style={styles.stepText}>Paso 1 de 3: Nombre Genérico de la Agrupación</Text>
                        <TextInput
                            style={styles.wizardInput}
                            placeholder="Ej: Rutina Bloque A / Mes 1"
                            placeholderTextColor={themeColors.textSecondary}
                            value={routineName}
                            onChangeText={setRoutineName}
                            autoFocus
                        />
                        <Text style={styles.warningTextCenter}>
                            Este nombre agrupará las rutinas (Día 1, Día 2, etc.)
                        </Text>
                    </>
                );
            case 2:
                return (
                    <>
                        <Text style={styles.stepText}>Paso 2 de 3: Configuración de la Agrupación</Text>
                        
                        <Text style={styles.label}>Cantidad de Rutinas:</Text>
                        <Text style={styles.warningTextCenter}>
                            (Mínimo 1, Máximo 5 rutinas)
                        </Text>
                        <View style={styles.routineCounter}>
                            <TouchableOpacity 
                                style={[styles.counterButton, { backgroundColor: themeColors.danger }]}
                                onPress={() => setRoutinesCount(prev => Math.max(1, prev - 1))}
                                disabled={routinesCount <= 1}
                            >
                                <Minus size={24} color={themeColors.card} />
                            </TouchableOpacity>

                            <Text style={styles.counterCountText}>{routinesCount}</Text>

                            <TouchableOpacity 
                                style={[styles.counterButton, { backgroundColor: themeColors.success }]}
                                onPress={() => setRoutinesCount(prev => Math.min(5, prev + 1))} // Maximo 5
                                disabled={routinesCount >= 5}
                            >
                                <Plus size={24} color={themeColors.card} />
                            </TouchableOpacity>
                        </View>
                        
                        {/* NUEVO: INPUT DE FECHA DE VENCIMIENTO */}
                        <Text style={[styles.label, {marginTop: 20}]}>Fecha de Vencimiento:</Text>
                        <TextInput
                            style={styles.wizardInput}
                            placeholder="Ej: 2024-12-31"
                            placeholderTextColor={themeColors.textSecondary}
                            value={expirationDate}
                            onChangeText={setExpirationDate}
                            keyboardType="default"
                        />
                        <Text style={styles.warningTextCenter}>
                            Formato AAAA-MM-DD requerido por la API. Esta fecha debe ser futura.
                        </Text>
                        
                        <Text style={styles.studentEmail}>Agrupación: {routineName.trim()} | Vence: {expirationDate.trim() || '[Fecha Requerida]'}</Text>
                    </>
                );
            case 3:
                return (
                    <>
                        <Text style={styles.stepText}>Paso 3 de 3: Selecciona el Alumno</Text>
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
                                <Text style={styles.warningTextCenter}>No se encontraron alumnos.</Text>
                            )}
                        </ScrollView>
                        <Text style={styles.studentEmail}>Agrupación: {routineName.trim()} | Vence: {expirationDate.trim()}</Text>
                    </>
                );
            default:
                return null;
        }
    };

    const nextStep = () => {
        if (step === 1) {
            if (!routineName.trim()) {
                Alert.alert("Error", "Debes ingresar un nombre para la agrupación.");
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (routinesCount < 1) {
                Alert.alert("Error", "Debes seleccionar al menos una rutina para crear.");
                return;
            }
            // VALIDACION DE FECHA (Formato AAAA-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(expirationDate.trim())) {
                Alert.alert("Error", "Debes ingresar una fecha de vencimiento válida en formato AAAA-MM-DD.");
                return;
            }

            // Validacion de fecha futura simple
            try {
                const today = new Date();
                today.setHours(0,0,0,0);
                const expiry = new Date(expirationDate.trim());
                if (expiry <= today) {
                    Alert.alert("Error", "La fecha de vencimiento debe ser una fecha futura.");
                    return;
                }
            } catch (e) {
                Alert.alert("Error", "Formato de fecha no reconocido. Usa AAAA-MM-DD.");
                return;
            }


            setStep(3);
        }
    };
    
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerSelection}>
                <Text style={styles.wizardTitle}>Crear Rutina Agrupada</Text>
                <Button title="Cancelar" onPress={onCancel} color={themeColors.danger} />
            </View>
            
            <ScrollView contentContainerStyle={styles.wizardContainer}>
                {renderStep()}

                <View style={styles.wizardActions}>
                    <Button 
                        title="< Atrás" 
                        onPress={() => setStep(step - 1)} 
                        disabled={step === 1}
                        color={themeColors.textSecondary}
                    />
                    {(step === 1 || step === 2) && (
                        <Button 
                            title={"Siguiente >"} 
                            onPress={nextStep} 
                            disabled={step === 1 ? !routineName.trim() : routinesCount < 1 || !expirationDate.trim()}
                            color={themeColors.primary}
                        />
                    )}
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
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null); // Alumno para asignar/gestionar
    
    const [creatingForStudent, setCreatingForStudent] = useState(false); 
    const [dataError, setDataError] = useState(null); 
    const [isMenuVisible, setIsMenuVisible] = useState(false); // Estado para el modal de menu

    const [searchTerm, setSearchTerm] = useState('');

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

        } catch (e) {
            console.error("Error cargando datos del profesor:", e.response ? e.response.data : e.message);
            
            let errorMsg;
            
            if (e.message === 'Network Error') {
                errorMsg = "Error de Red. Verifica la URL de Render o la conexión del servidor.";
            } else if (e.response && (e.response.status === 401 || e.response.status === 403)) {
                errorMsg = "Sesión inválida o expirada. Saliendo...";
                signOut(); 
            } else if (e.response && e.response.status === 500) {
                errorMsg = "Error interno del servidor (500) al cargar listas. Base de datos inconsistente.";
            } else {
                errorMsg = "Error al cargar datos. Token inválido o backend.";
            }
            
            setDataError(errorMsg); 
        } finally {
            setIsLoading(false);
        }
    };
    
    // ----------------------------------------------------------------
    // FUNCIÓN: NAVEGAR A EDICIÓN DE DETALLES DEL ALUMNO (NUEVA)
    // ----------------------------------------------------------------
    const handleEditStudent = (studentData) => {
        // Navega a la nueva pantalla 'StudentDetails'
        navigation.navigate('StudentDetails', { student: studentData });
    };

    // ----------------------------------------------------------------
    // FUNCIÓN: Cierre de Sesion y Contrasena (Modal)
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
    
    // ----------------------------------------------------------------
    // Logica de filtrado de estudiantes
    // ----------------------------------------------------------------
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
                     <Text style={styles.errorTitle}>!Error de Conexión!</Text>
                     <Text style={styles.errorDetail}>{dataError}</Text>
                     <View style={{marginTop: 20}}>
                         <Button title="Intentar de Nuevo" onPress={fetchData} color={themeColors.primary} />
                     </View>
                     {dataError !== "Sesión inválida o expirada. Saliendo..." && (
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
                <Text style={{ color: themeColors.textSecondary, marginTop: 10 }}>Cargando panel de gestión...</Text>
            </SafeAreaView>
        );
    }
    
    // Paso 1: Modo Wizard de Creacion de Rutina (Simplificado)
    if (creatingForStudent) {
        return (
            <CreationWizardSimplified
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
                        title="Crear Nueva Rutina Agrupada y Asignar" 
                        onPress={() => setCreatingForStudent(true)} 
                        color={themeColors.success} 
                    />
                </View>

                <Text style={styles.listTitle}>Alumnos ({filteredStudents.length})</Text> 

                {/* Input de busqueda */}
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
                            <View 
                                key={item.id.toString()}
                                style={styles.studentCard}
                            >
                                <View>
                                    <Text style={styles.studentName}>{item.nombre}</Text>
                                    <Text style={styles.studentEmail}>{item.email}</Text>
                                </View>
                                
                                {/* BOTONES DE ACCIÓN */}
                                <View style={styles.studentCardActions}>
                                    {/* Botón 1: Gestionar Rutina */}
                                    <TouchableOpacity 
                                        style={[styles.actionButton, {backgroundColor: themeColors.warning}]}
                                        onPress={() => setSelectedStudent(item)} // Va a AssignmentView
                                    >
                                        <Text style={styles.actionButtonText}>Rutina</Text>
                                    </TouchableOpacity>

                                    {/* Botón 2: Editar Datos */}
                                    <TouchableOpacity 
                                        style={[styles.actionButton, {backgroundColor: themeColors.primary}]}
                                        onPress={() => handleEditStudent(item)} // Va a la nueva pantalla de edición
                                    >
                                        <Text style={styles.actionButtonText}>Editar</Text>
                                    </TouchableOpacity>
                                </View>
                                
                            </View>
                        ))
                    ) : (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <Text style={{ color: themeColors.textSecondary }}>No hay alumnos registrados que coincidan con la busqueda.</Text>
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
                            <Text style={styles.menuItemText}>Cambiar Contraseña</Text>
                        </TouchableOpacity>
                        
                        {/* Opcion 2: Cerrar Sesion */}
                        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                            <LogOut size={18} color={themeColors.danger} />
                            <Text style={styles.menuItemTextLogout}>Cerrar Sesión</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={[styles.menuItem, styles.menuItemClose]} onPress={() => setIsMenuVisible(false)}>
                            <Text style={styles.menuItemTextClose}>Cerrar Menú</Text>
                        </TouchableOpacity>

                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}