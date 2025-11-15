import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
    StyleSheet, Text, View, ScrollView, SafeAreaView, Button, 
    ActivityIndicator, FlatList, TouchableOpacity, Alert, Modal,
    TextInput 
} from 'react-native';
import axios from 'axios';
import { AuthContext } from '../App'; 
import { useTheme } from '../ThemeContext'; 
// Importamos TODOS los iconos necesarios (Lucide)
import { Trash2, Edit, RefreshCcw, Menu, User, Key, LogOut, Minus, Plus, ChevronDown, ChevronUp, UserPlus, CheckCircle, Weight } from 'lucide-react-native'; 

// ----------------------------------------------------------------------
// URL de la API (DEBE COINCIDIR con la de App.js)
// ----------------------------------------------------------------------
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// FUNCIONES DE FECHA (Ajustadas para DD/MM/YYYY)
// ----------------------------------------------------------------------

// Convierte DD/MM/YYYY o YYYY-MM-DD a un objeto Date (CRÍTICO para validación y formato)
const parseDateToJS = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split(/[-\/]/); // Soporta tanto - como /
    if (parts.length === 3) {
        // Asumimos DD/MM/YYYY o YYYY-MM-DD
        let year, month, day;
        if (parts[0].length === 4) { // Asume YYYY-MM-DD (API format)
            [year, month, day] = parts;
        } else { // Asume DD/MM/YYYY (Display format)
            [day, month, year] = parts;
        }
        // Usamos UTC para evitar problemas de zona horaria con la fecha local
        const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
        return date;
    }
    return null;
};

// Formatea un objeto Date (o una cadena ISO) a DD/MM/YYYY para la UI.
const formatDisplayDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    
    let date = dateInput instanceof Date ? dateInput : parseDateToJS(dateInput);

    if (date && !isNaN(date.getTime())) {
        // Usamos Intl.DateTimeFormat para el formato local DD/MM/YYYY
        return new Intl.DateTimeFormat('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(date);
    }
    return 'Inválida';
};

// Convierte DD/MM/YYYY o DD-MM-YYYY a YYYY-MM-DD (Formato requerido por la API)
const formatAPIDate = (dateString) => {
    const date = parseDateToJS(dateString);
    if (date && !isNaN(date.getTime())) {
        // Convertir a YYYY-MM-DD
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return '';
};
// ----------------------------------------------------------------------


// ----------------------------------------------------------------------
// GENERADOR DE ESTILOS PARA ASIGNACION (AssignmentView)
// ----------------------------------------------------------------------
const getAssignmentStyles = (colors) => StyleSheet.create({
    scrollContainer: {
        flex: 1, 
        backgroundColor: colors.background, // Usa el fondo del tema
    },
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: colors.background, // Usa el fondo del tema
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
    groupHeaderContainer: { 
        width: '100%',
        paddingBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: colors.primary,
        marginBottom: 15,
    },
    groupHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 5,
    },
    groupDetails: { // Nuevo estilo para detalles adicionales del grupo
        fontSize: 14, 
        fontWeight: 'normal', 
        color: colors.textSecondary, 
        marginBottom: 2,
    },
    groupActions: { 
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 10,
        marginTop: 10,
    },
    groupActionButtonText: { 
        color: colors.card, 
        fontWeight: 'bold', 
        fontSize: 12,
    },
    toggleGroupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    // Estilo base de la tarjeta (para CollapsibleAssignmentCard)
    assignmentCard: {
        flexDirection: 'row', 
        backgroundColor: colors.card,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: colors.isDark ? '#000' : '#444',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: colors.isDark ? 0.4 : 0.1, // Sombra más visible en modo oscuro
        shadowRadius: 3,
        elevation: 3,
        overflow: 'hidden', 
    },
    // Barra lateral de estado
    statusBar: {
        width: 30, 
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'white',
        transform: [{ rotate: '-90deg' }], 
        width: 100, 
        textAlign: 'center',
    },
    // Contenido del header y acciones
    assignmentContent: {
        flex: 1,
    },
    assignmentHeader: { 
        padding: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flex: 1,
    },
    assignmentDetails: {
        flex: 1, // Permite que ocupe el espacio
        paddingRight: 10,
    },
    assignmentActions: { 
        flexDirection: 'row',
        alignItems: 'center',
        // Asegura que los botones estén pegados al borde derecho si es necesario.
        justifyContent: 'flex-end', 
    },
    deleteButton: {
        padding: 8, 
        backgroundColor: colors.danger, 
        borderRadius: 8,
        flexDirection: 'row', 
        alignItems: 'center',
    },
    editButton: { 
        padding: 8, 
        backgroundColor: colors.primary, 
        borderRadius: 8,
        flexDirection: 'row', 
        alignItems: 'center',
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
        // CORRECCIÓN DE CONTRASTE: Usamos colors.card (#1F2937) en Dark Mode.
        backgroundColor: colors.isDark ? colors.card : '#1F2937', 
    },
    exerciseItem: {
        paddingLeft: 10,
        paddingVertical: 8, 
        borderLeftWidth: 2,
        borderLeftColor: colors.highlight,
        marginBottom: 8,
        backgroundColor: colors.isDark ? colors.card : '#1F2937', // Fondo para el item del ejercicio
        borderRadius: 5,
    },
    exerciseName: {
        fontSize: 15,
        fontWeight: '700', 
        color: colors.textPrimary,
        marginBottom: 5,
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
        backgroundColor: colors.isDark ? colors.highlight : colors.divider, // Ajuste para dark mode
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    detailLabel: {
        fontSize: 12,
        color: colors.textPrimary, 
        marginRight: 4,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.primaryDark,
    },
    // --- Estilos de Botones Personalizados (AssignmentView) ---
    customButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10, // Bordes redondeados
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 100,
        // Sombra para darle un toque 3D
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    buttonPrimary: {
        backgroundColor: colors.primary, // Color principal para avanzar/guardar
    },
    buttonSecondary: {
        backgroundColor: colors.card, // Fondo claro o de tarjeta
        borderColor: colors.divider,
        borderWidth: 1,
    },
    buttonDanger: {
        backgroundColor: colors.danger, // Color para cancelar
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.card, // Texto blanco/color de tarjeta para botones de colores
    },
    buttonTextSecondary: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textPrimary, // Texto principal para botones secundarios
    },
});

