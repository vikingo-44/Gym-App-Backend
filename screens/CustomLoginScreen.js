import React, { useState, useContext } from 'react';
import { 
    StyleSheet, Text, View, TextInput, Button, SafeAreaView, 
    ScrollView, ActivityIndicator, TouchableOpacity, Modal, Alert,
    KeyboardAvoidingView, Platform
} from 'react-native';
import axios from 'axios';
// Importamos AuthContext desde el archivo App principal (App.js)
import { AuthContext } from '../App'; 
// 🚨 Importamos el hook de tema para usar los colores globales y la función de toggle
import { useTheme } from '../ThemeContext'; 

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

    // Reutilizamos getStyles para obtener estilos consistentes
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

            if (msg.includes("DNI ya está registrado")) {
                msg = "El DNI proporcionado ya se encuentra registrado.";
            } else if (msg.includes("El email ya está registrado")) {
                 msg = "El Email proporcionado ya se encuentra registrado.";
            } else if (e.message === 'Network Error') {
                 msg = `Error de Conexión. Asegúrate de que el servidor de FastAPI y Ngrok están activos y que la URL (${API_URL}) es la correcta.`;
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
                        placeholder="Número de Documento (DNI)"
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
// Función de Login Personalizada (Ahora usa DNI en lugar de Email)
// ----------------------------------------------------------------------
export default function CustomLoginScreen({ signIn, API_URL }) {
    // 🔑 USAMOS EL HOOK GLOBAL DE TEMA, incluyendo toggleTheme
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
            // La llamada ahora usa DNI para el login
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
                 errorMessage = `Error de Conexión. Asegúrate de que el servidor de FastAPI y Ngrok están activos y que la URL (${API_URL}) es la correcta.`;
            } else if (e.response && e.response.status !== 401) {
                errorMessage = `Error del Servidor (${e.response.status}). Intenta más tarde.`;
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Obtenemos los estilos dinámicamente
    const styles = getStyles(themeColors);

    // Nuevo estado para el modal de registro
    const [isRegisterVisible, setIsRegisterVisible] = useState(false); 

    return (
        <SafeAreaView style={[styles.container, {backgroundColor: themeColors.background}]}>
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
            
                {/* Modal de Registro, le pasamos los colores del tema */}
                <RegisterModal 
                    isVisible={isRegisterVisible} 
                    onClose={() => setIsRegisterVisible(false)} 
                    API_URL={API_URL} 
                    themeColors={themeColors}
                />

                <ScrollView contentContainerStyle={styles.content}>
                    
                    {/* 🚨 SELECTOR DE MODO (REINCORPORADO) */}
                    <View style={styles.themeToggleContainer}>
                        <TouchableOpacity onPress={toggleTheme}>
                            <Text style={[styles.themeToggleText, {color: themeColors.primary}]}>
                                {isDark ? '🌞 Modo Claro' : '🌙 Modo Oscuro'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Encabezado solicitado */}
                    <View style={styles.header}>
                        <Text style={[styles.title, {color: themeColors.textPrimary}]}>ND Training</Text>
                        <Text style={[styles.slogan, {color: themeColors.textSecondary}]}>Es hora de llegar muy lejos</Text>
                    </View>

                    {error && <Text style={[styles.errorText, {color: themeColors.danger, backgroundColor: themeColors.isDark ? '#330000' : '#FFEBEE'}]}>{error}</Text>}
                    
                    {/* Inputs de Login */}
                    <TextInput
                        style={[styles.input, {
                            backgroundColor: themeColors.inputBackground, 
                            color: themeColors.textPrimary,
                            borderColor: themeColors.inputBorder,
                        }]}
                        placeholder="Número de Documento (DNI)"
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
                            {/* Botón para abrir el Modal de Registro */}
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
    );
}

// ----------------------------------------------------------------------
// Función que genera los estilos básicos estáticos (los colores sensibles se aplican inline)
// ----------------------------------------------------------------------
const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        // El color de fondo se aplica inline en el componente principal
    },
    content: {
        padding: 30,
        flexGrow: 1,
        justifyContent: 'center',
    },
    themeToggleContainer: {
        position: 'absolute',
        top: 40,
        right: 20,
        padding: 10,
    },
    themeToggleText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    header: {
        alignItems: 'center',
        marginBottom: 50,
    },
    title: {
        fontSize: 38,
        fontWeight: '900',
        marginBottom: 5,
    },
    slogan: {
        fontSize: 16,
        fontStyle: 'italic',
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
        // El color de fondo se aplica inline
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
        // El color del título se aplica inline
        textAlign: 'center',
        marginBottom: 30,
    },
    successText: {
        // El color de éxito se aplica inline
        marginBottom: 15,
        textAlign: 'center',
        fontWeight: 'bold',
    }
});