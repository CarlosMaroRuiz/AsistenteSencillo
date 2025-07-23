const API_BASE_URL = process.env.REACT_APP_API_URL || ''; // Deja vacío para rutas relativas

export const sendMessage = async (message) => {
  try {
    // Usa ruta relativa (/api/message) que será redirigida por Vercel
    const response = await fetch(`/api/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error en la API:', error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('No se pudo conectar al servidor. Por favor, inténtalo de nuevo más tarde.');
    }
    
    throw new Error(`Error de conexión: ${error.message}`);
  }
};