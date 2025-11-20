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
const LOGO_SOURCE = require('../assets/logoND.png'); 
const BACKGROUND_SOURCE = require('../assets/wallpaper.jpg'); 

// ----------------------------------------------------------------------
// Componente de Registro de Alumno (Modal) - SE MANTIENE IGUAL
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
            <SafeAreaView style={[styles.modalContainer, {backgroundColor: 'black'}]}>
                <ScrollView contentContainerStyle={styles.modalContent}>
                    <Text style={[styles.modalTitle, {color: 'white'}]}>Registro de Alumno</Text>
                    
                    {error && <Text style={[styles.errorText, {color: 'white', backgroundColor: '#B91C1CAB'}]}>{error}</Text>}
                    {success && <Text style={[styles.successText, {color: '#3ABFBC'}]}>¡Registro exitoso! Ya puedes ingresar con tu DNI y contraseña.</Text>}

                    <TextInput
                        style={[styles.input, {
                            backgroundColor: '#1C1C1E', 
                            color: 'white',
                            borderColor: '#1C1C1E',
                        }]}
                        placeholder="Nombre completo"
                        placeholderTextColor={'#A9A9A9'}
                        value={nombre}
                        onChangeText={setNombre}
                    />
                    <TextInput
                        style={[styles.input, {
                            backgroundColor: '#1C1C1E', 
                            color: 'white',
                            borderColor: '#1C1C1E',
                        }]}
                        placeholder="Email"
                        placeholderTextColor={'#A9A9A9'}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={[styles.input, {
                            backgroundColor: '#1C1C1E', 
                            color: 'white',
                            borderColor: '#1C1C1E',
                        }]}
                        placeholder="Numero de Documento (DNI)"
                        placeholderTextColor={'#A9A9A9'}
                        value={dni}
                        onChangeText={setDni}
                        keyboardType="numeric"
                    />
                    <TextInput
                        style={[styles.input, {
                            backgroundColor: '#1C1C1E', 
                            color: 'white',
                            borderColor: '#1C1C1E',
                        }]}
                        placeholder="Contraseña"
                        placeholderTextColor={'#A9A9A9'}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry 
                    />
                    
                    <TouchableOpacity
                        style={[styles.customButton, styles.buttonSuccess, { opacity: isLoading ? 0.6 : 1, marginTop: 30 }]}
                        onPress={handleRegister}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color={'black'} />
                        ) : (
                            <Text style={styles.buttonText}>REGISTRARSE</Text>
                        )}
                    </TouchableOpacity>
                    
                    <View style={{marginTop: 20}}>
                        <TouchableOpacity
                            style={[styles.customButton, styles.buttonSecondary, {marginTop: 0}]}
                            onPress={onClose}
                        >
                            <Text style={styles.buttonTextSecondary}>VOLVER A INGRESAR</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

// ----------------------------------------------------------------------
// Funcion de Login Personalizada (Estilo PEAKFIT final)
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
            style={styles.backgroundImagePeakfit}
            imageStyle={styles.backgroundImageStylePeakfit} 
        >
            <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}> 
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

                    <ScrollView contentContainerStyle={styles.contentLogin}>
                        
                        <View style={styles.headerPeakfit}>
                            {/* Logo */}
                            <Image source={LOGO_SOURCE} style={styles.logoImagePeakfit} />
                            {/* Lema */}
                            <Text style={styles.sloganText}>Es hora de llegar muy lejos</Text>
                        </View>

                        {/* Título en español */}
                        <Text style={styles.titlePeakfit}>Iniciar Sesión</Text>
                        
                        {error && <Text style={styles.errorText}>{error}</Text>}
                        
                        {/* INPUT: Email o DNI */}
                        <Text style={styles.inputLabelPeakfit}>Email o DNI</Text>
                        <TextInput
                            style={[styles.inputPeakfit, {
                                backgroundColor: '#1C1C1E', 
                                color: 'white',
                            }]}
                            placeholder="Email o DNI"
                            placeholderTextColor={'#A9A9A9'}
                            value={dni} 
                            onChangeText={setDni}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        
                        {/* INPUT: Contraseña */}
                        <Text style={styles.inputLabelPeakfit}>Contraseña</Text>
                        <View style={styles.passwordContainerPeakfit}>
                            <TextInput
                                style={[styles.inputPeakfit, styles.passwordInputPeakfit, {
                                    backgroundColor: '#1C1C1E', 
                                    color: 'white',
                                }]}
                                placeholder="Contraseña"
                                placeholderTextColor={'#A9A9A9'}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                            <Text style={styles.passwordIconPeakfit}>👁️</Text>
                        </View>

                        {/* 🚨 ELIMINAMOS: utilityRowPeakfit (Mantener sesión y Olvidaste contraseña) */}
                        
                        {isLoading ? (
                            <ActivityIndicator size="large" color={'#3ABFBC'} style={{marginTop: 25}}/>
                        ) : (
                            <>
                                {/* BOTÓN INICIAR SESIÓN */}
                                <TouchableOpacity
                                    style={[styles.customButtonPeakfit, styles.buttonPrimaryPeakfit, {marginTop: 30}]}
                                    onPress={handleLogin}
                                >
                                    <Text style={styles.buttonTextPeakfit}>INICIAR SESIÓN</Text>
                                </TouchableOpacity>
                            </>
                        )}
                        
                        {/* Enlace de registro (Sign Up) */}
                        <View style={styles.signUpContainerPeakfit}>
                            <Text style={styles.signUpTextPeakfit}>¿No tienes una cuenta? </Text>
                            <TouchableOpacity onPress={() => setIsRegisterVisible(true)}>
                                <Text style={styles.signUpLinkPeakfit}>Registrarse</Text>
                            </TouchableOpacity>
                        </View>

                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ImageBackground>
    );
}

