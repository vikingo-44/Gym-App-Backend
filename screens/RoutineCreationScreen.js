import React, { useState, useEffect, useContext } from 'react';
import { 
    StyleSheet, Text, View, TextInput, Button, SafeAreaView, 
    ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
// 🚨 Importar useRoute para acceder a los parámetros de navegación
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import { AuthContext } from '../App'; 
// 🚨 Importamos el hook de tema
import { useTheme } from '../ThemeContext';

// ----------------------------------------------------------------------
// URL de la API (DEBE COINCIDIR con la de App.js)
// ----------------------------------------------------------------------
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// Generador de Estilos Dinámicos (Ejercicios)
// ----------------------------------------------------------------------
const getExerciseStyles = (colors) => StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        borderLeftWidth: 5,
        borderLeftColor: colors.primary,
        shadowColor: colors.isDark ? '#000' : '#444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: colors.isDark ? 0.3 : 0.1,
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
        color: colors.textPrimary,
    },
    deleteButton: {
        backgroundColor: colors.danger,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButtonText: {
        color: colors.card,
        fontWeight: 'bold',
        fontSize: 14,
    },
    selectButton: {
        backgroundColor: colors.inputBackground,
        borderColor: colors.inputBorder,
        borderWidth: 1,
        borderRadius: 6,
        padding: 15,
        marginBottom: 15,
    },
    selectButtonText: {
        color: colors.textPrimary,
        fontSize: 16,
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    input: {
        height: 40,
        backgroundColor: colors.inputBackground,
        borderColor: colors.inputBorder,
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 10,
        fontSize: 14,
        color: colors.textPrimary,
        width: '48%', 
    },
    smallInput: {
        width: '48%', 
        marginBottom: 10, 
    },
    warning: {
        fontSize: 14,
        color: colors.warning,
        textAlign: 'left',
        paddingVertical: 5,
    }
});

// Componente para un solo ejercicio
const ExerciseItem = ({ index, exercise, updateExercise, removeExercise, toggleSelector }) => {
    
    // 🔑 Obtener el tema y los colores
    const { colors: themeColors } = useTheme();
    const exerciseStyles = getExerciseStyles(themeColors);

    const handleChange = (field, value) => {
        updateExercise(index, field, value);
    };

    return (
        <View style={exerciseStyles.card}>
            <View style={exerciseStyles.header}>
                <Text style={exerciseStyles.title}>Ejercicio #{index + 1}</Text>
                <TouchableOpacity onPress={() => removeExercise(index)} style={exerciseStyles.deleteButton}>
                    <Text style={exerciseStyles.deleteButtonText}>X</Text>
                </TouchableOpacity>
            </View>

            {/* BOTÓN/DISPLAY DEL EJERCICIO SELECCIONADO */}
            <TouchableOpacity 
                style={exerciseStyles.selectButton} 
                onPress={() => toggleSelector(index)} 
            >
                <Text style={exerciseStyles.selectButtonText}>
                    {exercise.name || "Toca para Seleccionar Ejercicio"}
                </Text>
            </TouchableOpacity>
            
            <View style={exerciseStyles.row}>
                {/* Input de Series */}
                <TextInput
                    style={[exerciseStyles.input, exerciseStyles.smallInput]}
                    placeholder="Series"
                    placeholderTextColor={themeColors.textSecondary}
                    keyboardType="numeric"
                    value={exercise.series}
                    onChangeText={(text) => handleChange('series', text)}
                />
                {/* Input de Repeticiones */}
                <TextInput
                    style={[exerciseStyles.input, exerciseStyles.smallInput]}
                    placeholder="Repeticiones"
                    placeholderTextColor={themeColors.textSecondary}
                    keyboardType="default" 
                    value={exercise.repetitions}
                    onChangeText={(text) => handleChange('repetitions', text)}
                />
            </View>
        </View>
    );
};


