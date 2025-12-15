import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
    StyleSheet, Text, View, TextInput, Button, SafeAreaView, 
    ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Modal
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import { AuthContext } from '../App'; 
import { useTheme } from '../ThemeContext'; 
import { Save, XCircle, PlusCircle, Trash2, Search, Zap, Loader, RefreshCcw } from 'lucide-react-native';

// ----------------------------------------------------------------------
// API Configuration
// ----------------------------------------------------------------------
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 

// ----------------------------------------------------------------------
// Dynamic Exercise Styles Generator - ESTILO PEAKFIT
// ----------------------------------------------------------------------
const getExerciseStyles = (colors) => StyleSheet.create({
    card: {
        backgroundColor: '#1C1C1E', // PEAKFIT Card Dark Gray
        borderRadius: 10, 
        padding: 15,
        marginBottom: 15,
        borderLeftWidth: 5,
        borderLeftColor: '#3ABFBC', // PEAKFIT Accent Green
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: 'white', // PEAKFIT Text White
        opacity: 1, 
    },
    deleteButton: {
        padding: 5,
    },
    selectButton: {
        backgroundColor: '#1C1C1E', // Base color dark gray 
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        borderWidth: 1,
        borderColor: colors.divider, // Borde sutil
    },
    selectButtonText: {
        color: 'white', // PEAKFIT Text White
        fontSize: 17,
        fontWeight: '600',
        marginLeft: 10,
        flexShrink: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    compactLabel: {
        fontSize: 12,
        color: '#A9A9A9', // PEAKFIT Secondary Text Gray
        marginBottom: 3,
        fontWeight: 'bold',
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    inputGroup: {
        width: '31%', 
        alignItems: 'center',
    },
    input: {
        height: 40,
        backgroundColor: 'black', // PEAKFIT Darker Input
        borderColor: colors.divider, 
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 5,
        fontSize: 14,
        color: 'white', // PEAKFIT Text White
        textAlign: 'center',
        width: '100%',
    },
    // <--- NUEVO ESTILO PARA NOTAS --->
    notesLabel: {
        fontSize: 14,
        color: '#A9A9A9',
        marginBottom: 5,
        marginTop: 15,
        fontWeight: 'bold',
    },
    notesInput: {
        minHeight: 80,
        backgroundColor: 'black',
        borderColor: colors.divider,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingTop: 10,
        fontSize: 14,
        color: 'white',
        textAlignVertical: 'top',
        marginBottom: 5,
    },
    // <--- FIN NUEVO ESTILO --->
});

// ----------------------------------------------------------------------
// Exercise Item Component
// ----------------------------------------------------------------------
const ExerciseItem = ({ index, exercise, updateExercise, removeExercise, toggleSelector, themeColors }) => {
    
    const exerciseStyles = getExerciseStyles(themeColors);

    const handleChange = (field, value) => {
        updateExercise(index, field, value);
    };

    const placeholderColor = '#A9A9A9';

    // Determina el color del botón de selección (verde si está seleccionado, rojo si no)
    const buttonColor = exercise.exercise_id ? '#3ABFBC' : themeColors.danger;
    
    // Fondo más oscuro para el botón si está seleccionado, o usa el color de la tarjeta
    const buttonBgColor = exercise.exercise_id ? '#1C1C1E' : '#1C1C1E'; 
    // El indicador visual es el color del texto/icono, no el fondo.


    return (
        <View style={exerciseStyles.card}>
            <View style={exerciseStyles.header}>
                <Text style={exerciseStyles.title}>Ejercicio #{index + 1}</Text>
                <TouchableOpacity 
                    onPress={() => removeExercise(index)} 
                    style={exerciseStyles.deleteButton}
                >
                    <Trash2 size={20} color={themeColors.danger} />
                </TouchableOpacity>
            </View>

            {/* Button/Display of Selected Exercise */}
            <TouchableOpacity 
                style={[
                    exerciseStyles.selectButton, 
                    {backgroundColor: buttonBgColor}
                ]} 
                onPress={() => toggleSelector(index)} 
            >
                {/* Icono usa el color determinado (verde/rojo) */}
                <Zap size={20} color={buttonColor} /> 
                <Text 
                    style={[
                        exerciseStyles.selectButtonText, 
                        // El texto es rojo si no está seleccionado
                        !exercise.exercise_id && {color: themeColors.danger} 
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail" 
                >
                    {exercise.name || "Toca para Seleccionar Ejercicio"}
                </Text>
            </TouchableOpacity>
            
            {/* Compact Input Row */}
            <View style={exerciseStyles.row}>
                {/* 1. Series Input */}
                <View style={exerciseStyles.inputGroup}>
                    <Text style={exerciseStyles.compactLabel}>Series</Text>
                    <TextInput
                        style={exerciseStyles.input}
                        placeholder="3"
                        placeholderTextColor={placeholderColor}
                        keyboardType="numeric"
                        // CORRECCIÓN: Usar 'series' (o 'sets' si el estado usa sets)
                        value={exercise.series} 
                        onChangeText={(text) => handleChange('series', text)}
                    />
                </View>

                {/* 2. Repetitions Input */}
                <View style={exerciseStyles.inputGroup}>
                    <Text style={exerciseStyles.compactLabel}>Repeticiones</Text>
                    <TextInput
                        style={exerciseStyles.input}
                        placeholder="10-12"
                        placeholderTextColor={placeholderColor}
                        keyboardType="default" 
                        value={exercise.repetitions}
                        onChangeText={(text) => handleChange('repetitions', text)}
                    />
                </View>

                {/* 3. Weight Input */}
                <View style={exerciseStyles.inputGroup}>
                    <Text style={exerciseStyles.compactLabel}>Peso</Text>
                    <TextInput
                        style={exerciseStyles.input}
                        placeholder="20 kg"
                        placeholderTextColor={placeholderColor}
                        keyboardType="default" 
                        value={exercise.peso}
                        onChangeText={(text) => handleChange('peso', text)}
                    />
                </View>
            </View>

            {/* <--- CAMPO NUEVO: NOTAS DEL PROFESOR (PARA EL ALUMNO) ---> */}
            <Text style={exerciseStyles.notesLabel}>Notas / Técnica (Opcional):</Text>
            <TextInput
                style={exerciseStyles.notesInput}
                placeholder="Ej: 30 segundos de descanso, técnica estricta, etc."
                placeholderTextColor={placeholderColor}
                keyboardType="default" 
                value={exercise.notas}
                onChangeText={(text) => handleChange('notas', text)}
                multiline
                numberOfLines={3}
            />
            {/* <--- FIN CAMPO NUEVO ---> */}
        </View>
    );
};

// ----------------------------------------------------------------------
// Dynamic Screen Styles Generator - ESTILO PEAKFIT
// ----------------------------------------------------------------------
const getStyles = (colors) => StyleSheet.create({
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
    content: {
        padding: 20,
        paddingBottom: 100, 
    },
    subHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: 'black', // 🚨 PEAKFIT: Header Negro
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 10, // Más redondeado
        justifyContent: 'center',
        width: '48%',
    },
    selectorActionButton: { 
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3ABFBC', // 🚨 PEAKFIT: Verde Brillante
        borderRadius: 10,
        paddingVertical: 10,
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 15,
    },
    actionButtonText: {
        color: 'black', // 🚨 PEAKFIT: Texto Negro en botones de acción
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 14,
    },
    cancelButton: {
        backgroundColor: colors.danger, // Mantenemos el color de peligro
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white', // 🚨 PEAKFIT: Texto Blanco
        marginBottom: 5,
        marginTop: 15,
    },
    input: {
        height: 50,
        backgroundColor: '#1C1C1E', // 🚨 PEAKFIT: Input Dark Gray
        borderColor: colors.divider,
        borderWidth: 1,
        borderRadius: 10, // Más redondeado
        paddingHorizontal: 15,
        fontSize: 16,
        marginBottom: 15,
        color: 'white', // 🚨 PEAKFIT: Texto Blanco
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
        paddingTop: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white', // 🚨 PEAKFIT: Texto Blanco
        marginTop: 25,
        marginBottom: 15,
    },
    floatingButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#3ABFBC', // 🚨 PEAKFIT: Verde Brillante
        padding: 15,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#3ABFBC', // Sombra Verde
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
    },
    floatingButtonText: {
        color: 'black', // 🚨 PEAKFIT: Texto Negro
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 16,
    },
    selectorContainer: {
        flex: 1,
        backgroundColor: 'black', // 🚨 PEAKFIT: Fondo Negro
        paddingTop: Platform.OS === 'android' ? 40 : 0, 
    },
    selectorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        backgroundColor: 'black', // 🚨 PEAKFIT: Header Negro
    },
    selectorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white', // 🚨 PEAKFIT: Texto Blanco
        flex: 1, 
        textAlign: 'center',
    },
    selectorSearchInput: {
        height: 45,
        backgroundColor: '#1C1C1E', // 🚨 PEAKFIT: Input Dark Gray
        borderColor: colors.divider,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 15,
        fontSize: 16,
        color: 'white', // 🚨 PEAKFIT: Texto Blanco
    },
    selectorList: {
        paddingHorizontal: 0, 
        paddingVertical: 10,
    },
    selectorItem: {
        paddingVertical: 15,
        paddingHorizontal: 20, 
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'black', 
    },
    selectorItemName: {
        fontSize: 17,
        fontWeight: '600',
        color: 'white', // 🚨 PEAKFIT: Texto Blanco
        flexShrink: 1, 
    },
    selectorItemGroup: {
        fontSize: 14,
        color: '#A9A9A9', // 🚨 PEAKFIT: Secondary Text Gray
        marginLeft: 10,
    },
    closeSelectorButton: {
        padding: 5,
    },
    screenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', 
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: 'black', // 🚨 PEAKFIT: Header Negro
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    screenTitle: {
        fontSize: 18, 
        fontWeight: 'bold',
        color: 'white', // 🚨 PEAKFIT: Texto Blanco
        textAlign: 'center',
    },
    addExerciseButtonText: {
        color: 'black',
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 16,
    }
});

