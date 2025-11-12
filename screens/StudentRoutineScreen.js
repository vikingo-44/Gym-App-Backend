import React, { useState, useEffect, useContext } from 'react';
import { 
    StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, 
    ActivityIndicator, Button 
} from 'react-native';
import axios from 'axios';
// Asegúrate de que estas importaciones están disponibles
import { RefreshCcw, LogOut } from 'lucide-react-native'; 

// NOTA: Reemplaza con tu URL de Ngrok
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 

// --- PANTALLA DE RUTINA (ALUMNO) ---
function StudentRoutineScreen() {
    const [activeAssignments, setActiveAssignments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Asumimos que AuthContext proporciona signOut y getToken
    const { signOut, getToken } = useContext(AuthContext);

    const fetchRoutine = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getToken();
            if (!token) {
                signOut();
                return;
            }

            const response = await axios.get(`${API_URL}/students/me/routine`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const assignments = response.data; 

            if (assignments && assignments.length > 0) {
                // Filtro extra en caso de que existan asignaciones con routine=null
                const validAssignments = assignments.filter(a => a.routine !== null);
                setActiveAssignments(validAssignments);
                if (validAssignments.length === 0) {
                     setError("No tienes ninguna rutina activa asignada.");
                }
            } else {
                setActiveAssignments([]);
                setError("No tienes ninguna rutina activa asignada."); 
            }

        } catch (e) {
            console.error("Error al cargar la rutina del alumno:", e.response ? e.response.data : e.message);
            
            if (e.response && (e.response.status === 404 || e.response.data?.detail === "No tienes ninguna rutina activa asignada.")) {
                setError("No tienes ninguna rutina activa asignada.");
            } else {
                setError("Error al cargar la rutina. Verifica la conexión o backend.");
            }
        } finally {
            // Un pequeño retraso para que la UX se sienta mejor
            setTimeout(() => setIsLoading(false), 300); 
        }
    };

    useEffect(() => {
        fetchRoutine();
    }, []);

    const handleRefresh = () => {
        fetchRoutine();
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={{ marginTop: 10, color: '#555' }}>Cargando tus rutinas...</Text>
            </SafeAreaView>
        );
    }

    // --- Componente de Tarjeta de Ejercicio ---
    const ExerciseCard = ({ link }) => (
        <View style={styles.exerciseCard}>
            <Text style={styles.exerciseOrder}>{link.order?.toString()}</Text>
            <View style={styles.exerciseContent}>
                <Text style={styles.exerciseName}>{link.exercise?.nombre ?? 'Ejercicio Desconocido'}</Text>
                <View style={styles.exerciseDetails}>
                    <Text style={styles.exerciseReps}>{link.sets?.toString()} series de {link.repetitions} reps</Text>
                    <Text style={styles.exerciseGroup}>{link.exercise?.grupo_muscular ?? 'N/A'}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            
            {/* 🚨 CABECERA ESTILIZADA con botones */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Tu Panel de Rutinas</Text>
                <View style={styles.headerButtons}>
                    {/* Botón Refrescar */}
                    <TouchableOpacity 
                        onPress={handleRefresh} 
                        style={styles.refreshButton}
                        disabled={isLoading}
                    >
                        <RefreshCcw size={24} color="#007AFF" />
                    </TouchableOpacity>
                    {/* Botón Cerrar Sesión */}
                    <TouchableOpacity 
                        onPress={signOut} 
                        style={styles.logoutButton}
                    >
                        <LogOut size={24} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
            </View>
            
            <ScrollView style={styles.content}>
                
                {/* Título y Mensaje de Error/Vacío */}
                <View style={styles.mainContentHeader}>
                    <Text style={styles.mainTitle}>Tus Rutinas Activas ({activeAssignments.length})</Text>
                    {error && error !== "No tienes ninguna rutina activa asignada." && <Text style={styles.errorText}>{error}</Text>}
                </View>

                {activeAssignments.length > 0 ? (
                    activeAssignments.map((assignment, assignmentIndex) => (
                        // Tarjeta Principal de Rutina
                        <View key={assignment.id?.toString() ?? assignmentIndex.toString()} style={styles.routineMainCard}>
                            
                            <Text style={styles.routineTitle}>
                                {assignment.routine?.nombre ?? 'Rutina Sin Título'}
                            </Text>
                            <Text style={styles.routineDescription}>
                                {assignment.routine?.descripcion ?? 'Sin descripción.'}
                            </Text>
                            <Text style={styles.assignedBy}>
                                Asignada por: {assignment.professor?.nombre ?? 'Profesor Desconocido'}
                            </Text>
                            
                            {/* Lista de Ejercicios */}
                            <View style={styles.exerciseListContainer}>
                                <Text style={styles.sectionTitle}>Ejercicios:</Text>
                                {assignment.routine?.exercise_links?.map((link, index) => (
                                    <ExerciseCard key={link.exercise?.id?.toString() ?? index.toString()} link={link} />
                                ))}
                            </View>
                        </View>
                    ))
                ) : (
                    // Mensaje cuando no hay rutina activa
                    <View style={styles.noRoutineContainer}>
                        <Text style={styles.noRoutineText}>¡Libre de Rutinas!</Text>
                        <Text style={styles.noRoutineSubText}>Pídele a tu profesor que te asigne un nuevo plan.</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// --- ESTILOS MEJORADOS ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F4F8', // Fondo azul claro/grisáceo
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F0F4F8',
    },
    // Estilos de la nueva cabecera
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        elevation: 2, // Sombra suave
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 15, // Espacio entre botones de la cabecera
    },
    refreshButton: {
        padding: 5,
        borderRadius: 5,
    },
    logoutButton: {
        padding: 5,
        borderRadius: 5,
    },
    // Contenido principal
    content: {
        flex: 1,
        padding: 15,
    },
    mainContentHeader: {
        marginBottom: 20,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 5,
    },
    errorText: {
        color: '#FF3B30',
        fontWeight: '600',
        marginTop: 10,
        textAlign: 'center',
        backgroundColor: '#FFEBEE',
        padding: 10,
        borderRadius: 8,
    },
    // Tarjeta de Rutina Maestra
    routineMainCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
        borderLeftWidth: 6,
        borderLeftColor: '#007AFF', // Azul primario
    },
    routineTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 5,
    },
    routineDescription: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 10,
    },
    assignedBy: {
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 15,
        fontStyle: 'italic',
    },
    statusText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#10B981', // Verde
        marginBottom: 15,
    },
    exerciseListContainer: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 10,
    },
    // Tarjeta de Ejercicio
    exerciseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#007AFF', // Azul
    },
    exerciseOrder: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#007AFF',
        marginRight: 15,
        width: 25,
        textAlign: 'center',
    },
    exerciseContent: {
        flex: 1,
    },
    exerciseName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    exerciseDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    exerciseReps: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '500',
    },
    exerciseGroup: {
        fontSize: 12,
        color: '#9CA3AF',
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    // Contenedor sin rutinas
    noRoutineContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginTop: 50,
        borderWidth: 1,
        borderColor: '#FFD700',
    },
    noRoutineText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FF9500', // Naranja/Dorado
        marginBottom: 10,
        textAlign: 'center',
    },
    noRoutineSubText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    }
});