// ----------------------------------------------------------------------
// COMPONENTE: Tarjeta Colapsable de Asignacion
// ----------------------------------------------------------------------
const CollapsibleAssignmentCard = ({ 
    assignment, assignmentStyles, themeColors, 
    handleEditAssignment, 
}) => {
    
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
                
                {/* 2. CABECERA: Rutina Name Area (Ahora es una View) */}
                <View style={assignmentStyles.assignmentHeader}>
                    <View style={assignmentStyles.assignmentDetails}>
                        <Text style={assignmentStyles.routineName}>{assignment.routine.nombre}</Text>
                        
                        {/* Indicador de cantidad de ejercicios, separado del botón */}
                        <Text style={{ marginTop: 5, color: themeColors.textSecondary, fontSize: 13, fontWeight: '500'}}>
                            {linkCount} EJERCICIOS
                        </Text>
                    </View>

                    {/* 3. ACCIONES DE LA RUTINA INDIVIDUAL Y BOTÓN DE EXPANSIÓN (Touch Area) */}
                    <View style={assignmentStyles.assignmentActions}>
                        
                        {/* Botón para Editar Rutina Individual */}
                        <TouchableOpacity 
                            style={[assignmentStyles.editButton, { marginRight: 8 }]} 
                            onPress={() => handleEditAssignment(assignment.routine_id)} 
                        >
                            <Edit size={20} color={themeColors.card} />
                        </TouchableOpacity>
                        
                        {/* NUEVO BOTÓN DEDICADO: Expansión/Colapso */}
                        <TouchableOpacity
                            style={[
                                assignmentStyles.editButton, 
                                { backgroundColor: isExpanded ? themeColors.textSecondary : themeColors.primary }
                            ]}
                            onPress={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? 
                                <ChevronUp size={20} color={themeColors.card} /> : 
                                <ChevronDown size={20} color={themeColors.card} />
                            }
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 4. CONTENIDO COLAPSABLE (Ejercicios) */}
                {isExpanded && renderExercises()}
            </View>
        </View>
    );
}


