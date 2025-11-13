import React, { useState, useEffect, useContext } from 'react';
import { 
    StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, 
    ActivityIndicator, Button, Alert
} from 'react-native';
import axios from 'axios';
import { AuthContext } from '../App';
import { useTheme } from '../ThemeContext';
// 🚨 ICONOS NECESARIOS: RefreshCcw, LogOut, ChevronDown, ChevronUp
import { RefreshCcw, LogOut, ChevronDown, ChevronUp } from 'lucide-react-native'; 

const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 

// ----------------------------------------------------------------------
// GENERADOR DE ESTILOS DINÁMICOS (Consolidando el estilo Profesor/Alumno)
// ----------------------------------------------------------------------
const getStudentStyles = (colors) => StyleSheet.create({
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
    // --- Cabecera (Profesor style) ---
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.primary,
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 15,
    },
    iconButton: {
        padding: 8,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.highlight, // Fondo de resaltado para iconos
    },
    content: {
        flex: 1,
        padding: 20,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 20,
    },
    errorText: {
        color: colors.danger,
        fontWeight: '600',
        marginTop: 10,
        textAlign: 'center',
        backgroundColor: colors.isDark ? colors.danger + '30' : '#FFEBEE',
        padding: 10,
        borderRadius: 8,
        marginBottom: 20,
    },
    noRoutineContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: colors.card,
        borderRadius: 12,
        marginTop: 50,
        borderWidth: 1,
        borderColor: colors.warning,
    },
    noRoutineText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.warning,
        marginBottom: 10,
        textAlign: 'center',
    },
    noRoutineSubText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    // --- Estilos de la Tarjeta Colapsable (Profesor Style) ---
    routineCardContainer: {
        flexDirection: 'row', // Para la barra lateral
        backgroundColor: colors.card,
        borderRadius: 10,
        marginBottom: 15,
        shadowColor: colors.isDark ? '#000' : '#444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: colors.isDark ? 0.3 : 0.1,
        shadowRadius: 3,
        elevation: 3,
        overflow: 'hidden',
    },
    // 🚨 Barra lateral de estado
    statusBar: {
        width: 40, 
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'white',
        transform: [{ rotate: '-90deg' }], // Texto vertical
        width: 80, 
        textAlign: 'center',
    },
    // Contenido principal (derecha de la barra)
    assignmentContent: {
        flex: 1,
    },
    cardHeader: {
        padding: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flex: 1,
    },
    routineTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 5,
    },
    routineGroup: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    assignedBy: {
        fontSize: 12,
        color: colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 5,
    },
    toggleIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    // Estilos del contenido expandido
    exerciseListContainer: {
        paddingTop: 15,
        paddingHorizontal: 15,
        paddingBottom: 15,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    exerciseItem: {
        paddingLeft: 10,
        paddingVertical: 8,
        borderLeftWidth: 2,
        borderLeftColor: colors.highlight,
        marginBottom: 8,
    },
    exerciseName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 5,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 15,
        marginTop: 5,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.isDark ? colors.highlight : colors.divider, // Estilo de ProfesorScreen
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    detailLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginRight: 4,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.primaryDark,
    },
});

