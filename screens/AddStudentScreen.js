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

// Esquema de estilos dinámico
const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
        backgroundColor: colors.card,
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
        color: colors.primary,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 20,
        marginTop: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.divider,
        paddingHorizontal: 15,
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 16,
        color: colors.textPrimary,
        marginLeft: 10,
    },
    buttonContainer: {
        width: '100%',
        marginTop: 30,
        alignItems: 'center', // Alinea el ActivityIndicator y el botón
    },
    loadingText: {
        marginTop: 10,
        color: colors.textSecondary,
    },
    successMessage: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.success,
        textAlign: 'center',
        marginTop: 40,
    },
    icon: {
        marginRight: 5,
    },
    
    // ------------------------------------------------
    // --- ESTILOS DE BOTONES MODERNOS APLICADOS ---
    // ------------------------------------------------
    customButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10, // Bordes redondeados
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '100%', 
        // Sombra para darle profundidad
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    buttonPrimary: {
        // Usamos el color 'success' (verde) para el botón de registro
        backgroundColor: colors.success, 
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.card, // Texto blanco/claro
    },
    // ------------------------------------------------
});

/**
 * Pantalla para que el Profesor dé de alta un nuevo Alumno.
 * Requiere nombre, email, DNI y contraseña. El rol se fija como 'Alumno'.
 */
export default function AddStudentScreen({ navigation }) {
    const { colors: themeColors } = useTheme();
    const styles = getStyles(themeColors);
    const { getToken } = useContext(AuthContext);

    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [dni, setDni] = useState(''); // <--- NUEVO ESTADO PARA DNI
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

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
        // Validación de campos obligatorios
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
        
        // Validación de DNI: solo números
        if (!/^\d+$/.test(dni.trim())) {
             Alert.alert("Error", "El DNI solo debe contener números.");
             return;
        }

        setIsLoading(true);

        try {
            const token = await getToken(); // Obtiene el token del profesor
            const headers = { 'Authorization': `Bearer ${token}` };

            // Endpoint de registro
            const response = await axios.post(
                `${API_URL}/users/`,
                {
                    nombre: nombre.trim(),
                    email: email.trim(),
                    dni: dni.trim(), // <--- ENVÍO DEL DNI
                    password: password.trim(),
                    // CRÍTICO: Se fuerza el rol a "Alumno"
                    role: "Alumno" 
                },
                { headers } // Se envía el token de autenticación del profesor
            );

            // Si el registro es exitoso
            setIsSuccess(true);
            
            // Opcional: Volver al panel después de 3 segundos
            setTimeout(() => {
                navigation.goBack(); 
            }, 3000);

        } catch (e) {
            console.error("Error al registrar alumno:", e.response ? e.response.data : e.message);
            const detail = e.response?.data?.detail || "Error desconocido al registrar.";
            
            Alert.alert("Error de Registro", `Fallo al dar de alta al alumno. Detalle: ${detail}`);

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
                    <ArrowLeft size={24} color={themeColors.textPrimary} />
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
                            <CheckCircle size={80} color={themeColors.success} />
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
                                    <User size={20} color={themeColors.textSecondary} style={styles.icon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Nombre y apellido del alumno"
                                        placeholderTextColor={themeColors.textSecondary}
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
                                    <Mail size={20} color={themeColors.textSecondary} style={styles.icon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="ejemplo@correo.com"
                                        placeholderTextColor={themeColors.textSecondary}
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
                                    <CreditCard size={20} color={themeColors.textSecondary} style={styles.icon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Solo números"
                                        placeholderTextColor={themeColors.textSecondary}
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
                                    <Lock size={20} color={themeColors.textSecondary} style={styles.icon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Mínimo 6 caracteres"
                                        placeholderTextColor={themeColors.textSecondary}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                        editable={!isLoading}
                                    />
                                </View>
                            </View>

                            {/* BOTÓN REGISTRAR ALUMNO (MODIFICADO) */}
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
								{isLoading && <ActivityIndicator size="small" color={themeColors.primary} style={{ marginTop: 15 }} />}
							</View>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}