// --- COMPONENTE: MODAL DE EDICIÓN DE GRUPO (NUEVO) ---
function EditGroupWizard({ groupData, onComplete, onCancel, fetchCurrentAssignments }) {
    const { colors: themeColors } = useTheme();
    const styles = getMainScreenStyles(themeColors); 
    const { getToken } = useContext(AuthContext);

    const firstRoutine = groupData.assignments[0];
    const group = firstRoutine.routine?.routine_group;
    
    // Inicializar la fecha de vencimiento en formato DD/MM/YYYY para la edición
    const initialExpiryDate = groupData.expiryDate ? formatDisplayDate(groupData.expiryDate) : '';

    const [groupName, setGroupName] = useState(groupData.groupName || '');
    const [routinesCount, setRoutinesCount] = useState(groupData.assignments.length);
    const [expirationDate, setExpirationDate] = useState(initialExpiryDate); // Formato DD/MM/YYYY
    const [isLoading, setIsLoading] = useState(false);

    const handleUpdateGroup = async () => {
        if (!groupName.trim() || !expirationDate.trim()) {
             Alert.alert("Error", "El nombre y la fecha de vencimiento son obligatorios.");
             return;
        }

        // Validar el formato DD/MM/YYYY para el usuario
        const displayDateRegex = /^\d{2}[-/]\d{2}[-/]\d{4}$/;
        if (!displayDateRegex.test(expirationDate.trim())) {
            Alert.alert("Error", "Debes ingresar una fecha de vencimiento válida en formato DD/MM/AAAA.");
            return;
        }
        
        // Convertir la fecha al formato YYYY-MM-DD para la API
        const apiFormattedDate = formatAPIDate(expirationDate.trim());
        if (!apiFormattedDate) {
             Alert.alert("Error", "No se pudo convertir la fecha a un formato válido para la API.");
             return;
        }
        
        setIsLoading(true);
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };
            const routineGroupId = groupData.routineGroupId;
            const currentCount = groupData.assignments.length;
            
            // 1. PATCH: Actualizar el grupo de rutinas (Nombre y Fecha)
            await axios.patch(
                `${API_URL}/routine_groups/${routineGroupId}`, 
                { 
                    nombre: groupName.trim(), 
                    fecha_vencimiento: apiFormattedDate, // Usamos el formato YYYY-MM-DD
                },
                { headers }
            );

            // 2. Manejar la lógica de cambio de días (rutinas)
            if (routinesCount > currentCount) {
                // Agregar nuevas rutinas (Día N)
                const routinesToAdd = routinesCount - currentCount;
                
                for (let i = 1; i <= routinesToAdd; i++) {
                    const newDayNumber = currentCount + i;
                    
                    // Llamada al endpoint para crear una nueva rutina en el grupo
                    await axios.post(
                        `${API_URL}/routines/group/${routineGroupId}/day/${newDayNumber}/student/${firstRoutine.student_id}`, 
                        { 
                            nombre: `${groupName.trim()} - Dia ${newDayNumber}`,
                            descripcion: `Rutina Dia ${newDayNumber} generada por edición.`,
                        },
                        { headers }
                    );
                }
                
            } else if (routinesCount < currentCount) {
                // Eliminar rutinas (Día N)
                const routinesToDelete = currentCount - routinesCount;
                
                const routinesSortedByDay = groupData.assignments.sort((a, b) => {
                    const aDayMatch = a.routine.nombre.match(/ - Dia (\d+)$/);
                    const bDayMatch = b.routine.nombre.match(/ - Dia (\d+)$/);
                    const aDay = aDayMatch ? parseInt(aDayMatch[1]) : 0;
                    const bDay = bDayMatch ? parseInt(bDayMatch[1]) : 0;
                    return bDay - aDay; // Orden descendente para eliminar las últimas
                });

                const deletionPromises = [];
                for (let i = 0; i < routinesToDelete; i++) {
                    const routineToDelete = routinesSortedByDay[i];
                    if (routineToDelete) {
                        // Elimina la rutina maestra (que a su vez elimina la asignación)
                        deletionPromises.push(
                            axios.delete(`${API_URL}/routines/${routineToDelete.routine_id}`, { headers })
                        );
                    }
                }
                await Promise.all(deletionPromises);
            }

            Alert.alert("Éxito", "Grupo actualizado correctamente. ¡Recuerda recargar si editaste las rutinas individuales!");
            fetchCurrentAssignments(); // Refresca los datos en la vista de asignaciones
            onComplete();

        } catch (e) {
            console.error("Error actualizando grupo:", e.response ? e.response.data : e.message);
            Alert.alert("Error", `Fallo al actualizar el grupo. Detalle: ${e.response?.data?.detail || "Error de red/servidor."}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, {backgroundColor: themeColors.background}]}>
            <View style={styles.headerSelection}>
                <Text style={styles.wizardTitle}>Editar Grupo: {groupData.groupName}</Text>
                {/* BOTÓN CANCELAR */}
                <TouchableOpacity 
                    style={[styles.customButton, styles.buttonDanger, {minWidth: 80}]} 
                    onPress={onCancel}
                >
                    <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
            </View>
            
            <ScrollView contentContainerStyle={styles.wizardContainer}>
                <Text style={styles.stepText}>Detalles del Grupo</Text>
                
                <Text style={styles.label}>Nombre de la Agrupación:</Text>
                <TextInput
                    style={styles.wizardInput}
                    placeholder="Ej: Rutina Bloque B"
                    placeholderTextColor={themeColors.textSecondary}
                    value={groupName}
                    onChangeText={setGroupName}
                />
                
                <Text style={[styles.label, {marginTop: 20}]}>Cantidad de Rutinas (Días):</Text>
                <Text style={styles.warningTextCenter}>
                    Si se aumenta, se crearán rutinas vacías. Si se reduce, se eliminarán las rutinas con el día más alto.
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
                
                <Text style={[styles.label, {marginTop: 20}]}>Fecha de Vencimiento:</Text>
                <TextInput
                    style={styles.wizardInput}
                    placeholder="DD/MM/AAAA" // placeholder en nuevo formato
                    placeholderTextColor={themeColors.textSecondary}
                    value={expirationDate}
                    onChangeText={setExpirationDate}
                    keyboardType="default"
                />
                
                <View style={[styles.wizardActions, {justifyContent: 'center'}]}>
                    {/* BOTÓN GUARDAR CAMBIOS */}
                    <TouchableOpacity 
                        style={[styles.customButton, styles.buttonPrimary, { opacity: isLoading ? 0.5 : 1, minWidth: 160 }]} 
                        onPress={handleUpdateGroup} 
                        disabled={isLoading}
                    >
                        <Text style={styles.buttonText}>{isLoading ? "Guardando..." : "Guardar Cambios"}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// --- Sub-componente para Asignar y Gestionar Rutinas ---
function AssignmentView({ student, routines, onAssignmentComplete, onCancel, navigation }) {
    
    const { colors: themeColors, isDark } = useTheme(); 
    const assignmentStyles = getAssignmentStyles(themeColors);

    // Estado para editar grupo (Nuevo)
    const [editingGroup, setEditingGroup] = useState(null); 
    
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
            
            const sortedAssignments = Array.isArray(response.data) ? response.data : [];
            setCurrentAssignments(sortedAssignments); 

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
    // NUEVA FUNCION: Iniciar Edición de Grupo
    // ----------------------------------------------------------------
    const handleEditGroup = (groupData) => {
        setEditingGroup(groupData);
    };

    // ----------------------------------------------------------------
    // FUNCION 2B: ELIMINAR ASIGNACION DE GRUPO COMPLETO
    // ----------------------------------------------------------------
    const handleDeleteRoutineGroup = (routineGroupId, groupName) => {
        if (!routineGroupId) return; // Prevencion extra
        
        Alert.alert(
            "ELIMINAR ASIGNACIONES DE GRUPO", // Texto ajustado
            `¿Estás seguro de que quieres eliminar TODAS las asignaciones (Día 1, Día 2, etc.) del grupo: ${groupName} para ESTE ALUMNO?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar Asignaciones", // Texto ajustado
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await getToken();
                            // Endpoint de eliminacion de grupo de asignaciones para un alumno
                            await axios.delete(`${API_URL}/assignments/group/${routineGroupId}/student/${student.id}`, { 
                                headers: { 'Authorization': `Bearer ${token}` } 
                            });
                            Alert.alert("Éxito", "Grupo de asignaciones eliminado correctamente.");
                            fetchCurrentAssignments();
                        } catch (e) {
                            console.error("Error eliminando grupo:", e.response ? e.response.data : e.message);
                            Alert.alert("Error", `Fallo al eliminar el grupo: ${e.response?.data?.detail || "Error de red/servidor."}`);
                        }
                    }
                }
            ]
        );
    };

    // ----------------------------------------------------------------
    // FUNCION 3B: CAMBIAR ESTADO ACTIVO/INACTIVO DE GRUPO COMPLETO (CORREGIDO)
    // ----------------------------------------------------------------
    const handleToggleGroupActive = async (assignments, isGroupCurrentlyActive) => {
        const newStatus = !isGroupCurrentlyActive;
        
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };
            
            if (newStatus === true) {
                // ACTIVAR GRUPO: ¡ACTIVAR TODAS las asignaciones del grupo!
                await Promise.all(assignments.map(assignment => 
                    axios.patch(
                        `${API_URL}/assignments/${assignment.id}`, 
                        { is_active: true }, 
                        { headers }
                    )
                ));
            } else {
                // INACTIVAR GRUPO: Inactiva todas las asignaciones del grupo
                await Promise.all(assignments.map(assignment => 
                    axios.patch(
                        `${API_URL}/assignments/${assignment.id}`, 
                        { is_active: false }, 
                        { headers }
                    )
                ));
            }

            Alert.alert("Éxito", `Grupo ${newStatus ? 'activado' : 'inactivado'} correctamente. **Todas las rutinas están ${newStatus ? 'activas' : 'inactivas'}.**`);
            fetchCurrentAssignments(); 

        } catch (e) {
            console.error("Error cambiando estado del grupo:", e.response ? e.response.data : e.message);
            Alert.alert("Error", `Fallo al cambiar el estado del grupo. Detalle: ${e.response?.data?.detail || "Error de red/servidor."}`);
        }
    };


    // --- EFECTO: Cargar las asignaciones al cambiar de alumno ---
    useEffect(() => {
        fetchCurrentAssignments();
    }, [student.id, isDark]); 
    
    
    // ----------------------------------------------------------------
    // FUNCION DE AGRUPACION (Por el nombre base de la rutina)
    // ----------------------------------------------------------------
    const getGroupedAssignments = () => {
        const groups = {};
        
        for (const assignment of currentAssignments) {
            
            let groupName;
            // La API devuelve YYYY-MM-DD
            let groupExpiryDate = assignment.routine?.routine_group?.fecha_vencimiento;
            
            let groupCreationDate = assignment.routine?.routine_group?.created_at || assignment.routine?.routine_group?.fecha_creacion; 
            
            let professorCreatorName = assignment.routine?.professor?.nombre; 
            
            let routineGroupId = assignment.routine?.routine_group?.id;

            if (assignment.routine?.routine_group?.nombre) {
                groupName = assignment.routine.routine_group.nombre;
            } else {
                groupName = assignment.routine?.nombre || 'Rutina Sin Nombre';
                routineGroupId = assignment.routine_id; 
            }

            const groupIdKey = routineGroupId ? `G-${routineGroupId}` : `R-${assignment.routine_id}`;

            if (!groups[groupIdKey]) {
                groups[groupIdKey] = {
                    groupName: groupName,
                    assignments: [],
                    expiryDate: groupExpiryDate, // YYYY-MM-DD de la API
                    creationDate: groupCreationDate, // Cadena ISO/Fecha de la API
                    professorCreatorName: professorCreatorName, // String o null
                    routineGroupId: routineGroupId, 
                };
            }
            groups[groupIdKey].assignments.push(assignment);
        }

        return groups;
    };

    const groupedAssignments = getGroupedAssignments();
    
    // Si estamos editando un grupo, mostramos el wizard
    if (editingGroup) {
        return (
            <EditGroupWizard 
                groupData={editingGroup} 
                onCancel={() => setEditingGroup(null)}
                onComplete={() => setEditingGroup(null)}
                fetchCurrentAssignments={fetchCurrentAssignments}
            />
        );
    }
    
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
                            Object.keys(groupedAssignments).map((groupIdKey) => {
                                const groupData = groupedAssignments[groupIdKey];
                                const groupAssignments = groupData.assignments;
                                
                                const routineGroupId = groupData.routineGroupId;
                                const isGroupActive = groupAssignments.some(a => a.is_active);
                                
                                // Determina la primera rutina para usar su ID para editar la rutina individual
                                const firstRoutineInGroup = groupAssignments
                                    .sort((a, b) => {
                                        const aDayMatch = a.routine.nombre.match(/ - Dia (\d+)$/);
                                        const bDayMatch = b.routine.nombre.match(/ - Dia (\d+)$/);
                                        const aDay = aDayMatch ? parseInt(aDayMatch[1]) : 999;
                                        const bDay = bDayMatch ? parseInt(bDayMatch[1]) : 999;
                                        return aDay - bDay;
                                    })[0];
                                
                                const finalGroupIdForActions = routineGroupId || firstRoutineInGroup?.routine_id;

                                return (
                                    <View key={groupIdKey}>
                                        {/* ENCABEZADO Y ACCIONES DEL GRUPO */}
                                        <View style={assignmentStyles.groupHeaderContainer}>
                                            <Text style={assignmentStyles.groupHeader}>
                                                {groupData.groupName} ({groupAssignments.length} Rutinas)
                                            </Text>
                                            
                                            {/* Mostrar Fecha de Creación (Formateada) */}
                                            {groupData.creationDate && (
                                                <Text style={assignmentStyles.groupDetails}>
                                                    Creado: {formatDisplayDate(groupData.creationDate)}
                                                </Text>
                                            )}

                                            {/* Mostrar Profesor Creador (Se muestra N/A si está ausente) */}
                                            <Text style={assignmentStyles.groupDetails}>
                                                Profesor: {groupData.professorCreatorName || 'N/A'}
                                            </Text>
                                            
                                            {/* Mostrar Fecha de Vencimiento formateada */}
                                            <Text style={assignmentStyles.groupDetails}>
                                                Vence: {formatDisplayDate(groupData.expiryDate)}
                                            </Text>

                                            {/* ACCIONES DEL GRUPO */}
                                            {finalGroupIdForActions && (
                                                <View style={assignmentStyles.groupActions}>
                                                     {/* Botón Editar Grupo (Abre el nuevo Wizard) */}
                                                     <TouchableOpacity 
                                                         style={assignmentStyles.editButton} 
                                                         onPress={() => handleEditGroup(groupData)} // Abre el nuevo modal/wizard
                                                     >
                                                         <Edit size={20} color={themeColors.card} />
                                                         <Text style={assignmentStyles.groupActionButtonText}>EDITAR GRUPO</Text>
                                                     </TouchableOpacity>
                                                     
                                                     {/* Botón de Activar/Inactivar Grupo */}
                                                     <TouchableOpacity 
                                                         style={[
                                                             assignmentStyles.toggleGroupButton, 
                                                             { backgroundColor: isGroupActive ? themeColors.warning : themeColors.success } 
                                                         ]}
                                                         onPress={() => handleToggleGroupActive(groupAssignments, isGroupActive)}
                                                     >
                                                         <Text style={assignmentStyles.groupActionButtonText}>
                                                             {isGroupActive ? 'INACTIVAR GRUPO' : 'ACTIVAR GRUPO'}
                                                         </Text>
                                                     </TouchableOpacity>

                                                     {/* Botón de Eliminar Asignaciones de Grupo/Rutina */}
                                                     <TouchableOpacity 
                                                         style={assignmentStyles.deleteButton} 
                                                         onPress={() => handleDeleteRoutineGroup(finalGroupIdForActions, groupData.groupName)}
                                                     >
                                                         <Trash2 size={20} color={themeColors.card} />
                                                         <Text style={assignmentStyles.groupActionButtonText}>ELIMINAR</Text>
                                                     </TouchableOpacity>
                                                 </View>
                                            )}
                                            {/* Fin Acciones de Grupo */}

                                        </View>

                                        {/* Listado de rutinas dentro del grupo */}
                                        {groupAssignments
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
                                                />
                                            ))}
                                    </View>
                                );
                            })
                        ) : (
                            <Text style={assignmentStyles.warning}>Este alumno no tiene rutinas asignadas.</Text>
                        )}
                    </View>
                )}

                <View style={assignmentStyles.backButton}>
                    {/* BOTÓN VOLVER AL PANEL */}
                    <TouchableOpacity 
                        style={[assignmentStyles.customButton, assignmentStyles.buttonSecondary, { minWidth: 160, marginBottom: 20 }]} 
                        onPress={onCancel}
                    >
                        <Text style={assignmentStyles.buttonTextSecondary}>Volver al Panel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

