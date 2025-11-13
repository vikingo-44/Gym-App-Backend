import React, { useState, useContext } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Button, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import { useTheme } from '../ThemeContext'; 
import { AuthContext } from '../App'; // Asumiendo que AuthContext está disponible en '../App'

const API_URL = "https://gym-app-backend-e9bn.onrender.com";

export default function StudentDetailsScreen({ navigation }) {
    
    const route = useRoute();
    const { student } = route.params;
    const { colors: themeColors } = useTheme();
    const { getToken } = useContext(AuthContext);

    // 🚨 1. ESTADOS EDITABLES
    const [nombre, setNombre] = useState(student.nombre || '');
    const [email, setEmail] = useState(student.email || '');
    const [dni, setDni] = useState(student.dni || '');
    const [isLoading, setIsLoading] = useState(false);
    
    // El ID interno (student.id) NO es editable.
    const hasChanges = nombre !== student.nombre || email !== student.email || dni !== student.dni;

    // ----------------------------------------------------------------
    // 🚨 2. FUNCIÓN DE GUARDADO (PATCH a la API)
    // ----------------------------------------------------------------
    const handleSave = async () => {
        if (!hasChanges) {
            Alert.alert("Atención", "No hay cambios para guardar.");
            return;
        }

        if (!nombre.trim() || !email.trim() || !dni.trim()) {
            Alert.alert("Error", "Todos los campos deben estar completos.");
            return;
        }

        setIsLoading(true);
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };
            
            const updatePayload = {
                nombre: nombre.trim(),
                email: email.trim(),
                dni: dni.trim(),
            };
            
            // Envía la solicitud PATCH al nuevo endpoint
            await axios.patch(`${API_URL}/users/student/${student.id}`, updatePayload, { headers });

            Alert.alert("Éxito", `Los datos de ${nombre} se actualizaron correctamente.`);
            
            // 3. Opcional: Volver al profesor screen y forzar recarga de la lista
            navigation.navigate('ProfessorPanel', { reload: true }); 

        } catch (e) {
            console.error("Error al guardar datos del alumno:", e.response ? e.response.data : e.message);
            let errorMessage = "Fallo al actualizar. Verifica la conexión o el DNI/Email ya están en uso.";
            if (e.response && e.response.data && e.response.data.detail) {
                // Muestra un error más específico si viene del backend
                errorMessage = e.response.data.detail;
            }
            Alert.alert("Error", errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    // ----------------------------------------------------------------
    // 3. ESTILOS (Uso de useTheme)
    // ----------------------------------------------------------------
    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: themeColors.background,
        },
        scrollContent: {
            padding: 20,
        },
        title: {
            fontSize: 26,
            fontWeight: 'bold',
            color: themeColors.primary,
            marginBottom: 20,
            borderBottomWidth: 2,
            borderBottomColor: themeColors.divider,
            paddingBottom: 5,
        },
        detailCard: {
            backgroundColor: themeColors.card,
            padding: 15,
            borderRadius: 10,
            marginBottom: 15,
            borderLeftWidth: 5,
            borderLeftColor: themeColors.primary,
        },
        detailLabel: {
            fontSize: 14,
            color: themeColors.textSecondary,
            fontWeight: '600',
            marginTop: 10,
            marginBottom: 5,
        },
        // 🚨 Estilo para el TextInput (Editable)
        inputField: {
            fontSize: 18,
            color: themeColors.textPrimary,
            fontWeight: 'bold',
            paddingVertical: 5,
            borderBottomWidth: 1,
            borderBottomColor: themeColors.divider,
            backgroundColor: themeColors.isDark ? themeColors.highlight : themeColors.background,
            borderRadius: 4,
            paddingHorizontal: 10,
        },
        detailValueStatic: {
            fontSize: 18,
            color: themeColors.textSecondary,
            fontWeight: 'bold',
        },
        buttonContainer: {
            marginTop: 30,
            gap: 10,
        }
    });

    // ----------------------------------------------------------------
    // 4. RENDERIZADO
    // ----------------------------------------------------------------
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Editar Alumno: {student.nombre}</Text>

                <View style={styles.detailCard}>
                    
                    {/* CAMPO EDITABLE: Nombre Completo */}
                    <Text style={styles.detailLabel}>Nombre Completo:</Text>
                    <TextInput
                        style={styles.inputField}
                        value={nombre}
                        onChangeText={setNombre}
                        placeholder="Nombre"
                        placeholderTextColor={themeColors.textSecondary}
                    />

                    {/* CAMPO EDITABLE: Email */}
                    <Text style={styles.detailLabel}>Email:</Text>
                    <TextInput
                        style={styles.inputField}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Email"
                        placeholderTextColor={themeColors.textSecondary}
                        keyboardType="email-address"
                    />

                    {/* CAMPO EDITABLE: DNI */}
                    <Text style={styles.detailLabel}>DNI:</Text>
                    <TextInput
                        style={styles.inputField}
                        value={dni}
                        onChangeText={setDni}
                        placeholder="DNI"
                        placeholderTextColor={themeColors.textSecondary}
                        keyboardType="numeric"
                    />

                    {/* CAMPO ESTÁTICO: ID Interno (No editable) */}
                    <Text style={styles.detailLabel}>ID Interno (Estático):</Text>
                    <Text style={styles.detailValueStatic}>{student.id}</Text>
                    
                    {/* 🚨 ROL ELIMINADO según solicitud */}
                    
                </View>
                
                <View style={styles.buttonContainer}>
                    {isLoading ? (
                        <ActivityIndicator size="large" color={themeColors.primary} />
                    ) : (
                        <Button 
                            title={hasChanges ? "GUARDAR CAMBIOS" : "Sin Cambios"} 
                            onPress={handleSave} 
                            color={themeColors.success} 
                            disabled={!hasChanges}
                        />
                    )}
                </View>
                <View style={{marginTop: 10}}>
                    <Button title="Volver sin Guardar" onPress={() => navigation.goBack()} color={themeColors.textSecondary} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}