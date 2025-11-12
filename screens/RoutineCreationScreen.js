import React, { useState, useEffect, useContext } from 'react';
import { 
    StyleSheet, Text, View, TextInput, Button, SafeAreaView, 
    ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
    // Importamos un componente básico para el selector de días
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
// Componente para un solo ejercicio
// (Se mantiene intacto, pero ahora maneja el ejercicio del día actual)
// ----------------------------------------------------------------------
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
    // 🚨 AÑADIDO: Estilos para el Selector de Días (Step 5)
    daySelectorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: colors.card,
        borderRadius: 10,
        padding: 10,
        elevation: 1,
    },
    dayButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 6,
        backgroundColor: colors.divider,
    },
    dayButtonActive: {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    dayButtonText: {
        color: colors.textPrimary,
        fontWeight: 'bold',
    },
    dayButtonTextActive: {
        color: colors.card,
    },
    // 🚨 AÑADIDO: Estilos para el campo de Fecha de Fin (Step 6)
    dateInput: {
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
    // Estilos existentes...
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
        marginBottom: 5, // Reducido para meter el subtítulo
        textAlign: 'center',
    },
    headerSubtitle: { // 🚨 AÑADIDO
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: 20,
        textAlign: 'center',
        fontStyle: 'italic',
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
    
    // 🚨 1. OBTENER PARÁMETROS: Incluir los metadatos del wizard
    const route = useRoute();
    const { 
        studentId, studentName, routineId, 
        routineMetadata // 🚨 NUEVO: Recibe { nombre, descripcion, days } desde el Wizard
    } = route.params || {};
    
    const isEditMode = !!routineId; // Bandera para saber si estamos editando
    
    // --- ESTADOS DE LA RUTINA ---
    const [routineName, setRoutineName] = useState(routineMetadata?.nombre || '');
    const [routineDescription, setRoutineDescription] = useState(routineMetadata?.descripcion || '');
    
    // 🚨 ESTADO CLAVE: Ejercicios por Día (array de arrays)
    // Inicializado: [[ej1, ej2], [ej1, ej2], ...]
    const daysFromMetadata = routineMetadata?.days || 1;
    const initialExercises = isEditMode ? [] : Array(daysFromMetadata).fill(0).map(() => []);

    const [exercisesPerDay, setExercisesPerDay] = useState(initialExercises);
    
    // --- ESTADOS DEL FLUJO DE DÍAS (Step 5) y FECHA (Step 6) ---
    const [daysCount, setDaysCount] = useState(daysFromMetadata);
    const [currentDayIndex, setCurrentDayIndex] = useState(0); // 0-indexed
    const [routineEndDate, setRoutineEndDate] = useState(''); // 🚨 NUEVO: Fecha de fin de la rutina (Step 6)
    
    // Acceso rápido a los ejercicios del día actual
    const exercises = exercisesPerDay[currentDayIndex] || [];
    
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
                // 🚨 Asumo que en el backend no se guarda la separación por días, solo el orden.
                // Aquí deberías tener lógica para reconstruir los días si fuera necesario.
                // Para simplificar, en modo edición, se mantiene el flujo original (un solo día)
                const loadedExercises = routineData.exercise_links
                    .sort((a, b) => a.order - b.order) 
                    .map(link => ({
                        exercise_id: link.exercise_id, 
                        name: link.exercise?.nombre || 'Ejercicio Desconocido',
                        series: String(link.sets || ''), 
                        repetitions: String(link.repetitions || ''), 
                        order: link.order
                    }));
                
                // Si es edición, volvemos a un solo día para simplificar la compatibilidad con el backend actual
                setExercisesPerDay([loadedExercises]);
                setDaysCount(1);
                setCurrentDayIndex(0);
                
                // 🚨 Si tu API guardara la fecha de fin: setRoutineEndDate(routineData.end_date || '');

                navigation.setOptions({ title: `Editar: ${routineData.nombre}` });
            } else {
                // Si es modo CREACIÓN desde el Wizard, ya tenemos nombre y descripción, solo ajustamos título
                const title = studentName ? `Crear para ${studentName.split(' ')[0]}` : `Crear Rutina Maestra`;
                navigation.setOptions({ title });
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

    // --- Lógica de Manejo de Ejercicios por Día (Step 5) ---
    const addExercise = () => {
        const newExercisesPerDay = [...exercisesPerDay];
        newExercisesPerDay[currentDayIndex] = [
            ...(newExercisesPerDay[currentDayIndex] || []), 
            { exercise_id: null, name: '', series: '', repetitions: '' }
        ];
        setExercisesPerDay(newExercisesPerDay);
    };

    const updateExercise = (index, field, value) => {
        const newExercisesPerDay = [...exercisesPerDay];
        const dayExercises = [...(newExercisesPerDay[currentDayIndex] || [])];
        dayExercises[index][field] = value;
        newExercisesPerDay[currentDayIndex] = dayExercises;
        setExercisesPerDay(newExercisesPerDay);
    };

    const removeExercise = (index) => {
        const newExercisesPerDay = [...exercisesPerDay];
        const dayExercises = (newExercisesPerDay[currentDayIndex] || []).filter((_, i) => i !== index);
        newExercisesPerDay[currentDayIndex] = dayExercises;
        setExercisesPerDay(newExercisesPerDay);
    };
    
    // --- Lógica de la Lista Desplegable de Ejercicios ---
    const toggleExerciseSelector = (index) => {
        setCurrentExerciseIndex(index);
        setIsExerciseSelectorOpen(true);
    };
    
    const handleSelectExercise = (exerciseId, exerciseName) => {
        if (currentExerciseIndex !== null) {
            // Revisa si el ejercicio ya fue agregado en ESTE DÍA.
            const dayExercises = exercisesPerDay[currentDayIndex] || [];
            const isDuplicate = dayExercises.some((ex, i) => i !== currentExerciseIndex && ex.exercise_id === exerciseId);
            
            if (isDuplicate) {
                Alert.alert("Advertencia", `Este ejercicio ya está en la rutina del Día ${currentDayIndex + 1}.`);
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
        const finalRoutineName = routineName.trim();
        if (!finalRoutineName) {
            Alert.alert("Error", "Debes ingresar un nombre de rutina.");
            return;
        }

        // 🚨 Validar que todos los días tengan AL MENOS un ejercicio
        const totalExercises = exercisesPerDay.flat();
        if (totalExercises.length === 0) {
            Alert.alert("Error", "La rutina debe contener al menos un ejercicio en total.");
            return;
        }
        
        // Validar ejercicios y series/repeticiones
        const invalidExercise = totalExercises.find(ex => 
            !ex.exercise_id || 
            !ex.series.trim() || !ex.repetitions.trim() || 
            isNaN(parseInt(ex.series)) || parseInt(ex.series) <= 0
        );

        if (invalidExercise) {
            Alert.alert("Error de Validación", "Todos los ejercicios deben estar seleccionados y tener Series (número entero positivo) y Repeticiones válidas.");
            return;
        }

        setIsSaving(true);
        
        // 🚨 2. Preparar el JSON para la API: Combinar todos los días en una sola lista y reordenar
        let overallOrder = 0;
        const allExercises = exercisesPerDay.flatMap((dayExercises, dayIndex) => 
            dayExercises.map(ex => {
                overallOrder++;
                return {
                    exercise_id: ex.exercise_id, 
                    sets: parseInt(ex.series), // Convertir a int
                    repetitions: ex.repetitions.trim(), 
                    // Usamos el order general. Si el backend necesitara el día, se añadiría aquí.
                    order: overallOrder 
                };
            })
        );
        
        // 🔑 Formato del JSON para la API (RoutineCreate)
        const finalRoutineData = {
            nombre: finalRoutineName,
            descripcion: routineDescription.trim() || null,
            exercises: allExercises,
            // 🚨 Aquí se debe enviar la Fecha de Fin si el backend la soporta (se requiere campo en FastAPI/DB)
            // end_date: routineEndDate.trim() || null, 
        };


        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };
            
            let successMessage = "";

            if (isEditMode) {
                // MODO EDICIÓN: PATCH /routines/{id}
                await axios.patch(`${API_URL}/routines/${routineId}`, finalRoutineData, { headers });
                successMessage = `Rutina "${finalRoutineName}" actualizada exitosamente.`;
                
            } else {
                // MODO CREACIÓN: POST /routines/ y luego POST /assignments/
                
                // 1. POST /routines/ (Crear la plantilla)
                const routineResponse = await axios.post(`${API_URL}/routines/`, finalRoutineData, { headers });
                const newRoutineId = routineResponse.data.id;
                
                // 2. Si se seleccionó un alumno al iniciar, ASIGNAR la rutina
                if (studentId) {
                    const assignmentData = {
                        routine_id: newRoutineId,
                        student_id: studentId,
                        is_active: true
                    };

                    await axios.post(`${API_URL}/assignments/`, assignmentData, { headers });
                    successMessage = `Rutina "${finalRoutineName}" creada y asignada a ${studentName} correctamente.`;
                } else {
                    successMessage = `Rutina Maestra "${finalRoutineName}" creada exitosamente.`;
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

    // --- VISTA PRINCIPAL DE CREACIÓN (Steps 5 & 6) ---
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                style={{flex: 1}} 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.headerTitle}>{routineName || (isEditMode ? "✍️ Editar Rutina" : "🛠️ Nueva Rutina")}</Text>
                    {/* 🚨 DISPLAY DE AGRUPACIÓN (Step 2/3) */}
                    {!!routineDescription && (
                        <Text style={styles.headerSubtitle}>
                            Objetivo: {routineDescription} | {studentName ? `Para: ${studentName}` : 'Maestra'}
                        </Text>
                    )}
                    
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
                    
                    {/* INPUT NOMBRE RUTINA (Mantenido aunque se rellene desde el wizard) */}
                    <Text style={styles.label}>Nombre de la Rutina:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Rutina Full Body"
                        placeholderTextColor={themeColors.textSecondary}
                        value={routineName}
                        onChangeText={setRoutineName}
                    />
                    
                    {/* INPUT DESCRIPCIÓN (Mantenido aunque se rellene desde el wizard) */}
                    <Text style={styles.label}>Descripción (Opcional):</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="e.g., Fase de volumen 4 semanas"
                        placeholderTextColor={themeColors.textSecondary}
                        value={routineDescription}
                        onChangeText={setRoutineDescription}
                        multiline
                    />
                    
                    {/* -------------------- STEP 5: SELECCIÓN DE DÍA Y EJERCICIOS -------------------- */}
                    <Text style={[styles.label, {marginTop: 20, fontSize: 18, color: themeColors.primary, borderBottomWidth: 1, borderBottomColor: themeColors.divider, paddingBottom: 5}]}>
                        Planificación por Días ({daysCount} Días):
                    </Text>

                    {/* Selector de Días */}
                    <View style={styles.daySelectorContainer}>
                        {[...Array(daysCount)].map((_, dayIndex) => (
                            <TouchableOpacity
                                key={dayIndex}
                                style={[
                                    styles.dayButton, 
                                    currentDayIndex === dayIndex && styles.dayButtonActive
                                ]}
                                onPress={() => setCurrentDayIndex(dayIndex)}
                            >
                                <Text style={[
                                    styles.dayButtonText, 
                                    currentDayIndex === dayIndex && styles.dayButtonTextActive
                                ]}>
                                    Día {dayIndex + 1}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    
                    {/* Lista de Ejercicios para el Día Actual */}
                    {availableExercises.length === 0 && (
                        <View style={styles.noExercisesWarning}>
                            <Text style={styles.warningText}>
                                ⚠️ **Advertencia:** No hay ejercicios disponibles. 
                                ¡Crea al menos uno en FastAPI para poder seleccionarlo!
                            </Text>
                        </View>
                    )}

                    <Text style={[styles.label, {marginTop: 10}]}>
                        Ejercicios del Día {currentDayIndex + 1} ({exercises.length}):
                    </Text>

                    <View style={styles.exerciseListContainer}>
                        {exercises.map((exercise, index) => (
                            <ExerciseItem 
                                key={`${currentDayIndex}-${index}`} // Clave única por día e índice
                                index={index}
                                exercise={exercise}
                                updateExercise={updateExercise}
                                removeExercise={removeExercise}
                                toggleSelector={toggleExerciseSelector}
                            />
                        ))}
                    </View>

                    <TouchableOpacity onPress={addExercise} style={styles.addButton} disabled={fetchError || availableExercises.length === 0}>
                        <Text style={styles.addButtonText}>➕ Agregar Ejercicio al Día {currentDayIndex + 1}</Text>
                    </TouchableOpacity>
                    {/* -------------------- FIN STEP 5 -------------------- */}
                    
                    {/* -------------------- STEP 6: FECHA DE FIN -------------------- */}
                    <Text style={[styles.label, {marginTop: 30}]}>Fecha de Fin de la Rutina (dd/mm/aaaa):</Text>
                    <TextInput
                        style={styles.dateInput}
                        placeholder="Opcional. Ej: 31/12/2025"
                        placeholderTextColor={themeColors.textSecondary}
                        value={routineEndDate}
                        onChangeText={setRoutineEndDate}
                        keyboardType="default" // Usar default, pero puedes usar 'numbers-and-punctuation' si tu formato es fijo
                    />
                    {/* -------------------- FIN STEP 6 -------------------- */}

                </ScrollView>
            </KeyboardAvoidingView>

            <View style={styles.footer}>
                <Button 
                    title={isSaving ? "Guardando..." : (isEditMode ? "GUARDAR CAMBIOS" : (studentId ? "GUARDAR Y ASIGNAR" : "GUARDAR MAESTRA"))} 
                    onPress={handleSaveRoutine} 
                    disabled={isSaving || !routineName.trim() || totalExercises.length === 0}
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

// ----------------------------------------------------------------------
// Generador de Estilos Dinámicos (Ejercicios) - Mantenido al final
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