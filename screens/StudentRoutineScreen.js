import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
    StyleSheet, Text, View, ScrollView, SafeAreaView, Button, 
    ActivityIndicator, FlatList, TouchableOpacity, Alert, Modal,
    TextInput 
} from 'react-native';
import axios from 'axios';
import { AuthContext } from '../App'; 
import { useTheme } from '../ThemeContext'; 
// 🚨 Importamos los iconos
import { Trash2, Edit, RefreshCcw, Settings, Key, LogOut, Minus, Plus, ChevronDown, ChevronUp } from 'lucide-react-native'; 

// URL de la API (Asegúrate que esta URL coincida con la de tu App.js/Backend)
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 

// ----------------------------------------------------------------------
// COMPONENTE: MODAL DE AJUSTES Y CUENTA
// ----------------------------------------------------------------------
const AccountSettingsModal = ({ isVisible, onClose, navigation, signOut, themeColors }) => {
    const styles = getStudentStyles(themeColors);

    const handleChangePassword = () => {
        onClose();
        navigation.navigate('ChangePassword');
    };

    const handleLogout = () => {
        Alert.alert(
            "Cerrar Sesión",
            "¿Estás seguro que quieres cerrar sesión?",
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Cerrar", onPress: signOut, style: "destructive" },
            ]
        );
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <TouchableOpacity 
                style={styles.modalOverlay} 
                activeOpacity={1} 
                onPressOut={onClose}
            >
                <View style={[styles.menuContainer, {backgroundColor: themeColors.card}]}>
                    <Text style={[styles.menuTitle, {color: themeColors.textPrimary, borderBottomColor: themeColors.divider}]}>
                        Ajustes de Cuenta
                    </Text>
                    
                    {/* Opción 1: Cambiar Contraseña */}
                    <TouchableOpacity style={styles.menuItem} onPress={handleChangePassword}>
                        <View style={{marginRight: 10}}><Key size={18} color={themeColors.primary} /></View>
                        <Text style={[styles.menuItemText, {color: themeColors.textPrimary}]}>Cambiar Contraseña</Text>
                    </TouchableOpacity>
                    
                    {/* Opción 2: Cerrar Sesión */}
                    <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                        <View style={{marginRight: 10}}><LogOut size={18} color={themeColors.danger} /></View>
                        <Text style={[styles.menuItemText, styles.menuItemTextLogout, {color: themeColors.danger}]}>Cerrar Sesión</Text>
                    </TouchableOpacity>
                    
                    {/* Cerrar Menu */}
                    <TouchableOpacity style={[styles.menuItem, styles.menuItemClose]} onPress={onClose}>
                        <Text style={styles.menuItemTextClose}>Cerrar Menú</Text>
                    </TouchableOpacity>

                </View>
            </TouchableOpacity>
        </Modal>
    );
};


