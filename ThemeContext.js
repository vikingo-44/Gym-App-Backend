import React, { createContext, useContext, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';

// --- Definición de Temas ---
const LightTheme = {
    isDark: false,
    colors: {
        background: '#F0F4F8',     // Fondo principal
        card: '#FFFFFF',           // Fondo de tarjetas/contenedores
        textPrimary: '#1F2937',    // Texto oscuro principal
        textSecondary: '#6B7280',  // Texto secundario (Gris medio)
        inputBackground: '#FFFFFF',// Fondo de inputs
        inputBorder: '#D1D5DB',    // Borde de input (Gris claro)
        primary: '#007AFF',        // Azul iOS (Botones, encabezados, acento principal)
        primaryDark: '#005ACF',    // Azul más oscuro
        success: '#10B981',        // Verde (Guardar, Activo)
        danger: '#FF3B30',         // Rojo (Eliminar, Error)
        warning: '#FF9500',        // Naranja/Amarillo (Advertencia, Inactivo)
        divider: '#E5E7EB',        // Líneas divisorias
        highlight: '#D1E7FF',      // Fondo de selección/highlight
    },
};

const DarkTheme = {
    isDark: true,
    colors: {
        background: '#121212',     // Fondo principal oscuro
        card: '#1F2937',           // Fondo de tarjetas/contenedores (Gris oscuro)
        textPrimary: '#F9FAFB',    // Texto claro principal
        textSecondary: '#D1D5DB',  // Texto secundario (Gris claro)
        inputBackground: '#374151',// Fondo de inputs oscuro
        inputBorder: '#4B5563',    // Borde de input
        primary: '#60A5FA',        // Azul claro
        primaryDark: '#3B82F6',    // Azul medio
        success: '#34D399',        // Verde claro
        danger: '#F87171',         // Rojo claro
        warning: '#FDE047',        // Amarillo claro
        divider: '#374151',        // Líneas divisorias oscuras
        highlight: '#3B4D63',      // Fondo de selección/highlight
    },
};

// 1. Crear el Contexto, incluyendo toggleTheme
const ThemeContext = createContext({
    ...LightTheme,
    toggleTheme: () => {}, // Función placeholder
});

// 2. Hook personalizado para usar el tema
export const useTheme = () => useContext(ThemeContext);

// 3. Proveedor del Tema
export const ThemeProvider = ({ children }) => {
    // Detecta el esquema de color del sistema operativo
    const systemScheme = useColorScheme();
    
    // Estado para permitir la anulación manual: 'light', 'dark', o 'system'
    const [manualScheme, setManualScheme] = useState('system'); 

    // Determina el esquema actual: manual o del sistema
    const currentScheme = manualScheme === 'system' ? systemScheme : manualScheme;
    
    // El tema activo se basa en el esquema actual
    const activeTheme = currentScheme === 'dark' ? DarkTheme : LightTheme;

    // Función para alternar el esquema (si no es manual, lo cambia a lo opuesto del actual)
    const toggleTheme = () => {
        setManualScheme(prevScheme => {
            if (prevScheme === 'system') {
                // Si estaba en sistema, lo forzamos al opuesto del sistema
                return systemScheme === 'dark' ? 'light' : 'dark';
            } else {
                // Si estaba forzado, lo alternamos
                return prevScheme === 'dark' ? 'light' : 'dark';
            }
        });
    };
    
    // El valor que se pasa al contexto
    const contextValue = useMemo(() => ({
        ...activeTheme,
        toggleTheme,
        manualScheme, // Para saber si estamos forzando el tema
    }), [activeTheme, toggleTheme, manualScheme]);


    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
};