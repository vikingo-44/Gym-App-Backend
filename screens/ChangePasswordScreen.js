import React, { useState, useContext } from 'react';
import { 
    StyleSheet, Text, View, TextInput, TouchableOpacity, 
    ScrollView, SafeAreaView, Alert, ActivityIndicator 
} from 'react-native';
import axios from 'axios';
import { AuthContext } from '../App'; 
// Importamos useTheme
import { useTheme } from '../ThemeContext'; 

// 🚨 Asegurate de que esta URL sea la misma que en App.js
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 

// ----------------------------------------------------------------------
// GENERADOR DE ESTILOS DINÁMICOS - ESTILO PEAKFIT
// ----------------------------------------------------------------------
const getStyles = (colors) => StyleSheet.create({
    safeArea: {
        flex: 1,
        // Fondo principal negro
        backgroundColor: 'black',
    },
    container: {
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        // Título blanco
        color: 'white',
        marginBottom: 30,
        marginTop: 20,
    },
    input: {
        width: '100%',
        height: 50,
        // Fondo de input oscuro
        backgroundColor: '#1C1C1E',
        // Eliminamos el borde visible
        borderColor: 'transparent',
        borderWidth: 1,
        borderRadius: 10, // Más redondeado
        paddingHorizontal: 15,
        marginBottom: 15,
        fontSize: 16,
        // Color del texto: Blanco
        color: 'white',
    },
    button: {
        width: '100%',
        // Botón principal: Verde brillante
        backgroundColor: '#3ABFBC',
        padding: 15,
        borderRadius: 10, // Más redondeado
        alignItems: 'center',
        marginTop: 20,
        // Sombra del botón (ajustada para el verde)
        shadowColor: '#3ABFBC',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 5,
        elevation: 6,
    },
    buttonText: {
        // Texto del botón: Negro para alto contraste
        color: 'black',
        fontSize: 18,
        fontWeight: 'bold',
    }
});

export default function ChangePasswordScreen({ navigation }) {
    
    const { colors: themeColors, isDark } = useTheme();
    const styles = getStyles(themeColors); // Obtenemos estilos dinámicos

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { getToken, signOut } = useContext(AuthContext);

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "La nueva contraseña y la confirmación no coinciden."); 
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

            Alert.alert("Éxito", "Tu contraseña ha sido actualizada. Por favor, vuelve a iniciar sesión.", [ 
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
                    // Placeholder gris claro
                    placeholderTextColor={'#A9A9A9'}
                    secureTextEntry={true}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    editable={!isLoading}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Nueva Contraseña (mínimo 6 caracteres)" 
                    // Placeholder gris claro
                    placeholderTextColor={'#A9A9A9'}
                    secureTextEntry={true}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!isLoading}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Confirmar Nueva Contraseña"
                    // Placeholder gris claro
                    placeholderTextColor={'#A9A9A9'}
                    secureTextEntry={true}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!isLoading}
                />
                
                {isLoading ? (
                    <ActivityIndicator 
                        size="large" 
                        color={'#3ABFBC'} // Color principal del tema
                        style={{marginTop: 20}} 
                    />
                ) : (
                    <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
                        <Text style={styles.buttonText}>Actualizar Contraseña</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity 
                    onPress={() => navigation.goBack()}
                    style={{marginTop: 30, padding: 10}}
                >
                    <Text style={{color: '#3ABFBC', fontSize: 16, fontWeight: 'bold'}}>
                        Cancelar y Volver
                    </Text>
                </TouchableOpacity>
                
            </ScrollView>
        </SafeAreaView>
    );
}