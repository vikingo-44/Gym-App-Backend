import React, { useState, useEffect, useContext } from 'react';
import { 
    StyleSheet, Text, View, TextInput, Button, SafeAreaView, 
    ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
// 🚨 Importar useRoute para acceder a los parámetros de navegación
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import { AuthContext } from '../App'; 

// ----------------------------------------------------------------------
// URL de la API (DEBE COINCIDIR con la de App.js)
// ----------------------------------------------------------------------
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 
// ----------------------------------------------------------------------

// Componente para un solo ejercicio
const ExerciseItem = ({ index, exercise, updateExercise, removeExercise, toggleSelector }) => {
    
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
                    placeholderTextColor="#A0A0A0"
                    keyboardType="numeric"
                    value={exercise.series}
                    onChangeText={(text) => handleChange('series', text)}
                />
                {/* Input de Repeticiones */}
                <TextInput
                    style={[exerciseStyles.input, exerciseStyles.smallInput]}
                    placeholder="Repeticiones"
                    placeholderTextColor="#A0A0A0"
                    keyboardType="default" 
                    value={exercise.repetitions}
                    onChangeText={(text) => handleChange('repetitions', text)}
                />
            </View>
        </View>
    );
};

// ----------------------------------------------------------------------
// Pantalla Principal de Creación / Edición
// ----------------------------------------------------------------------
export default function RoutineCreationScreen({ navigation }) {
    // 🚨 1. OBTENER PARÁMETROS DEL ALUMNO (Creación) o RUTINA (Edición)
    const route = useRoute();
    const { studentId, studentName, routineId } = route.params || {};
    
    // Bandera para saber si estamos editando
    const isEditMode = !!routineId; 
    
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
                    // Ordenar por el campo 'order' que viene del enlace
                    .sort((a, b) => a.order - b.order) 
                    .map(link => ({
                        // Usamos el ID del ejercicio
                        exercise_id: link.exercise_id, 
                        // Usamos el nombre del ejercicio (del objeto anidado)
                        name: link.exercise?.nombre || 'Ejercicio Desconocido',
                        series: String(link.sets),
                        repetitions: link.repetitions,
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
        setExercises([...exercises, { exercise_id: null, name: '', series: '', repetitions: '', order: exercises.length + 1 }]);
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

        if (!isEditMode && !studentId) {
            Alert.alert("Error", "En modo creación, se debe seleccionar un alumno para asignar la rutina.");
            return;
        }
        
        // Validar ejercicios
        const invalidExercise = exercises.find(ex => 
            !ex.exercise_id || !ex.series.trim() || !ex.repetitions.trim() || 
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
            
            // 🔑 Formato del JSON para la API (RoutineCreateOrUpdate)
            const routineData = {
                nombre: routineName.trim(),
                descripcion: routineDescription.trim() || null, // Incluir la descripción
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
                
                // 2. POST /assignments/ (Asignar la rutina recién creada al alumno)
                const assignmentData = {
                    routine_id: newRoutineId,
                    student_id: studentId,
                    is_active: true
                };

                await axios.post(`${API_URL}/assignments/`, assignmentData, { headers });
                successMessage = `Rutina "${routineName.trim()}" creada y asignada a ${studentName} correctamente.`;
            }

            Alert.alert(isEditMode ? "Éxito de Edición" : "¡Éxito!", successMessage);
            navigation.goBack(); 
            
        } catch (e) {
            console.error("Error guardando rutina (API):", e.message, JSON.stringify(e.response ? e.response.data : e.message)); 
            
            let errorMessage = "Fallo desconocido al guardar la rutina.";
            if (e.message === 'Network Error') {
                 errorMessage = "Error de Red. Verifica que Ngrok esté activo y la URL sea la correcta.";
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
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={{marginTop: 10, color: '#4B5563'}}>Cargando datos...</Text>
            </View>
        );
    }

    if (fetchError) {
          return (
              <SafeAreaView style={styles.container}>
                  <View style={styles.errorView}>
                      <Text style={styles.errorTitle}>Error de Conexión</Text>
                      <Text style={styles.errorDetail}>{fetchError}</Text>
                      <Button title="Reintentar Carga" onPress={fetchData} color="#FF9500" />
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
                    <Button title="Cancelar" onPress={() => setIsExerciseSelectorOpen(false)} color="#EF4444" />
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
                    
                    {/* DISPLAY DEL ALUMNO SELECCIONADO (Solo en modo Creación) */}
                    {!isEditMode && studentName && (
                        <View style={styles.studentInfoBox}>
                            <Text style={styles.label}>Asignando a:</Text>
                            <Text style={styles.studentNameDisplay}>
                                {studentName || "Error: Alumno no seleccionado"}
                            </Text>
                        </View>
                    )}
                    {/* FIN DEL DISPLAY DE ALUMNO */}

                    {/* INPUT NOMBRE RUTINA */}
                    <Text style={styles.label}>Nombre de la Rutina:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Rutina Hipertrofia Día A"
                        placeholderTextColor="#A0A0A0"
                        value={routineName}
                        onChangeText={setRoutineName}
                    />
                    
                    {/* INPUT DESCRIPCIÓN */}
                    <Text style={styles.label}>Descripción (Opcional):</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="e.g., Fase de volumen 4 semanas"
                        placeholderTextColor="#A0A0A0"
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

                    <Text style={[styles.label, {marginTop: 20, fontSize: 18, color: '#3B82F6'}]}>
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
                                toggleSelector={toggleExerciseSelector} // Usar el selector de ejercicios
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
                    title={isSaving ? "Guardando..." : (isEditMode ? "GUARDAR CAMBIOS" : "GUARDAR Y ASIGNAR")} 
                    onPress={handleSaveRoutine} 
                    disabled={isSaving || !routineName.trim() || exercises.length === 0 || (!isEditMode && !studentId)}
                    color={isEditMode ? "#FF9500" : "#10B981"} // Naranja para editar, verde para crear/asignar
                />
                <View style={{marginTop: 10}}>
                    <Button 
                        title="Cancelar" 
                        onPress={() => navigation.goBack()} 
                        color="#EF4444"
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

// --- ESTILOS ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F0F7',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F0F0F7',
    },
    errorView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#F0F0F7',
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#EF4444',
        marginBottom: 10,
    },
    errorDetail: {
        fontSize: 16,
        color: '#4B5563',
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
        color: '#1F2937',
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 5,
        marginTop: 10,
    },
    input: {
        height: 50,
        backgroundColor: '#FFFFFF',
        borderColor: '#D1D5DB',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
        marginBottom: 15,
        color: '#1F2937',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
        paddingTop: 10,
    },
    studentInfoBox: {
        backgroundColor: '#D1E7FF',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        borderLeftWidth: 5,
        borderLeftColor: '#007AFF',
    },
    studentNameDisplay: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#007AFF',
        marginTop: 5,
    },
    exerciseListContainer: {
        marginTop: 10,
    },
    addButton: {
        backgroundColor: '#3B82F6', 
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 18,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    noExercisesWarning: {
        backgroundColor: '#FFFBEA',
        borderColor: '#FDBA74',
        borderWidth: 1,
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
        marginTop: 20,
    },
    warningText: {
        color: '#D97706',
        fontSize: 14,
        textAlign: 'center',
    },
    // Estilos del Selector Personalizado (Modal)
    selectorContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingTop: 40,
    },
    selectorTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        color: '#1F2937',
    },
    selectorList: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    selectorItem: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F7',
    },
    selectorItemName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#3B82F6',
    },
    selectorItemGroup: {
        fontSize: 14,
        color: '#4B5563',
    }
});

const exerciseStyles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        borderLeftWidth: 5,
        borderLeftColor: '#3B82F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
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
        color: '#1F2937',
    },
    deleteButton: {
        backgroundColor: '#EF4444',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
    selectButton: {
        backgroundColor: '#F9FAFB',
        borderColor: '#D1D5DB',
        borderWidth: 1,
        borderRadius: 6,
        padding: 15,
        marginBottom: 15,
    },
    selectButtonText: {
        color: '#1F2937',
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
        backgroundColor: '#F9FAFB',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 10,
        fontSize: 14,
        color: '#1F2937',
        width: '48%', 
    },
    smallInput: {
        width: '48%', 
        marginBottom: 10, 
    },
    warning: {
        fontSize: 14,
        color: '#F97316',
        textAlign: 'left',
        paddingVertical: 5,
    }
});