// ----------------------------------------------------------------------
// COMPONENTE: Tarjeta Colapsable de Rutina (Alumno)
// ----------------------------------------------------------------------
const CollapsibleRoutineCard = ({ assignment, styles, themeColors }) => {
    
    const [isExpanded, setIsExpanded] = useState(false);
    const routine = assignment.routine;
    const linkCount = routine?.exercise_links ? routine.exercise_links.length : 0;
    
    // 🚨 Lógica de Estado (Barra Lateral)
    const statusColor = assignment.is_active ? themeColors.success : themeColors.warning;
    const statusText = assignment.is_active ? 'ACTIVA' : 'INACTIVA';

    // Formateo de fecha (si existe)
    const formattedExpiryDate = routine?.routine_group?.fecha_vencimiento 
        ? `Vence: ${routine.routine_group.fecha_vencimiento}` 
        : 'Vencimiento: N/A';

    // Renderiza la lista de ejercicios (solo cuando se expande)
    const renderExercises = () => (
        <View style={styles.exerciseListContainer}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: themeColors.textPrimary, marginBottom: 10 }}>Detalle de Ejercicios:</Text>
            {routine.exercise_links
                .sort((a, b) => a.order - b.order)
                .map((link, exIndex) => (
                    <View key={link.id || exIndex} style={styles.exerciseItem}>
                        <Text style={styles.exerciseName}>
                            {link.order}. {link.exercise?.nombre ?? 'Ejercicio Desconocido'}
                        </Text>
                        
                        <View style={styles.detailsRow}>
                            {/* Sets */}
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Sets:</Text>
                                <Text style={styles.detailValue}>{link.sets}</Text>
                            </View>

                            {/* Reps */}
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Reps:</Text>
                                <Text style={styles.detailValue}>{link.repetitions}</Text>
                            </View>

                            {/* Peso (usando '-' si es nulo) */}
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Peso:</Text>
                                <Text style={styles.detailValue}>{link.peso || '-'}</Text>
                            </View>
                        </View>
                    </View>
                ))}
        </View>
    );

    return (
        <View style={styles.routineCardContainer}>
            
            {/* 🚨 1. BARRA LATERAL DE ESTADO */}
            <View style={[styles.statusBar, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{statusText}</Text>
            </View>

            {/* 2. CONTENIDO PRINCIPAL Y COLAPSABLE */}
            <View style={styles.assignmentContent}>
                
                <TouchableOpacity 
                    style={styles.cardHeader}
                    onPress={() => setIsExpanded(!isExpanded)}
                    activeOpacity={0.8}
                >
                    <View style={{flex: 1}}>
                        <Text style={styles.routineTitle}>
                            {routine?.nombre ?? 'Rutina Sin Título'}
                        </Text>
                        
                        {/* Grupo y Vencimiento */}
                        <Text style={styles.routineGroup}>
                            {routine?.routine_group?.nombre ? `Grupo: ${routine.routine_group.nombre}` : 'Rutina Individual'}
                        </Text>
                        <Text style={styles.routineGroup}>{formattedExpiryDate}</Text>
                        
                        {/* Indicador de Profesor */}
                        <Text style={styles.assignedBy}>
                            Profesor: {assignment.professor?.nombre ?? 'Desconocido'}
                        </Text>
                        
                        {/* Indicador Colapsable */}
                        <View style={styles.toggleIndicator}>
                            {isExpanded ? 
                                <ChevronUp size={16} color={themeColors.primary} /> : 
                                <ChevronDown size={16} color={themeColors.primary} />
                            }
                            <Text style={{marginLeft: 5, color: themeColors.primary, fontSize: 13, fontWeight: '500'}}>
                                {isExpanded ? 'TOCAR PARA COLAPSAR' : `VER ${linkCount} EJERCICIOS`}
                            </Text>
                        </View>
                    </View>
                    
                </TouchableOpacity>

                {/* Contenido Colapsable */}
                {isExpanded && renderExercises()}
            </View>
        </View>
    );
}

// --- PANTALLA DE RUTINA (ALUMNO) ---
export default function StudentRoutineScreen() {
    
    // 🚨 Usamos useTheme
    const { colors: themeColors } = useTheme();
    const styles = getStudentStyles(themeColors);

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
                const validAssignments = assignments.filter(a => a.routine !== null);
                
                // 🚨 Ordenamos por el ID interno de la rutina para asegurar Día 1, Día 2, etc.
                validAssignments.sort((a, b) => a.routine.id - b.routine.id);

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
                Alert.alert("Error de Conexión", "Fallo al cargar la rutina. Verifica tu conexión o token.");
                setError("Error al cargar la rutina. Revisa tu conexión.");
            }
        } finally {
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
                <ActivityIndicator size="large" color={themeColors.primary} />
                <Text style={{ marginTop: 10, color: themeColors.textSecondary }}>Cargando tus rutinas...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            
            {/* CABECERA ESTILIZADA con botones */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Mi Plan de Entrenamiento</Text>
                <View style={styles.headerButtons}>
                    {/* Botón Refrescar */}
                    <TouchableOpacity 
                        onPress={handleRefresh} 
                        style={styles.iconButton}
                        disabled={isLoading}
                    >
                        <RefreshCcw size={24} color={themeColors.primaryDark} /> 
                    </TouchableOpacity>
                    {/* Botón Cerrar Sesión */}
                    <TouchableOpacity 
                        onPress={signOut} 
                        style={[styles.iconButton, {backgroundColor: themeColors.danger + '20'}]}
                    >
                        <LogOut size={24} color={themeColors.danger} /> 
                    </TouchableOpacity>
                </View>
            </View>
            
            <ScrollView contentContainerStyle={styles.content}>
                
                <View style={styles.mainContentHeader}>
                    <Text style={styles.mainTitle}>Tus Rutinas Activas ({activeAssignments.length})</Text>
                    {error && error !== "No tienes ninguna rutina activa asignada." && <Text style={styles.errorText}>{error}</Text>}
                </View>

                {activeAssignments.length > 0 ? (
                    activeAssignments.map((assignment, assignmentIndex) => (
                        <CollapsibleRoutineCard 
                            key={assignment.id?.toString() ?? assignmentIndex.toString()} 
                            assignment={assignment}
                            styles={styles}
                            themeColors={themeColors}
                        />
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