// ----------------------------------------------------------------------
// Main Routine Creation / Edition Screen
// ----------------------------------------------------------------------
export default function RoutineCreationScreenV3({ navigation }) {
    
    const { colors: themeColors } = useTheme();
    const styles = getStyles(themeColors);

    // Route parameters
    const route = useRoute();
    const { studentId, studentName, routineId, routineMetadata } = route.params || {};
    
    const isEditMode = !!routineId; 
    
    // State for multi-day routine management
    const totalDays = isEditMode ? 1 : (routineMetadata?.days || 1);
    const baseName = isEditMode ? '' : (routineMetadata?.nombre || 'Nueva Rutina');

    const [currentDay, setCurrentDay] = useState(1);
    
    // Stores data for all N routines
    const [allRoutinesData, setAllRoutinesData] = useState(() => 
        isEditMode ? [] : Array.from({ length: totalDays }, (_, i) => ({
            day: i + 1,
            name: `${baseName} - Día ${i + 1}`,
            description: '', 
            exercises: [],
        }))
    );

    // Current routine data for UI
    const currentRoutine = allRoutinesData[currentDay - 1] || { exercises: [], name: '', description: '' };
    
    // UI and data states
    const [availableExercises, setAvailableExercises] = useState([]); 
    const [isExerciseSelectorOpen, setIsExerciseSelectorOpen] = useState(false); 
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Loading/Error states
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    
    const { getToken } = useContext(AuthContext);

    // ------------------------------------------------------------------
    // Helper Functions
    // ------------------------------------------------------------------
    
    const setRoutineData = (field, value) => {
        setAllRoutinesData(prev => {
            const newRoutines = [...prev];
            if (newRoutines[currentDay - 1]) {
                newRoutines[currentDay - 1][field] = value;
            }
            return newRoutines;
        });
    };

    const updateExercise = (index, field, value) => {
        setAllRoutinesData(prev => {
            const newRoutines = [...prev];
            const currentExercises = [...(newRoutines[currentDay - 1]?.exercises || [])];
            
            if (currentExercises[index]) {
                currentExercises[index] = { ...currentExercises[index], [field]: value };
            }
            
            if (newRoutines[currentDay - 1]) {
                // En modo edición (newRoutines.length es 1) o creación, esto siempre apunta al día correcto
                newRoutines[currentDay - 1].exercises = currentExercises; 
            }
            return newRoutines;
        });
    };
    
    // Función de carga de ejercicios (Ahora envuelta en useCallback)
    const fetchExercises = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };
            
            // 1. Load ALL available Exercises
            const exercisesResponse = await axios.get(`${API_URL}/exercises/`, { headers });
            setAvailableExercises(exercisesResponse.data);
            
            // 2. Load Routine Data if in Edit Mode (Solo se ejecuta si es modo edición y no se ha cargado)
            if (isEditMode && routineId && allRoutinesData.length === 0) {
                const routineResponse = await axios.get(`${API_URL}/routines/${routineId}`, { headers });
                const routineData = routineResponse.data;

                const loadedExercises = routineData.exercise_links
                    .sort((a, b) => a.order - b.order) 
                    .map(link => ({
                        exercise_id: link.exercise_id, 
                        name: link.exercise?.nombre || 'Ejercicio Desconocido',
                        // CORRECCIÓN PARA CARGA: Aseguramos que los valores sean string o cadena vacía, NO "null" literal.
                        series: String(link.sets || ''), // Aquí usamos 'series' que coincide con el estado del componente ExerciseItem
                        repetitions: String(link.repetitions || ''), 
                        peso: String(link.peso || ''), // Aseguramos que sea string
                        notas: String(link.professor_note || ''), // <--- CRÍTICO: CARGAR NOTAS EN EDICIÓN (professor_note)
                    }));
                
                // Aseguramos que solo haya un elemento en modo edición
                setAllRoutinesData([{
                    day: 1,
                    name: routineData.nombre,
                    // CORRECCIÓN: Si la descripción viene nula, la establecemos como cadena vacía.
                    description: routineData.descripcion || '', 
                    exercises: loadedExercises,
                }]);
                
            } 

        } catch (e) {
            console.error("Error loading data:", e.response ? e.response.data : e.message);
            setFetchError(`Error de conexión al cargar datos. ${isEditMode ? 'Rutina no encontrada.' : ''}`); 
        } finally {
            setIsLoading(false);
        }
    }, [isEditMode, routineId, getToken, allRoutinesData.length]);


    // ------------------------------------------------------------------
    // Effectos y Handlers de Navegación
    // ------------------------------------------------------------------

    // 1. Carga inicial de datos y Configuración del encabezado
    useEffect(() => {
        fetchExercises();
        
        // CORRECCIÓN DE UNIFICACIÓN: Eliminamos el botón de regreso nativo
        navigation.setOptions({ 
            headerLeft: () => null, // Esto elimina la flecha de volver atrás
            title: isEditMode ? `Editar: ${route.params?.routineMetadata?.nombre || 'Rutina'}` : `Creación: ${baseName}`,
        });
        
    }, [routineId, fetchExercises]); 
    
    // 2. RECARGA al volver de ExercisesAdd.js (por el focus)
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
             // Siempre recargamos los ejercicios al volver de cualquier otra pantalla para refrescar el catálogo
             fetchExercises();
        });

        return unsubscribe;
    }, [navigation, fetchExercises]);


    // 3. NUEVO HANDLER: Navegar a la pantalla de adición de ejercicios
    const handleNavigateToAddExercise = () => {
        // Cerramos el selector si estuviera abierto y navegamos a la pantalla de adición
        setIsExerciseSelectorOpen(false); 
        // ¡Esta es la navegación que necesita la nueva pantalla en App.js!
        navigation.navigate('ExercisesAdd'); 
    };

    // Exercise management
    const addExercise = () => {
        const newExercises = [...currentRoutine.exercises, { 
            exercise_id: null, 
            name: '', 
            series: '', 
            repetitions: '', 
            peso: '', 
            notas: '', // <--- CRÍTICO: INICIALIZAR NOTAS AL AÑADIR
        }];
        setRoutineData('exercises', newExercises);
    };

    const removeExercise = (index) => {
        Alert.alert(
            "Confirmar Eliminación",
            `¿Estás seguro de que quieres eliminar el ejercicio #${index + 1}?`,
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Eliminar", 
                    style: "destructive", 
                    onPress: () => {
                        const newExercises = currentRoutine.exercises.filter((_, i) => i !== index);
                        setRoutineData('exercises', newExercises);
                    }
                }
            ]
        );
    };
    
    // Exercise Selector Modal Logic
    const toggleExerciseSelector = (index) => {
        setCurrentExerciseIndex(index);
        setIsExerciseSelectorOpen(true);
        setSearchQuery(''); // Limpiamos la búsqueda al abrir
    };
    
    const handleSelectExercise = (exerciseId, exerciseName) => {
        if (currentExerciseIndex !== null) {
            const isDuplicate = currentRoutine.exercises.some((ex, i) => i !== currentExerciseIndex && ex.exercise_id === exerciseId);
            if (isDuplicate) {
                Alert.alert("Advertencia", "Este ejercicio ya está en la rutina. Puedes editar sus series/repeticiones."); 
            }
            
            updateExercise(currentExerciseIndex, 'exercise_id', exerciseId);
            updateExercise(currentExerciseIndex, 'name', exerciseName);
        }
        setIsExerciseSelectorOpen(false);
        setSearchQuery(''); 
        setCurrentExerciseIndex(null);
    };
    
    // ------------------------------------------------------------------
    // Validation and Save Logic (VALIDACIÓN REFORZADA)
    // ------------------------------------------------------------------
    const validateCurrentRoutine = () => {
        if (!currentRoutine.name.trim()) {
            Alert.alert("Error", `El nombre de la rutina no puede estar vacío.`); 
            return false;
        }
        
        if (currentRoutine.exercises.length === 0) {
            Alert.alert("Error", `La rutina "${currentRoutine.name}" debe tener al menos un ejercicio.`);
            return false;
        }
        
        const invalidExercise = currentRoutine.exercises.find(ex => {
            // 1. Exercise must be selected
            if (!ex.exercise_id) return true;
            
            // 2. Series validation: must be a positive integer
            const seriesTrimmed = ex.series ? ex.series.trim() : '';
            const seriesNumber = parseInt(seriesTrimmed);
            
            // Falla si es NaN (e.g., "a"), o si es <= 0, o si el string es vacío (seriesTrimmed.length === 0)
            if (isNaN(seriesNumber) || seriesNumber <= 0) return true;

            // 3. Repetitions validation: must be non-empty string
            const repetitionsTrimmed = ex.repetitions ? ex.repetitions.trim() : '';
            if (repetitionsTrimmed.length === 0) return true; 

            // 4. Peso can be empty, Notes can be empty.

            // All checks passed
            return false;
        });

        if (invalidExercise) {
            Alert.alert("Error de Validación", `En "${currentRoutine.name}": Todos los ejercicios deben estar seleccionados y tener Series (entero positivo) y Repeticiones no vacías.`); 
            return false;
        }
        return true;
    };
    
    const handleNextRoutineOrSaveAll = async () => {
        if (!validateCurrentRoutine()) return;

        if (currentDay < totalDays) {
            setCurrentDay(currentDay + 1);
            Alert.alert("Rutina Guardada Temporalmente", `¡Rutina "${currentRoutine.name}" completada! Editando el Día ${currentDay + 1}.`, [{ text: "OK" }]); 
        } else {
            // Este modo (transaccional) solo se usa en creación
            await handleSaveTransaction();
        }
    };

    const handleSaveTransaction = async () => {
        if (isSaving) return;
        setIsSaving(true);
        
        const expirationDate = routineMetadata?.expirationDate; // YYYY-MM-DD

        const payload = {
            nombre: baseName, 
            descripcion: routineMetadata?.descripcion || null, 
            fecha_vencimiento: expirationDate,
            student_id: studentId,
            days: totalDays, 
            routines: allRoutinesData.map((routine, index) => ({
                nombre: routine.name, 
                // Aseguramos que la descripción sea string vacío si está vacía, no null (por si el backend lo requiere)
                descripcion: routine.description.trim() || '', 
                exercises: routine.exercises.map((ex, exIndex) => ({
                    exercise_id: ex.exercise_id,
                    sets: parseInt(ex.series.trim()), // Aseguramos el parseo (debe ser un entero)
                    repetitions: ex.repetitions.trim(), // Aseguramos que sea string
                    peso: ex.peso.trim() || 'N/A', 
                    professor_note: ex.notas.trim() || null, // <--- CRÍTICO: ENVIAR NOTAS EN TRANSACCIÓN (professor_note)
                    order: exIndex + 1
                }))
            }))
        };

        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            // Endpoint para la creación transaccional de Grupo y Rutinas
            await axios.post(`${API_URL}/routines-group/create-transactional`, payload, { headers });
            
            Alert.alert(
                "Éxito Total!", 
                `Se creó la agrupación "${baseName}" con ${totalDays} rutinas y fue asignada a ${studentName}.`
            );
            
            navigation.goBack(); 
            
        } catch (e) {
            console.error("Error saving transaction (API):", e.response ? e.response.data : e.message);
            
            let errorMessage = "Fallo desconocido al guardar la transacción."; 
            if (e.response && e.response.data && e.response.data.detail) {
                if (Array.isArray(e.response.data.detail) || typeof e.response.data.detail === 'string') {
                    errorMessage = `Error de FastAPI: ${JSON.stringify(e.response.data.detail)}`;
                }
            }
            
            Alert.alert("Error de Guardado", errorMessage);
        } finally {
            setIsSaving(false);
        }
    };


    const handleSaveSingleRoutine = async () => {
        if (!validateCurrentRoutine()) return;

        setIsSaving(true);
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };
            
            // En modo edición, solo hay una rutina en allRoutinesData[0]
            const routineToSave = currentRoutine; 

            const routineData = {
                nombre: routineToSave.name.trim(),
                // CORRECCIÓN CLAVE: Si la descripción está vacía, enviamos "" en lugar de null
                descripcion: routineToSave.description.trim() || '', 
                exercises: routineToSave.exercises.map((ex, index) => ({ 
                    exercise_id: ex.exercise_id, 
                    sets: parseInt(ex.series.trim()), // Aseguramos el parseo (debe ser un entero)
                    repetitions: ex.repetitions.trim(), // Aseguramos que sea string
                    peso: ex.peso.trim() || 'N/A', 
                    professor_note: ex.notas.trim() || null, // <--- CRÍTICO: ENVIAR NOTAS EN EDICIÓN (professor_note)
                    order: index + 1 
                }))
            };

            // Usamos el endpoint PATCH /routines/{routine_id}
            await axios.patch(`${API_URL}/routines/${routineId}`, routineData, { headers });
            
            Alert.alert("Éxito de Edición", `Rutina "${routineToSave.name.trim()}" actualizada exitosamente.`); 
            navigation.goBack(); 
            
        } catch (e) {
            console.error("Error saving routine (API):", e.message, JSON.stringify(e.response ? e.response.data : e.message)); 
            
            let errorMessage = "Fallo desconocido al guardar la rutina.";
             if (e.response && e.response.data && e.response.data.detail) {
                 // Captura el mensaje de error detallado del backend
                 if (Array.isArray(e.response.data.detail) || typeof e.response.data.detail === 'string') {
                     // Si el backend es el que lanza el error, mostramos su detalle
                     errorMessage = `Error de FastAPI: ${JSON.stringify(e.response.data.detail)}`;
                 }
             } else if (e.message === "Network Error") {
                 errorMessage = "Error de red: No se pudo conectar al servidor API.";
             }

            // Aquí alertamos el error. El error de Render es provocado por esta llamada fallida.
            Alert.alert("Error de Edición", errorMessage); 
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleMainSaveAction = isEditMode ? handleSaveSingleRoutine : handleNextRoutineOrSaveAll;
    
    const filteredExercises = availableExercises.filter(ex => 
        ex.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (ex.grupo_muscular && ex.grupo_muscular.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // UI Status Views
    if (isLoading || (allRoutinesData.length === 0 && !isEditMode && !fetchError)) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={'#3ABFBC'} />
                <Text style={{marginTop: 10, color: themeColors.textSecondary}}>Cargando datos...</Text>
            </View>
        );
    }
    
    // Placeholder color for inputs
    const placeholderColor = '#A9A9A9';

    // Main button texts and colors
    const mainButtonText = isEditMode ? "Guardar Cambios" : (
        currentDay < totalDays ? `Siguiente (Día ${currentDay + 1})` : "Guardar Todo"
    );
    const mainButtonColor = isEditMode ? themeColors.warning : (
        currentDay < totalDays ? '#3ABFBC' : '#3ABFBC' // Siempre verde en creación
    );

    // ------------------------------------------------------------------
    // Exercise Selector Modal View
    // ------------------------------------------------------------------
    if (isExerciseSelectorOpen) {
        return (
            <SafeAreaView style={styles.selectorContainer}>
                <View style={styles.selectorHeader}>
                    <TouchableOpacity 
                        onPress={() => setIsExerciseSelectorOpen(false)}
                        style={styles.closeSelectorButton}
                    >
                        <XCircle size={28} color={themeColors.danger} />
                    </TouchableOpacity>
                    <Text style={styles.selectorTitle}>Seleccionar Ejercicio</Text>
                    <View style={{width: 28}}/> 
                </View>

                <TextInput
                    style={styles.selectorSearchInput}
                    placeholder="Buscar (Nombre o Grupo Muscular)"
                    placeholderTextColor={placeholderColor}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                
                {/* --- BOTÓN AGREGAR NUEVO EJERCICIO --- */}
                <TouchableOpacity 
                    onPress={handleNavigateToAddExercise} 
                    style={[styles.selectorActionButton, { backgroundColor: '#3ABFBC'}]} 
                    disabled={isSaving}
                >
                    <PlusCircle size={18} color={'black'} />
                    <Text style={styles.addExerciseButtonText}>Agregar Nuevo Ejercicio al Catálogo</Text>
                </TouchableOpacity>
                {/* ------------------------------------------------------------------------- */}

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

    // ------------------------------------------------------------------
    // Main Screen View
    // ------------------------------------------------------------------
    return (
        <SafeAreaView style={styles.container}>
            {/* Encabezado Personalizado (Reemplaza la barra de navegación nativa) */}
            <View style={styles.screenHeader}>
                <Text style={styles.screenTitle}>
                    {isEditMode ? `Editar Rutina: ${currentRoutine.name}` : `Creación: ${currentRoutine.name}`}
                </Text>
            </View>
            
            {/* Top Action Bar (Guardar/Cancelar) */}
            <View style={styles.subHeader}>
                {/* BOTÓN CANCELAR (Ahora es el único botón de navegación de salida) */}
                <TouchableOpacity 
                    onPress={() => navigation.goBack()}
                    style={[styles.actionButton, styles.cancelButton]}
                    disabled={isSaving}
                >
                    <XCircle size={18} color={'black'} />
                    <Text style={styles.actionButtonText}>Cancelar</Text>
                </TouchableOpacity>

                {/* BOTÓN PRINCIPAL DE ACCIÓN (Siguiente/Guardar) */}
                <TouchableOpacity 
                    onPress={handleMainSaveAction}
                    style={[styles.actionButton, {backgroundColor: mainButtonColor}]}
                    disabled={isSaving || !currentRoutine.name.trim() || currentRoutine.exercises.length === 0}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color={'black'} />
                    ) : (
                        <Save size={18} color={'black'} />
                    )}
                    <Text style={styles.actionButtonText}>
                        {isSaving ? "Guardando..." : mainButtonText}
                    </Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
                style={{flex: 1}} 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    
                    {/* Routine Name Input */}
                    <Text style={styles.label}>Nombre de la Rutina (Día {currentDay}):</Text>
                    <TextInput
                        style={styles.input} 
                        placeholder="Ej: Rutina Hipertrofia Día A"
                        placeholderTextColor={placeholderColor}
                        value={currentRoutine.name}
                        onChangeText={(text) => setRoutineData('name', text)}
                        editable={!isSaving}
                    />
                    
                    {/* Description Input */}
                    <Text style={styles.label}>Descripción (Opcional):</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Ej: Fase de volumen 4 semanas"
                        placeholderTextColor={placeholderColor}
                        value={currentRoutine.description}
                        onChangeText={(text) => setRoutineData('description', text)}
                        multiline
                        editable={!isSaving}
                    />
                    
                    {/* Exercise List Section */}
                    <Text style={styles.sectionTitle}>
                        Ejercicios ({currentRoutine.exercises.length}):
                    </Text>
                    
                    {/* Aquí ahora va directamente la lista de ejercicios: */}
                    <View>
                        {currentRoutine.exercises.map((exercise, index) => (
                            <ExerciseItem 
                                key={index.toString()}
                                index={index}
                                exercise={exercise}
                                updateExercise={updateExercise}
                                removeExercise={removeExercise}
                                toggleSelector={toggleExerciseSelector}
                                themeColors={themeColors}
                            />
                        ))}
                    </View>
                
                </ScrollView>
            </KeyboardAvoidingView>

            {/* FAB: Floating Action Button to Add Exercise ITEM to the current routine */}
            <TouchableOpacity 
                onPress={addExercise} 
                style={styles.floatingButton} 
                disabled={isSaving || fetchError || availableExercises.length === 0}
            >
                <PlusCircle size={24} color={'black'} />
                <Text style={styles.floatingButtonText}>Añadir Ejercicio</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}