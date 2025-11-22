import React, { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react'; 
import { 
    StyleSheet, Text, View, ScrollView, SafeAreaView, Button, 
    ActivityIndicator, FlatList, TouchableOpacity, Alert, Modal,
    TextInput, Animated, Platform, Image // Añadimos Image para el logo
} from 'react-native';
import axios from 'axios';
import { AuthContext } from '../App'; 
import { useTheme } from '../ThemeContext'; 
// Importamos TODOS los iconos necesarios (Lucide)
import { Trash2, Edit, RefreshCcw, Menu, User, Key, LogOut, Minus, Plus, ChevronDown, ChevronUp, UserPlus, CheckCircle, Weight, Calendar, XCircle } from 'lucide-react-native'; 

// ----------------------------------------------------------------------
// URL de la API (DEBE COINCIDIR con la de App.js)
// ----------------------------------------------------------------------
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// URIs de Imagenes (Si se necesitan en el futuro)
// ----------------------------------------------------------------------
const LOGO_SOURCE = require('../assets/logoND.jpg'); 
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// FUNCIONES DE FECHA (Ajustadas para DD/MM/YYYY)
// ----------------------------------------------------------------------

/**
 * Convierte DD/MM/YYYY o YYYY-MM-DD a un objeto Date (CRÍTICO para validación y formato)
 * NOTA: Esta función devuelve una fecha en la hora local del dispositivo.
 */
const parseDateToJS = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split(/[-\/]/); // Soporta tanto - como /
    if (parts.length === 3) {
        let year, month, day;
        if (parts[0].length === 4) { // Asume YYYY-MM-DD (API format)
            [year, month, day] = parts;
        } else { // Asume DD/MM/YYYY (Display format)
            [day, month, year] = parts;
        }
        
        // Se usa el constructor Date(year, monthIndex, day) que usa el Huso Horario Local 
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date;
    }
    return null;
};

/**
 * Formatea un objeto Date (o una cadena ISO) a DD/MM/YYYY para la UI.
 */
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

/**
 * Convierte DD/MM/YYYY o DD-MM-YYYY a YYYY-MM-DD (Formato requerido por la API)
 */
