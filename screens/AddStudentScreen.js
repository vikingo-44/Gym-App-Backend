import React, { useState, useContext } from 'react';
import { 
    StyleSheet, Text, View, TextInput, Button, SafeAreaView, 
    ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, 
    Platform, ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { AuthContext } from '../App'; 
import { useTheme } from '../ThemeContext'; 
// Importamos los iconos
import { User, Mail, Lock, CheckCircle, ArrowLeft, CreditCard } from 'lucide-react-native'; 

// ----------------------------------------------------------------------
// URL de la API (DEBE COINCIDIR con la de App.js y ProfessorScreen.js)
// ----------------------------------------------------------------------
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 
// ----------------------------------------------------------------------

// Esquema de estilos dinámico - ESTILO PEAKFIT
const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black', // Fondo negro
    },
    scrollContainer: {
        flexGrow: 1,
        padding: 20,
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#1C1C1E', // Fondo de tarjeta oscuro
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
        marginRight: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#3ABFBC', // Título Verde
    },
    inputContainer: {
        width: '100%',
        marginBottom: 20,
        marginTop: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white', // Texto de label blanco
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E', // Fondo de input oscuro
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'transparent', // Sin borde visible
        paddingHorizontal: 15,
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 16,
        color: 'white', // Texto de input blanco
        marginLeft: 10,
    },
    buttonContainer: {
        width: '100%',
        marginTop: 30,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#A9A9A9', // Gris claro
    },
    successMessage: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3ABFBC', // Verde
        textAlign: 'center',
        marginTop: 40,
    },
    icon: {
        // Los iconos usan color secundario para los inputs
        marginRight: 5,
    },
    
    // ------------------------------------------------
    // --- ESTILOS DE BOTONES PEAKFIT ---
    // ------------------------------------------------
    customButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10, 
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '100%', 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 5,
        elevation: 6,
    },
    buttonPrimary: {
        // Usamos el color verde brillante
        backgroundColor: '#3ABFBC', 
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'black', // Texto negro
    },
});

/**
 * Pantalla para que el Profesor dé de alta un nuevo Alumno.
 */
export default function AddStudentScreen({ navigation }) {
    const { colors: themeColors } = useTheme();
    const styles = getStyles(themeColors);

    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [dni, setDni] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Placeholder Color (Gris Claro)
    const placeholderColor = '#A9A9A9';
    // Icon Color (Gris Claro)
    const iconColor = '#A9A9A9';
    
    // Reinicia el formulario y el estado
    const resetForm = () => {
        setNombre('');
        setEmail('');
        setDni('');
        setPassword('');
        setIsSuccess(false);
        setIsLoading(false);
    };

    const handleRegisterStudent = async () => {
        // --- VALIDACIONES (Se mantienen) ---
        if (!nombre.trim() || !email.trim() || !dni.trim() || !password.trim()) {
            Alert.alert("Error", "Todos los campos son obligatorios.");
            return;
        }

        if (password.length < 6) {
            Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            Alert.alert("Error", "El formato del correo electrónico es inválido.");
            return;
        }
        
        if (!/^\d+$/.test(dni.trim())) {
            Alert.alert("Error", "El DNI solo debe contener números.");
            return;
        }
        // --- FIN VALIDACIONES ---

        setIsLoading(true);

        try {
            // Se usa el endpoint de registro público.
            const response = await axios.post(
                `${API_URL}/register/student`,
                {
                    nombre: nombre.trim(),
                    email: email.trim(),
                    dni: dni.trim(),
                    password: password.trim(),
                    rol: "Alumno" // <--- CRÍTICO: Añadido para que coincida con el payload del RegisterModal.
                }
            );

            // Si el registro es exitoso
            setIsSuccess(true);
            
            // Opcional: Volver al panel después de 3 segundos
            setTimeout(() => {
                navigation.goBack(); 
            }, 3000);

        } catch (e) {
            console.error("Error al registrar alumno:", e.response ? e.response.data : e.message);
            const detail = e.response?.data?.detail;
            
            let msg = detail && typeof detail === 'string' ? detail : "Fallo desconocido en el servidor.";

            if (msg.includes("DNI ya esta registrado")) {
                msg = "El DNI proporcionado ya se encuentra registrado.";
            } else if (msg.includes("El email ya esta registrado")) {
                msg = "El Email proporcionado ya se encuentra registrado.";
            } else if (e.message === 'Network Error') {
                msg = `Error de Conexión. Asegúrate de que el servidor de FastAPI esté activo.`;
            }
            
            Alert.alert("Error de Registro", `Fallo al dar de alta el alumno. Detalle: ${msg}`);

        } finally {
            setIsLoading(false);
        }
    };

    const handleGoBack = () => {
        navigation.goBack();
    };


    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backButton} disabled={isLoading}>
                    <ArrowLeft size={24} color={'white'} />
                </TouchableOpacity>
                <Text style={styles.title}>Alta de Nuevo Alumno</Text>
            </View>

            <KeyboardAvoidingView 
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                    
                    {isSuccess ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <CheckCircle size={80} color={'#3ABFBC'} />
                            <Text style={styles.successMessage}>
                                ¡Alumno '{nombre}' dado de alta con éxito!
                            </Text>
                            <Text style={styles.loadingText}>Volviendo al panel...</Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Nombre Completo:</Text>
                                <View style={styles.inputWrapper}>
                                    <User size={20} color={iconColor} style={styles.icon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Nombre y apellido del alumno"
                                        placeholderTextColor={placeholderColor}
                                        value={nombre}
                                        onChangeText={setNombre}
                                        keyboardType="default"
                                        autoCapitalize="words"
                                        editable={!isLoading}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Correo Electrónico (Email):</Text>
                                <View style={styles.inputWrapper}>
                                    <Mail size={20} color={iconColor} style={styles.icon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="ejemplo@correo.com"
                                        placeholderTextColor={placeholderColor}
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        editable={!isLoading}
                                    />
                                </View>
                            </View>
                            
                            {/* CAMPO DNI */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>DNI (Documento Nacional de Identidad):</Text>
                                <View style={styles.inputWrapper}>
                                    <CreditCard size={20} color={iconColor} style={styles.icon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Solo números"
                                        placeholderTextColor={placeholderColor}
                                        value={dni}
                                        onChangeText={setDni}
                                        keyboardType="numeric"
                                        editable={!isLoading}
                                    />
                                </View>
                            </View>
                            {/* FIN CAMPO DNI */}

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Contraseña Inicial:</Text>
                                <View style={styles.inputWrapper}>
                                    <Lock size={20} color={iconColor} style={styles.icon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Mínimo 6 caracteres"
                                        placeholderTextColor={placeholderColor}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                        editable={!isLoading}
                                    />
                                </View>
                            </View>

                            {/* BOTÓN REGISTRAR ALUMNO */}
                            <View style={styles.buttonContainer}>
								<TouchableOpacity
									style={[
										styles.customButton,
										styles.buttonPrimary,
										{ opacity: (isLoading || !nombre.trim() || !email.trim() || !dni.trim() || !password.trim()) ? 0.5 : 1 }
									]}
									onPress={handleRegisterStudent}
									disabled={isLoading || !nombre.trim() || !email.trim() || !dni.trim() || !password.trim()}
								>
									<Text style={styles.buttonText}>{isLoading ? "Registrando..." : "Registrar Alumno"}</Text>
								</TouchableOpacity>
								{isLoading && <ActivityIndicator size="small" color={'#3ABFBC'} style={{ marginTop: 15 }} />}
							</View>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}