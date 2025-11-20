import React, { useState, useEffect, useContext } from 'react';
import { 
    StyleSheet, Text, View, TextInput, SafeAreaView, 
    ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import { AuthContext } from '../App'; 
import { useTheme } from '../ThemeContext'; 
import { Save, XCircle, PlusCircle, Trash2, Zap, ArrowLeft } from 'lucide-react-native'; // Añadimos ArrowLeft por si acaso

// ----------------------------------------------------------------------
// API Configuration (Must match App.js)
// ----------------------------------------------------------------------
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 

// ----------------------------------------------------------------------
// Dynamic Exercise Styles Generator
// ----------------------------------------------------------------------
const getExerciseStyles = (colors) => StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        borderLeftWidth: 5,
        borderLeftColor: colors.primary,
        elevation: 4,
        shadowColor: colors.isDark ? '#000' : '#444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: colors.isDark ? 0.3 : 0.1,
        shadowRadius: 3,
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
        color: colors.textPrimary,
        opacity: 0.7,
    },
    deleteButton: {
        padding: 5,
    },
    selectButton: {
        backgroundColor: colors.highlight,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    selectButtonText: {
        color: colors.textPrimary, 
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
        color: colors.textSecondary,
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
        backgroundColor: colors.background,
        borderColor: colors.divider, 
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 5,
        fontSize: 14,
        color: colors.textPrimary,
        textAlign: 'center',
        width: '100%',
    },
});

// ----------------------------------------------------------------------
// Exercise Item Component
// ----------------------------------------------------------------------
const ExerciseItem = ({ index, exercise, updateExercise, removeExercise, toggleSelector, themeColors }) => {
    
    const exerciseStyles = getExerciseStyles(themeColors);

    const handleChange = (field, value) => {
        updateExercise(index, field, value);
    };

    const placeholderColor = themeColors.isDark ? themeColors.textSecondary : '#A0A0A0';
    // Determina el color del botón de selección (rojo si no hay exercise_id)
    const buttonColor = exercise.exercise_id ? themeColors.primary : themeColors.danger;
    const buttonBgColor = exercise.exercise_id ? themeColors.highlight : (themeColors.isDark ? '#2D2D2D' : '#FEECEC');


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
                    // Si no está seleccionado, forzamos un borde y fondo de advertencia.
                    !exercise.exercise_id && {borderColor: themeColors.danger, backgroundColor: buttonBgColor},
                ]} 
                onPress={() => toggleSelector(index)} 
            >
                {/* Usamos el color determinado */}
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
        </View>
    );
};

// ----------------------------------------------------------------------
// Dynamic Screen Styles Generator
// ----------------------------------------------------------------------
const getStyles = (colors) => StyleSheet.create({
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
    content: {
        padding: 20,
        paddingBottom: 100, // Space for FAB
    },
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
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        justifyContent: 'center',
        width: '48%', 
    },
    actionButtonText: {
        color: colors.card,
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 14,
    },
    // Estilo para el botón de Agregar dentro del modal
    selectorActionButton: { 
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.success, // Usamos success para el botón de adición
        borderRadius: 8,
        paddingVertical: 10,
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 15,
    },
    cancelButton: {
        backgroundColor: colors.danger,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 5,
        marginTop: 15,
    },
    input: {
        height: 50,
        backgroundColor: colors.highlight, 
        borderColor: colors.divider,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
        marginBottom: 15,
        color: colors.textPrimary,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
        paddingTop: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginTop: 25,
        marginBottom: 15,
    },
    floatingButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: colors.success,
        padding: 15,
        borderRadius: 50,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 6,
        shadowColor: colors.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    floatingButtonText: {
        color: colors.card,
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 16,
    },
    selectorContainer: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'android' ? 40 : 0, 
    },
    selectorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        backgroundColor: colors.card,
    },
    selectorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
        flex: 1, 
        textAlign: 'center',
    },
    selectorSearchInput: {
        height: 45,
        backgroundColor: colors.highlight,
        borderColor: colors.divider,
        borderWidth: 1,
        borderRadius: 25,
        paddingHorizontal: 20,
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 15,
        fontSize: 16,
        color: colors.textPrimary,
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
    },
    selectorItemName: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.textPrimary,
        flexShrink: 1, 
    },
    selectorItemGroup: {
        fontSize: 14,
        color: colors.textSecondary,
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
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    screenTitle: {
        fontSize: 18, 
        fontWeight: 'bold',
        color: colors.textPrimary, 
        textAlign: 'center',
    },
});