// ----------------------------------------------------------------------
// GENERADOR DE ESTILOS PARA LA PANTALLA PRINCIPAL (ProfessorScreen)
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
        backgroundColor: colors.card, // Fondo de card
        borderColor: colors.divider,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
        color: colors.textPrimary, // Color de texto principal
        marginHorizontal: 20,
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: colors.card, // Fondo de card
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        elevation: 2,
    },
    headerSelection: { 
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.card, // Fondo de card
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    headerTitle: {
        fontSize: 18, 
        fontWeight: 'bold',
        color: colors.textPrimary, // Título en el centro
        flex: 1, // Para ocupar el espacio central
        textAlign: 'center',
    },
    titleSelection: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.success,
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
    actionSection: {
        // AJUSTE DE ESTILO
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: colors.card, // Fondo de card
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        alignItems: 'flex-start', // Alinear texto a la izquierda
    },
    subtitle: {
        fontSize: 20, // Título más grande para el saludo
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 10,
    },
    listTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
        padding: 20,
        backgroundColor: colors.divider, // Fondo de divisor
    },
    studentCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.card, // Fondo de card
        borderRadius: 10,
        padding: 15,
        marginHorizontal: 0, 
        marginBottom: 10,
        shadowColor: colors.isDark ? '#000' : '#444',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: colors.isDark ? 0.4 : 0.1,
        shadowRadius: 2,
        elevation: 2,
        width: '100%', 
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
        minWidth: 80, 
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: colors.card,
    },
    // NUEVO ESTILO FAB (Floating Action Button)
    fab: {
        position: 'absolute',
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        right: 20,
        bottom: 20,
        backgroundColor: colors.success, // Color principal para crear
        borderRadius: 30,
        elevation: 8,
        shadowColor: colors.isDark ? colors.success : colors.success, // Ajuste de sombra para dark mode
        shadowOpacity: 0.5,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 5,
    },
    fabIcon: {
        color: colors.card, // Icono blanco o color de tarjeta
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
    // ESTILOS DEL DRAWER LATERAL (Modificados para deslizar de izquierda)
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    menuContainer: {
        width: 280, // Ancho fijo para el drawer
        height: '100%', // Ocupa toda la altura
        backgroundColor: colors.card,
        // *** POSICIONAMIENTO CLAVE PARA DRAWER IZQUIERDO ***
        position: 'absolute', 
        left: 0,              
        top: 0,               
        // **************************************************
        shadowColor: colors.isDark ? '#000' : '#000',
        shadowOffset: { width: 2, height: 0 }, 
        shadowOpacity: colors.isDark ? 0.8 : 0.2,
        shadowRadius: 5,
        elevation: 10,
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        paddingVertical: 10,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        color: colors.primary,
        paddingHorizontal: 15, 
    },
    menuItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        flexDirection: 'row', 
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 15, 
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
    },
    // Estilos del Wizard (para que se vean)
    wizardContainer: {
        flexGrow: 1, 
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
    // ESTILOS DEL INDICADOR DE PROGRESO (FALTANTES)
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingVertical: 15,
        width: '100%',
    },
    progressStep: {
        flex: 1,
        alignItems: 'center',
        position: 'relative',
    },
    progressConnectorBackground: {
        height: 4,
        backgroundColor: colors.divider,
        position: 'absolute',
        top: 20, // Centrado verticalmente al tamaño del círculo
    },
    progressConnectorActive: {
        backgroundColor: colors.success,
    },
    progressCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.card,
        borderWidth: 2,
        borderColor: colors.textSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    progressCircleActive: {
        borderColor: colors.primary,
    },
    progressCircleDone: {
        backgroundColor: colors.success,
        borderColor: colors.success,
    },
    progressText: {
        marginTop: 5,
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    // --- Estilos de Botones Personalizados (Wizard/AssignmentView) ---
    customButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10, // Bordes redondeados
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 100,
        // Sombra para darle un toque 3D
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    buttonPrimary: {
        backgroundColor: colors.primary, // Color principal para avanzar/guardar
    },
    buttonSecondary: {
        backgroundColor: colors.card, // Fondo claro o de tarjeta
        borderColor: colors.divider,
        borderWidth: 1,
    },
    buttonDanger: {
        backgroundColor: colors.danger, // Color para cancelar
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.card, // Texto blanco/color de tarjeta para botones de colores
    },
    buttonTextSecondary: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textPrimary, // Texto principal para botones secundarios
    },
});

