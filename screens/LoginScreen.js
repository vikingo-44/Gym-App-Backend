const API_URL = " https://rambunctious-beverley-dialogic.ngrok-free.dev";

try {
    const response = await axios.post(`${API_URL}/login`, { email, password });
    // Guarda el token de forma segura:
    await AsyncStorage.setItem('user_token', response.data.access_token);
    // Navega a la pantalla de la rutina
} catch (error) {
    console.error(error);
    // Mostrar error al usuario
}