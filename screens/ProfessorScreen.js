import React, { useState, useEffect, useContext } from 'react';
import { 
    StyleSheet, Text, View, ScrollView, SafeAreaView, Button, 
    ActivityIndicator, FlatList, TouchableOpacity, Alert, Modal 
} from 'react-native';
import axios from 'axios';
import { AuthContext } from '../App'; 
// Importaciones de iconos (necesitas tener 'lucide-react-native' instalado)
import { Trash2, Edit } from 'lucide-react-native'; 

// ----------------------------------------------------------------------
// URL de la API (DEBE COINCIDIR con la de App.js)
// ----------------------------------------------------------------------
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 
// ----------------------------------------------------------------------

// --- Sub-componente para Asignar y Gestionar Rutinas ---
function AssignmentView({ student, routines, onAssignmentComplete, onCancel }) {
    const availableRoutines = Array.isArray(routines) ? routines : []; 
    
    // Asignacion
    const [selectedRoutine, setSelectedRoutine] = useState(availableRoutines.length > 0 ? availableRoutines[0].id : null); 
    const [isAssigning, setIsAssigning] = useState(false);
    
    // Gestion de Asignaciones
    const [currentAssignments, setCurrentAssignments] = useState([]);
    const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(true);

    const { getToken } = useContext(AuthContext);

    // ----------------------------------------------------------------
    // FUNCION 1: CARGAR ASIGNACIONES ACTUALES DEL ALUMNO (TODAS)
    // ----------------------------------------------------------------
    const fetchCurrentAssignments = async () => {
        setIsAssignmentsLoading(true);
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            // CAMBIO CRITICO AQUI: Usamos la nueva ruta de Profesor
            const response = await axios.get(
                `${API_URL}/professor/assignments/student/${student.id}`, 
                { headers }
            );
            
            setCurrentAssignments(response.data); 

        } catch (e) {
            // El error 404 ahora significa que el alumno no tiene *ninguna* asignacion, 
            // no un error de rol.
            if (e.response && e.response.status === 404) {
                setCurrentAssignments([]);
            } else {
                 console.error("Error al cargar asignaciones (Ruta Profesor):", e.response ? e.response.data : e.message);
            }
        } finally {
            setIsAssignmentsLoading(false);
        }
    };
    
    // ----------------------------------------------------------------
    // FUNCION 2: ELIMINAR ASIGNACION
    // ----------------------------------------------------------------
    const handleDeleteAssignment = (assignmentId) => {
        Alert.alert(
            "Confirmar Eliminacion",
            "?Estas seguro de que quieres eliminar esta asignacion de rutina?",
            [
                {
                    text: "Cancelar",
                    style: "cancel"
                },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await getToken();
                            const headers = { 'Authorization': `Bearer ${token}` };
                            
                            await axios.delete(`${API_URL}/assignments/${assignmentId}`, { headers });
                            
                            Alert.alert("Exito", "Asignacion eliminada correctamente.");
                            
                            fetchCurrentAssignments();
                            
                        } catch (e) {
                            console.error("Error eliminando asignacion:", e.response ? e.response.data : e.message);
                            Alert.alert("Error", "Fallo al eliminar la asignacion.");
                        }
                    }
                }
            ]
        );
    };

    // ----------------------------------------------------------------
    // FUNCION 3: CAMBIAR ESTADO ACTIVO/INACTIVO
    // ----------------------------------------------------------------
    const handleToggleActive = async (assignmentId, currentStatus) => {
        const newStatus = !currentStatus;
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            // Llamada a la ruta PATCH /assignments/{assignment_id}/active?is_active=...
            await axios.patch(`${API_URL}/assignments/${assignmentId}/active?is_active=${newStatus}`, null, { headers });

            Alert.alert("Exito", `Rutina ${newStatus ? 'activada' : 'inactivada'} correctamente.`);
            
            // Refrescar la lista en la vista actual
            fetchCurrentAssignments();

        } catch (e) {
            console.error("Error cambiando estado:", e.response ? e.response.data : e.message);
            Alert.alert("Error", "Fallo al cambiar el estado de la asignacion.");
        }
    };


    // --- EFECTO: Cargar las asignaciones al cambiar de alumno ---
    useEffect(() => {
        fetchCurrentAssignments();
    }, [student.id]); 

    // --- ASIGNACION DE RUTINA (Logica original) ---
    const handleAssign = async () => {
        if (!selectedRoutine) {
            Alert.alert("Error", "No hay rutinas disponibles para asignar.");
            return;
        }

        setIsAssigning(true);
        try {
            const token = await getToken();
            await axios.post(`${API_URL}/assignments/`, {
                routine_id: selectedRoutine, 
                student_id: student.id,
                is_active: true
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            Alert.alert("Exito", `Rutina asignada a ${student.nombre}.`);
            fetchCurrentAssignments(); 
        } catch (e) {
            console.error("Error asignando rutina:", e.response ? e.response.data : e.message);
            let errorMessage = "Fallo al asignar la rutina. Verifica la conexion o backend.";
            if (e.response && e.response.data && e.response.data.detail) {
                errorMessage = `Error de API: ${JSON.stringify(e.response.data.detail)}`;
            } else if (e.response && (e.response.status === 401 || e.response.status === 403)) {
                errorMessage = "Token expirado o no autorizado. Vuelve a iniciar sesion.";
            }
            Alert.alert("Error", errorMessage);
        } finally {
            setIsAssigning(false);
        }
    };
    
    // --- VISTA DE RENDERIZADO ---
    return (
        <ScrollView style={assignmentStyles.scrollContainer}>
            <View style={assignmentStyles.container}>
                <Text style={assignmentStyles.title}>Gestionar: {student.nombre}</Text>

                {/* -------------------- 1. GESTIONAR ASIGNACIONES (ACTIVAR/INACTIVAR) -------------------- */}
                <Text style={assignmentStyles.subtitle}>Rutinas Asignadas Actualmente ({currentAssignments.length})</Text>
                
                {isAssignmentsLoading ? (
                    <ActivityIndicator size="small" color="#007AFF" style={{marginBottom: 15}}/>
                ) : (
                    <View style={assignmentStyles.currentAssignmentList}>
                        {currentAssignments.length > 0 ? (
                            currentAssignments.map((assignment) => (
                                <View key={assignment.id.toString()} style={[
                                    assignmentStyles.assignmentCard, 
                                    // Estilo visual para estado activo/inactivo
                                    { borderLeftColor: assignment.is_active ? '#10B981' : '#FF9500' }
                                ]}>
                                    
                                    <View style={assignmentStyles.assignmentDetails}>
                                        <Text style={assignmentStyles.routineName}>{assignment.routine.nombre}</Text>
                                        <Text style={assignmentStyles.assignmentDate}>
                                            Estado: 
                                            <Text style={{fontWeight: 'bold', color: assignment.is_active ? '#10B981' : '#FF9500'}}>
                                                {assignment.is_active ? ' ACTIVA' : ' INACTIVA'}
                                            </Text>
                                        </Text>
                                    </View>
                                    
                                    {/* BOTON DE ACTIVAR / INACTIVAR */}
                                    <TouchableOpacity 
                                        style={[
                                            assignmentStyles.toggleButton, 
                                            { backgroundColor: assignment.is_active ? '#FF9500' : '#10B981' } // Color opuesto al estado actual
                                        ]} 
                                        onPress={() => handleToggleActive(assignment.id, assignment.is_active)}
                                    >
                                        <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 }}>
                                            {assignment.is_active ? 'INACTIVAR' : 'ACTIVAR'}
                                        </Text>
                                    </TouchableOpacity>

                                    {/* BOTON DE ELIMINACION */}
                                    <TouchableOpacity 
                                        style={assignmentStyles.deleteButton} 
                                        onPress={() => handleDeleteAssignment(assignment.id)}
                                    >
                                        <Trash2 size={20} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                            ))
                        ) : (
                            <Text style={assignmentStyles.warning}>Este alumno no tiene rutinas asignadas.</Text>
                        )}
                    </View>
                )}


                {/* -------------------- 2. ASIGNAR NUEVA RUTINA -------------------- */}
                <Text style={assignmentStyles.subtitle}>Asignar Rutina Existente</Text>
                
                <View style={assignmentStyles.routineListContainer}>
                    <Text style={assignmentStyles.label}>Rutinas maestras disponibles:</Text>
                    <ScrollView style={{maxHeight: 200, marginBottom: 15}}>
                        {availableRoutines.length > 0 ? (
                            availableRoutines.map((r) => (
                                <TouchableOpacity 
                                    key={r.id.toString()}
                                    style={[
                                        assignmentStyles.routineItem, 
                                        selectedRoutine === r.id && assignmentStyles.routineItemSelected
                                    ]}
                                    onPress={() => setSelectedRoutine(r.id)}
                                >
                                    <Text style={assignmentStyles.routineNameItem}>{r.nombre}</Text>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <Text style={assignmentStyles.warning}>No hay rutinas creadas en la base de datos.</Text>
                        )}
                    </ScrollView>
                </View>

                <Button 
                    title={isAssigning ? "Asignando..." : "ASIGNAR RUTINA"} 
                    onPress={handleAssign} 
                    disabled={isAssigning || !selectedRoutine}
                    color="#10B981"
                />

                <View style={assignmentStyles.backButton}>
                    <Button title="Volver al Panel" onPress={onCancel} color="#555" />
                </View>
            </View>
        </ScrollView>
    );
}

// --- VISTA DE SELECCION DE ALUMNO PARA CREAR RUTINA (NUEVO COMPONENTE) ---
function StudentSelectionForCreation({ navigation, students, onCancel }) {
    
    const handleSelectStudent = (student) => {
        // Navega a RoutineCreationScreen pasando el ID del estudiante
        navigation.navigate('RoutineCreation', { 
            studentId: student.id,
            studentName: student.nombre
        });
        // IMPORTANTE: Como navegamos a otra pantalla, no necesitamos llamar a onCancel aqui.
    };
    
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerSelection}>
                <Text style={styles.titleSelection}>Selecciona un Alumno</Text>
                <Button title="Cancelar" onPress={onCancel} color="#FF3B30" />
            </View>
            
            <Text style={styles.listTitle}>Alumnos para Nueva Rutina ({students.length})</Text>

            <FlatList
                data={students}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.studentCard}
                        onPress={() => handleSelectStudent(item)}
                    >
                        <View>
                            <Text style={styles.studentName}>{item.nombre}</Text>
                            <Text style={styles.studentEmail}>{item.email}</Text>
                        </View>
                        
                    </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                ListEmptyComponent={() => (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                         <Text style={{ color: '#6B7280' }}>No hay alumnos registrados.</Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}


// --- PANTALLA PRINCIPAL DEL PROFESOR ---
export default function ProfessorScreen({ navigation }) {
    const [students, setStudents] = useState([]);
    const [routines, setRoutines] = useState([]); // Rutinas Maestras
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null); // Alumno para asignar/gestionar
    const [creatingForStudent, setCreatingForStudent] = useState(false); // Modo: seleccionar alumno para crear
    const [dataError, setDataError] = useState(null); 
    const [isMenuVisible, setIsMenuVisible] = useState(false); // Estado para el modal

    const { signOut, getToken } = useContext(AuthContext);

    // ----------------------------------------------------------------
    // FUNCION PRINCIPAL: CARGA DATOS
    // ----------------------------------------------------------------
    const fetchData = async () => {
        setIsLoading(true);
        setDataError(null); 
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            const studentsResponse = await axios.get(`${API_URL}/users/students`, { headers });
            setStudents(Array.isArray(studentsResponse.data) ? studentsResponse.data : []);

            const routinesResponse = await axios.get(`${API_URL}/routines/`, { headers });
            setRoutines(Array.isArray(routinesResponse.data) ? routinesResponse.data : []);

        } catch (e) {
            console.error("Error cargando datos del profesor:", e.response ? e.response.data : e.message);
            
            let errorMsg;
            
            if (e.message === 'Network Error') {
                errorMsg = "Error de Red. Verifica la URL de Render o la conexion del servidor.";
            } else if (e.response && (e.response.status === 401 || e.response.status === 403)) {
                errorMsg = "Sesion invalida o expirada. Saliendo...";
                signOut(); 
            } else if (e.response && e.response.status === 500) {
                 errorMsg = "Error interno del servidor (500) al cargar listas. Base de datos inconsistente.";
            } else {
                errorMsg = "Error al cargar datos. Token invalido o backend.";
            }
            
            setDataError(errorMsg); 
        } finally {
            setIsLoading(false);
        }
    };
    
    // ----------------------------------------------------------------
    // FUNCION: ELIMINAR RUTINA MAESTRA
    // ----------------------------------------------------------------
    const handleDeleteRoutine = (routineId, routineName) => {
        Alert.alert(
            "Confirmar Eliminacion",
            `?Estas seguro de que quieres eliminar la rutina maestra "${routineName}"? Esto eliminara todas las asignaciones basadas en esta rutina.`,
            [
                {
                    text: "Cancelar",
                    style: "cancel"
                },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await getToken();
                            const headers = { 'Authorization': `Bearer ${token}` };
                            
                            // Llamada a la API de DELETE
                            await axios.delete(`${API_URL}/routines/${routineId}`, { headers });
                            
                            Alert.alert("Exito", `Rutina "${routineName}" eliminada correctamente.`);
                            
                            // Recargar las listas
                            fetchData();
                            
                        } catch (e) {
                            console.error("Error eliminando rutina:", e.response ? e.response.data : e.message);
                            Alert.alert("Error", "Fallo al eliminar la rutina maestra. (Asegurate de que la ruta DELETE /routines/{id} esta implementada en FastAPI)");
                        }
                    }
                }
            ]
        );
    };

    // ----------------------------------------------------------------
    // FUNCION: NAVEGAR A EDICION
    // ----------------------------------------------------------------
    const handleEditRoutine = (routine) => {
        // Navega a RoutineCreationScreen, pasando el ID de la rutina para que cargue sus datos
        navigation.navigate('RoutineCreation', { 
            routineId: routine.id,
        });
    };
    
    // ----------------------------------------------------------------
    // FUNCION: Cierre de Sesion y Contrasena (Modal)
    // ----------------------------------------------------------------
    const handleChangePassword = () => {
        setIsMenuVisible(false); // Cierra el modal
        navigation.navigate('ChangePassword'); // Debe existir en App.js
    };
    
    const handleLogout = () => {
        setIsMenuVisible(false);
        signOut();
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', fetchData);
        fetchData();
        return unsubscribe;
    }, [navigation]);
    
    const handleAssignmentComplete = () => {
        setSelectedStudent(null);
        fetchData(); 
    };
    
    // --- VISTAS DE ESTADO ---
    if (dataError && !isLoading && !selectedStudent && !creatingForStudent) {
        return (
             <SafeAreaView style={styles.container}>
                 <View style={styles.errorView}>
                     <Text style={styles.errorTitle}>!Error de Conexion!</Text>
                     <Text style={styles.errorDetail}>{dataError}</Text>
                     <View style={{marginTop: 20}}>
                         <Button title="Intentar de Nuevo" onPress={fetchData} color="#007AFF" />
                     </View>
                     {dataError !== "Sesion invalida o expirada. Saliendo..." && (
                         <View style={{marginTop: 10}}>
                             <Button title="Salir" onPress={signOut} color="#FF3B30" />
                         </View>
                     )}
                 </View>
             </SafeAreaView>
         );
       }

    if (isLoading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text>Cargando panel de gestion...</Text>
            </SafeAreaView>
        );
    }
    
    // Paso 1: Modo Seleccionar Alumno para CREAR Rutina
    if (creatingForStudent) {
        return (
            <StudentSelectionForCreation
                navigation={navigation}
                students={students}
                onCancel={() => setCreatingForStudent(false)}
            />
        );
    }

    // Paso 2: Modo Gestionar Asignacion de Alumno existente
    if (selectedStudent) {
        return (
            <SafeAreaView style={styles.container}>
                <AssignmentView 
                    student={selectedStudent} 
                    routines={routines} 
                    onAssignmentComplete={handleAssignmentComplete} 
                    onCancel={() => setSelectedStudent(null)} 
                />
            </SafeAreaView>
        );
    }
    
    // --- VISTA PRINCIPAL ---
    return (
        <SafeAreaView style={styles.container}>
            {/* ?? CABECERA ESTILIZADA CON ICONOS (Nueva Implementacion) */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Panel Profesor</Text>
                <View style={styles.headerButtons}>
                    {/* Boton de Actualizar: ICONO */}
                    <TouchableOpacity 
                        onPress={fetchData} 
                        style={[styles.refreshButton, styles.iconButton]}
                        disabled={isLoading}
                    >
                        <Text style={styles.refreshIcon}>??</Text>
                    </TouchableOpacity>
                    {/* Boton de Menu/Opciones */}
                    <TouchableOpacity 
                        onPress={() => setIsMenuVisible(true)} 
                        style={[styles.menuButton, styles.iconButton]}
                    >
                        <Text style={styles.menuIcon}>??</Text>
                    </TouchableOpacity>
                </View>
            </View>
            
            <ScrollView style={styles.scrollContent}>
                
                <View style={styles.actionSection}>
                    <Text style={styles.subtitle}>Opciones del Profesor</Text>
                    
                    {/* BOTON CREAR RUTINA */}
                    <Button 
                        title="Crear Nueva Rutina y Asignar" 
                        onPress={() => setCreatingForStudent(true)} 
                        color="#10B981" 
                    />
                </View>

                {/* -------------------- SECCION DE GESTION DE RUTINAS MAESTRAS -------------------- */}
                <View style={{width: '100%', marginBottom: 20}}>
                    <Text style={styles.listTitle}>Gestion de Rutinas Maestras ({routines.length})</Text>
                    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10, maxHeight: 200 }}>
                        {routines.length > 0 ? (
                            routines.map((r) => (
                                <View key={r.id.toString()} style={styles.routineMasterCard}>
                                    <View style={styles.routineMasterDetails}>
                                        <Text style={styles.routineMasterName}>{r.nombre}</Text>
                                        <Text style={styles.routineMasterDescription}>Ejercicios: {r.exercise_links.length}</Text>
                                    </View>
                                    
                                    <View style={styles.routineMasterActions}>
                                        <TouchableOpacity 
                                            style={[styles.actionButton, { backgroundColor: '#FF9500' }]}
                                            onPress={() => handleEditRoutine(r)} // BOTON EDITAR
                                        >
                                            <Edit size={20} color="#FFFFFF" />
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
                                            onPress={() => handleDeleteRoutine(r.id, r.nombre)} // BOTON ELIMINAR
                                        >
                                            <Trash2 size={20} color="#FFFFFF" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.warningTextCenter}>No hay rutinas maestras creadas.</Text>
                        )}
                    </ScrollView>
                </View>
                {/* -------------------------------------------------------------------------------- */}


                <Text style={styles.listTitle}>Alumnos ({students.length})</Text>

                <FlatList
                    data={students}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={styles.studentCard}
                            onPress={() => setSelectedStudent(item)} // Clic para GESTIONAR ASIGNACION
                        >
                            <View>
                                <Text style={styles.studentName}>{item.nombre}</Text>
                                <Text style={styles.studentEmail}>{item.email}</Text>
                            </View>
                            <Text style={styles.assignButtonText}>GESTIONAR {'>>'}</Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                    ListEmptyComponent={() => (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <Text style={{ color: '#6B7280' }}>No hay alumnos registrados. Puedes registrarlos en tu backend.</Text>
                        </View>
                    )}
                    scrollEnabled={false} // Para que se desplace con el ScrollView principal
                />
            </ScrollView>
            
            {/* ?? MODAL DE OPCIONES DE USUARIO (IDENTICO AL DEL ALUMNO) */}
            <Modal 
                animationType="fade"
                transparent={true}
                visible={isMenuVisible}
                onRequestClose={() => setIsMenuVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPressOut={() => setIsMenuVisible(false)} // Cierra al tocar fuera
                >
                    <View style={styles.menuContainer}>
                        <Text style={styles.menuTitle}>Ajustes de Cuenta</Text>
                        
                        {/* Opcion 1: Cambiar Contrasena */}
                        <TouchableOpacity style={styles.menuItem} onPress={handleChangePassword}>
                            <Text style={styles.menuItemText}>?? Cambiar Contrasena</Text>
                        </TouchableOpacity>
                        
                        {/* Opcion 2: Cerrar Sesion */}
                        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                            <Text style={styles.menuItemTextLogout}>?? Cerrar Sesion</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={[styles.menuItem, styles.menuItemClose]} onPress={() => setIsMenuVisible(false)}>
                            <Text style={styles.menuItemTextClose}>Cerrar Menu</Text>
                        </TouchableOpacity>

                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

// --- ESTILOS ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F0F7', 
    },
    scrollContent: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F0F0F7',
    },
    // ?? NUEVOS ESTILOS DE CABECERA
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        elevation: 2,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 15, // Espacio entre botones de la cabecera
    },
    // Botones de Icono Base
    iconButton: {
        padding: 8, 
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    refreshButton: {
        backgroundColor: '#E6F3FF', 
    },
    refreshIcon: {
        color: '#007AFF',
        fontSize: 22, 
        fontWeight: 'normal',
    },
    menuButton: {
        backgroundColor: '#F0F0F0', 
    },
    menuIcon: {
        color: '#1F2937',
        fontSize: 22, 
        fontWeight: 'normal',
    },
    // FIN NUEVOS ESTILOS DE CABECERA
    
    headerSelection: { // Estilo para el encabezado en la seleccion de alumno
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#DDD',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    titleSelection: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#10B981',
    },
    actionSection: {
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#DDD',
        alignItems: 'center',
        gap: 10,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 5,
    },
    listTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        padding: 20,
        backgroundColor: '#E5E7EB',
    },
    // --- Tarjeta de Alumno ---
    studentCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    studentName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    studentEmail: {
        fontSize: 14,
        color: '#888',
    },
    assignButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FF9500', 
    },
    // --- Tarjeta de Rutina Maestra ---
    routineMasterCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF', 
    },
    routineMasterDetails: {
        flex: 1,
    },
    routineMasterName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    routineMasterDescription: {
        fontSize: 12,
        color: '#6B7280',
    },
    routineMasterActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 8,
        borderRadius: 6,
    },
    warningTextCenter: {
        color: '#FF9500',
        textAlign: 'center',
        padding: 10,
    },
    errorView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#F0F0F7',
    },
    errorTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#FF3B30',
        marginBottom: 10,
    },
    errorDetail: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
    },
    // ?? ESTILOS DEL MODAL (Copiados de App.js)
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
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        paddingBottom: 10,
        marginBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    menuItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    menuItemClose: {
        borderBottomWidth: 0,
        marginTop: 10,
        backgroundColor: '#F0F0F0',
        borderRadius: 8,
        alignItems: 'center',
    },
    menuItemText: {
        fontSize: 15,
        color: '#1F2937',
        fontWeight: '600',
    },
    menuItemTextLogout: {
        fontSize: 15,
        color: '#FF3B30', 
        fontWeight: '600',
    },
    menuItemTextClose: {
        fontSize: 15,
        color: '#555',
        fontWeight: '600',
        padding: 5,
    },
});

