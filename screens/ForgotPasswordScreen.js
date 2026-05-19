import React, { useState } from 'react';
import { 
    StyleSheet, Text, View, TextInput, TouchableOpacity, 
    ScrollView, SafeAreaView, Alert, ActivityIndicator 
} from 'react-native';
import axios from 'axios';
import { useTheme } from '../ThemeContext'; // Importamos useTheme
import { ArrowLeft, Mail, User } from 'lucide-react-native';

// 🚨 Asegúrate de que esta URL sea la misma que en App.js
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 

// ----------------------------------------------------------------------
// GENERADOR DE ESTILOS DINÁMICOS - ESTILO PEAKFIT
// ----------------------------------------------------------------------
const getStyles = (colors) => StyleSheet.create({
    safeArea: {
        flex: 1,
        // Fondo principal negro
        backgroundColor: 'black', // 🚨 PEAKFIT
    },
    container: {
        padding: 25,
        alignItems: 'center',
        flexGrow: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        // Título blanco
        color: 'white', // 🚨 PEAKFIT
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#A9A9A9', // Gris claro para el subtítulo
        marginBottom: 40,
        textAlign: 'center',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        height: 50,
        // Fondo de input oscuro
        backgroundColor: '#1C1C1E', // 🚨 PEAKFIT
        borderRadius: 10, // Más redondeado
        paddingHorizontal: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'transparent', 
    },
    input: {
        flex: 1,
        fontSize: 16,
        // Color del texto: Blanco
        color: 'white', // 🚨 PEAKFIT
        marginLeft: 10, 
    },
    button: {
        width: '100%',
        // Botón principal: Verde brillante
        backgroundColor: '#3ABFBC', // 🚨 PEAKFIT
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        // Sombra del botón (ajustada para el verde)
        shadowColor: '#3ABFBC', // 🚨 PEAKFIT
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
        elevation: 6,
    },
    buttonText: {
        // Texto del botón: Negro para alto contraste
        color: 'black', // 🚨 PEAKFIT
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        marginTop: 30,
        padding: 10,
    },
    backButtonText: {
        color: '#A9A9A9', // Gris claro para el enlace de volver
        fontSize: 16,
        fontWeight: '600',
    }
});

export default function ForgotPasswordScreen({ navigation }) {
    
    const { colors: themeColors } = useTheme();
    const styles = getStyles(themeColors);

    const [identifier, setIdentifier] = useState(''); // Puede ser DNI o Email
    const [isLoading, setIsLoading] = useState(false);
    
    // Color para los iconos y placeholder
    const iconColor = '#A9A9A9'; 
    const placeholderColor = '#A9A9A9';

    const handleResetPassword = async () => {
        if (!identifier.trim()) {
            Alert.alert("Error", "Por favor, ingresa tu DNI o Email.");
            return;
        }

        setIsLoading(true);
        // 🚨 NOTA: Este es un placeholder, ya que la lógica real del backend 
        // para "olvidé mi contraseña" (enviar un token/link) no está implementada.
        try {
            // ---------------------------------------------------------
            // 🚨 AQUÍ IRÍA LA LLAMADA A TU ENDPOINT DE PASSWORD RESET
            // ---------------------------------------------------------
            
            // Ejemplo de llamada (asume un endpoint que pide el identificador)
            /*
            await axios.post(`${API_URL}/password/forgot`, {
                identifier: identifier.trim()
            });
            */
            
            // Simulación de éxito (reemplazar con la lógica real)
            await new Promise(resolve => setTimeout(resolve, 1500)); 

            Alert.alert(
                "¡Solicitud Enviada!", 
                "Si el DNI/Email es correcto, recibirás un correo con instrucciones para restablecer tu contraseña."
            );
            
            // Opcional: Navegar de vuelta al login después del éxito
            navigation.goBack(); 

        } catch (e) {
            console.error("Error al solicitar restablecimiento:", e.response ? e.response.data : e.message);
            
            // Mensaje genérico para no revelar si el DNI/Email existe
            const errorMessage = "No se pudo procesar la solicitud. Por favor, verifica el identificador e inténtalo de nuevo más tarde.";

            Alert.alert("Error", errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                
                <Text style={styles.title}>¿Olvidaste tu Contraseña?</Text>
                <Text style={styles.subtitle}>
                    Ingresa tu DNI o Email para que podamos enviarte instrucciones para restablecerla.
                </Text>

                <View style={styles.inputWrapper}>
                    <User size={20} color={iconColor} />
                    <TextInput
                        style={styles.input}
                        placeholder="DNI o Email"
                        placeholderTextColor={placeholderColor}
                        value={identifier}
                        onChangeText={setIdentifier}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!isLoading}
                    />
                </View>
                
                {isLoading ? (
                    <ActivityIndicator 
                        size="large" 
                        color={'#3ABFBC'} 
                        style={{marginTop: 20}} 
                    />
                ) : (
                    <TouchableOpacity 
                        style={styles.button} 
                        onPress={handleResetPassword}
                        disabled={!identifier.trim()}
                    >
                        <Text style={styles.buttonText}>Restablecer Contraseña</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity 
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Text style={styles.backButtonText}>
                        <ArrowLeft size={14} color={iconColor} style={{marginRight: 5}}/> Volver al Inicio de Sesión
                    </Text>
                </TouchableOpacity>
                
            </ScrollView>
        </SafeAreaView>
    );
}