// ----------------------------------------------------------------------
// COMPONENTE: INDICADOR DE PROGRESO (Minimalista)
// ----------------------------------------------------------------------
const ProgressIndicator = ({ currentStep, totalSteps, stepNames, themeColors }) => {
    const styles = getMainScreenStyles(themeColors);

    const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

    return (
        <View style={{ width: '100%', paddingHorizontal: 0 }}>
            <View style={styles.progressContainer}>
                {steps.map((stepNum, index) => {
                    const isActive = stepNum === currentStep;
                    const isDone = stepNum < currentStep;

                    let circleStyle = styles.progressCircle;
                    
                    if (isActive) {
                        circleStyle = { ...circleStyle, ...styles.progressCircleActive };
                    } else if (isDone) {
                        circleStyle = { ...circleStyle, ...styles.progressCircleDone };
                    }
                    
                    const isLastStep = index === totalSteps - 1;

                    return (
                        <View key={stepNum} style={styles.progressStep}>
                            {/* Conector desde el paso anterior */}
                            {index > 0 && (
                                <View style={[
                                    styles.progressConnectorBackground,
                                    { width: '100%', right: '50%' }, 
                                ]}>
                                    <View style={[
                                        { height: '100%' }, // Para que el conector ocupe la altura
                                        styles.progressConnectorActive,
                                        { width: isDone ? '100%' : (isActive ? '50%' : '0%') }
                                    ]}/>
                                </View>
                            )}

                            {/* Círculo del Paso */}
                            <View style={circleStyle}>
                                {isDone ? (
                                    <CheckCircle size={18} color={themeColors.card} />
                                ) : (
                                    <Text style={{ 
                                        color: isActive ? themeColors.primary : themeColors.textSecondary, 
                                        fontWeight: 'bold',
                                        fontSize: 14,
                                    }}>
                                        {stepNum}
                                    </Text>
                                )}
                            </View>
                            
                            {/* Texto del Paso */}
                            <Text style={[styles.progressText, { color: isDone ? themeColors.success : (isActive ? themeColors.primary : themeColors.textSecondary) }]}>
                                {stepNames[stepNum - 1]}
                            </Text>

                            {/* Conector hacia el siguiente */}
                            {!isLastStep && (
                                <View style={[
                                    styles.progressConnectorBackground,
                                    { width: '100%', left: '50%' },
                                ]}/>
                            )}
                        </View>
                    );
                })}
            </View>
        </View>
    );
};


