import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Button } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../ThemeContext'; 

export default function StudentDetailsScreen({ navigation }) {
    
    // Usamos useRoute para obtener los parámetros de navegación
    const route = useRoute();
    const { student } = route.params; // Obtenemos el objeto student completo
    const { colors: themeColors } = useTheme();

    // Función de ejemplo para manejar la edición (si la implementas en el backend)
    const handleSave = () => {
        // Lógica para guardar los cambios del alumno (ej: actualizar nombre, email, etc.)
        alert(`Guardando datos de ${student.nombre}. Implementación de API pendiente.`);
    };

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
            borderLeftColor: themeColors.warning,
        },
        detailLabel: {
            fontSize: 14,
            color: themeColors.textSecondary,
            fontWeight: '600',
            marginTop: 10,
        },
        detailValue: {
            fontSize: 18,
            color: themeColors.textPrimary,
            fontWeight: 'bold',
        },
        buttonContainer: {
            marginTop: 30,
        }
    });

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Datos del Alumno: {student.nombre}</Text>

                <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>Nombre Completo:</Text>
                    <Text style={styles.detailValue}>{student.nombre}</Text>

                    <Text style={styles.detailLabel}>Email:</Text>
                    <Text style={styles.detailValue}>{student.email}</Text>

                    <Text style={styles.detailLabel}>DNI:</Text>
                    <Text style={styles.detailValue}>{student.dni}</Text>
                    
                    <Text style={styles.detailLabel}>ID Interno:</Text>
                    <Text style={styles.detailValue}>{student.id}</Text>
                    
                    <Text style={styles.detailLabel}>Rol:</Text>
                    <Text style={styles.detailValue}>{student.rol}</Text>
                </View>

                {/* Aquí irían los inputs de edición si los implementas */}
                
                <View style={styles.buttonContainer}>
                    <Button title="Guardar Cambios (Funcionalidad pendiente)" onPress={handleSave} color={themeColors.primary} />
                </View>
                <View style={{marginTop: 10}}>
                    <Button title="Volver" onPress={() => navigation.goBack()} color={themeColors.textSecondary} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}