const formatAPIDate = (dateInput) => {
    if (!dateInput) return '';
    
    // Si es un objeto Date, lo formateamos (nuevo)
    if (dateInput instanceof Date) {
        const year = dateInput.getFullYear();
        const month = String(dateInput.getMonth() + 1).padStart(2, '0');
        const day = String(dateInput.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Si es una cadena, intentamos parsear y luego formatear
    const date = parseDateToJS(dateInput); 
    if (date && !isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return '';
};
// ----------------------------------------------------------------------


// ----------------------------------------------------------------------
// GENERADOR DE ESTILOS PARA ASIGNACION (AssignmentView) - ESTILO PEAKFIT
// ----------------------------------------------------------------------
const getAssignmentStyles = (colors) => StyleSheet.create({
    scrollContainer: { flex: 1, backgroundColor: 'black', },
    container: { flex: 1, padding: 20, backgroundColor: 'black', alignItems: 'center', },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#3ABFBC', width: '100%', textAlign: 'center' },
    
    // Subtítulo de sección (Rutinas Asignadas Actualmente)
    subtitle: { 
        fontSize: 18, 
        fontWeight: '600', 
        color: 'white', // Blanco
        marginTop: 20, 
        marginBottom: 15, 
        width: '100%', 
        borderBottomWidth: 1, 
        borderBottomColor: colors.divider, 
        paddingBottom: 5, 
    },
    
    routineListContainer: { width: '100%', marginBottom: 30, },
    label: { fontSize: 16, fontWeight: '600', color: 'white', marginBottom: 10, },
    warning: { fontSize: 16, color: colors.warning, textAlign: 'center', padding: 10, },
    backButtonTop: { width: '100%', marginBottom: 20, alignItems: 'center', },
    currentAssignmentList: { width: '100%', marginBottom: 20, },
    
    // Encabezado del Grupo (Nombre y Detalles)
    groupHeaderContainer: { 
        width: '100%', paddingBottom: 10, borderBottomWidth: 2, 
        borderBottomColor: '#3ABFBC', // Línea verde
        marginBottom: 15, 
    },
    groupHeader: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 5, },
    groupDetails: { fontSize: 14, fontWeight: 'normal', color: '#A9A9A9', marginBottom: 2, },
    groupActions: { flexDirection: 'row', justifyContent: 'flex-start', gap: 10, marginTop: 10, flexWrap: 'wrap', },
    groupActionButtonText: { color: 'black', fontWeight: 'bold', fontSize: 12, marginLeft: 5, }, // Texto negro para contraste en botones verde/rojo
    
    // Botón de Toggle Activo/Inactivo del Grupo
    toggleGroupButton: { 
        flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, 
        borderRadius: 8, 
    },
    
    // Tarjeta Colapsable de Asignación
    assignmentCard: {
        flexDirection: 'row', 
        backgroundColor: '#1C1C1E', // Fondo oscuro
        borderRadius: 10, 
        marginBottom: 10,
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.8, 
        shadowRadius: 5, 
        elevation: 4, 
        overflow: 'hidden', 
    },
    statusBar: { width: 30, justifyContent: 'center', alignItems: 'center', paddingVertical: 10, },
    statusText: { fontSize: 12, fontWeight: 'bold', color: 'black', transform: [{ rotate: '-90deg' }], width: 100, textAlign: 'center', }, // Texto negro
    assignmentContent: { flex: 1, },
    assignmentHeader: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1, },
    assignmentDetails: { flex: 1, paddingRight: 10, },
    assignmentActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', },
    
    // Botones de acción individual
    deleteButton: { padding: 8, backgroundColor: colors.danger, borderRadius: 8, flexDirection: 'row', alignItems: 'center', },
    editButton: { padding: 8, backgroundColor: '#3ABFBC', borderRadius: 8, flexDirection: 'row', alignItems: 'center', }, // Verde
    routineName: { fontSize: 18, fontWeight: '600', color: 'white', },
    
    // Contenido colapsable (Lista de Ejercicios)
    exerciseListContainer: {
        marginTop: 15, paddingTop: 10, paddingHorizontal: 15, paddingBottom: 5, borderTopWidth: 1,
        borderTopColor: colors.divider, 
        backgroundColor: 'black', // Fondo negro dentro de la tarjeta oscura
    },
    exerciseItem: {
        paddingLeft: 10, paddingVertical: 8, 
        borderLeftWidth: 2, 
        borderLeftColor: '#3ABFBC', // Línea de acento verde
        marginBottom: 8, 
        backgroundColor: '#1C1C1E', // Fondo oscuro de la tarjeta
        borderRadius: 5,
    },
    exerciseName: { fontSize: 15, fontWeight: '700', color: 'white', marginBottom: 5, },
    detailsRow: { flexDirection: 'row', justifyContent: 'flex-start', gap: 15, marginTop: 5, },
    detailItem: {
        flexDirection: 'row', alignItems: 'center', 
        backgroundColor: 'black', // Fondo del detalle más oscuro aún
        borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    },
    detailLabel: { fontSize: 12, color: '#A9A9A9', marginRight: 4, fontWeight: '500', }, // Gris claro
    detailValue: { fontSize: 14, fontWeight: 'bold', color: '#3ABFBC', }, // Verde para el valor
    
    // Botones (Estilo Unificado de la Pantalla Principal)
    customButton: {
        paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center',
        justifyContent: 'center', minWidth: 100, shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5, shadowRadius: 3, elevation: 4,
    },
    buttonPrimary: { backgroundColor: '#3ABFBC', },
    buttonSecondary: { backgroundColor: '#1C1C1E', borderColor: colors.divider, borderWidth: 1, },
    buttonDanger: { backgroundColor: colors.danger, },
    buttonText: { fontSize: 16, fontWeight: 'bold', color: 'black', },
    buttonTextSecondary: { fontSize: 16, fontWeight: 'bold', color: 'white', },
    
    // Separador de Grupo
    groupSeparator: { 
        marginBottom: 30, 
        paddingBottom: 20, 
        borderBottomWidth: 2, 
        borderBottomColor: colors.divider, 
        borderStyle: 'dotted' 
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
    const isPastDue = assignment.routine.routine_group?.fecha_vencimiento && 
                        parseDateToJS(assignment.routine.routine_group.fecha_vencimiento) < new Date();

    // Lógica de color: Verde (Activa) / Amarillo (Inactiva) / Rojo (Vencida)
    let statusColor;
    let statusText;

    if (isPastDue) {
        statusColor = themeColors.danger; // Rojo para VENCIDA
        statusText = 'VENCIDA';
    } else if (assignment.is_active) {
        statusColor = themeColors.success; // Verde para ACTIVA
        statusText = 'ACTIVA';
    } else {
        statusColor = themeColors.warning; // Amarillo/Warning para INACTIVA
        statusText = 'INACTIVA';
    }
    
    // Renderiza la lista de ejercicios (solo cuando se expande)
    const renderExercises = () => (
        <View style={assignmentStyles.exerciseListContainer}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: themeColors.textPrimary, marginBottom: 5 }}>Detalle de Ejercicios:</Text>
            {assignment.routine.exercise_links
                .sort((a, b) => a.order - b.order)
                .map((link, exIndex) => (
                    link.exercise ? (
                        <View key={link.id || exIndex} style={assignmentStyles.exerciseItem}>
                            <Text style={assignmentStyles.exerciseName}>
                                {link.order}. {link.exercise.nombre}
                            </Text>
                            
                            <View style={assignmentStyles.detailsRow}>
                                <View style={assignmentStyles.detailItem}>
                                    <Text style={assignmentStyles.detailLabel}>Sets:</Text>
                                    <Text style={assignmentStyles.detailValue}>{link.sets}</Text>
                                </View>
                                <View style={assignmentStyles.detailItem}>
                                    <Text style={assignmentStyles.detailLabel}>Reps:</Text>
                                    <Text style={assignmentStyles.detailValue}>{link.repetitions}</Text>
                                </View>
                                <View style={assignmentStyles.detailItem}>
                                    <Text style={assignmentStyles.detailLabel}>Peso:</Text>
                                    <Text style={assignmentStyles.detailValue}>{link.peso || '-'}</Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <Text key={link.id || exIndex} style={{color: themeColors.danger}}>
                            Error: Ejercicio no cargado.
                        </Text>
                    )
                ))}
        </View>
    );

    return (
        <View style={assignmentStyles.assignmentCard}>
            
            {/* 1. BARRA LATERAL DE ESTADO */}
            <View style={[assignmentStyles.statusBar, { backgroundColor: statusColor }]}>
                <Text style={[assignmentStyles.statusText, { color: statusText === 'VENCIDA' ? themeColors.card : 'black' }]}>
                    {statusText}
                </Text>
            </View>

            {/* CONTENEDOR PRINCIPAL DEL CONTENIDO */}
            <View style={assignmentStyles.assignmentContent}>
                
                {/* 2. CABECERA: Rutina Name Area */}
                <View style={assignmentStyles.assignmentHeader}>
                    <View style={assignmentStyles.assignmentDetails}>
                        <Text style={assignmentStyles.routineName}>{assignment.routine.nombre}</Text>
                        <Text style={{ marginTop: 5, color: themeColors.textSecondary, fontSize: 13, fontWeight: '500'}}>
                            {linkCount} EJERCICIOS
                        </Text>
                    </View>

                    {/* 3. ACCIONES DE LA RUTINA INDIVIDUAL Y BOTÓN DE EXPANSIÓN */}
                    <View style={assignmentStyles.assignmentActions}>
                        
                        {/* Botón para Editar Rutina Individual */}
                        <TouchableOpacity 
                            style={[assignmentStyles.editButton, { marginRight: 8 }]} 
                            onPress={() => handleEditAssignment(assignment.routine_id)} 
                        >
                            <Edit size={20} color={'black'} />
                        </TouchableOpacity>
                        
                        {/* Botón Expansión/Colapso */}
                        <TouchableOpacity
                            style={[
                                assignmentStyles.editButton, 
                                { backgroundColor: isExpanded ? themeColors.textSecondary : '#3ABFBC' }
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

    const wizardLabelStyle = {
        ...styles.label, 
        color: 'white', // Usamos color blanco
        fontSize: 18, 
        fontWeight: 'bold', 
        marginBottom: 10,
    };

    const { getToken } = useContext(AuthContext);

    const firstRoutine = groupData.assignments[0];
    
    // Inicializar la fecha de vencimiento en formato DD/MM/YYYY para la edición
    const initialExpiryDate = groupData.expiryDate ? formatDisplayDate(groupData.expiryDate) : '';

    const [groupName, setGroupName] = useState(groupData.groupName || '');
    const [routinesCount, setRoutinesCount] = useState(groupData.assignments.length);
    const [expirationDateInput, setExpirationDateInput] = useState(initialExpiryDate); // Formato DD/MM/YYYY (String)
    const [isLoading, setIsLoading] = useState(false);
    
    const placeholderColor = themeColors.isDark ? themeColors.textSecondary : '#6B7280';


    const handleUpdateGroup = async () => {
        if (!groupName.trim() || !expirationDateInput.trim()) {
             Alert.alert("Error", "El nombre y la fecha de vencimiento son obligatorios.");
             return;
        }

        // 1. VALIDACION y CONVERSION DE FECHA
        // Validar el formato DD/MM/YYYY para el usuario (Permitimos - o /)
        const displayDateRegex = /^\d{2}[-/]\d{2}[-/]\d{4}$/;
        if (!displayDateRegex.test(expirationDateInput.trim())) {
            Alert.alert("Error", "Debes ingresar una fecha de vencimiento válida en formato DD/MM/AAAA.");
            return;
        }
        
        // Convertir la fecha al formato YYYY-MM-DD para la API
        const apiFormattedDate = formatAPIDate(expirationDateInput.trim());
        if (!apiFormattedDate) {
             Alert.alert("Error", "No se pudo convertir la fecha a un formato válido para la API.");
             return;
        }
        
        // Validar fecha futura
        const expiry = parseDateToJS(expirationDateInput.trim());
        const today = new Date();
        today.setHours(0,0,0,0);
        if(expiry) expiry.setHours(0,0,0,0); 
        
        if (!expiry || expiry <= today) {
            Alert.alert("Error", "La fecha de vencimiento debe ser una fecha futura.");
            return;
        }
        // FIN VALIDACION

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
                            nombre: `${groupName.trim()} - Día ${newDayNumber}`,
                            descripcion: `Rutina Día ${newDayNumber} generada por edición.`,
                        },
                        { headers }
                    );
                }
                
            } else if (routinesCount < currentCount) {
                // Eliminar rutinas (Día N)
                const routinesToDeleteCount = currentCount - routinesCount;
                
                // Obtenemos los IDs de las asignaciones y rutinas, ordenadas DESCENDENTEMENTE por el día de la rutina.
                const routinesSortedByDay = groupData.assignments.sort((a, b) => {
                    const aMatch = a.routine.nombre.match(/ - Dia (\d+)$/i) || a.routine.nombre.match(/ - Día (\d+)$/i);
                    const bMatch = b.routine.nombre.match(/ - Dia (\d+)$/i) || b.routine.nombre.match(/ - Día (\d+)$/i);
                    const aDay = aMatch ? parseInt(aMatch[1]) : 0;
                    const bDay = bMatch ? parseInt(bMatch[1]) : 0;
                    return bDay - aDay; // Orden descendente: [Día 3, Día 2, Día 1]
                });

                const deletionPromises = [];
                // Tomamos las últimas 'routinesToDeleteCount'
                for (let i = 0; i < routinesToDeleteCount; i++) {
                    const routineToDelete = routinesSortedByDay[i];
                    if (routineToDelete) {
                        // Eliminamos la rutina maestra (que debe eliminar asignación y enlaces en cascada en el backend)
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
        <SafeAreaView style={[styles.container, {backgroundColor: 'black'}]}>
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
                
                {/* Nombre de la Agrupacion */}
                <Text style={wizardLabelStyle}>Nombre de la Agrupación:</Text>
                <TextInput
                    style={styles.wizardInput}
                    placeholder="Ej: Rutina Bloque B"
                    placeholderTextColor={placeholderColor}
                    value={groupName}
                    onChangeText={setGroupName}
                />
                
                {/* Cantidad de Rutinas */}
                <Text style={[wizardLabelStyle, {marginTop: 20}]}>Cantidad de Rutinas (Días):</Text>
                <Text style={styles.warningTextCenter}>
                    Si se aumenta, se crearán rutinas vacías. Si se reduce, se eliminarán las rutinas con el día más alto.
                </Text>
                <View style={styles.routineCounter}>
                    <TouchableOpacity 
                        style={[styles.counterButton, { backgroundColor: themeColors.danger }]}
                        onPress={() => setRoutinesCount(prev => Math.max(1, prev - 1))}
                        disabled={routinesCount <= 1 || isLoading}
                    >
                        <Minus size={24} color={'black'} />
                    </TouchableOpacity>

                    <Text style={styles.counterCountText}>{routinesCount}</Text>

                    <TouchableOpacity 
                        style={[styles.counterButton, { backgroundColor: '#3ABFBC' }]}
                        onPress={() => setRoutinesCount(prev => Math.min(5, prev + 1))} // Maximo 5
                        disabled={routinesCount >= 5 || isLoading}
                    >
                        <Plus size={24} color={'black'} />
                    </TouchableOpacity>
                </View>
                
                {/* Fecha de Vencimiento (Input de texto simple para edición) */}
                <Text style={[wizardLabelStyle, {marginTop: 20}]}>Fecha de Vencimiento (DD/MM/AAAA):</Text>
                <TextInput
                    style={styles.wizardInput}
                    placeholder="DD/MM/AAAA" 
                    placeholderTextColor={placeholderColor}
                    value={expirationDateInput}
                    onChangeText={setExpirationDateInput}
                    keyboardType="default"
                    editable={!isLoading}
                />
                <Text style={styles.warningTextCenter}>
                    Formato DD/MM/AAAA requerido.
                </Text>
                
                <View style={[styles.wizardActions, {justifyContent: 'center'}]}>
                    {/* BOTÓN GUARDAR CAMBIOS */}
                    <TouchableOpacity 
                        style={[styles.customButton, styles.buttonPrimary, { opacity: isLoading ? 0.5 : 1, minWidth: 160 }]} 
                        onPress={handleUpdateGroup} 
                        disabled={isLoading || !groupName.trim() || !expirationDateInput.trim()}
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
                 Alert.alert("Error de Conexión", `No se pudieron cargar las asignaciones. ${e.message}`);
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
            // Aseguramos que la navegación apunte a 'RoutineEditScreen'
            navigation.navigate('RoutineEditScreen', { 
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
        if (!routineGroupId) return;
        
        Alert.alert(
            "ELIMINAR ASIGNACIONES DE GRUPO", 
            `¿Estás seguro de que quieres eliminar TODAS las asignaciones (Día 1, Día 2, etc.) del grupo: ${groupName} para ESTE ALUMNO?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar Asignaciones", 
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
                            Alert.alert("Error", `Fallo al eliminar el grupo. Detalle: ${e.response?.data?.detail || "Error de red/servidor."}`);
                        }
                    }
                }
            ]
        );
    };

    // ----------------------------------------------------------------
    // FUNCION 3B: CAMBIAR ESTADO ACTIVO/INACTIVO DE GRUPO COMPLETO
    // ----------------------------------------------------------------
    const handleToggleGroupActive = async (assignments, isGroupCurrentlyActive) => {
        const newStatus = !isGroupCurrentlyActive;
        
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };
            
            // PATCH: Cambia el estado de TODAS las rutinas del grupo.
            await Promise.all(assignments.map(assignment =>
                axios.patch(
                    `${API_URL}/assignments/${assignment.id}`, 
                    { is_active: newStatus }, 
                    { headers }
                )
            ));

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
        // Re-fetch cuando volvemos de editar una rutina individual
        const unsubscribeFocus = navigation.addListener('focus', () => {
             fetchCurrentAssignments();
        });

        return unsubscribeFocus;

    }, [student.id, isDark]); 
    
    
    // ----------------------------------------------------------------
    // FUNCION DE AGRUPACION 
    // ----------------------------------------------------------------
    const getGroupedAssignments = () => {
        const groups = {};
        
        for (const assignment of currentAssignments) {
            
            if (!assignment.routine || !assignment.routine.routine_group) continue;
            
            let groupName = assignment.routine.routine_group.nombre;
            let groupExpiryDate = assignment.routine.routine_group.fecha_vencimiento;
            let groupCreationDate = assignment.routine.routine_group.created_at; 
            let professorCreatorName = assignment.routine.professor?.nombre; 
            let routineGroupId = assignment.routine.routine_group.id;
            
            const groupIdKey = `G-${routineGroupId}`;

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

                {/* BOTÓN VOLVER AL PANEL */}
                <View style={assignmentStyles.backButtonTop}>
                    <TouchableOpacity 
                        style={[assignmentStyles.customButton, assignmentStyles.buttonSecondary, { minWidth: 160 }]} 
                        onPress={onCancel}
                    >
                        <Text style={assignmentStyles.buttonTextSecondary}>Volver al Panel</Text>
                    </TouchableOpacity>
                </View>

                {/* -------------------- 1. GESTIONAR ASIGNACIONES (AGRUPADAS) -------------------- */}
                <Text style={assignmentStyles.subtitle}>Rutinas Asignadas Actualmente ({currentAssignments.length})</Text>
                
                {isAssignmentsLoading ? (
                    <ActivityIndicator size="small" color={'#3ABFBC'} style={{marginBottom: 15}}/>
                ) : (
                    <View style={assignmentStyles.currentAssignmentList}>
                        {Object.keys(groupedAssignments).length > 0 ? (
                            Object.keys(groupedAssignments).map((groupIdKey, index) => { // Agregamos 'index'
                                const groupData = groupedAssignments[groupIdKey];
                                const groupAssignments = groupData.assignments;
                                
                                const routineGroupId = groupData.routineGroupId;
                                // Chequea si alguna rutina del grupo está activa (el ancla)
                                const isGroupActive = groupAssignments.some(a => a.is_active);
                                
                                const finalGroupIdForActions = routineGroupId;

                                // Lógica para el separador visual
                                const isLastGroup = index === Object.keys(groupedAssignments).length - 1;
                                const groupStyle = isLastGroup ? {} : assignmentStyles.groupSeparator;

                                return (
                                    // *** APLICACIÓN DEL ESTILO DE SEPARACIÓN ***
                                    <View key={groupIdKey} style={groupStyle}>
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

                                                    {/* Botón de Activar/Inactivar Grupo */}
                                                    <TouchableOpacity 
                                                        style={[
                                                            assignmentStyles.toggleGroupButton, 
                                                            { backgroundColor: isGroupActive ? themeColors.warning : '#3ABFBC' } 
                                                        ]}
                                                        onPress={() => handleToggleGroupActive(groupAssignments, isGroupActive)}
                                                    >
                                                        {isGroupActive ? 
                                                            <XCircle size={16} color={'black'} /> :
                                                            <CheckCircle size={16} color={'black'} />
                                                        }
                                                        <Text style={[assignmentStyles.groupActionButtonText, {color: 'black'}]}>
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
                                                .sort((a, b) => {
                                                    const aMatch = a.routine.nombre.match(/ - Dia (\d+)$/i) || a.routine.nombre.match(/ - Día (\d+)$/i);
                                                    const bMatch = b.routine.nombre.match(/ - Dia (\d+)$/i) || b.routine.nombre.match(/ - Día (\d+)$/i);
                                                    const aDay = aMatch ? parseInt(aMatch[1]) : 999;
                                                    const bDay = bMatch ? parseInt(bMatch[1]) : 999;
                                                    return aDay - bDay;
                                                })
                                                .map((assignment) => (
                                                    <CollapsibleAssignmentCard 
                                                        key={assignment.id.toString()}
                                                        assignment={assignment}
                                                        assignmentStyles={assignmentStyles}
                                                        themeColors={themeColors}
                                                        // Esta llamada es la que edita la rutina individual
                                                        handleEditAssignment={handleEditAssignment} 
                                                    />
                                                ))}
                                        </View>
                                    );
                                })
                            ) : (
                                <Text style={assignmentStyles.warning}>Este alumno no tiene rutinas asignadas.</Text>
                            )}
                    )}

               </View>
             </ScrollView>
           );
}

// ----------------------------------------------------------------------
// GENERADOR DE ESTILOS PARA LA PANTALLA PRINCIPAL (ProfessorScreen) - ESTILO PEAKFIT
// ----------------------------------------------------------------------

const getMainScreenStyles = (colors) => StyleSheet.create({
    // COLORES PEAKFIT: 
    // - background: Negro ('black')
    // - card: Gris oscuro para tarjetas e inputs ('#1C1C1E')
    // - primary/success: Verde brillante ('#3ABFBC')
    // - textPrimary: Blanco
    // - textSecondary: Gris claro ('#A9A9A9')
    
    container: { flex: 1, backgroundColor: 'black', },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black', },
    
    // INPUT DE BÚSQUEDA (Estilo oscuro y redondeado)
    searchInput: {
        height: 45, 
        backgroundColor: '#1C1C1E', // Fondo de tarjeta oscuro
        borderColor: '#1C1C1E',     // Borde invisible/oscuro
        borderWidth: 1,
        borderRadius: 10, // Más redondeado
        paddingHorizontal: 15, 
        fontSize: 16, 
        color: 'white', // Texto blanco
        marginHorizontal: 20, 
        marginTop: 15, 
        marginBottom: 20,
    },
    
    // CABECERA (Header y HeaderSelection)
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 15, 
        backgroundColor: 'black', // Fondo negro
        borderBottomWidth: 1,
        borderBottomColor: colors.divider, // Separador sutil
        elevation: 0, // Quitamos sombra para el fondo oscuro
    },
    headerSelection: { 
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 20, 
        backgroundColor: '#1C1C1E', // Fondo de tarjeta oscuro
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', flex: 1, textAlign: 'center', },
    titleSelection: { fontSize: 22, fontWeight: 'bold', color: '#3ABFBC', }, // Verde
    headerButtons: { flexDirection: 'row', gap: 15, },
    
    // Iconos de la cabecera
    iconButton: { 
        padding: 8, 
        borderRadius: 8, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#1C1C1E', // Fondo de botón oscuro
    },
    
    // Sección de Bienvenida/Acciones
    actionSection: {
        paddingHorizontal: 20, paddingVertical: 15, 
        backgroundColor: '#1C1C1E', // Fondo de tarjeta oscuro
        borderBottomWidth: 1, borderBottomColor: colors.divider, 
        alignItems: 'flex-start',
    },
    subtitle: { fontSize: 20, fontWeight: 'bold', color: 'white', marginBottom: 10, },
    listTitle: { 
        fontSize: 18, fontWeight: 'bold', color: 'white', 
        paddingVertical: 10, 
        paddingHorizontal: 20,
        backgroundColor: 'black', // Título sobre fondo negro
    },
    
    // Tarjeta de Alumno
    studentCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#1F2937', // Fondo de tarjeta oscuro
        borderRadius: 10, 
        padding: 15, 
        marginBottom: 10, 
        shadowColor: '#000', // Sombra oscura
        shadowOffset: { width: 0, height: 1 }, 
        shadowOpacity: 0.8,
        shadowRadius: 5, 
        elevation: 4, 
        width: '100%', 
    },
    studentName: { fontSize: 18, fontWeight: '600', color: 'white', },
    studentEmail: { fontSize: 14, color: '#A9A9A9', }, // Gris claro
    studentCardActions: { flexDirection: 'row', gap: 10, },
    
    // Botones de acción en la tarjeta (Rutina, Editar)
    actionButton: { 
        paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, 
        alignItems: 'center', justifyContent: 'center', minWidth: 80, 
    },
    actionButtonText: { fontSize: 13, fontWeight: 'bold', color: 'black', }, // Texto negro para contraste
    
    // Botón de Acción Flotante (FAB)
    fab: {
        position: 'absolute', width: 60, height: 60, alignItems: 'center', justifyContent: 'center',
        right: 20, bottom: 20, 
        backgroundColor: '#3ABFBC', // Verde brillante
        borderRadius: 30, elevation: 8,
        shadowColor: '#3ABFBC', 
        shadowOpacity: 0.8,
        shadowOffset: { width: 0, height: 4 }, 
        shadowRadius: 10,
    },
    fabIcon: { color: 'black', }, // Icono negro en fondo verde
    warningTextCenter: { color: colors.warning, textAlign: 'center', padding: 10, },
    errorView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: 'black', },
    errorTitle: { fontSize: 26, fontWeight: 'bold', color: colors.danger, marginBottom: 10, },
    errorDetail: { fontSize: 16, color: '#A9A9A9', textAlign: 'center', },
    
    // Menú Lateral (Drawer)
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-start', alignItems: 'flex-start', },
    menuContainer: {
        width: 280, height: '100%', 
        backgroundColor: '#1C1C1E', // Fondo oscuro del menú
        position: 'absolute', 
        left: 0, top: 0, 
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 }, 
        shadowOpacity: 1,
        shadowRadius: 5, 
        elevation: 10,
    },
    menuTitle: {
        fontSize: 18, fontWeight: 'bold', paddingVertical: 15, marginBottom: 10,
        borderBottomWidth: 1, borderBottomColor: colors.divider, 
        color: '#3ABFBC', // Título verde
        paddingHorizontal: 15, 
    },
    menuItem: {
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider,
        flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, 
    },
    menuItemClose: {
        position: 'absolute', bottom: 0, left: 0, right: 0, padding: 15,
        backgroundColor: colors.divider, alignItems: 'center',
    },
    menuItemText: { fontSize: 15, color: 'white', fontWeight: '600', },
    menuItemTextLogout: { fontSize: 15, color: colors.danger, fontWeight: '600', },
    menuItemTextClose: { fontSize: 15, color: 'white', fontWeight: '600', },
    
    // Wizard (Asistente de Creación/Edición)
    wizardContainer: { flexGrow: 1, padding: 20, width: '100%', },
    wizardTitle: { fontSize: 24, fontWeight: 'bold', color: '#3ABFBC', marginBottom: 20, textAlign: 'center', }, // Verde
    wizardInput: {
        height: 50, 
        backgroundColor: '#1C1C1E', // Fondo oscuro
        borderColor: colors.divider, 
        borderWidth: 1,
        borderRadius: 10, // Redondeado
        paddingHorizontal: 15, 
        fontSize: 16, 
        color: 'white',
        marginBottom: 20, 
        width: '100%',
    },
    wizardActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, },
    routineCounter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 20, paddingVertical: 10, },
    counterButton: { 
        padding: 10, 
        backgroundColor: '#3ABFBC', // Verde (Usamos el color directo ya que el primario del tema es dinámico)
        borderRadius: 8, 
    },
    counterCountText: { fontSize: 32, fontWeight: 'bold', color: 'white', width: 60, textAlign: 'center', },
    
    // Indicador de Progreso
    progressContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 15, width: '100%', },
    progressStep: { flex: 1, alignItems: 'center', position: 'relative', },
    progressConnectorBackground: { height: 4, backgroundColor: colors.divider, position: 'absolute', top: 20, zIndex: 0, },
    progressConnectorActive: { backgroundColor: '#3ABFBC', }, // Verde brillante
    progressCircle: {
        width: 40, height: 40, borderRadius: 20, 
        backgroundColor: '#1C1C1E', // Fondo oscuro
        borderWidth: 2,
        borderColor: colors.divider, 
        justifyContent: 'center', alignItems: 'center', zIndex: 1,
    },
    progressCircleActive: { borderColor: '#3ABFBC', }, // Verde
    progressCircleDone: { backgroundColor: '#3ABFBC', borderColor: '#3ABFBC', }, // Verde
    progressText: { marginTop: 5, fontSize: 12, color: colors.textSecondary, fontWeight: '500', },
    
    // Botones (Estilo Unificado)
    customButton: {
        paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center',
        justifyContent: 'center', minWidth: 100, shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5, shadowRadius: 3, elevation: 4,
    },
    buttonPrimary: { backgroundColor: '#3ABFBC', }, // Verde principal
    buttonSecondary: { backgroundColor: '#1C1C1E', borderColor: colors.divider, borderWidth: 1, }, // Oscuro secundario
    buttonDanger: { backgroundColor: colors.danger, },
    buttonText: { fontSize: 16, fontWeight: 'bold', color: 'black', }, // Texto negro en verde o rojo
    buttonTextSecondary: { fontSize: 16, fontWeight: 'bold', color: 'white', }, // Texto blanco en secundario oscuro
    
    // Input de Fecha (Modal Custom)
    dateInputContainer: {
        flexDirection: 'row', alignItems: 'center', height: 50, 
        backgroundColor: '#1C1C1E', // Fondo oscuro
        borderColor: colors.divider, borderWidth: 1, borderRadius: 10, paddingHorizontal: 15,
        marginBottom: 20, justifyContent: 'space-between',
    },
    dateText: { fontSize: 16, color: 'white', fontWeight: '500', flex: 1, },
    
    // Contenido del DatePicker Modal
    modalContent: {
        backgroundColor: '#1C1C1E', // Fondo oscuro
        borderRadius: 10,
        padding: 20,
        width: '80%',
        alignSelf: 'center',
        marginTop: '30%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 5,
    },
    datePickerInputGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 10,
    },
    datePickerInput: {
        flex: 1,
        height: 50,
        backgroundColor: 'black', // Fondo más oscuro para input
        borderColor: colors.divider,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        fontSize: 18,
        color: 'white',
        textAlign: 'center',
    },
    
    // Estilo de los títulos de los pasos del Wizard
    stepText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white', 
        marginBottom: 15,
        textAlign: 'center',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    // Estilo para labels de Wizard (Adaptado)
    label: { 
        fontSize: 16, 
        fontWeight: '600', 
        color: 'white', 
        marginBottom: 10, 
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
                                        { height: '100%' }, 
                                        styles.progressConnectorActive,
                                        { width: isDone ? '100%' : (isActive ? '50%' : '0%') }
                                    ]}/>
                                </View>
                            )}

                            {/* Círculo del Paso */}
                            <View style={circleStyle}>
                                {isDone ? (
                                    <CheckCircle size={18} color={'black'} />
                                ) : (
                                    <Text style={{ 
                                        color: isActive ? '#3ABFBC' : themeColors.textSecondary, 
                                        fontWeight: 'bold',
                                        fontSize: 14,
                                    }}>
                                        {stepNum}
                                    </Text>
                                )}
                            </View>
                            
                            {/* Texto del Paso */}
                            <Text style={[styles.progressText, { color: isDone ? '#3ABFBC' : (isActive ? '#3ABFBC' : themeColors.textSecondary) }]}>
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

// ----------------------------------------------------------------------
// 🆕 NUEVO COMPONENTE: MODAL DE SELECCIÓN DE FECHA CUSTOM
// ----------------------------------------------------------------------
function DatePickerModal({ isVisible, initialDate, onClose, onDateSelect }) {
    const { colors: themeColors } = useTheme();
    const styles = getMainScreenStyles(themeColors);
    
    // Inicializa DD/MM/AAAA. Si initialDate es un objeto Date, lo parseamos.
    let initialDay = '';
    let initialMonth = '';
    let initialYear = '';
    if (initialDate instanceof Date && !isNaN(initialDate.getTime())) {
        const display = formatDisplayDate(initialDate).split('/');
        initialDay = display[0];
        initialMonth = display[1];
        initialYear = display[2];
    }

    const [day, setDay] = useState(initialDay);
    const [month, setMonth] = useState(initialMonth);
    const [year, setYear] = useState(initialYear);

    // Refs para enfocar al siguiente campo
    const monthRef = useRef(null);
    const yearRef = useRef(null);

    const handleConfirm = () => {
        const d = parseInt(day, 10);
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);

        // 1. Validaciones básicas
        if (isNaN(d) || isNaN(m) || isNaN(y) || d < 1 || m < 1 || m > 12 || y < 2024 || y > 2100) {
            Alert.alert("Error de Fecha", "Por favor, ingrese valores válidos para Día (1-31), Mes (1-12) y Año (Mín. 2024).");
            return;
        }

        // 2. Validación de fecha real (JS Date Object)
        // Usamos el mes - 1 porque Date usa índice base 0 (Enero=0)
        const date = new Date(y, m - 1, d);
        
        // Verifica que la fecha construida coincida con los inputs (ej: 31 de Febrero -> 3 de Marzo)
        if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
             Alert.alert("Error de Fecha", "Fecha inválida (Ej: Febrero tiene 28/29 días).");
             return;
        }
        
        // 3. Validación de fecha futura (ignora el tiempo)
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        date.setHours(0, 0, 0, 0);
        
        if (date <= today) {
            Alert.alert("Error de Fecha", "La fecha de vencimiento debe ser una fecha futura.");
            return;
        }

        onDateSelect(date);
        onClose();
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <TouchableOpacity 
                style={[styles.modalOverlay, {justifyContent: 'center', alignItems: 'center'}]}
                activeOpacity={1}
                onPressOut={onClose}
            >
                <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                    <Text style={[styles.wizardTitle, {color: 'white', fontSize: 20}]}>Seleccionar Fecha de Vencimiento</Text>
                    
                    <View style={styles.datePickerInputGroup}>
                        <TextInput
                            style={styles.datePickerInput}
                            placeholder="DD"
                            placeholderTextColor={themeColors.textSecondary}
                            keyboardType="numeric"
                            maxLength={2}
                            value={day}
                            onChangeText={(text) => {
                                setDay(text.replace(/[^0-9]/g, ''));
                                if (text.length === 2 && monthRef.current) {
                                     monthRef.current.focus();
                                }
                            }}
                        />
                        <TextInput
                            ref={monthRef}
                            style={styles.datePickerInput}
                            placeholder="MM"
                            placeholderTextColor={themeColors.textSecondary}
                            keyboardType="numeric"
                            maxLength={2}
                            value={month}
                            onChangeText={(text) => {
                                setMonth(text.replace(/[^0-9]/g, ''));
                                if (text.length === 2 && yearRef.current) {
                                     yearRef.current.focus();
                                }
                            }}
                        />
                        <TextInput
                            ref={yearRef}
                            style={styles.datePickerInput}
                            placeholder="AAAA"
                            placeholderTextColor={themeColors.textSecondary}
                            keyboardType="numeric"
                            maxLength={4}
                            value={year}
                            onChangeText={(text) => setYear(text.replace(/[^0-9]/g, ''))}
                        />
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                        <TouchableOpacity
                            style={[styles.customButton, styles.buttonDanger]}
                            onPress={onClose}
                        >
                            <Text style={styles.buttonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.customButton, styles.buttonPrimary]}
                            onPress={handleConfirm}
                        >
                            <Text style={styles.buttonText}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

// ----------------------------------------------------------------------
// --- COMPONENTE: Asistente de Creacion Simplificado (3 Pasos) ---
// ----------------------------------------------------------------------
function CreationWizardSimplified({ students, onCancel, navigation }) {
    
    const { colors: themeColors } = useTheme();
    const styles = getMainScreenStyles(themeColors); 

    const [step, setStep] = useState(1);
    const [routineName, setRoutineName] = useState(''); 
    const [routineDescription, setRoutineDescription] = useState(''); 
    const [routinesCount, setRoutinesCount] = useState(1); 
    
    // ***************************************************************
    // ESTADO DE FECHA CON COMPONENTE DATETIMEPICKER
    // ***************************************************************
    const [expirationDateObject, setExpirationDateObject] = useState(null); // Objeto Date seleccionado
    const [showDatePicker, setShowDatePicker] = useState(false); // Visibilidad del picker (Ahora Modal)
    // ***************************************************************

    const [searchTerm, setSearchTerm] = useState(''); 

    const wizardLabelStyle = {
        ...styles.label, 
        color: 'white', // Usa el color blanco
        fontSize: 18, 
        fontWeight: 'bold', 
        marginBottom: 10,
    };
    
    const placeholderColor = themeColors.isDark ? themeColors.textSecondary : '#6B7280';


    const STEP_NAMES = ["Nombre", "Config", "Asignación"]; 
    const TOTAL_STEPS = 3;

    const { getToken } = useContext(AuthContext);

    // Función para inactivar todas las asignaciones existentes para un alumno
    const deactivateExistingAssignments = async (studentId) => {
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };
            
            const response = await axios.get(
                `${API_URL}/professor/assignments/student/${studentId}`, 
                { headers }
            );
            const assignmentsToDeactivate = Array.isArray(response.data) ? response.data : [];

            const patchPromises = assignmentsToDeactivate.map(assignment => 
                axios.patch(
                    `${API_URL}/assignments/${assignment.id}`, 
                    { is_active: false }, 
                    { headers }
                )
            );
            
            await Promise.all(patchPromises);
            console.log(`Inactivadas ${patchPromises.length} asignaciones anteriores para el alumno ${studentId}.`);

        } catch (e) {
            console.error("Error al inactivar asignaciones anteriores:", e.response ? e.response.data : e.message);
        }
    };


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

    const handleSelectStudent = async (student) => {
        
        Alert.alert(
            "Confirmación de Asignación",
            `Al asignar esta nueva rutina, todas las asignaciones **activas** anteriores para **${student.nombre}** serán inactivadas. ¿Continuar?`,
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Crear y Asignar", 
                    onPress: async () => {
                        // Inactivar grupos anteriores
                        await deactivateExistingAssignments(student.id);

                        // 1. Convertir el objeto Date al formato YYYY-MM-DD para la API
                        const apiFormattedDate = expirationDateObject 
                            ? formatAPIDate(expirationDateObject) 
                            : null;
                        
                        // 2. FIN DEL WIZARD: Navegamos a RoutineCreationScreen
                        navigation.navigate('RoutineCreation', { 
                            studentId: student.id,
                            studentName: student.nombre,
                            routineMetadata: {
                                nombre: routineName.trim(),
                                descripcion: routineDescription.trim(), 
                                days: routinesCount, 
                                expirationDate: apiFormattedDate 
                            }
                        });
                        onCancel(); // Cerramos el wizard en ProfessorScreen
                    }
                }
            ]
        );
    };
    
    // ***************************************************************
    // HANDLER DE SELECCIÓN DE FECHA CUSTOM
    // ***************************************************************
    const handleDateSelect = (selectedDate) => {
        // La validación de fecha futura ya ocurrió en DatePickerModal
        setExpirationDateObject(selectedDate);
    };

    // Formatea la fecha para mostrar en el botón
    const formatDateDisplay = (date) => {
        if (!date) return "Toca para Seleccionar Fecha";
        // Formato DD/MM/AAAA usando la función global para consistencia
        return formatDisplayDate(date);
    };
    // ***************************************************************


    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <>
                        <Text style={styles.stepText}>Paso 1: Nombre y Descripción del Grupo</Text>
                        <Text style={wizardLabelStyle}>Nombre de la Agrupación:</Text>
                        <TextInput
                            style={styles.wizardInput}
                            placeholder="Ej: Rutina Bloque A / Mes 1"
                            placeholderTextColor={placeholderColor}
                            value={routineName}
                            onChangeText={setRoutineName}
                            autoFocus
                        />
                        <Text style={wizardLabelStyle}>Descripción del Grupo (Opcional):</Text>
                        <TextInput
                            style={[styles.wizardInput, { height: 80, textAlignVertical: 'top' }]}
                            placeholder="Ej: Fase de hipertrofia de 4 semanas."
                            placeholderTextColor={placeholderColor}
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
                        
                        {/* Cantidad de Rutinas */}
                        <Text style={[wizardLabelStyle, {marginTop: 20}]}>Cantidad de Rutinas (Días):</Text>
                        <Text style={styles.warningTextCenter}>
                            (Mínimo 1, Máximo 5 rutinas)
                        </Text>
                        <View style={styles.routineCounter}>
                            <TouchableOpacity 
                                style={[styles.counterButton, { backgroundColor: themeColors.danger }]}
                                onPress={() => setRoutinesCount(prev => Math.max(1, prev - 1))}
                                disabled={routinesCount <= 1}
                            >
                                <Minus size={24} color={'black'} />
                            </TouchableOpacity>

                            <Text style={styles.counterCountText}>{routinesCount}</Text>

                            <TouchableOpacity 
                                style={[styles.counterButton, { backgroundColor: '#3ABFBC' }]}
                                onPress={() => setRoutinesCount(prev => Math.min(5, prev + 1))} // Maximo 5
                                disabled={routinesCount >= 5}
                            >
                                <Plus size={24} color={'black'} />
                            </TouchableOpacity>
                        </View>
                        
                        {/* FECHA DE VENCIMIENTO INTERACTIVA (AHORA ES UN BOTÓN QUE ABRE EL MODAL CUSTOM) */}
                        <Text style={[wizardLabelStyle, {marginTop: 20}]}>Fecha de Vencimiento:</Text>
                        <TouchableOpacity 
                            style={styles.dateInputContainer} 
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={styles.dateText}>
                                {formatDateDisplay(expirationDateObject)}
                            </Text>
                            <Calendar size={20} color={'#3ABFBC'} />
                        </TouchableOpacity>
                        
                        {/* MODAL DE SELECCIÓN DE FECHA */}
                        <DatePickerModal 
                            isVisible={showDatePicker}
                            initialDate={expirationDateObject}
                            onClose={() => setShowDatePicker(false)}
                            onDateSelect={handleDateSelect}
                        />

                        <Text style={styles.studentEmail}>
                            Rutinas a crear: {routinesCount} | Vence: {expirationDateObject ? formatDateDisplay(expirationDateObject) : '[Fecha Requerida]'}
                        </Text>
                    </>
                );
            case 3:
                return (
                    <>
                        <Text style={styles.stepText}>Paso 3: Selecciona el Alumno</Text>
                        <TextInput
                            style={styles.searchInput} 
                            placeholder="Buscar alumno por nombre o email..."
                            placeholderTextColor={placeholderColor}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                        <ScrollView style={{ maxHeight: 400, marginBottom: 20 }}>
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map((item) => (
                                    // 🚨 CLAVE: ESTE ES EL BOTÓN QUE PUEDE ESTAR FALLANDO EN LA WEB
                                    <TouchableOpacity 
                                        key={item.id.toString()}
                                        style={styles.studentCard}
                                        onPress={() => handleSelectStudent(item)}
                                    >
                                        <View>
                                            <Text style={styles.studentName}>{item.nombre}</Text>
                                            <Text style={styles.studentEmail}>{item.email}</Text>
                                        </View>
                                        <Text style={{...styles.actionButtonText, color: '#3ABFBC'}}>CREAR >> </Text>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={styles.warningTextCenter}>No se encontraron alumnos.</Text>
                            )}
                        </ScrollView>
                        <Text style={styles.studentEmail}>
                             Agrupación: {routineName.trim()} | Vence: {expirationDateObject ? formatDateDisplay(expirationDateObject) : 'N/A'}
                        </Text>
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
            
            if (!expirationDateObject) {
                Alert.alert("Error", "Debes seleccionar una fecha de vencimiento.");
                return;
            }

            // Validación de fecha futura
            const expiry = new Date(expirationDateObject.setHours(0,0,0,0));
            const today = new Date(new Date().setHours(0,0,0,0)); 
            
            if (!expiry || isNaN(expiry.getTime())) {
                Alert.alert("Error", "Fecha de vencimiento inválida.");
                return;
            }

            if (expiry <= today) {
                Alert.alert("Error", "La fecha de vencimiento debe ser una fecha futura.");
                return;
            }

            setStep(3);
        }
    };
    
    const isStepTwoValid = routinesCount >= 1 && expirationDateObject;
    
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
                            style={[styles.customButton, styles.buttonPrimary, { opacity: (step === 1 ? !routineName.trim() : !isStepTwoValid) ? 0.5 : 1 }]} 
                            onPress={nextStep} 
                            disabled={step === 1 ? !routineName.trim() : !isStepTwoValid}
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
    const [isMenuVisible, setIsMenuVisible] = useState(false); 

    const [searchTerm, setSearchTerm] = useState('');

    const { signOut, getToken, userProfile } = useContext(AuthContext);

    // ----------------------------------------------------------------
    // LÓGICA DE ANIMACIÓN DEL DRAWER (Menú Lateral)
    // ----------------------------------------------------------------
    const drawerWidth = 280; 
    const menuAnim = useRef(new Animated.Value(-drawerWidth)).current; 

    // Función para animar la entrada del menú
    const animateIn = () => {
        setIsMenuVisible(true); 
        Animated.timing(menuAnim, {
            toValue: 0, 
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    // Función para animar la salida del menú
    const animateOut = (callback) => {
        Animated.timing(menuAnim, {
            toValue: -drawerWidth, 
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setIsMenuVisible(false); 
            if (callback) callback();
        });
    };
    // ----------------------------------------------------------------
    
    // ----------------------------------------------------------------
    // FUNCION PRINCIPAL: CARGA DATOS
    // ----------------------------------------------------------------
    const fetchData = useCallback(async () => {
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
    }, [getToken, signOut]);
    
    // ----------------------------------------------------------------
    // FUNCIÓN: NAVEGAR A EDICIÓN DE DETALLES DEL ALUMNO
    // ----------------------------------------------------------------
    const handleEditStudent = (studentData) => {
        navigation.navigate('StudentDetails', { student: studentData });
    };

    // ----------------------------------------------------------------
    // FUNCIÓN: ACCIONES DEL MENÚ LATERAL (DRAWER) - USANDO ANIMATEOUT
    // ----------------------------------------------------------------
    const handleViewProfile = () => {
        animateOut(() => Alert.alert("Mi Perfil", "Esta sección navegará a tu pantalla de perfil (aún no implementada)."));
    };

    const handleChangePassword = () => {
        animateOut(() => navigation.navigate('ChangePassword')); 
    };
    
    const handleAddStudent = () => {
        animateOut(() => navigation.navigate('AddStudent')); 
    };

    // 🚨 MODIFICACIÓN CLAVE PARA EL STATIC SITE
    const handleLogout = () => {
        Alert.alert(
            "Cerrar Sesión",
            "¿Estás seguro de que quieres cerrar sesión?",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Cerrar", 
                    onPress: () => {
                        // FORZAMOS EL CIERRE DEL DRAWER ANTES DE LLAMAR A SIGNOUT
                        // Esto garantiza que la navegación pueda procesar el cambio de estado de token.
                        animateOut(() => signOut()); 
                    }, 
                    style: "destructive" 
                },
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
                <ActivityIndicator size="large" color={'#3ABFBC'} />
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
                    onPress={animateIn} 
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
                    <RefreshCcw size={22} color={'#3ABFBC'} />
                </TouchableOpacity>
            </View>
            
            {/* SCROLLVIEW PRINCIPAL */}
            <ScrollView style={{ flex: 1 }}>
                
                {/* SECCIÓN DE ACCIONES/SALUDO (Mejora visual) */}
                <View style={styles.actionSection}>
                    <Text style={styles.subtitle}>
                        👋 Bienvenido/a Prof. {userProfile?.nombre?.split(' ')[0] || 'Profesor/a'}
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
                                        style={[styles.actionButton, {backgroundColor: '#3ABFBC'}]}
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
                <Weight size={30} color={'black'} style={styles.fabIcon} />
            </TouchableOpacity>

            {/* MODAL DE OPCIONES (DRAWER LATERAL IZQUIERDO CON ANIMACIÓN) */}
            <Modal 
                animationType="none" 
                transparent={true}
                visible={isMenuVisible}
                onRequestClose={() => animateOut()} 
            >
                {/* Overlay transparente que se cierra al tocar fuera */}
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPressOut={() => animateOut()} 
                >
                    {/* DRAWER CONTENT (Animated.View para el deslizamiento) */}
                    <Animated.View 
                        style={[
                            styles.menuContainer, 
                            { transform: [{ translateX: menuAnim }] } 
                        ]}
                        // 🚨 FIX WEB: Añadimos onStartShouldSetResponder para que no se cierre al hacer clic dentro
                        onStartShouldSetResponder={() => true} 
                    >
                        
                        <SafeAreaView style={{ flex: 1 }}> 
                            
                            <ScrollView contentContainerStyle={{ paddingBottom: 70 }}>
                                <Text style={styles.menuTitle}>Menú Profesor</Text>

                                <TouchableOpacity 
                                    style={styles.menuItem} 
                                    onPress={handleViewProfile}
                                >
                                    <User size={18} color={themeColors.textPrimary} /> 
                                    <Text style={styles.menuItemText}>Mi Perfil</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.menuItem} 
                                    onPress={handleChangePassword}
                                >
                                    <Key size={18} color={themeColors.textPrimary} /> 
                                    <Text style={styles.menuItemText}>Cambiar Contraseña</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.menuItem} 
                                    onPress={handleAddStudent}
                                >
                                    <UserPlus size={18} color={themeColors.success} /> 
                                    <Text style={[styles.menuItemText, {color: themeColors.success}]}>Registrar Nuevo Alumno</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={[styles.menuItem, {borderBottomWidth: 0}]} 
                                    onPress={handleLogout}
                                >
                                    <LogOut size={18} color={themeColors.danger} />
                                    <Text style={styles.menuItemTextLogout}>Cerrar Sesión</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </SafeAreaView>
                        
                         {/* Botón de cierre visible dentro del menú */}
                         <TouchableOpacity 
                            style={styles.menuItemClose}
                            onPress={() => animateOut()}
                        >
                            <Text style={styles.menuItemTextClose}>Cerrar Menú</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}