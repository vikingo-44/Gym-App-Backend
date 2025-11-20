import React, { useState, useContext } from 'react';
import { 
    View, Text, TextInput, StyleSheet, Alert, ScrollView, 
    SafeAreaView, TouchableOpacity, ActivityIndicator, Platform 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { ArrowLeft, Save } from 'lucide-react-native';
import axios from 'axios'; // <--- ¡LÍNEA FALTANTE CRÍTICA!

// IMPORTACIONES CRÍTICAS:
import { AuthContext } from '../App'; // Ruta al contexto de autenticación
import { useTheme } from '../ThemeContext'; // Usamos el hook de tema para los colores

// ----------------------------------------------------------------------
// Configuración
// ----------------------------------------------------------------------
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 

// Asegúrate de que esta lista de grupos musculares coincida con el Enum en tu FastAPI
const MUSCLE_GROUPS = [
    { label: 'Seleccionar Grupo', value: '' },
    { label: 'Pectoral', value: 'Pectoral' },
    { label: 'Espalda', value: 'Espalda' },
    { label: 'Piernas', value: 'Piernas' },
    { label: 'Hombro', value: 'Hombro' },
    { label: 'Brazos', value: 'Brazos' },
    { label: 'Abdomen', value: 'Abdomen' },
    { label: 'Gluteos', value: 'Gluteos' },
    { label: 'Cardio', value: 'Cardio' },
];

// ----------------------------------------------------------------------
// GENERADOR DE ESTILOS DINÁMICOS - ESTILO PEAKFIT
// ----------------------------------------------------------------------
const getStyles = (colors) => StyleSheet.create({
    fullContainer: {
        flex: 1,
        backgroundColor: 'black', // 🚨 PEAKFIT: Fondo Negro
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        backgroundColor: 'black', // 🚨 PEAKFIT: Encabezado Negro
        borderBottomWidth: 1,
        borderBottomColor: colors.divider, // Separador sutil
        paddingTop: Platform.OS === 'android' ? 40 : 15, 
    },
    backButton: {
        padding: 5,
    },
    container: {
        padding: 20,
    },
    card: {
        backgroundColor: '#1C1C1E', // 🚨 PEAKFIT: Fondo de tarjeta/Formulario Oscuro
        borderRadius: 10,
        padding: 20, // Aumentar padding para un look más premium
        shadowColor: '#000', // Sombra oscura
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.8, // Sombra más pronunciada
        shadowRadius: 5,
        elevation: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white', // 🚨 PEAKFIT: Texto Blanco
        flex: 1,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        color: 'white', // 🚨 PEAKFIT: Texto Blanco
        fontWeight: '600',
        marginTop: 15,
        marginBottom: 8, // Aumentar margen
    },
    input: {
        // Unificamos el estilo de input para el look PEAKFIT
        backgroundColor: '#1C1C1E', // Mismo color que la tarjeta para un look flotante minimalista
        borderRadius: 10,
        padding: 12, // Aumentar padding
        fontSize: 16,
        color: 'white', // 🚨 PEAKFIT: Texto Blanco
        borderWidth: 1,
        borderColor: colors.divider, // Borde sutil
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        backgroundColor: '#1C1C1E', // 🚨 PEAKFIT: Fondo oscuro
        borderRadius: 10, // Redondeado
        borderWidth: 1,
        borderColor: colors.divider,
        overflow: 'hidden',
        marginBottom: 10,
    },
    picker: {
        width: '100%',
        color: 'white', // 🚨 PEAKFIT: Texto Blanco
    },
    saveButton: {
        backgroundColor: '#3ABFBC', // 🚨 PEAKFIT: Verde Brillante
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 30, // Aumentar margen
        // Sombra de botón PEAKFIT
        shadowColor: '#3ABFBC',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
        elevation: 6,
    },
    saveButtonText: {
        color: 'black', // 🚨 PEAKFIT: Texto Negro en botón verde
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    disabledButton: {
        backgroundColor: colors.divider,
        opacity: 0.6,
        shadowColor: 'transparent',
    }
});
// ----------------------------------------------------------------------

const ExercisesAdd = () => {
    const navigation = useNavigation();
    // 🚨 OBTENEMOS LOS COLORES DEL TEMA
    const { colors: themeColors } = useTheme(); 
    const styles = getStyles(themeColors); // Generamos estilos

    // Usamos el contexto de Auth
    const { getToken } = useContext(AuthContext); 
    
    // Estado del formulario
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [grupoMuscular, setGrupoMuscular] = useState('');
    const [loading, setLoading] = useState(false);

    // Color del placeholder dinámico PEAKFIT
    const placeholderColor = '#A9A9A9'; // Gris claro


    // Función para manejar la creación del ejercicio
    const handleAddExercise = async () => {
        if (!nombre.trim() || !grupoMuscular.trim()) {
            Alert.alert('Error', 'El Nombre y el Grupo Muscular son obligatorios.');
            return;
        }

        setLoading(true);
        const token = await getToken();

        const exerciseData = [
            {
                nombre: nombre.trim(),
                descripcion: descripcion.trim() || 'Sin descripción.',
                grupo_muscular: grupoMuscular, 
            }
        ];

        try {
            // Usamos axios para manejar mejor los errores
            const response = await axios.post(`${API_URL}/exercises/`, exerciseData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                }
            });

            setLoading(false);
            
            Alert.alert('Éxito', `Ejercicio "${response.data[0].nombre}" creado correctamente!`);
            
            // Volver a RoutineCreationScreen y RECARGAR la lista de ejercicios disponibles
            navigation.goBack(); 
            

        } catch (error) {
            setLoading(false);
            const detail = error.response?.data?.detail || error.message || 'Fallo en la conexión o la API.';
            Alert.alert('Error al crear ejercicio', detail);
            console.error('Error al agregar ejercicio:', error.response?.data || error);
        }
    };

    return (
        <SafeAreaView style={styles.fullContainer}>
            {/* Encabezado */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} disabled={loading}>
                    <ArrowLeft size={24} color={'white'} />
                </TouchableOpacity>
                <Text style={styles.title}>Crear Nuevo Ejercicio</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.card}>
                    
                    {/* Nombre del Ejercicio */}
                    <Text style={styles.label}>Nombre:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej: Hip Thrust con Barra"
                        placeholderTextColor={placeholderColor}
                        value={nombre}
                        onChangeText={setNombre}
                        editable={!loading}
                    />

                    {/* Descripción (Opcional) */}
                    <Text style={styles.label}>Descripción (Opcional):</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Ej: Desarrollo del glúteo mayor."
                        placeholderTextColor={placeholderColor}
                        value={descripcion}
                        onChangeText={setDescripcion}
                        multiline
                        numberOfLines={4}
                        editable={!loading}
                    />

                    {/* Selector de Grupo Muscular */}
                    <Text style={styles.label}>Grupo Muscular:</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={grupoMuscular}
                            onValueChange={(itemValue) => setGrupoMuscular(itemValue)}
                            style={styles.picker}
                            enabled={!loading}
                        >
                            {MUSCLE_GROUPS.map((group) => (
                                <Picker.Item 
                                    key={group.value} 
                                    label={group.label} 
                                    value={group.value} 
                                    // Aseguramos que el texto del Picker se vea bien
                                    // Usamos blanco si tiene valor, gris claro si es el placeholder (valor vacío)
                                    color={group.value === '' ? placeholderColor : 'white'}
                                />
                            ))}
                        </Picker>
                    </View>

                    {/* Botón de Guardar */}
                    <TouchableOpacity
                        onPress={handleAddExercise}
                        disabled={loading || !nombre.trim() || !grupoMuscular.trim()}
                        style={[styles.saveButton, (loading || !nombre.trim() || !grupoMuscular.trim()) && styles.disabledButton]}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={'black'} />
                        ) : (
                            <Save size={20} color={'black'} />
                        )}
                        <Text style={styles.saveButtonText}>{loading ? 'Creando...' : 'Crear Ejercicio'}</Text>
                    </TouchableOpacity>

                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default ExercisesAdd;