// ----------------------------------------------------------------------
// COMPONENTE: Tarjeta Colapsable de Rutina (Alumno)
// ----------------------------------------------------------------------
const CollapsibleRoutineCard = ({ assignment, styles, themeColors }) => {
    
    // Inicializa isExpanded con false para que las tarjetas estén cerradas por defecto
    const [isExpanded, setIsExpanded] = useState(false);
    const routine = assignment.routine;
    const linkCount = routine?.exercise_links ? routine.exercise_links.length : 0;
    
    // Lógica de Estado (Barra Lateral)
    const statusColor = assignment.is_active ? themeColors.success : themeColors.warning;
    const statusText = assignment.is_active ? 'ACTIVA' : 'INACTIVA';

    // Formateo de fecha
    const formattedExpiryDate = routine?.routine_group?.fecha_vencimiento 
        ? `Vence: ${new Date(routine.routine_group.fecha_vencimiento).toLocaleDateString('es-AR')}` 
        : 'Vencimiento: N/A';

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
                            <View style={[styles.detailItem, {backgroundColor: themeColors.highlight}]}>
                                <Text style={styles.detailLabel}>Sets:</Text>
                                <Text style={[styles.detailValue, {color: themeColors.primaryDark}]}>{link.sets}</Text>
                            </View>

                            {/* Reps */}
                            <View style={[styles.detailItem, {backgroundColor: themeColors.highlight}]}>
                                <Text style={styles.detailLabel}>Reps:</Text>
                                <Text style={[styles.detailValue, {color: themeColors.primaryDark}]}>{link.repetitions}</Text>
                            </View>

                            {/* Peso */}
                            <View style={[styles.detailItem, {backgroundColor: themeColors.highlight}]}>
                                <Text style={styles.detailLabel}>Peso:</Text>
                                <Text style={[styles.detailValue, {color: themeColors.primaryDark}]}>{link.peso || '-'}</Text>
                            </View>
                        </View>
                    </View>
                ))}
        </View>
    );

    return (
        <View style={styles.routineCardContainer}>
            
            {/* 1. BARRA LATERAL DE ESTADO */}
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
                        {/* 🚨 NUEVO: Nombre del Grupo de Rutinas Destacado */}
                        {routine?.routine_group?.nombre && (
                            <Text style={[styles.groupNameSubtitle, { color: themeColors.primary }]}>
                                {routine.routine_group.nombre}
                            </Text>
                        )}

                        <Text style={styles.routineTitle}>
                            {routine?.nombre ?? 'Rutina Sin Título'}
                        </Text>
                        
                        {/* Vencimiento */}
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

// ----------------------------------------------------------------------
// PANTALLA DE RUTINA (ALUMNO) PRINCIPAL
// ----------------------------------------------------------------------
export default function StudentRoutineScreen({ navigation }) {
    
    const { colors: themeColors } = useTheme();
    const styles = getStudentStyles(themeColors);
    
    const { signOut, getToken, userProfile } = useContext(AuthContext);

    const [activeAssignments, setActiveAssignments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMenuVisible, setIsMenuVisible] = useState(false); // Estado del Modal

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
                
                // Ordenamos por el ID de la rutina para asegurar el orden (Día 1, Día 2, etc.)
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
                Alert.alert("Error de Conexión", "Fallo al cargar la rutina. Verifica tu conexión o backend.");
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
            
            {/* 🚨 MODAL DE OPCIONES DE USUARIO */}
            <AccountSettingsModal 
                isVisible={isMenuVisible}
                onClose={() => setIsMenuVisible(false)}
                navigation={navigation}
                signOut={signOut} 
                themeColors={themeColors}
            />
            
            {/* CABECERA ESTILIZADA con botones */}
            <View style={styles.header}>
                {/* 🚨 TÍTULO DINÁMICO */}
                <Text style={styles.headerTitle}>
                    Bienvenido/a {userProfile?.nombre?.split(' ')[0] || 'Alumno/a'}
                </Text>

                <View style={styles.headerButtons}>
                    {/* Botón Refrescar */}
                    <TouchableOpacity 
                        onPress={handleRefresh} 
                        style={styles.iconButton}
                        disabled={isLoading}
                    >
                        <RefreshCcw size={24} color={themeColors.primaryDark} /> 
                    </TouchableOpacity>
                    {/* Botón de Ajustes (abre modal) */}
                    <TouchableOpacity 
                        onPress={() => setIsMenuVisible(true)} 
                        style={styles.iconButton}
                    >
                        <Settings size={24} color={themeColors.primaryDark} /> 
                    </TouchableOpacity>
                </View>
            </View>
            
            <ScrollView contentContainerStyle={styles.content}>
                
                <View style={styles.mainContentHeader}>
                    <Text style={styles.mainTitle}>Mi Plan de Entrenamiento</Text>
                    <Text style={{color: themeColors.textSecondary}}>Rutinas Activas ({activeAssignments.length})</Text>
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
        fontSize: 18, 
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
        backgroundColor: colors.highlight,
    },
    content: {
        flexGrow: 1, 
        padding: 20,
    },
    mainContentHeader: {
        marginBottom: 10,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 5,
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
    // --- Estilos de la Tarjeta Colapsable ---
    routineCardContainer: {
        flexDirection: 'row',
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
    // Barra lateral de estado
    statusBar: {
        width: 30, // 🚨 AJUSTE 1: Ancho de la barra lateral
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'white',
        transform: [{ rotate: '-90deg' }], // Texto vertical
        width: 100, // 🚨 AJUSTE 2: Aumento de ancho antes de rotación para evitar wrapping
        textAlign: 'center',
    },
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
    // 🚨 NUEVO ESTILO: Nombre del Grupo
    groupNameSubtitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    routineTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 5,
    },
    routineGroup: {
        fontSize: 13, // Ajustado para el vencimiento
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
        backgroundColor: colors.isDark ? colors.background : '#F7F7F7',
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
    // --- Estilos del Modal ---
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 80, 
        paddingRight: 10,
    },
    menuContainer: {
        width: 250,
        backgroundColor: colors.card,
        borderRadius: 10,
        padding: 10,
        shadowColor: colors.isDark ? '#000' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: colors.isDark ? 0.4 : 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        paddingBottom: 10,
        marginBottom: 5,
        borderBottomWidth: 1,
    },
    menuItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuItemClose: {
        borderBottomWidth: 0,
        marginTop: 10,
        backgroundColor: colors.divider,
        borderRadius: 8,
        alignItems: 'center',
    },
    menuItemText: {
        fontSize: 15,
        fontWeight: '600',
    },
    menuItemTextLogout: {
        fontSize: 15,
        fontWeight: '600',
    },
    menuItemTextClose: {
        fontSize: 15,
        fontWeight: '600',
        padding: 5,
        color: colors.textPrimary,
    },
});