// ----------------------------------------------------------------------
// Funcion que genera los estilos del nuevo diseño "Peakfit"
// ----------------------------------------------------------------------
const getStyles = (colors) => StyleSheet.create({
    // -------------------------------------------------------------------
    // ESTILOS BASE PEAKFIT 
    // -------------------------------------------------------------------
    backgroundImagePeakfit: {
        flex: 1,
    },
    backgroundImageStylePeakfit: {
        opacity: 0.4, 
    },
    contentLogin: {
        paddingHorizontal: 25,
        paddingVertical: 50, 
        flexGrow: 1,
        justifyContent: 'center',
    },

    // Logo y Encabezado
    headerPeakfit: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logoImagePeakfit: {
        width: 200, 
        height: 200, 
        resizeMode: 'contain',
    },
    sloganText: {
        fontSize: 14,
        color: '#A9A9A9',
        fontStyle: 'italic',
        marginTop: -20, 
        marginBottom: 20,
    },
    
    // Títulos y Subtítulos
    titlePeakfit: {
        fontSize: 30,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 15, 
    },

    // Inputs
    inputLabelPeakfit: {
        fontSize: 14,
        color: '#A9A9A9',
        marginBottom: 8,
    },
    inputPeakfit: {
        height: 50,
        backgroundColor: '#1C1C1E', 
        color: 'white',
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 20,
        fontSize: 16,
        borderWidth: 0, 
    },

    // Password con Icono 
    passwordContainerPeakfit: {
        flexDirection: 'row',
        alignItems: 'center',
        // 🚨 CAMBIO: Se ajusta el margen inferior para alinearse con el diseño sin utilityRow
        marginBottom: 0, 
    },
    passwordInputPeakfit: {
        flex: 1,
        marginBottom: 0,
    },
    passwordIconPeakfit: {
        position: 'absolute',
        right: 15,
        color: '#A9A9A9',
        fontSize: 18,
    },

    // 🚨 ELIMINAMOS: utilityRowPeakfit, checkboxContainerPeakfit, checkboxPeakfit, checkboxTextPeakfit, forgotPasswordPeakfit.

    // Botones Principales
    customButtonPeakfit: {
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#3ABFBC',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    buttonPrimaryPeakfit: {
        backgroundColor: '#3ABFBC', 
    },
    buttonTextPeakfit: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'black', 
    },

    // Enlace de Registro (Sign Up)
    signUpContainerPeakfit: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 40, 
    },
    signUpTextPeakfit: {
        color: '#A9A9A9',
        fontSize: 14,
    },
    signUpLinkPeakfit: {
        color: '#3ABFBC', 
        fontSize: 14,
        fontWeight: 'bold',
    },
    
    // Estilo de error modificado
    errorText: {
        marginBottom: 15,
        textAlign: 'center',
        padding: 10,
        borderRadius: 8,
        fontWeight: '600',
        color: 'white', 
        backgroundColor: '#B91C1CAB', 
    },

    // -------------------------------------------------------------------
    // ESTILOS DEL MODAL DE REGISTRO
    // -------------------------------------------------------------------
    modalContainer: {
        flex: 1,
        paddingTop: 40,
        backgroundColor: 'black', 
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
        color: 'white', 
    },
    input: { 
        height: 50,
        backgroundColor: '#1C1C1E', 
        color: 'white',
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 20,
        fontSize: 16,
        borderWidth: 0,
    },
    customButton: { 
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 10, 
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 100,
        marginTop: 15,
    },
    buttonSuccess: {
        backgroundColor: '#3ABFBC', 
    },
    buttonSecondary: {
        backgroundColor: '#1C1C1E', 
        borderColor: '#A9A9A9',
        borderWidth: 1,
    },
    buttonText: { 
        fontSize: 16,
        fontWeight: 'bold',
        color: 'black', 
    },
    buttonTextSecondary: { 
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white', 
    },
    successText: {
        marginBottom: 15,
        textAlign: 'center',
        fontWeight: 'bold',
        color: '#3ABFBC',
    }
});