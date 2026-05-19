import React, { useState, useEffect, useContext } from 'react';
import { 
    StyleSheet, Text, View, TextInput, Button, SafeAreaView, 
    ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
// Importar useRoute para acceder a los parametros de navegacion
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import { AuthContext } from '../App'; 
import { useTheme } from '../ThemeContext'; 
// 🚨 IMPORTAMOS ÍCONOS PARA LOS BOTONES SUPERIORES
import { Save, XCircle, ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react-native';

// ----------------------------------------------------------------------
// URL de la API (DEBE COINCIDIR con la de App.js)
// ----------------------------------------------------------------------
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// GENERADOR DE ESTILOS DE EJERCICIO DINÁMICOS
// ----------------------------------------------------------------------
const getExerciseStyles = (colors) => StyleSheet.create({
    card: {
        backgroundColor: colors.card, // Fondo de la tarjeta
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        borderLeftWidth: 5,
        borderLeftColor: colors.primary, // Borde izquierdo azul
        shadowColor: colors.isDark ? '#000' : '#444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: colors.isDark ? 0.4 : 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary, // Texto principal
    },
    deleteButton: {
        backgroundColor: colors.danger, // Botón de peligro
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButtonText: {
        color: colors.card, // Blanco/claro
        fontWeight: 'bold',
        fontSize: 12,
    },
    selectButton: {
        backgroundColor: colors.highlight, // Fondo de resaltado (ligeramente más claro/oscuro)
        borderColor: colors.divider, // Borde gris
        borderWidth: 1,
        borderRadius: 6,
        padding: 15,
        marginBottom: 15,
        justifyContent: 'flex-start', // Alinea el contenido a la izquierda
        alignItems: 'flex-start', // Alinea el contenido a la izquierda
    },
    // Estilo del texto del botón de selección
    selectButtonText: {
        color: colors.textPrimary, // Texto principal
        fontSize: 16,
        maxWidth: '100%', 
    },
    // 🚨 CONTENEDOR DE INPUTS (La Fila Compacta)
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
        marginBottom: 10, // Añadido para separación inferior
    },
    // 🚨 ESTILO PARA LA ETIQUETA COMPACTA
    compactLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 3,
        fontWeight: 'bold',
        textAlign: 'center', // Para centrar la etiqueta sobre el input
    },
    // 🚨 ESTILO PARA EL CONTENEDOR DE CADA INPUT EN LA FILA
    inputGroup: {
        width: '31%', // Distribución en 3 columnas con espacio entre ellas
        alignItems: 'center', // Centra la etiqueta y el input
    },
    input: {
        height: 40,
        backgroundColor: colors.highlight, // Fondo del input
        borderColor: colors.divider, 
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 5, // Reducido para inputs compactos
        fontSize: 14,
        color: colors.textPrimary, // Texto principal
        textAlign: 'center', // Centra el valor
        width: '100%',
    },
});

// Componente para un solo ejercicio
const ExerciseItem = ({ index, exercise, updateExercise, removeExercise, toggleSelector, themeColors }) => {
    
    const exerciseStyles = getExerciseStyles(themeColors);

    // Función centralizada de cambio para Series/Repeticiones/Peso
    const handleChange = (field, value) => {
        updateExercise(index, field, value);
    };

    // Placeholder color dinámico
    const placeholderColor = themeColors.isDark ? themeColors.textSecondary : '#A0A0A0';

    return (
        <View style={exerciseStyles.card}>
            <View style={exerciseStyles.header}>
                <Text style={exerciseStyles.title}>Ejercicio #{index + 1}</Text>
                <TouchableOpacity onPress={() => removeExercise(index)} style={exerciseStyles.deleteButton}>
                    <Text style={exerciseStyles.deleteButtonText}>X</Text>
                </TouchableOpacity>
            </View>

            {/* BOToN/DISPLAY DEL EJERCICIO SELECCIONADO */}
            <TouchableOpacity 
                style={[
                    exerciseStyles.selectButton, 
                    !exercise.exercise_id && {borderColor: themeColors.danger},
                    // 🚨 CORRECCIÓN 2: Ajuste de padding/margin dentro del botón si es necesario.
                    // El selectButton ya tiene padding 15, por lo que el texto no debería estar pegado.
                    // Lo verificaremos en la vista principal.
                ]} 
                onPress={() => toggleSelector(index)} 
            >
                {/* Forzamos el texto a una sola línea y alineamos a la izquierda */}
                <Text 
                    style={[
                        exerciseStyles.selectButtonText, 
                        !exercise.exercise_id && {color: themeColors.danger} // Texto rojo si no está seleccionado
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail" // Cortar con puntos suspensivos al final
                >
                    {exercise.name || "Toca para Seleccionar Ejercicio"}
                </Text>
            </TouchableOpacity>
            
            {/* 🚨 NUEVA FILA COMPACTA DE INPUTS */}
            <View style={exerciseStyles.row}>
                {/* 1. Input de Series */}
                <View style={exerciseStyles.inputGroup}>
                    <Text style={exerciseStyles.compactLabel}>SERIES</Text>
                    <TextInput
                        style={exerciseStyles.input}
                        placeholder="ej: 3"
                        placeholderTextColor={placeholderColor}
                        keyboardType="numeric"
                        value={exercise.series}
                        onChangeText={(text) => handleChange('series', text)}
                    />
                </View>

                {/* 2. Input de Repeticiones */}
                <View style={exerciseStyles.inputGroup}>
                    <Text style={exerciseStyles.compactLabel}>REPETICIONES</Text>
                    <TextInput
                        style={exerciseStyles.input}
                        placeholder="ej: 10-12"
                        placeholderTextColor={placeholderColor}
                        keyboardType="default" 
                        value={exercise.repetitions}
                        onChangeText={(text) => handleChange('repetitions', text)}
                    />
                </View>

                {/* 3. Input de Peso/Resistencia */}
                <View style={exerciseStyles.inputGroup}>
                    {/* 🚨 CORRECCIÓN 3: Solo PESO */}
                    <Text style={exerciseStyles.compactLabel}>PESO</Text>
                    <TextInput
                        style={exerciseStyles.input}
                        placeholder="ej: 20 kg"
                        placeholderTextColor={placeholderColor}
                        keyboardType="default" 
                        value={exercise.peso}
                        onChangeText={(text) => handleChange('peso', text)}
                    />
                </View>
            </View>
            {/* FIN NUEVA FILA COMPACTA */}
        </View>
    );
};

// ----------------------------------------------------------------------
// GENERADOR DE ESTILOS DE PANTALLA DINÁMICOS
// ----------------------------------------------------------------------
const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background, // Fondo de la app
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    errorView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.background,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.danger, // Rojo de peligro
        marginBottom: 10,
    },
    errorDetail: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    content: {
        padding: 20,
        paddingBottom: 20,
    },
    // TÍTULO PRINCIPAL EN EL ENCABEZADO SUPERIOR
    mainHeader: {
        backgroundColor: colors.card, // Fondo de la tarjeta (para que coincida con el tema)
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    headerTitle: {
        fontSize: 20, // Reducido para dejar espacio al SubHeader
        fontWeight: 'bold',
        color: colors.textPrimary, // Texto principal
        textAlign: 'center',
    },
    // NUEVO: ESTILO PARA LA BARRA SUPERIOR DE BOTONES (SUB-HEADER)
    subHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.primary,
    },
    actionButtonText: {
        color: colors.card,
        fontWeight: 'bold',
        marginLeft: 5,
        fontSize: 14,
    },
    cancelButton: {
        backgroundColor: colors.danger,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary, // Texto principal
        marginBottom: 5,
        marginTop: 10,
    },
    input: {
        height: 50,
        backgroundColor: colors.card, // Fondo de la tarjeta/input
        borderColor: colors.divider, // Borde divisor
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
        marginBottom: 15,
        color: colors.textPrimary, // Texto principal
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
        paddingTop: 10,
    },
    // Estilo adaptado para el modo oscuro
    studentInfoBox: {
        // Color de fondo más suave para el modo oscuro
        backgroundColor: colors.isDark ? colors.highlight : '#D1E7FF',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        borderLeftWidth: 5,
        borderLeftColor: colors.primary, // Color primario
    },
    studentNameDisplay: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.primary, // Color primario
        marginTop: 5,
    },
    exerciseListContainer: {
        marginTop: 10,
    },
    addButton: {
        backgroundColor: colors.primary,  // Botón principal
        padding: 15,
        borderRadius: 8,
        // 🚨 CAMBIOS PARA EVITAR EL ENVOLTORIO
        flexDirection: 'row', 
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    addButtonText: {
        color: colors.card, // Texto blanco/claro
        fontWeight: 'bold',
        fontSize: 18,
        marginLeft: 10, // Separación entre ícono y texto
    },
    // 🚨 CORRECCIÓN 1: Estilo para el título de la sección "Ejercicios"
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 20,
        marginBottom: 10,
        // Eliminamos el paddingHorizontal aquí para que se alinee con el borde del ScrollView
        paddingHorizontal: 20, 
    },
    noExercisesWarning: {
        backgroundColor: colors.isDark ? colors.warning + '30' : '#FFFBEA', // Fondo de advertencia
        borderColor: colors.warning,
        borderWidth: 1,
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
        marginTop: 20,
    },
    warningText: {
        color: colors.warning, // Texto de advertencia
        fontSize: 14,
        textAlign: 'center',
    },
    // Estilos del Selector Personalizado (Modal)
    selectorContainer: {
        flex: 1,
        backgroundColor: colors.background, // Fondo del selector
        // Ajustamos el padding superior si es Android
        paddingTop: Platform.OS === 'android' ? 40 : 0, 
    },
    // 🚨 NUEVO: Encabezado del selector con el botón de cerrar
    selectorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        backgroundColor: colors.card,
    },
    selectorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
        flex: 1, // Permite que el título ocupe el espacio restante
        textAlign: 'center',
    },
    // 🚨 NUEVO: Estilo para el input de búsqueda
    selectorSearchInput: {
        height: 40,
        backgroundColor: colors.card,
        borderColor: colors.divider,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginHorizontal: 20,
        marginTop: 10, // Añadido para separación del header
        marginBottom: 10,
        fontSize: 16,
        color: colors.textPrimary,
    },
    selectorList: {
        // Eliminar padding horizontal aquí
        paddingHorizontal: 0, 
        paddingVertical: 10,
    },
    selectorItem: {
        paddingVertical: 15,
        paddingHorizontal: 20, // Añadido padding horizontal aquí
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    selectorItemName: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.primary, // Azul primario
    },
    selectorItemGroup: {
        fontSize: 14,
        color: colors.textSecondary,
    }
});