// ----------------------------------------------------------------------
// Generador de Estilos Dinámicos (Principal)
// ----------------------------------------------------------------------
const getScreenStyles = (colors) => StyleSheet.create({
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
        color: colors.danger,
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
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 5,
        marginTop: 10,
    },
    input: {
        height: 50,
        backgroundColor: colors.inputBackground,
        borderColor: colors.inputBorder,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
        marginBottom: 10,
        color: colors.textPrimary,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
        paddingTop: 10,
    },
    studentInfoBox: {
        backgroundColor: colors.highlight,
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        borderLeftWidth: 5,
        borderLeftColor: colors.primary,
    },
    studentNameDisplay: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.primaryDark,
        marginTop: 5,
    },
    exerciseListContainer: {
        marginTop: 10,
    },
    addButton: {
        backgroundColor: colors.primary, 
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    addButtonText: {
        color: colors.card,
        fontWeight: 'bold',
        fontSize: 18,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        backgroundColor: colors.card,
    },
    noExercisesWarning: {
        backgroundColor: colors.isDark ? '#331100' : '#FFFBEA',
        borderColor: colors.warning,
        borderWidth: 1,
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
        marginTop: 20,
    },
    warningText: {
        color: colors.warning,
        fontSize: 14,
        textAlign: 'center',
    },
    // Estilos del Selector Personalizado (Modal)
    selectorContainer: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: 40,
    },
    selectorTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        color: colors.textPrimary,
    },
    selectorList: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    selectorItem: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    selectorItemName: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.primaryDark,
    },
    selectorItemGroup: {
        fontSize: 14,
        color: colors.textSecondary,
    }
});