// --- COMPONENTE: Asistente de Creacion Simplificado (3 Pasos) ---
function CreationWizardSimplified({ students, onCancel, navigation }) {
    
    const { colors: themeColors } = useTheme();
    const styles = getMainScreenStyles(themeColors); // Estilos dinamicos

    const [step, setStep] = useState(1);
    const [routineName, setRoutineName] = useState(''); // Paso 1: Nombre de Agrupacion
    const [routineDescription, setRoutineDescription] = useState(''); // Paso 1: Descripcion de Agrupacion
    const [routinesCount, setRoutinesCount] = useState(1); // Paso 2: Cantidad de Rutinas
    const [expirationDate, setExpirationDate] = useState(''); // FECHA DE VENCIMIENTO (DD/MM/AAAA)
    const [searchTerm, setSearchTerm] = useState(''); // Filtro de alumnos

    // Nombres de los pasos
    const STEP_NAMES = ["Nombre", "Config", "Asignación"]; 
    const TOTAL_STEPS = 3;

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
        
        // Convertir la fecha al formato YYYY-MM-DD para la API antes de pasarla al navigacion
        const apiFormattedDate = formatAPIDate(expirationDate.trim());
        
        // FIN DEL WIZARD: Navegamos a RoutineCreationScreen
        navigation.navigate('RoutineCreation', { 
            studentId: student.id,
            studentName: student.nombre,
            // Enviamos la metadata completa al frontend
            routineMetadata: {
                nombre: routineName.trim(),
                descripcion: routineDescription.trim(), // Pasar la descripcion del grupo
                days: routinesCount, // Cantidad de rutinas a crear
                expirationDate: apiFormattedDate // Enviamos YYYY-MM-DD a la API
            }
        });
        onCancel(); // Cerramos el wizard en ProfessorScreen
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <>
                        <Text style={styles.stepText}>Paso 1: Nombre y Descripción del Grupo</Text>
                        <Text style={styles.label}>Nombre de la Agrupación:</Text>
                        <TextInput
                            style={styles.wizardInput}
                            placeholder="Ej: Rutina Bloque A / Mes 1"
                            placeholderTextColor={themeColors.textSecondary}
                            value={routineName}
                            onChangeText={setRoutineName}
                            autoFocus
                        />
                        <Text style={styles.label}>Descripción del Grupo (Opcional):</Text>
                        <TextInput
                            style={[styles.wizardInput, { height: 80, textAlignVertical: 'top' }]}
                            placeholder="Ej: Fase de hipertrofia de 4 semanas."
                            placeholderTextColor={themeColors.textSecondary}
                            value={routineDescription}
                            onChangeText={setRoutineDescription}
                            multiline
                        />
                        <Text style={styles.warningTextCenter}>
                            Este nombre agrupará las rutinas (Día 1, Día 2, etc.)
                        </Text>
                    </>
                );
            case 2:
                return (
                    <>
                        <Text style={styles.stepText}>Paso 2: Configuración de la Agrupación</Text>
                        
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
                        
                        {/* INPUT DE FECHA DE VENCIMIENTO */}
                        <Text style={[styles.label, {marginTop: 20}]}>Fecha de Vencimiento:</Text>
                        <TextInput
                            style={styles.wizardInput}
                            placeholder="DD/MM/AAAA" // placeholder en nuevo formato
                            placeholderTextColor={themeColors.textSecondary}
                            value={expirationDate}
                            onChangeText={setExpirationDate}
                            keyboardType="default"
                        />
                        <Text style={styles.warningTextCenter}>
                            Formato DD/MM/AAAA requerido. Se convertirá a AAAA-MM-DD para la API.
                        </Text>
                        
                        <Text style={styles.studentEmail}>Agrupación: {routineName.trim()} | Vence: {expirationDate.trim() || '[Fecha Requerida]'}</Text>
                    </>
                );
            case 3:
                return (
                    <>
                        <Text style={styles.stepText}>Paso 3: Selecciona el Alumno</Text>
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
                                        <Text style={{...styles.actionButtonText, color: themeColors.success}}>CREAR >> </Text>
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
            // Validacion de formato DD/MM/AAAA
            const displayDateRegex = /^\d{2}[-/]\d{2}[-/]\d{4}$/;
            if (!displayDateRegex.test(expirationDate.trim())) {
                Alert.alert("Error", "Debes ingresar una fecha de vencimiento válida en formato DD/MM/AAAA.");
                return;
            }

            // Validacion de fecha futura
            const expiry = parseDateToJS(expirationDate.trim());
            const today = new Date();
            today.setUTCHours(0,0,0,0); 

            if (!expiry || isNaN(expiry.getTime())) {
                Alert.alert("Error", "Formato de fecha no reconocido. Usa DD/MM/AAAA.");
                return;
            }

            // Usamos UTC para la comparación para que sea solo la fecha
            if (expiry <= today) {
                Alert.alert("Error", "La fecha de vencimiento debe ser una fecha futura.");
                return;
            }

            setStep(3);
        }
    };
    
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerSelection}>
                <Text style={styles.wizardTitle}>Crear Rutina Agrupada</Text>
                {/* BOTÓN CANCELAR */}
                <TouchableOpacity 
                    style={[styles.customButton, styles.buttonDanger, {minWidth: 80}]} 
                    onPress={onCancel}
                >
                    <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
            </View>
            
            {/* INTEGRACIÓN DEL INDICADOR DE PROGRESO */}
            <ProgressIndicator 
                currentStep={step} 
                totalSteps={TOTAL_STEPS} 
                stepNames={STEP_NAMES} 
                themeColors={themeColors}
            />

            <ScrollView contentContainerStyle={styles.wizardContainer}>
                {renderStep()}

                <View style={styles.wizardActions}>
                    {/* BOTÓN ATRÁS */}
                    <TouchableOpacity 
                        style={[styles.customButton, styles.buttonSecondary, { opacity: step === 1 ? 0.5 : 1 }]} 
                        onPress={() => setStep(step - 1)} 
                        disabled={step === 1}
                    >
                        <Text style={styles.buttonTextSecondary}>{"< Atrás"}</Text>
                    </TouchableOpacity>

                    {(step === 1 || step === 2) && (
                        /* BOTÓN SIGUIENTE */
                        <TouchableOpacity 
                            style={[styles.customButton, styles.buttonPrimary, { opacity: (step === 1 ? !routineName.trim() : routinesCount < 1 || !expirationDate.trim()) ? 0.5 : 1 }]} 
                            onPress={nextStep} 
                            disabled={step === 1 ? !routineName.trim() : routinesCount < 1 || !expirationDate.trim()}
                        >
                            <Text style={styles.buttonText}>{"Siguiente >"}</Text>
                        </TouchableOpacity>
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

    const { signOut, getToken, userProfile } = useContext(AuthContext);

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
    // FUNCIÓN: NAVEGAR A EDICIÓN DE DETALLES DEL ALUMNO
    // ----------------------------------------------------------------
    const handleEditStudent = (studentData) => {
        navigation.navigate('StudentDetails', { student: studentData });
    };

    // ----------------------------------------------------------------
    // FUNCIÓN: ACCIONES DEL MENÚ LATERAL (DRAWER)
    // ----------------------------------------------------------------
    const handleViewProfile = () => {
        setIsMenuVisible(false);
        Alert.alert("Mi Perfil", "Esta sección navegará a tu pantalla de perfil (aún no implementada).");
    };

    const handleChangePassword = () => {
        setIsMenuVisible(false); // Cierra el modal
        navigation.navigate('ChangePassword'); 
    };
    
    const handleAddStudent = () => {
        setIsMenuVisible(false); // Cierra el modal
        // Navegación a la pantalla de creación de alumno (que el usuario creará)
        navigation.navigate('AddStudent'); 
    };

    const handleLogout = () => {
        Alert.alert(
            "Cerrar Sesión",
            "¿Estás seguro de que quieres cerrar sesión?",
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Cerrar", onPress: () => {
                    setIsMenuVisible(false);
                    signOut();
                }, style: "destructive" },
            ]
        );
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
    
    // Logica de filtrado de estudiantes
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
                         {/* BOTÓN INTENTAR DE NUEVO (NO FUE PEDIDO, SE MANTIENE EL ESTILO ORIGINAL DE Button) */}
                         <Button title="Intentar de Nuevo" onPress={fetchData} color={themeColors.primary} />
                     </View>
                     {dataError !== "Sesión inválida o expirada. Saliendo..." && (
                         <View style={{marginTop: 10}}>
                             {/* BOTÓN SALIR (NO FUE PEDIDO, SE MANTIENE EL ESTILO ORIGINAL DE Button) */}
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
                {/* Boton de Menu/Drawer (Izquierda) */}
                <TouchableOpacity 
                    onPress={() => setIsMenuVisible(true)} 
                    style={styles.iconButton}
                >
                    <Menu size={22} color={themeColors.textPrimary} /> 
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Gestor de Alumnos</Text>
                
                {/* Boton de Actualizar (Derecha) */}
                <TouchableOpacity 
                    onPress={fetchData} 
                    style={styles.iconButton}
                    disabled={isLoading}
                >
                    <RefreshCcw size={22} color={themeColors.primaryDark} />
                </TouchableOpacity>
            </View>
            
            {/* SCROLLVIEW PRINCIPAL */}
            <ScrollView style={{ flex: 1 }}>
                
                {/* SECCIÓN DE ACCIONES/SALUDO (Mejora visual) */}
                <View style={styles.actionSection}>
                    <Text style={styles.subtitle}>
                        👋 Bienvenido/a **{userProfile?.nombre?.split(' ')[0] || 'Profesor/a'}**
                    </Text>
                    <Text style={{ fontSize: 14, color: themeColors.textSecondary }}>
                        Utiliza el botón flotante (Pesas) para crear una nueva rutina y asignarla.
                    </Text>
                </View>

                <Text style={styles.listTitle}>Alumnos Registrados ({filteredStudents.length})</Text> 
                
                
                {/* Input de busqueda */}
                <TextInput
                    style={styles.searchInput} 
                    placeholder="Buscar alumno por nombre o email..."
                    placeholderTextColor={themeColors.textSecondary}
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                />
                
                <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80, paddingTop: 10 }}>
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
            
            {/* BOTÓN DE ACCIÓN FLOTANTE (FAB) CON ICONO DE PESAS */}
            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => setCreatingForStudent(true)}
            >
                <Weight size={30} color={themeColors.card} style={styles.fabIcon} />
            </TouchableOpacity>

            {/* MODAL DE OPCIONES (DRAWER LATERAL IZQUIERDO) */}
            <Modal 
                animationType="slide" // Esto activa la animación de deslizamiento
                transparent={true}
                visible={isMenuVisible}
                onRequestClose={() => setIsMenuVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPressOut={() => setIsMenuVisible(false)} // Cierra al tocar fuera
                >
                    {/* DRAWER CONTENT */}
                    <View style={styles.menuContainer}> 
                        
                        {/* 🚨 Usamos SafeAreaView para manejar la barra de estado y el padding */}
                        <SafeAreaView style={{ flex: 1 }}> 
                            
                            {/* ScrollView para los ítems, con padding inferior para no solaparse con el botón "Cerrar" */}
                            <ScrollView contentContainerStyle={{ paddingBottom: 70 }}>
                                <Text style={styles.menuTitle}>Menú de Profesor</Text>
                                
                                {/* Mi Perfil */}
                                <TouchableOpacity style={styles.menuItem} onPress={handleViewProfile}>
                                    <User size={18} color={themeColors.textPrimary} /> 
                                    <Text style={styles.menuItemText}>Mi Perfil</Text>
                                </TouchableOpacity>

                                {/* Cambiar Contraseña */}
                                <TouchableOpacity style={styles.menuItem} onPress={handleChangePassword}>
                                    <Key size={18} color={themeColors.textPrimary} /> 
                                    <Text style={styles.menuItemText}>Cambiar Contraseña</Text>
                                </TouchableOpacity>
                                
                                {/* Agregar Alumno */}
                                <TouchableOpacity style={styles.menuItem} onPress={handleAddStudent}>
                                    <UserPlus size={18} color={themeColors.success} /> 
                                    <Text style={[styles.menuItemText, {color: themeColors.success}]}>Agregar Alumno</Text>
                                </TouchableOpacity>

                                {/* Cerrar Sesion */}
                                <TouchableOpacity style={[styles.menuItem, {borderBottomWidth: 0}]} onPress={handleLogout}>
                                    <LogOut size={18} color={themeColors.danger} />
                                    <Text style={styles.menuItemTextLogout}>Cerrar Sesión</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </SafeAreaView>
                        
                        {/* Cerrar Menu (botón fijo en el fondo) */}
                        <TouchableOpacity style={styles.menuItemClose} onPress={() => setIsMenuVisible(false)}>
                            <Text style={styles.menuItemTextClose}>Cerrar</Text>
                        </TouchableOpacity>

                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}