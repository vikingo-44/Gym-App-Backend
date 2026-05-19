import secrets
import string

def generate_strong_secret_key(length=32):
    """
    Genera una clave secreta fuerte y aleatoria para JWT (JSON Web Tokens).
    
    La clave incluye letras mayúsculas, minúsculas, dígitos y
    símbolos especiales para máxima seguridad, con una longitud de 32 caracteres.
    """
    # Definimos el conjunto de caracteres seguros
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()_+-=[]{}:;|,.<>/?~"
    
    # Generamos la clave usando secrets para criptografía
    secret_key = ''.join(secrets.choice(alphabet) for i in range(length))
    return secret_key

# --- Ejecución ---
if __name__ == "__main__":
    key = generate_strong_secret_key(32) # Generamos una clave de 32 caracteres
    print("---------------------------------------------------------------------------------")
    print("¡CLAVE SECRETA GENERADA! Cópiala y pégala en tu archivo .env (sin las comillas):")
    print("---------------------------------------------------------------------------------")
    print(key)
    print("---------------------------------------------------------------------------------")