// ----------------------------------------------------------------------
// Pantalla Principal de Creación / Edición
// ----------------------------------------------------------------------
export default function RoutineCreationScreen({ navigation }) {
    // 🔑 Obtener el tema y los colores
    const { colors: themeColors } = useTheme();
    const styles = getScreenStyles(themeColors); // 🚨 Generar estilos dinámicos
    
    // 🚨 1. OBTENER PARÁMETROS DEL ALUMNO (Creación) o RUTINA (Edición)
    const route = useRoute();
    const { studentId, studentName, routineId } = route.params || {};
    
    const isEditMode = !!routineId; // Bandera para saber si estamos editando
    
    // --- ESTADOS DE LA RUTINA ---
    const [routineName, setRoutineName] = useState('');
    const [routineDescription, setRoutineDescription] = useState(''); // Nuevo campo para descripción
    const [exercises, setExercises] = useState([]); 
    
    // --- ESTADOS DE EJERCICIOS ---
    const [availableExercises, setAvailableExercises] = useState([]); 
    const [isExerciseSelectorOpen, setIsExerciseSelectorOpen] = useState(false); 
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(null);

    // --- ESTADOS DE CARGA/ERRORES ---
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    
    const { getToken } = useContext(AuthContext);

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

                setRoutineName(routineData.nombre);
                setRoutineDescription(routineData.descripcion || '');

                // Mapear los ejercicios de la rutina para el estado del formulario
                const loadedExercises = routineData.exercise_links
                    .sort((a, b) => a.order - b.order) 
                    .map(link => ({
                        // Usamos el ID del ejercicio
                        exercise_id: link.exercise_id, 
                        // Usamos el nombre del ejercicio (del objeto anidado)
                        name: link.exercise?.nombre || 'Ejercicio Desconocido',
                        // 🚨 CORRECCIÓN CLAVE: Asegurar que sets y repetitions nunca sean null y siempre sean String
                        series: String(link.sets || ''), 
                        repetitions: String(link.repetitions || ''), 
                        order: link.order
                    }));
                setExercises(loadedExercises);

                navigation.setOptions({ title: `Editar: ${routineData.nombre}` });
            } else {
                // Si es modo CREACIÓN, solo ajustamos el título si se está asignando a un alumno
                if (studentName) {
                    navigation.setOptions({ title: `Crear para ${studentName.split(' ')[0]}` });
                } else {
                    navigation.setOptions({ title: `Crear Rutina Maestra` });
                }
            }

        } catch (e) {
            console.error("Error cargando datos:", e.response ? e.response.data : e.message);
            setFetchError(`Error de conexión al cargar datos. ${isEditMode ? 'Rutina no encontrada.' : ''}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [routineId]); // Recargar si cambiamos el ID de la rutina a editar

    // --- Lógica de Manejo de Ejercicios ---
    const addExercise = () => {
        setExercises([...exercises, { exercise_id: null, name: '', series: '', repetitions: '' }]);
    };

    const updateExercise = (index, field, value) => {
        const newExercises = [...exercises];
        newExercises[index][field] = value;
        setExercises(newExercises);
    };

    const removeExercise = (index) => {
        const newExercises = exercises.filter((_, i) => i !== index);
        setExercises(newExercises);
    };
    
    // --- Lógica de la Lista Desplegable de Ejercicios ---
    const toggleExerciseSelector = (index) => {
        setCurrentExerciseIndex(index);
        setIsExerciseSelectorOpen(true);
    };
    
    const handleSelectExercise = (exerciseId, exerciseName) => {
        if (currentExerciseIndex !== null) {
            // Revisa si el ejercicio ya fue agregado para evitar duplicados.
            const isDuplicate = exercises.some((ex, i) => i !== currentExerciseIndex && ex.exercise_id === exerciseId);
            if (isDuplicate) {
                Alert.alert("Advertencia", "Este ejercicio ya está en la rutina. Puedes editar sus series/repeticiones.");
                return;
            }
            
            updateExercise(currentExerciseIndex, 'exercise_id', exerciseId);
            updateExercise(currentExerciseIndex, 'name', exerciseName);
        }
        setIsExerciseSelectorOpen(false);
        setCurrentExerciseIndex(null);
    };
    
    // --- Lógica de Guardado (POST /routines/ ó PATCH /routines/{id}) ---
    const handleSaveRoutine = async () => {
        // 1. Validaciones
        if (!routineName.trim() || exercises.length === 0) {
            Alert.alert("Error", "Debes ingresar un nombre y al menos un ejercicio.");
            return;
        }
        
        // Validar ejercicios
        const invalidExercise = exercises.find(ex => 
            !ex.exercise_id || 
            // 🚨 Esta validación ahora es segura gracias a la corrección en fetchData
            !ex.series.trim() || !ex.repetitions.trim() || 
            isNaN(parseInt(ex.series)) || parseInt(ex.series) <= 0
        );

        if (invalidExercise) {
            Alert.alert("Error de Validación", "Todos los ejercicios deben estar seleccionados y tener Series (número entero positivo) y Repeticiones válidas.");
            return;
        }

        setIsSaving(true);
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };
            
            // 🔑 Formato del JSON para la API (RoutineCreate - usado para crear y actualizar)
            const routineData = {
                nombre: routineName.trim(),
                descripcion: routineDescription.trim() || null,
                exercises: exercises.map((ex, index) => ({ 
                    exercise_id: ex.exercise_id, 
                    sets: parseInt(ex.series), // Convertir a int
                    repetitions: ex.repetitions.trim(), 
                    order: index + 1 // Añadir el campo 'order'
                }))
            };

            let successMessage = "";

            if (isEditMode) {
                // MODO EDICIÓN: PATCH /routines/{id}
                await axios.patch(`${API_URL}/routines/${routineId}`, routineData, { headers });
                successMessage = `Rutina "${routineName.trim()}" actualizada exitosamente.`;
                
            } else {
                // MODO CREACIÓN: POST /routines/ y luego POST /assignments/
                
                // 1. POST /routines/ (Crear la plantilla)
                const routineResponse = await axios.post(`${API_URL}/routines/`, routineData, { headers });
                const newRoutineId = routineResponse.data.id;
                
                // 2. Si se seleccionó un alumno al iniciar, ASIGNAR la rutina
                if (studentId) {
                    const assignmentData = {
                        routine_id: newRoutineId,
                        student_id: studentId,
                        is_active: true
                    };

                    await axios.post(`${API_URL}/assignments/`, assignmentData, { headers });
                    successMessage = `Rutina "${routineName.trim()}" creada y asignada a ${studentName} correctamente.`;
                } else {
                    successMessage = `Rutina Maestra "${routineName.trim()}" creada exitosamente. Puedes asignarla desde el Panel de Profesor.`;
                }

            }

            Alert.alert(isEditMode ? "Éxito de Edición" : "¡Éxito!", successMessage);
            navigation.goBack(); 
            
        } catch (e) {
            console.error("Error guardando rutina (API):", e.message, JSON.stringify(e.response ? e.response.data : e.message)); 
            
            let errorMessage = "Fallo desconocido al guardar la rutina.";
            if (e.message === 'Network Error') {
                 errorMessage = "Error de Red. Verifica que la URL sea la correcta.";
            } else if (e.response && e.response.data && e.response.data.detail) {
                 errorMessage = `Error de FastAPI: ${JSON.stringify(e.response.data.detail)}`;
            }
            
            Alert.alert(isEditMode ? "Error de Edición" : "Error de Guardado", errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    // --- VISTAS DE ESTADO Y MODALES ---
    
    if (isLoading) {
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
                      <Button title="Reintentar Carga" onPress={fetchData} color={themeColors.warning} />
                  </View>
              </SafeAreaView>
          );
    }
    
    // --- VISTA DE SELECCIÓN DE EJERCICIOS (MODAL) ---
    if (isExerciseSelectorOpen) {
        return (
            <SafeAreaView style={styles.selectorContainer}>
                <Text style={styles.selectorTitle}>Seleccionar Ejercicio</Text>
                <ScrollView contentContainerStyle={styles.selectorList}>
                    {availableExercises.map((ex) => (
                        <TouchableOpacity
                            key={ex.id.toString()}
                            style={styles.selectorItem}
                            onPress={() => handleSelectExercise(ex.id, ex.nombre)}
                        >
                            <Text style={styles.selectorItemName}>{ex.nombre}</Text>
                            <Text style={styles.selectorItemGroup}>{ex.grupo_muscular}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <View style={{padding: 20}}>
                    <Button title="Cancelar" onPress={() => setIsExerciseSelectorOpen(false)} color={themeColors.danger} />
                </View>
            </SafeAreaView>
        );
    }

    // --- VISTA PRINCIPAL DE CREACIÓN ---
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                style={{flex: 1}} 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.headerTitle}>{isEditMode ? "✍️ Editar Rutina" : "🛠️ Crear Nueva Rutina"}</Text>
                    
                    {/* DISPLAY DEL ALUMNO SELECCIONADO (Solo en modo Creación y si se seleccionó) */}
                    {!isEditMode && studentName && (
                        <View style={styles.studentInfoBox}>
                            <Text style={styles.label}>Asignando a:</Text>
                            <Text style={styles.studentNameDisplay}>
                                {studentName}
                            </Text>
                        </View>
                    )}
                    {/* FIN DEL DISPLAY DE ALUMNO */}
                    
                    {/* INPUT NOMBRE RUTINA */}
                    <Text style={styles.label}>Nombre de la Rutina:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Rutina Hipertrofia Día A"
                        placeholderTextColor={themeColors.textSecondary}
                        value={routineName}
                        onChangeText={setRoutineName}
                    />
                    
                    {/* INPUT DESCRIPCIÓN */}
                    <Text style={styles.label}>Descripción (Opcional):</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="e.g., Fase de volumen 4 semanas"
                        placeholderTextColor={themeColors.textSecondary}
                        value={routineDescription}
                        onChangeText={setRoutineDescription}
                        multiline
                    />
                    
                    {availableExercises.length === 0 && (
                        <View style={styles.noExercisesWarning}>
                            <Text style={styles.warningText}>
                                ⚠️ **Advertencia:** No hay ejercicios disponibles. 
                                ¡Crea al menos uno en FastAPI para poder seleccionarlo!
                            </Text>
                        </View>
                    )}

                    <Text style={[styles.label, {marginTop: 20, fontSize: 18, color: themeColors.primary}]}>
                        Ejercicios ({exercises.length}):
                    </Text>

                    <View style={styles.exerciseListContainer}>
                        {exercises.map((exercise, index) => (
                            <ExerciseItem 
                                key={index.toString()}
                                index={index}
                                exercise={exercise}
                                updateExercise={updateExercise}
                                removeExercise={removeExercise}
                                toggleSelector={toggleExerciseSelector}
                            />
                        ))}
                    </View>

                    <TouchableOpacity onPress={addExercise} style={styles.addButton} disabled={fetchError || availableExercises.length === 0}>
                        <Text style={styles.addButtonText}>➕ Agregar Ejercicio</Text>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>

            <View style={styles.footer}>
                <Button 
                    title={isSaving ? "Guardando..." : (isEditMode ? "GUARDAR CAMBIOS" : (studentId ? "GUARDAR Y ASIGNAR" : "GUARDAR MAESTRA"))} 
                    onPress={handleSaveRoutine} 
                    disabled={isSaving || !routineName.trim() || exercises.length === 0}
                    color={isEditMode ? themeColors.warning : themeColors.success} // Naranja para editar, verde para crear
                />
                <View style={{marginTop: 10}}>
                    <Button 
                        title="Cancelar" 
                        onPress={() => navigation.goBack()} 
                        color={themeColors.danger}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}