// ----------------------------------------------------------------------
// Main Routine EDIT Screen
// ----------------------------------------------------------------------
export default function RoutineEditScreen({ navigation }) {
    
    const { colors: themeColors } = useTheme();
    const styles = getStyles(themeColors);

    // Route parameters: ONLY routineId is required here
    const route = useRoute();
    const { routineId } = route.params || {};
    
    // In this dedicated screen, isEditMode is ALWAYS TRUE
    const isEditMode = true; 
    
    const [routine, setRoutine] = useState({ name: '', description: '', exercises: [] });
    
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
    
    const updateRoutineData = (field, value) => {
        setRoutine(prev => ({ ...prev, [field]: value }));
    };

    const updateExercise = (index, field, value) => {
        setRoutine(prev => {
            const currentExercises = [...prev.exercises];
            
            if (currentExercises[index]) {
                currentExercises[index] = { ...currentExercises[index], [field]: value };
            }
            
            return { ...prev, exercises: currentExercises };
        });
    };
    
    const fetchData = async () => {
        if (!routineId) {
            setFetchError("Error: ID de rutina no proporcionado para edición.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setFetchError(null);
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };
            
            // 1. Load ALL available Exercises
            const exercisesResponse = await axios.get(`${API_URL}/exercises/`, { headers });
            setAvailableExercises(exercisesResponse.data);
            
            // 2. Load Routine Data 
            const routineResponse = await axios.get(`${API_URL}/routines/${routineId}`, { headers });
            const routineData = routineResponse.data;

            const loadedExercises = routineData.exercise_links
                .sort((a, b) => a.order - b.order) 
                .map(link => ({
                    exercise_id: link.exercise_id, 
                    name: link.exercise?.nombre || 'Ejercicio Desconocido',
                    // CORRECCIÓN CLAVE: Aseguramos que los valores sean string o cadena vacía, NO "null" literal.
                    series: String(link.sets || ''), 
                    repetitions: String(link.repetitions || ''), 
                    peso: link.peso || '', 
                }));
            
            // Set single routine data
            setRoutine({
                name: routineData.nombre,
                description: routineData.descripcion || '', // Handle null/undefined description
                exercises: loadedExercises,
            });
            
        } catch (e) {
            console.error("Error loading data:", e.response ? e.response.data : e.message);
            setFetchError(`Error de conexión al cargar datos. Rutina con ID ${routineId} no encontrada.`); 
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Remove native back button
        navigation.setOptions({ headerLeft: () => null });
    }, [routineId]); 

    // Exercise management
    const addExercise = () => {
        const newExercises = [...routine.exercises, { 
            exercise_id: null, 
            name: '', 
            series: '', 
            repetitions: '', 
            peso: '', 
        }];
        updateRoutineData('exercises', newExercises);
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
                        const newExercises = routine.exercises.filter((_, i) => i !== index);
                        updateRoutineData('exercises', newExercises);
                    }
                }
            ]
        );
    };
    
    // Exercise Selector Modal Logic
    const toggleExerciseSelector = (index) => {
        setCurrentExerciseIndex(index);
        setIsExerciseSelectorOpen(true);
    };
    
    const handleSelectExercise = (exerciseId, exerciseName) => {
        if (currentExerciseIndex !== null) {
            const isDuplicate = routine.exercises.some((ex, i) => i !== currentExerciseIndex && ex.exercise_id === exerciseId);
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

    // 🚨 NUEVO HANDLER: Navegar a la pantalla de adición de ejercicios
    const handleNavigateToAddExercise = () => {
        setIsExerciseSelectorOpen(false); 
        navigation.navigate('ExercisesAdd'); 
    };
    
    // ------------------------------------------------------------------
    // Validation and Save Logic 
    // ------------------------------------------------------------------
    const validateCurrentRoutine = () => {
        if (!routine.name.trim()) {
            Alert.alert("Error", `El nombre de la rutina no puede estar vacío.`); 
            return false;
        }
        
        if (routine.exercises.length === 0) {
            Alert.alert("Error", `La rutina "${routine.name}" debe tener al menos un ejercicio.`);
            return false;
        }
        
        const invalidExercise = routine.exercises.find(ex => {
            // 1. Exercise must be selected
            if (!ex.exercise_id) return true;
            
            // 2. Series validation: must be a positive integer
            const seriesTrimmed = ex.series ? ex.series.trim() : '';
            const seriesNumber = parseInt(seriesTrimmed);
            
            if (isNaN(seriesNumber) || seriesNumber <= 0) return true;

            // 3. Repetitions validation: must be non-empty string
            const repetitionsTrimmed = ex.repetitions ? ex.repetitions.trim() : '';
            if (repetitionsTrimmed.length === 0) return true; 

            // All checks passed
            return false;
        });

        if (invalidExercise) {
            Alert.alert("Error de Validación", `En "${routine.name}": Todos los ejercicios deben estar seleccionados y tener Series (entero positivo) y Repeticiones no vacías.`); 
            return false;
        }
        return true;
    };
    
    const handleSaveSingleRoutine = async () => {
        if (!validateCurrentRoutine()) return;

        setIsSaving(true);
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };
            
            const routineData = {
                nombre: routine.name.trim(),
                descripcion: routine.description.trim() || '', 
                exercises: routine.exercises.map((ex, index) => ({ 
                    exercise_id: ex.exercise_id, 
                    sets: parseInt(ex.series.trim()),
                    repetitions: ex.repetitions.trim(), 
                    peso: ex.peso.trim() || 'N/A', 
                    order: index + 1 
                }))
            };

            await axios.patch(`${API_URL}/routines/${routineId}`, routineData, { headers });
            
            Alert.alert("Éxito de Edición", `Rutina "${routine.name.trim()}" actualizada exitosamente.`); 
            navigation.goBack(); 
            
        } catch (e) {
            console.error("Error saving routine (API):", e.message, JSON.stringify(e.response ? e.response.data : e.message)); 
            
            let errorMessage = "Fallo desconocido al guardar la rutina.";
             if (e.response && e.response.data && e.response.data.detail) {
                if (Array.isArray(e.response.data.detail) || typeof e.response.data.detail === 'string') {
                    errorMessage = `Error de FastAPI: ${JSON.stringify(e.response.data.detail)}`;
                }
            } else if (e.message === "Network Error") {
                 errorMessage = "Error de red: No se pudo conectar al servidor API.";
            }

            Alert.alert("Error de Edición", errorMessage); 
        } finally {
            setIsSaving(false);
        }
    };
    
    const filteredExercises = availableExercises.filter(ex => 
        ex.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (ex.grupo_muscular && ex.grupo_muscular.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // UI Status Views
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={themeColors.primary} />
                <Text style={{marginTop: 10, color: themeColors.textSecondary}}>Cargando datos de edición...</Text>
            </View>
        );
    }

    if (fetchError) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{color: themeColors.danger, textAlign: 'center', margin: 20}}>
                    {fetchError}
                </Text>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()}
                    style={[styles.actionButton, styles.cancelButton, {backgroundColor: themeColors.primary, width: 150}]}
                >
                    <Text style={styles.actionButtonText}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }
    
    const placeholderColor = themeColors.isDark ? themeColors.textSecondary : '#A0A0A0';

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
                    placeholderTextColor={themeColors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
               
                {/* 🚨 BOTÓN AGREGAR NUEVO EJERCICIO (Igual que en RoutineCreationScreen) */}
                <TouchableOpacity 
                    onPress={handleNavigateToAddExercise} 
                    style={[styles.selectorActionButton, { backgroundColor: themeColors.success}]}
                    disabled={isSaving}
                >
                    <PlusCircle size={18} color={themeColors.card} />
                    <Text style={styles.actionButtonText}>Agregar Nuevo Ejercicio al Catálogo</Text>
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
                    Editar Rutina: {routine.name}
                </Text>
            </View>
            
            {/* Top Action Bar (Guardar/Cancelar) */}
            <View style={styles.subHeader}>
                {/* BOTÓN CANCELAR (Única forma de salir) */}
                <TouchableOpacity 
                    onPress={() => navigation.goBack()}
                    style={[styles.actionButton, styles.cancelButton]}
                    disabled={isSaving}
                >
                    <XCircle size={18} color={themeColors.card} />
                    <Text style={styles.actionButtonText}>Cancelar</Text>
                </TouchableOpacity>

                {/* BOTÓN GUARDAR CAMBIOS */}
                <TouchableOpacity 
                    onPress={handleSaveSingleRoutine}
                    style={[styles.actionButton, {backgroundColor: themeColors.warning}]}
                    disabled={isSaving || !routine.name.trim() || routine.exercises.length === 0}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color={themeColors.card} />
                    ) : (
                        <Save size={18} color={themeColors.card} />
                    )}
                    <Text style={styles.actionButtonText}>
                        {isSaving ? "Guardando..." : "Guardar Cambios"}
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
                    <Text style={styles.label}>Nombre de la Rutina:</Text>
                    <TextInput
                        style={styles.input} 
                        placeholder="Ej: Rutina Hipertrofia Día A"
                        placeholderTextColor={placeholderColor}
                        value={routine.name}
                        onChangeText={(text) => updateRoutineData('name', text)}
                        editable={!isSaving}
                    />
                    
                    {/* Description Input */}
                    <Text style={styles.label}>Descripción (Opcional):</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Ej: Fase de volumen 4 semanas"
                        placeholderTextColor={placeholderColor}
                        value={routine.description}
                        onChangeText={(text) => updateRoutineData('description', text)}
                        multiline
                        editable={!isSaving}
                    />
                    
                    {/* Exercise List Section */}
                    <Text style={styles.sectionTitle}>
                        Ejercicios ({routine.exercises.length}):
                    </Text>

                    <View>
                        {routine.exercises.map((exercise, index) => (
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

            {/* FAB: Floating Action Button to Add Exercise */}
            <TouchableOpacity 
                onPress={addExercise} 
                style={styles.floatingButton} 
                disabled={isSaving || fetchError || availableExercises.length === 0}
            >
                <PlusCircle size={24} color={themeColors.card} />
                <Text style={styles.floatingButtonText}>Añadir Ejercicio</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}