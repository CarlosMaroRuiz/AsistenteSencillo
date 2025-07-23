// api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://52.70.44.136';

export const sendMessage = async (message) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/message`, {
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
    
    // Manejo específico de diferentes tipos de errores
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('No se pudo conectar al servidor. ¿Está corriendo en el puerto 3000?');
    }
    
    throw new Error(`Error de conexión: ${error.message}`);
  }
};