import React, { useState, useContext } from 'react';
import { 
    StyleSheet, Text, View, TextInput, Button, SafeAreaView, 
    ScrollView, ActivityIndicator, TouchableOpacity, Modal, Alert,
    KeyboardAvoidingView, Platform, 
    ImageBackground, Image 
} from 'react-native';
import axios from 'axios';
import { AuthContext } from '../App'; 
import { useTheme } from '../ThemeContext'; 

// ----------------------------------------------------------------------
// URIs de Imagenes del Gimnasio
// ----------------------------------------------------------------------
const LOGO_SOURCE = require('../assets/logoND.jpg'); 
const BACKGROUND_SOURCE = require('../assets/wallpaper.jpg'); 


// ----------------------------------------------------------------------
// Componente de Registro de Alumno (Modal)
// ----------------------------------------------------------------------
function RegisterModal({ isVisible, onClose, API_URL, themeColors }) {
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [dni, setDni] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const styles = getStyles(themeColors); 

    const handleRegister = async () => {
        if (!nombre || !email || !dni || !password) {
            setError("Todos los campos son obligatorios.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            await axios.post(`${API_URL}/register/student`, {
                nombre, email, dni, password,
                rol: "Alumno" 
            });

            setSuccess(true);
            setNombre(''); setEmail(''); setDni(''); setPassword('');
            
        } catch (e) {
            console.error("Error en el registro:", e.response ? e.response.data : e.message);
            const detail = e.response?.data?.detail;
            let msg = detail && typeof detail === 'string' ? detail : "Fallo desconocido en el servidor.";

            if (msg.includes("DNI ya esta registrado")) {
                msg = "El DNI proporcionado ya se encuentra registrado.";
            } else if (msg.includes("El email ya esta registrado")) {
                msg = "El Email proporcionado ya se encuentra registrado.";
            } else if (e.message === 'Network Error') {
                msg = `Error de Conexion. Asegurate de que el servidor de FastAPI y Ngrok estan activos y que la URL (${API_URL}) es la correcta.`;
            }

            setError(`Error en el registro: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={false}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <SafeAreaView style={[styles.modalContainer, {backgroundColor: themeColors.background}]}>
                <ScrollView contentContainerStyle={styles.modalContent}>
                    <Text style={[styles.modalTitle, {color: themeColors.textPrimary}]}>Registro de Alumno</Text>
                    
                    {error && <Text style={[styles.errorText, {color: themeColors.danger}]}>{error}</Text>}
                    {success && <Text style={[styles.successText, {color: themeColors.success}]}>¡Registro exitoso! Ya puedes ingresar con tu DNI y contraseña.</Text>}

                    <TextInput
                        style={[styles.input, {
                            backgroundColor: themeColors.inputBackground, 
                            color: themeColors.textPrimary,
                            borderColor: themeColors.inputBorder,
                        }]}
                        placeholder="Nombre completo"
                        placeholderTextColor={themeColors.textSecondary}
                        value={nombre}
                        onChangeText={setNombre}
                    />
                    <TextInput
                        style={[styles.input, {
                            backgroundColor: themeColors.inputBackground, 
                            color: themeColors.textPrimary,
                            borderColor: themeColors.inputBorder,
                        }]}
                        placeholder="Email"
                        placeholderTextColor={themeColors.textSecondary}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={[styles.input, {
                            backgroundColor: themeColors.inputBackground, 
                            color: themeColors.textPrimary,
                            borderColor: themeColors.inputBorder,
                        }]}
                        placeholder="Numero de Documento (DNI)"
                        placeholderTextColor={themeColors.textSecondary}
                        value={dni}
                        onChangeText={setDni}
                        keyboardType="numeric"
                    />
                    <TextInput
                        style={[styles.input, {
                            backgroundColor: themeColors.inputBackground, 
                            color: themeColors.textPrimary,
                            borderColor: themeColors.inputBorder,
                        }]}
                        placeholder="Contraseña"
                        placeholderTextColor={themeColors.textSecondary}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry 
                    />
                    
                    {isLoading ? (
                        <ActivityIndicator size="large" color={themeColors.primary} />
                    ) : (
                        <Button 
                            title="Registrarse como Alumno" 
                            onPress={handleRegister} 
                            color={themeColors.success} 
                        />
                    )}
                    
                    <View style={{marginTop: 20}}>
                        <Button 
                            title="Volver a Ingresar" 
                            onPress={onClose} 
                            color={themeColors.textSecondary}
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

// ----------------------------------------------------------------------
// Funcion de Login Personalizada 
// ----------------------------------------------------------------------
export default function CustomLoginScreen({ signIn, API_URL }) {
    const { colors: themeColors, isDark, toggleTheme } = useTheme(); 

    const [dni, setDni] = useState(''); 
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const { getToken } = useContext(AuthContext);

    const handleLogin = async () => {
        if (!dni || !password) {
            setError("Por favor, ingresa DNI y contraseña.");
            return;
        }
        
        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.post(`${API_URL}/login`, {
                dni: dni, 
                password: password
            });

            const token = response.data.access_token;
            await signIn(token); 

        } catch (e) {
            console.error("Error de Login:", e.response ? e.response.data : e.message);
            
            let errorMessage = "DNI o contraseña incorrectos.";
            if (e.message === 'Network Error') {
                errorMessage = `Error de Conexion. Asegurate de que el servidor de FastAPI y Ngrok estan activos y que la URL (${API_URL}) es la correcta.`;
            } else if (e.response && e.response.status !== 401) {
                errorMessage = `Error del Servidor (${e.response.status}). Intenta mas tarde.`;
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const styles = getStyles(themeColors);

    const [isRegisterVisible, setIsRegisterVisible] = useState(false); 

    return (
        <ImageBackground 
            source={BACKGROUND_SOURCE} 
            style={styles.container}
            resizeMode="cover" 
        >
            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView 
                    style={{ flex: 1 }} 
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                
                    <RegisterModal 
                        isVisible={isRegisterVisible} 
                        onClose={() => setIsRegisterVisible(false)} 
                        API_URL={API_URL} 
                        themeColors={themeColors}
                    />

                    <ScrollView contentContainerStyle={styles.contentTransparent}>
                        
                        <View style={styles.header}>
                            <Image 
                                source={LOGO_SOURCE} 
                                style={styles.logo} // Estilo 'logo' con efecto
                                resizeMode="contain"
                            />
                            {/* 🚨 APLICA SOMBRA DE TEXTO Y COLOR BLANCO */}
                            <Text style={styles.slogan}>Es hora de llegar muy lejos</Text>
                        </View>

                        {/* Cambio: Ajustar el color de fondo de error para que funcione sobre cualquier fondo */}
                        {error && <Text style={[styles.errorText, {color: themeColors.danger, backgroundColor: isDark ? '#B91C1CAB' : '#FFEBEEAA'}]}>{error}</Text>}
                        
                        <TextInput
                            style={[styles.input, {
                                backgroundColor: themeColors.inputBackground, 
                                color: themeColors.textPrimary,
                                borderColor: themeColors.inputBorder,
                            }]}
                            placeholder="Numero de Documento (DNI)"
                            placeholderTextColor={themeColors.textSecondary}
                            value={dni}
                            onChangeText={setDni}
                            keyboardType="numeric" 
                            autoCapitalize="none"
                        />
                        <TextInput
                            style={[styles.input, {
                                backgroundColor: themeColors.inputBackground, 
                                color: themeColors.textPrimary,
                                borderColor: themeColors.inputBorder,
                            }]}
                            placeholder="Contraseña"
                            placeholderTextColor={themeColors.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry 
                        />
                        
                        {isLoading ? (
                            <ActivityIndicator size="large" color={themeColors.primary} />
                        ) : (
                            <>
                                <Button 
                                    title="Ingresar" 
                                    onPress={handleLogin} 
                                    color={themeColors.primary}
                                />
                                <View style={{marginTop: 20}}>
                                    <Button
                                        title="Registrarse como Alumno"
                                        onPress={() => setIsRegisterVisible(true)}
                                        color={themeColors.warning} 
                                    />
                                </View>
                            </>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ImageBackground>
    );
}

// ----------------------------------------------------------------------
// Funcion que genera los estilos basicos estaticos
// ----------------------------------------------------------------------
const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
    },
    // Contenedor principal transparente
    contentTransparent: {
        padding: 30,
        flexGrow: 1,
        justifyContent: 'center', 
        backgroundColor: 'transparent', 
        borderRadius: 20, 
        marginHorizontal: 20,
        paddingVertical: 50,
        alignSelf: 'center',
        width: Platform.OS === 'web' ? '40%' : '100%', 
        maxWidth: 400,
        shadowColor: 'transparent',
        elevation: 0,
    },
    themeToggleContainer: {
        position: 'absolute',
        top: 20,
        right: 20,
        padding: 10,
        zIndex: 10, 
    },
    themeToggleText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    header: {
        alignItems: 'center',
        marginBottom: 30, 
    },
    logo: {
        // Estilos del logo (Se mantienen)
        width: 180, 
        height: 120, 
        borderRadius: 20, 
        marginBottom: 15,
        alignSelf: 'center', 
        overflow: 'hidden', 
        // Efecto de sombra sutil pero estético (Se mantiene)
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 12, 
    },
    // 🚨 MODIFICACIÓN: Estilo del eslogan con Text Shadow para mejorar contraste
    slogan: {
        fontSize: 16,
        fontStyle: 'italic',
        color: 'white', // Color blanco para el texto
        marginTop: 15,
        // Sombra de texto para crear un contorno negro y aumentar la legibilidad
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 20,
        fontSize: 16,
    },
    errorText: {
        marginBottom: 15,
        textAlign: 'center',
        padding: 10,
        borderRadius: 8,
        fontWeight: '600',
    },
    // Estilos del Modal de Registro
    modalContainer: {
        flex: 1,
        paddingTop: 40,
    },
    modalContent: {
        padding: 30,
        flexGrow: 1,
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
    },
    successText: {
        marginBottom: 15,
        textAlign: 'center',
        fontWeight: 'bold',
    }
});