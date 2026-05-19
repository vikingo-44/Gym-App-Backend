import React, { useState, useContext } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Button, TextInput, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import { useTheme } from '../ThemeContext'; 
import { AuthContext } from '../App'; // Asumiendo que AuthContext esta disponible en '../App'
import { ArrowLeft } from 'lucide-react-native'; // Icono para volver

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
    // 🚨 2. FUNCIoN DE GUARDADO (PATCH a la API)
    // ----------------------------------------------------------------
    const handleSave = async () => {
        if (!hasChanges) {
            Alert.alert("Atencion", "No hay cambios para guardar.");
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
            
            // Envia la solicitud PATCH al nuevo endpoint
            await axios.patch(`${API_URL}/users/student/${student.id}`, updatePayload, { headers });

            Alert.alert("Éxito", `Los datos de ${nombre} se actualizaron correctamente.`);
            
            // 3. Opcional: Volver al profesor screen y forzar recarga de la lista
            navigation.navigate('ProfessorPanel', { reload: true }); 

        } catch (e) {
            console.error("Error al guardar datos del alumno:", e.response ? e.response.data : e.message);
            let errorMessage = "Fallo al actualizar. Verifica la conexión o el DNI/Email ya están en uso.";
            if (e.response && e.response.data && e.response.data.detail) {
                // Muestra un error mas especifico si viene del backend
                errorMessage = e.response.data.detail;
            }
            Alert.alert("Error", errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    // ----------------------------------------------------------------
    // 3. ESTILOS PEAKFIT (Uso de useTheme)
    // ----------------------------------------------------------------
    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: 'black', // 🚨 PEAKFIT: Fondo Negro
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 15,
            paddingTop: Platform.OS === 'android' ? 40 : 15,
            backgroundColor: 'black',
            borderBottomWidth: 1,
            borderBottomColor: '#1C1C1E', // Línea de separación sutil
        },
        scrollContent: {
            padding: 20,
        },
        title: {
            fontSize: 26,
            fontWeight: 'bold',
            color: 'white', // 🚨 PEAKFIT: Título Blanco
            marginBottom: 20,
            borderBottomWidth: 2,
            borderBottomColor: '#3ABFBC', // 🚨 PEAKFIT: Línea divisoria verde
            paddingBottom: 5,
        },
        detailCard: {
            backgroundColor: '#1C1C1E', // 🚨 PEAKFIT: Fondo de tarjeta Dark Gray
            padding: 15,
            borderRadius: 10,
            marginBottom: 15,
            borderLeftWidth: 5,
            borderLeftColor: '#3ABFBC', // 🚨 PEAKFIT: Borde verde
        },
        detailLabel: {
            fontSize: 14,
            color: '#A9A9A9', // 🚨 PEAKFIT: Texto Secundario Gris
            fontWeight: '600',
            marginTop: 15,
            marginBottom: 5,
        },
        inputField: {
            fontSize: 18,
            color: 'white', // 🚨 PEAKFIT: Texto Blanco
            fontWeight: 'bold',
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: '#A9A9A9', // 🚨 PEAKFIT: Borde sutil gris
            backgroundColor: 'black', // 🚨 PEAKFIT: Fondo de Input más oscuro
            borderRadius: 6,
            paddingHorizontal: 10,
            marginBottom: 10,
        },
        detailValueStatic: {
            fontSize: 18,
            color: 'white', // 🚨 PEAKFIT: Texto Blanco para valores
            fontWeight: 'bold',
        },
        buttonContainer: {
            marginTop: 30,
            gap: 10,
        },
        customButton: {
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '100%',
        },
        buttonText: {
            fontSize: 16,
            fontWeight: 'bold',
            color: 'black', // Texto negro en verde
        },
        buttonSuccess: {
            backgroundColor: '#3ABFBC',
        },
        buttonSecondary: {
            backgroundColor: '#1C1C1E',
        },
        buttonTextSecondary: {
            color: 'white',
        }
    });

    // Función para renderizar el botón de guardado (Personalizado)
    const renderSaveButton = () => (
        <TouchableOpacity
            style={[
                styles.customButton, 
                styles.buttonSuccess, 
                { opacity: !hasChanges || isLoading ? 0.5 : 1 }
            ]}
            onPress={handleSave}
            disabled={!hasChanges || isLoading}
        >
            <Text style={styles.buttonText}>
                {isLoading ? "Guardando..." : (hasChanges ? "GUARDAR CAMBIOS" : "Sin Cambios")}
            </Text>
        </TouchableOpacity>
    );

    // Función para renderizar el botón de Volver (Personalizado)
    const renderBackButton = () => (
        <TouchableOpacity
            style={[styles.customButton, styles.buttonSecondary, {marginTop: 10}]}
            onPress={() => navigation.goBack()}
        >
            <Text style={styles.buttonTextSecondary}>Volver sin Guardar</Text>
        </TouchableOpacity>
    );

    // ----------------------------------------------------------------
    // 4. RENDERIZADO
    // ----------------------------------------------------------------
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={'white'} />
                </TouchableOpacity>
                <Text style={[styles.title, {flex: 1, textAlign: 'center', borderBottomWidth: 0, marginHorizontal: 10, marginBottom: 0}]}>
                    Editar Alumno
                </Text>
                <View style={{width: 24}}/>
            </View>
            
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Detalles de: {student.nombre}</Text>

                <View style={styles.detailCard}>
                    
                    {/* CAMPO EDITABLE: Nombre Completo */}
                    <Text style={styles.detailLabel}>Nombre Completo:</Text>
                    <TextInput
                        style={styles.inputField}
                        value={nombre}
                        onChangeText={setNombre}
                        placeholder="Nombre"
                        placeholderTextColor={'#A9A9A9'}
                        editable={!isLoading}
                    />

                    {/* CAMPO EDITABLE: Email */}
                    <Text style={styles.detailLabel}>Email:</Text>
                    <TextInput
                        style={styles.inputField}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Email"
                        placeholderTextColor={'#A9A9A9'}
                        keyboardType="email-address"
                        editable={!isLoading}
                    />

                    {/* CAMPO EDITABLE: DNI */}
                    <Text style={styles.detailLabel}>DNI:</Text>
                    <TextInput
                        style={styles.inputField}
                        value={dni}
                        onChangeText={setDni}
                        placeholder="DNI"
                        placeholderTextColor={'#A9A9A9'}
                        keyboardType="numeric"
                        editable={!isLoading}
                    />

                    {/* CAMPO ESTaTICO: ID Interno (No editable) */}
                    <Text style={styles.detailLabel}>ID Interno (Estatico):</Text>
                    <Text style={styles.detailValueStatic}>{student.id}</Text>
                    
                </View>
                
                <View style={styles.buttonContainer}>
                    {isLoading ? (
                        <ActivityIndicator size="large" color={'#3ABFBC'} />
                    ) : (
                        <>
                            {renderSaveButton()}
                            {renderBackButton()}
                        </>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}