const assignmentStyles = StyleSheet.create({
    scrollContainer: {
        flex: 1, 
        backgroundColor: '#F0F0F7'
    },
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
        width: '100%',
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#007AFF',
        marginTop: 20,
        marginBottom: 15,
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingBottom: 5,
    },
    routineListContainer: {
        width: '100%',
        marginBottom: 30,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    routineItem: {
        backgroundColor: '#F0F0F7',
        padding: 15,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    routineItemSelected: {
        backgroundColor: '#D1E7FF',
        borderColor: '#007AFF',
    },
    routineNameItem: {
        fontSize: 16,
        color: '#333',
    },
    warning: {
        fontSize: 16,
        color: '#FF9500',
        textAlign: 'center',
        padding: 10,
    },
    backButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    // --- Estilos de Gestion de Asignaciones ---
    currentAssignmentList: {
        width: '100%',
        marginBottom: 20,
    },
    assignmentCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8F8F8',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        borderLeftWidth: 4, 
        borderLeftColor: '#FF9500', 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    assignmentDetails: {
        flex: 1,
    },
    assignmentDate: {
        fontSize: 14,
        color: '#888',
    },
    deleteButton: {
        marginLeft: 15,
        padding: 10,
        backgroundColor: '#FF3B30', 
        borderRadius: 8,
    },
    toggleButton: {
        marginLeft: 5,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    routineName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    }
});