// ----------------------------------------------------------------------
// Pantalla Principal de Creacion / Edicion
// ----------------------------------------------------------------------
export default function RoutineCreationScreen({ navigation }) {
    
    const { colors: themeColors } = useTheme(); // 🚨 USADO: useTheme
    const styles = getStyles(themeColors); // Estilos de la pantalla
    // Styles para los ejercicios se generan dentro de ExerciseItem

    // MODIFICADO: Capturar routineMetadata (Nombre Grupo, Dias, Fecha Vencimiento)
    const route = useRoute();
    const { studentId, studentName, routineId, routineMetadata } = route.params || {};
    
    const isEditMode = !!routineId; 
    
    // ESTADOS PARA AGRUPACIoN Y FLUJO MULTI-DiA
    const totalDays = isEditMode ? 1 : (routineMetadata?.days || 1);
    const baseName = isEditMode ? '' : (routineMetadata?.nombre || 'Nueva Rutina');

    const [currentDay, setCurrentDay] = useState(1);
    
    // Almacena los datos de todas las N rutinas
    const [allRoutinesData, setAllRoutinesData] = useState(() => 
        isEditMode ? [] : Array.from({ length: totalDays }, (_, i) => ({
            day: i + 1,
            // Nombre base + " - Día X"
            name: `${baseName} - Día ${i + 1}`,
            description: '', // Descripción individual de la rutina
            exercises: [],
        }))
    );

    // Obtener la rutina actual para la UI
    const currentRoutine = allRoutinesData[currentDay - 1] || { exercises: [], name: '', description: '' };
    
    // --- ESTADOS DE EJERCICIOS Y UI ---
    const [availableExercises, setAvailableExercises] = useState([]); 
    const [isExerciseSelectorOpen, setIsExerciseSelectorOpen] = useState(false); 
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(null);
    // 🚨 NUEVO: Estado para el buscador en el modal
    const [searchQuery, setSearchQuery] = useState('');

    // --- ESTADOS DE CARGA/ERRORES ---
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    
    const { getToken } = useContext(AuthContext);

    // ------------------------------------------------------------------
    // FUNCIÓN PARA ACTUALIZAR EL DATO DE LA RUTINA ACTUAL (nombre, descripcion, ejercicios)
    // ------------------------------------------------------------------
    const setRoutineData = (field, value) => {
        setAllRoutinesData(prev => {
            const newRoutines = [...prev];
            // Si hay un error de indice, prevenimos el crash
            if (newRoutines[currentDay - 1]) {
                newRoutines[currentDay - 1][field] = value;
            }
            return newRoutines;
        });
    };

    // ------------------------------------------------------------------
    // FUNCIÓN DE AYUDA PARA ACTUALIZAR UN EJERCICIO DENTRO DE LA RUTINA ACTUAL
    // ------------------------------------------------------------------
    const updateExercise = (index, field, value) => {
        setAllRoutinesData(prev => {
            const newRoutines = [...prev];
            const currentExercises = [...(newRoutines[currentDay - 1]?.exercises || [])];
            
            if (currentExercises[index]) {
                currentExercises[index] = { ...currentExercises[index], [field]: value };
            }
            
            if (newRoutines[currentDay - 1]) {
                newRoutines[currentDay - 1].exercises = currentExercises;
            }
            return newRoutines;
        });
    };
    
    // --- Carga Inicial (Ejercicios y/o Datos de la Rutina) ---
    const fetchData = async () => {
        setIsLoading(true);
        setFetchError(null);
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };
            
            // 1. Cargar TODOS los Ejercicios disponibles
            const exercisesResponse = await axios.get(`${API_URL}/exercises/`, { headers });
            setAvailableExercises(exercisesResponse.data);
            
            // 2. Si es MODO EDICIÓN, cargar los datos de la rutina
            if (isEditMode && routineId) {
                const routineResponse = await axios.get(`${API_URL}/routines/${routineId}`, { headers });
                const routineData = routineResponse.data;

                const loadedExercises = routineData.exercise_links
                    .sort((a, b) => a.order - b.order) 
                    .map(link => ({
                        exercise_id: link.exercise_id, 
                        name: link.exercise?.nombre || 'Ejercicio Desconocido',
                        series: String(link.sets),
                        repetitions: link.repetitions,
                        // NUEVO: Cargar el campo peso desde la API
                        peso: link.peso || 'N/A', 
                    }));
                
                // Cargar la rutina de edición en la posicion 0
                setAllRoutinesData([{
                    day: 1,
                    name: routineData.nombre,
                    description: routineData.descripcion || '',
                    exercises: loadedExercises,
                }]);
                
                navigation.setOptions({ title: `Editar: ${routineData.nombre}` });

            } else {
                // Modo CREACIÓN (multiples dias o 1 dia nuevo)
                navigation.setOptions({ title: `Creación: ${baseName}` }); // Ñ corregida
            }

        } catch (e) {
            console.error("Error cargando datos:", e.response ? e.response.data : e.message);
            setFetchError(`Error de conexión al cargar datos. ${isEditMode ? 'Rutina no encontrada.' : ''}`); // Ñ corregida
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [routineId]); 

    // --- Logica de Manejo de Ejercicios ---
    const addExercise = () => {
        const newExercises = [...currentRoutine.exercises, { 
            exercise_id: null, 
            name: '', 
            series: '', 
            repetitions: '', 
            // NUEVO: Inicializar campo peso
            peso: '', 
        }];
        setRoutineData('exercises', newExercises);
    };

    const removeExercise = (index) => {
        const newExercises = currentRoutine.exercises.filter((_, i) => i !== index);
        setRoutineData('exercises', newExercises);
    };
    
    // --- Logica de la Lista Desplegable de Ejercicios ---
    const toggleExerciseSelector = (index) => {
        setCurrentExerciseIndex(index);
        setIsExerciseSelectorOpen(true);
    };
    
    const handleSelectExercise = (exerciseId, exerciseName) => {
        if (currentExerciseIndex !== null) {
            const isDuplicate = currentRoutine.exercises.some((ex, i) => i !== currentExerciseIndex && ex.exercise_id === exerciseId);
            if (isDuplicate) {
                Alert.alert("Advertencia", "Este ejercicio ya está en la rutina. Puedes editar sus series/repeticiones."); // Á corregida
            }
            
            updateExercise(currentExerciseIndex, 'exercise_id', exerciseId);
            updateExercise(currentExerciseIndex, 'name', exerciseName);
        }
        setIsExerciseSelectorOpen(false);
        setSearchQuery(''); // Limpiar el buscador al cerrar
        setCurrentExerciseIndex(null);
    };
    
    // ------------------------------------------------------------------
    // FUNCIÓN DE VALIDACIÓN COMPARTIDA
    // ------------------------------------------------------------------
    const validateCurrentRoutine = () => {
        if (!currentRoutine.name.trim()) {
            Alert.alert("Error", `El nombre de la rutina ${currentRoutine.name} no puede estar vacío.`); // Í y Ó corregidas
            return false;
        }
        
        if (currentRoutine.exercises.length === 0) {
            Alert.alert("Error", `La rutina "${currentRoutine.name}" debe tener al menos un ejercicio.`);
            return false;
        }
        
        const invalidExercise = currentRoutine.exercises.find(ex => 
            !ex.exercise_id || !ex.series.trim() || !ex.repetitions.trim() || 
            isNaN(parseInt(ex.series)) || parseInt(ex.series) <= 0
        );
        // NOTA: El campo 'peso' no se hace obligatorio ya que puede ser 'N/A'

        if (invalidExercise) {
            Alert.alert("Error de Validación", `En "${currentRoutine.name}": Todos los ejercicios deben estar seleccionados y tener Series (entero positivo) y Repeticiones válidas.`); // Ó y Á corregidas
            return false;
        }
        return true;
    };
    
    // ------------------------------------------------------------------
    // Logica de Guardado (Modo Creacion: Siguiente Dia o Transaccion Final)
    // ------------------------------------------------------------------
    const handleNextRoutineOrSaveAll = async () => {
        if (!validateCurrentRoutine()) return;

        if (currentDay < totalDays) {
            // Guardar temporalmente el dia actual e ir al siguiente
            setCurrentDay(currentDay + 1);
            Alert.alert("Rutina Guardada Temporalmente", `¡Rutina "${currentRoutine.name}" completada! Editando el Día ${currentDay + 1}.`, [{ text: "OK" }]); // Í y Á corregidas
        } else {
            // último dia: Guardar la transacción completa
            await handleSaveTransaction();
        }
    };

    // ------------------------------------------------------------------
    // Guardado Transaccional (POST /routines-group/create-transactional)
    // ------------------------------------------------------------------
    const handleSaveTransaction = async () => {
        if (isSaving) return;
        setIsSaving(true);
        
        const expirationDate = routineMetadata?.expirationDate;

        // 1. Construir el payload completo para la API
        const payload = {
            nombre: baseName, // Nombre del Grupo (Bloque A)
            descripcion: routineMetadata?.descripcion || null, // Descripción del Grupo
            fecha_vencimiento: expirationDate,
            student_id: studentId,
            days: totalDays, // Necesario para el esquema de la API
            routines: allRoutinesData.map((routine, index) => ({
                nombre: routine.name, // Nombre de la rutina (Bloque A - Dia X o el nombre personalizado)
                descripcion: routine.description.trim() || null,
                exercises: routine.exercises.map((ex, exIndex) => ({
                    exercise_id: ex.exercise_id,
                    sets: parseInt(ex.series),
                    repetitions: ex.repetitions.trim(),
                    // INCLUIR PESO EN EL PAYLOAD
                    peso: ex.peso.trim() || 'N/A', 
                    order: exIndex + 1
                }))
            }))
        };

        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            // Llamada al nuevo endpoint transaccional
            await axios.post(`${API_URL}/routines-group/create-transactional`, payload, { headers });
            
            Alert.alert(
                "¡Éxito Total!",  // É corregida
                `Se creó la agrupación "${baseName}" con ${totalDays} rutinas y fue asignada a ${studentName}.` // Ó y Ó corregidas
            );
            
            navigation.goBack(); 
            
        } catch (e) {
            console.error("Error guardando transacción (API):", e.message, JSON.stringify(e.response ? e.response.data : e.message)); // Ó corregida
            
            let errorMessage = "Fallo desconocido al guardar la transacción."; // Ó corregida
            if (e.response && e.response.data && e.response.data.detail) {
                // Intenta mostrar el detalle si es un array o string
                if (Array.isArray(e.response.data.detail) || typeof e.response.data.detail === 'string') {
                    errorMessage = `Error de FastAPI: ${JSON.stringify(e.response.data.detail)}`;
                } else {
                     errorMessage = `Error de FastAPI: Ver log del servidor.`;
                }
            }
            
            Alert.alert("Error de Guardado", errorMessage);
        } finally {
            setIsSaving(false);
        }
    };


    // ------------------------------------------------------------------
    // Guardado unico (Modo Edicion: PATCH)
    // ------------------------------------------------------------------
    const handleSaveSingleRoutine = async () => {
        if (!validateCurrentRoutine()) return;

        setIsSaving(true);
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };
            
            const routineData = {
                nombre: currentRoutine.name.trim(),
                descripcion: currentRoutine.description.trim() || null,
                exercises: currentRoutine.exercises.map((ex, index) => ({ 
                    exercise_id: ex.exercise_id, 
                    sets: parseInt(ex.series), 
                    repetitions: ex.repetitions.trim(), 
                    // INCLUIR PESO EN EL PAYLOAD
                    peso: ex.peso.trim() || 'N/A', 
                    order: index + 1 
                }))
            };

            // MODO EDICIÓN: PATCH /routines/{id}
            await axios.patch(`${API_URL}/routines/${routineId}`, routineData, { headers });
            
            Alert.alert("Éxito de Edición", `Rutina "${currentRoutine.name.trim()}" actualizada exitosamente.`); // É corregida
            navigation.goBack(); 
            
        } catch (e) {
            console.error("Error guardando rutina (API):", e.message, JSON.stringify(e.response ? e.response.data : e.message)); 
            
            let errorMessage = "Fallo desconocido al guardar la rutina.";
             if (e.response && e.response.data && e.response.data.detail) {
                 if (Array.isArray(e.response.data.detail) || typeof e.response.data.detail === 'string') {
                    errorMessage = `Error de FastAPI: ${JSON.stringify(e.response.data.detail)}`;
                } else {
                     errorMessage = `Error de FastAPI: Ver log del servidor.`;
                }
            }
            
            Alert.alert("Error de Edición", errorMessage); // Ó corregida
        } finally {
            setIsSaving(false);
        }
    };
    
    // Determinar que función de guardado usar en el botón principal
    const handleMainSaveAction = isEditMode ? handleSaveSingleRoutine : handleNextRoutineOrSaveAll;
    
    // 🚨 Logica de filtrado de ejercicios
    const filteredExercises = availableExercises.filter(ex => 
        ex.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (ex.grupo_muscular && ex.grupo_muscular.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // --- VISTAS DE ESTADO ---
    if (isLoading || (allRoutinesData.length === 0 && !isEditMode)) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={themeColors.primary} />
                <Text style={{marginTop: 10, color: themeColors.textSecondary}}>Cargando datos...</Text>
            </View>
        );
    }

    if (fetchError) {
          return (
              <SafeAreaView style={styles.container}>
                  <View style={styles.errorView}>
                      <Text style={styles.errorTitle}>Error de Conexión</Text>
                      <Text style={styles.errorDetail}>{fetchError}</Text>
                      <Button 
                            title="Reintentar Carga" 
                            onPress={fetchData} 
                            color={themeColors.warning} // Color de advertencia
                        />
                  </View>
              </SafeAreaView>
          );
    }
    
    // Placeholder color dinámico para inputs
    const placeholderColor = themeColors.isDark ? themeColors.textSecondary : '#A0A0A0';

    // Determinar texto y color del botón principal
    const mainButtonText = isEditMode ? "Guardar Cambios" : (
        currentDay < totalDays ? `Siguiente (Día ${currentDay + 1})` : "Guardar y Asignar Todo"
    );
    const mainButtonColor = isEditMode ? themeColors.warning : (
        currentDay < totalDays ? themeColors.primary : themeColors.success
    );

    // --- VISTA DE SELECCIÓN DE EJERCICIOS (MODAL) ---
    if (isExerciseSelectorOpen) {
        return (
            <SafeAreaView style={styles.selectorContainer}>
                {/* 🚨 ENCABEZADO DEL SELECTOR CON BOTÓN CERRAR */}
                <View style={styles.selectorHeader}>
                    <TouchableOpacity 
                        onPress={() => setIsExerciseSelectorOpen(false)}
                        style={[styles.actionButton, styles.cancelButton, {backgroundColor: themeColors.danger, marginRight: 10}]}
                    >
                        <XCircle size={18} color={themeColors.card} />
                        <Text style={styles.actionButtonText}>Cerrar</Text>
                    </TouchableOpacity>
                    <Text style={styles.selectorTitle}>Seleccionar Ejercicio</Text>
                    {/* View vacía para equilibrar el espacio horizontal */}
                    <View style={{width: 80}}/> 
                </View>

                {/* 🚨 BUSCADOR */}
                <TextInput
                    style={styles.selectorSearchInput}
                    placeholder="Buscar (Nombre o Grupo Muscular)"
                    placeholderTextColor={themeColors.isDark ? themeColors.textSecondary : '#6B7280'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
               
                {/* Usamos contentContainerStyle para asegurar que el padding se aplique correctamente a los ítems */}
                <ScrollView contentContainerStyle={styles.selectorList}>
                    {filteredExercises.length > 0 ? (
                        filteredExercises.map((ex) => (
                        <TouchableOpacity
                            key={ex.id.toString()}
                            style={styles.selectorItem}
                            onPress={() => handleSelectExercise(ex.id, ex.nombre)}
                        >
                            <Text style={styles.selectorItemName}>{ex.nombre}</Text>
                            <Text style={styles.selectorItemGroup}>Grupo: {ex.grupo_muscular}</Text>
                        </TouchableOpacity>
                    ))
                    ) : (
                        <Text style={{textAlign: 'center', color: themeColors.textSecondary, marginTop: 20}}>
                            No se encontraron ejercicios con ese filtro.
                        </Text>
                    )}
                </ScrollView>
            </SafeAreaView>
        );
    }

    // --- VISTA PRINCIPAL DE CREACIÓN / EDICIÓN ---
    return (
        <SafeAreaView style={styles.container}>
            {/* 1. ENCABEZADO PRINCIPAL (Título) */}
            <View style={styles.mainHeader}>
                <Text style={styles.headerTitle}>
                    {isEditMode ? "Editar Rutina" : `Creación de Rutina`}
                </Text>
            </View>

            {/* 2. SUB-ENCABEZADO DE ACCIONES (Guardar/Cancelar) */}
            <View style={styles.subHeader}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()}
                    style={[styles.actionButton, styles.cancelButton, {backgroundColor: themeColors.danger}]}
                    disabled={isSaving}
                >
                    <XCircle size={18} color={themeColors.card} />
                    <Text style={styles.actionButtonText}>
                        Cancelar
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={handleMainSaveAction}
                    style={[styles.actionButton, {backgroundColor: mainButtonColor}]}
                    disabled={isSaving || !currentRoutine.name.trim() || currentRoutine.exercises.length === 0 || (!isEditMode && !studentId)}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color={themeColors.card} />
                    ) : (
                        <Save size={18} color={themeColors.card} />
                    )}
                    <Text style={styles.actionButtonText}>
                        {isSaving ? "Guardando..." : (isEditMode ? "Guardar Cambios" : (currentDay < totalDays ? "Siguiente" : "Guardar Todo"))}
                    </Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
                style={{flex: 1}} 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    
                    {/* DISPLAY DE DÍA ACTUAL/GRUPO */}
                    {!isEditMode && totalDays > 1 && (
                        <View style={[styles.studentInfoBox, {marginBottom: 15, borderLeftColor: themeColors.primary}]}>
                            <Text style={styles.label}>Agrupación: {baseName} (Vence: {routineMetadata?.expirationDate})</Text>
                            <Text style={[styles.studentNameDisplay, {color: themeColors.primary}]}>
                                Día {currentDay} de {totalDays}
                            </Text>
                        </View>
                    )}
                    
                    {/* DISPLAY DEL ALUMNO SELECCIONADO (Solo en modo Creacion) */}
                    {!isEditMode && studentName && (
                        <View style={styles.studentInfoBox}>
                            <Text style={styles.label}>Asignando a:</Text>
                            <Text style={styles.studentNameDisplay}>
                                {studentName || "Error: Alumno no seleccionado"}
                            </Text>
                        </View>
                    )}

                    {/* INPUT NOMBRE RUTINA */}
                    <Text style={styles.label}>Nombre de la Rutina (Día {currentDay}):</Text>
                    <TextInput
                        style={styles.input} 
                        placeholder="e.g., Rutina Hipertrofia Día A"
                        placeholderTextColor={placeholderColor}
                        value={currentRoutine.name}
                        onChangeText={(text) => setRoutineData('name', text)}
                        editable={true}
                    />
                    
                    {/* INPUT DESCRIPCIÓN */}
                    <Text style={styles.label}>Descripción (Opcional):</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="e.g., Fase de volumen 4 semanas"
                        placeholderTextColor={placeholderColor}
                        value={currentRoutine.description}
                        onChangeText={(text) => setRoutineData('description', text)}
                        multiline
                    />
                    
                    {availableExercises.length === 0 && (
                        <View style={styles.noExercisesWarning}>
                            <Text style={styles.warningText}>
                                **Advertencia:** No hay ejercicios disponibles. 
                                ¡Crea al menos uno en FastAPI para poder seleccionarlo!
                            </Text>
                        </View>
                    )}
                    
                    {/* 🚨 CORRECCIÓN 1: Aplicamos el nuevo estilo sectionTitle para corregir el margen */}
                    <Text style={styles.sectionTitle}>
                        Ejercicios ({currentRoutine.exercises.length}):
                    </Text>

                    <View style={styles.exerciseListContainer}>
                        {currentRoutine.exercises.map((exercise, index) => (
                            <ExerciseItem 
                                key={index.toString()}
                                index={index}
                                exercise={exercise}
                                updateExercise={updateExercise}
                                removeExercise={removeExercise}
                                toggleSelector={toggleExerciseSelector}
                                themeColors={themeColors} // Pasamos el tema
                            />
                        ))}
                    </View>

                    <TouchableOpacity 
                        onPress={addExercise} 
                        style={styles.addButton} 
                        disabled={fetchError || availableExercises.length === 0}
                    >
                        <PlusCircle size={18} color={themeColors.card} />
                        <Text style={styles.addButtonText}>Agregar Ejercicio</Text>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* ELIMINADO EL FOOTER CON BOTONES */}
        </SafeAreaView>
    );
}