import React, { useState, useEffect, useContext } from 'react';
import { 
    StyleSheet, Text, View, TextInput, Button, SafeAreaView, 
    ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
// ?? Importar useRoute para acceder a los parametros de navegacion
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
    
    // ?? Funcion centralizada de cambio para Series/Repeticiones/Peso
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

            {/* BOToN/DISPLAY DEL EJERCICIO SELECCIONADO */}
            <TouchableOpacity 
                style={[exerciseStyles.selectButton, !exercise.exercise_id && {borderColor: '#EF4444'}]} 
                onPress={() => toggleSelector(index)} 
            >
                <Text style={[exerciseStyles.selectButtonText, !exercise.exercise_id && {color: '#EF4444'}]}>
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
            
            {/* ?? NUEVO: Input de Peso/Resistencia (Full Width) */}
            <TextInput
                style={[exerciseStyles.input, { width: '100%', marginBottom: 10 }]}
                placeholder="Peso/Resistencia (ej: 20 kg, N/A, Bandas)"
                placeholderTextColor="#A0A0A0"
                keyboardType="default" 
                value={exercise.peso}
                onChangeText={(text) => handleChange('peso', text)}
            />
        </View>
    );
};

// ----------------------------------------------------------------------
// Pantalla Principal de Creacion / Edicion
// ----------------------------------------------------------------------
export default function RoutineCreationScreen({ navigation }) {
    
    // ?? MODIFICADO: Capturar routineMetadata (Nombre Grupo, Dias, Fecha Vencimiento)
    const route = useRoute();
    const { studentId, studentName, routineId, routineMetadata } = route.params || {};
    
    const isEditMode = !!routineId; 
    
    // ?? ESTADOS PARA AGRUPACIoN Y FLUJO MULTI-DiA
    const totalDays = isEditMode ? 1 : (routineMetadata?.days || 1);
    const baseName = isEditMode ? '' : (routineMetadata?.nombre || 'Nueva Rutina');

    const [currentDay, setCurrentDay] = useState(1);
    
    // Almacena los datos de todas las N rutinas
    const [allRoutinesData, setAllRoutinesData] = useState(() => 
        isEditMode ? [] : Array.from({ length: totalDays }, (_, i) => ({
            day: i + 1,
            // ?? Nombre base + " - Dia X"
            name: `${baseName} - Dia ${i + 1}`,
            description: '', // Descripcion individual de la rutina
            exercises: [],
        }))
    );

    // Obtener la rutina actual para la UI
    const currentRoutine = allRoutinesData[currentDay - 1] || { exercises: [], name: '', description: '' };
    
    // --- ESTADOS DE EJERCICIOS Y UI ---
    const [availableExercises, setAvailableExercises] = useState([]); 
    const [isExerciseSelectorOpen, setIsExerciseSelectorOpen] = useState(false); 
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(null);

    // --- ESTADOS DE CARGA/ERRORES ---
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    
    const { getToken } = useContext(AuthContext);

    // ------------------------------------------------------------------
    // ?? FUNCIoN PARA ACTUALIZAR EL DATO DE LA RUTINA ACTUAL (nombre, descripcion, ejercicios)
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
    // FUNCIoN DE AYUDA PARA ACTUALIZAR UN EJERCICIO DENTRO DE LA RUTINA ACTUAL
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
            
            // 2. Si es MODO EDICIoN, cargar los datos de la rutina
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
                        // ?? NUEVO: Cargar el campo peso desde la API
                        peso: link.peso || 'N/A', 
                    }));
                
                // Cargar la rutina de edicion en la posicion 0
                setAllRoutinesData([{
                    day: 1,
                    name: routineData.nombre,
                    description: routineData.descripcion || '',
                    exercises: loadedExercises,
                }]);
                
                navigation.setOptions({ title: `Editar: ${routineData.nombre}` });

            } else {
                // Modo CREACIoN (multiples dias o 1 dia nuevo)
                navigation.setOptions({ title: `Creacion: ${baseName}` });
            }

        } catch (e) {
            console.error("Error cargando datos:", e.response ? e.response.data : e.message);
            setFetchError(`Error de conexion al cargar datos. ${isEditMode ? 'Rutina no encontrada.' : ''}`);
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
            // ?? NUEVO: Inicializar campo peso
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
                Alert.alert("Advertencia", "Este ejercicio ya esta en la rutina. Puedes editar sus series/repeticiones.");
            }
            
            updateExercise(currentExerciseIndex, 'exercise_id', exerciseId);
            updateExercise(currentExerciseIndex, 'name', exerciseName);
        }
        setIsExerciseSelectorOpen(false);
        setCurrentExerciseIndex(null);
    };
    
    // ------------------------------------------------------------------
    // ?? FUNCIoN DE VALIDACIoN COMPARTIDA
    // ------------------------------------------------------------------
    const validateCurrentRoutine = () => {
        if (!currentRoutine.name.trim()) {
            Alert.alert("Error", `El nombre de la rutina ${currentRoutine.name} no puede estar vacio.`);
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
            Alert.alert("Error de Validacion", `En "${currentRoutine.name}": Todos los ejercicios deben estar seleccionados y tener Series (entero positivo) y Repeticiones validas.`);
            return false;
        }
        return true;
    };
    
    // ------------------------------------------------------------------
    // ?? Logica de Guardado (Modo Creacion: Siguiente Dia o Transaccion Final)
    // ------------------------------------------------------------------
    const handleNextRoutineOrSaveAll = async () => {
        if (!validateCurrentRoutine()) return;

        if (currentDay < totalDays) {
            // Guardar temporalmente el dia actual e ir al siguiente
            setCurrentDay(currentDay + 1);
            Alert.alert("Rutina Guardada Temporalmente", `?Rutina "${currentRoutine.name}" completada! Editando el Dia ${currentDay + 1}.`, [{ text: "OK" }]);
        } else {
            // ultimo dia: Guardar la transaccion completa
            await handleSaveTransaction();
        }
    };

    // ------------------------------------------------------------------
    // ?? Guardado Transaccional (POST /routines-group/create-transactional)
    // ------------------------------------------------------------------
    const handleSaveTransaction = async () => {
        if (isSaving) return;
        setIsSaving(true);
        
        const expirationDate = routineMetadata?.expirationDate;

        // 1. Construir el payload completo para la API
        const payload = {
            nombre: baseName, // Nombre del Grupo (Bloque A)
            descripcion: routineMetadata?.descripcion || null, // Descripcion del Grupo
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
                    // ?? INCLUIR PESO EN EL PAYLOAD
                    peso: ex.peso.trim() || 'N/A', 
                    order: exIndex + 1
                }))
            }))
        };

        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            // ?? Llamada al nuevo endpoint transaccional
            await axios.post(`${API_URL}/routines-group/create-transactional`, payload, { headers });
            
            Alert.alert(
                "?Exito Total!", 
                `Se creo la agrupacion "${baseName}" con ${totalDays} rutinas y fue asignada a ${studentName}.`
            );
            
            navigation.goBack(); 
            
        } catch (e) {
            console.error("Error guardando transaccion (API):", e.message, JSON.stringify(e.response ? e.response.data : e.message)); 
            
            let errorMessage = "Fallo desconocido al guardar la transaccion.";
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
                    // ?? INCLUIR PESO EN EL PAYLOAD
                    peso: ex.peso.trim() || 'N/A', 
                    order: index + 1 
                }))
            };

            // MODO EDICIoN: PATCH /routines/{id}
            await axios.patch(`${API_URL}/routines/${routineId}`, routineData, { headers });
            
            Alert.alert("exito de Edicion", `Rutina "${currentRoutine.name.trim()}" actualizada exitosamente.`);
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
            
            Alert.alert("Error de Edicion", errorMessage);
        } finally {
            setIsSaving(false);
        }
    };
    
    // Determinar que funcion de guardado usar en el boton principal
    const handleMainSaveAction = isEditMode ? handleSaveSingleRoutine : handleNextRoutineOrSaveAll;
    
    // --- VISTAS DE ESTADO ---
    if (isLoading || (allRoutinesData.length === 0 && !isEditMode)) {
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
                      <Text style={styles.errorTitle}>Error de Conexion</Text>
                      <Text style={styles.errorDetail}>{fetchError}</Text>
                      <Button title="Reintentar Carga" onPress={fetchData} color="#FF9500" />
                  </View>
              </SafeAreaView>
          );
    }
    
    // --- VISTA DE SELECCIoN DE EJERCICIOS (MODAL) ---
    if (isExerciseSelectorOpen) {
        return (
            <SafeAreaView style={styles.selectorContainer}>
                <Text style={styles.selectorTitle}>Seleccionar Ejercicio</Text>
                <ScrollView contentContainerContainerStyle={styles.selectorList}>
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

    // --- VISTA PRINCIPAL DE CREACIoN / EDICIoN ---
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                style={{flex: 1}} 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    
                    {/* TiTULO DINaMICO */}
                    <Text style={styles.headerTitle}>
                        {isEditMode ? "Editar Rutina" : `Creacion de: ${baseName}`}
                    </Text>
                    
                    {/* ?? DISPLAY DE DiA ACTUAL/GRUPO */}
                    {!isEditMode && totalDays > 1 && (
                        <View style={[styles.studentInfoBox, {marginBottom: 15, backgroundColor: '#D1E7FF', borderLeftColor: '#3B82F6'}]}>
                            <Text style={styles.label}>Agrupacion: {baseName} (Vence: {routineMetadata?.expirationDate})</Text>
                            <Text style={[styles.studentNameDisplay, {color: '#3B82F6'}]}>
                                Dia {currentDay} de {totalDays}
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
                    <Text style={styles.label}>Nombre de la Rutina (Dia {currentDay}):</Text>
                    <TextInput
                        // ?? MODIFICACIoN CLAVE: Quitamos la restriccion de estilo y editable para multi-dias
                        style={styles.input} 
                        placeholder="e.g., Rutina Hipertrofia Dia A"
                        placeholderTextColor="#A0A0A0"
                        value={currentRoutine.name}
                        onChangeText={(text) => setRoutineData('name', text)}
                        editable={true} // Siempre editable en esta vista (a menos que sea modo edicion y necesite ser forzado a read-only, pero aqui queremos que sea editable)
                    />
                    
                    {/* INPUT DESCRIPCIoN */}
                    <Text style={styles.label}>Descripcion (Opcional):</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="e.g., Fase de volumen 4 semanas"
                        placeholderTextColor="#A0A0A0"
                        value={currentRoutine.description}
                        onChangeText={(text) => setRoutineData('description', text)}
                        multiline
                    />
                    
                    {availableExercises.length === 0 && (
                        <View style={styles.noExercisesWarning}>
                            <Text style={styles.warningText}>
                                ?? **Advertencia:** No hay ejercicios disponibles. 
                                ?Crea al menos uno en FastAPI para poder seleccionarlo!
                            </Text>
                        </View>
                    )}

                    <Text style={[styles.label, {marginTop: 20, fontSize: 18, color: '#3B82F6'}]}>
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
                            />
                        ))}
                    </View>

                    <TouchableOpacity onPress={addExercise} style={styles.addButton} disabled={fetchError || availableExercises.length === 0}>
                        <Text style={styles.addButtonText}>Agregar Ejercicio</Text>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>

            <View style={styles.footer}>
                <Button 
                    // ?? TEXTO DEL BOToN DINaMICO
                    title={isSaving ? "Procesando..." : (
                        isEditMode ? "GUARDAR CAMBIOS" : 
                        (currentDay < totalDays ? `SIGUIENTE RUTINA (Dia ${currentDay + 1})` : "GUARDAR Y ASIGNAR TODO")
                    )} 
                    onPress={handleMainSaveAction} 
                    // Validacion en modo creacion
                    disabled={isSaving || !currentRoutine.name.trim() || currentRoutine.exercises.length === 0 || (!isEditMode && !studentId)}
                    // ?? COLOR DEL BOToN DINaMICO
                    color={isEditMode ? "#FF9500" : (currentDay < totalDays ? "#3B82F6" : "#10B981")} 
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
    inputDisabled: { // ESTO YA NO SE USA EN EL NOMBRE DE RUTINA
        backgroundColor: '#E5E7EB',
        color: '#9CA3AF',
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