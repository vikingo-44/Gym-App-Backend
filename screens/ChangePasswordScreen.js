import React, { useState, useContext } from 'react';
import { 
    StyleSheet, Text, View, TextInput, TouchableOpacity, 
    ScrollView, SafeAreaView, Alert, ActivityIndicator 
} from 'react-native';
import axios from 'axios';
// Importa el AuthContext desde tu App.js (asume que esta en la misma carpeta superior)
import { AuthContext } from '../App'; 

// 🚨 Asegurate de que esta URL sea la misma que en App.js
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 

export default function ChangePasswordScreen({ navigation }) {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { getToken, signOut } = useContext(AuthContext);

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "La nueva contraseña y la confirmacion no coinciden.");
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert("Error", "La nueva contraseña debe tener al menos 6 caracteres.");
            return;
        }

        setIsLoading(true);
        try {
            const token = await getToken();
            
            if (!token) {
                signOut();
                return;
            }

            // 🚨 RUTA DE LA API que crearemos en main.py
            const response = await axios.post(`${API_URL}/users/change-password`, {
                old_password: oldPassword,
                new_password: newPassword
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            Alert.alert("exito", "Tu contraseña ha sido actualizada. Por favor, vuelve a iniciar sesion.", [
                { 
                    text: "OK", 
                    onPress: () => signOut() // Forzamos el cierre para que use el nuevo hash
                }
            ]);

        } catch (e) {
            console.error("Error al cambiar contraseña:", e.response ? e.response.data : e.message);
            const errorDetail = e.response?.data?.detail || "Fallo desconocido al cambiar la contraseña.";
            Alert.alert("Error", errorDetail);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Cambiar Contraseña</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Contraseña Antigua"
                    secureTextEntry={true}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    editable={!isLoading}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Nueva Contraseña (minimo 6 caracteres)"
                    secureTextEntry={true}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!isLoading}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Confirmar Nueva Contraseña"
                    secureTextEntry={true}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!isLoading}
                />
                
                {isLoading ? (
                    <ActivityIndicator size="large" color="#007AFF" style={{marginTop: 20}} />
                ) : (
                    <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
                        <Text style={styles.buttonText}>Actualizar Contraseña</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F0F4F8',
    },
    container: {
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 30,
        marginTop: 20,
    },
    input: {
        width: '100%',
        height: 50,
        backgroundColor: '#FFFFFF',
        borderColor: '#E0E0E0',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 15,
        fontSize: 16,
        color: '#333',
    },
    button: {
        width: '100%',
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    }
});