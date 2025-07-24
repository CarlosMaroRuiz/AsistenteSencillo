import React, { useState, useEffect } from 'react';
import { sendMessage } from './api';

const TextChat = () => {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('Pensando...');

  // Array de mensajes de carga temáticos de abeja
  const loadingMessages = [
    "Milli está trabajando en eso...",
    "Recolectando néctar de información...",
    "Volando entre datos...",
    "No te desesperes amiguito...",
    "¡Bzzzz! Procesando polen de ideas...",
    "La colmena está calculando...",
    "Preparando miel de respuestas...",
    "Abeja ocupada, vuelve pronto...",
    "Polinizando tus preguntas...",
    "Zumbando en busca de respuestas..."
  ];

  // Efecto para cambiar el mensaje de carga mientras isLoading es true
  useEffect(() => {
    let messageInterval;
    
    if (isLoading) {
      let index = 0;
      // Iniciar con un mensaje aleatorio
      setLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
      
      // Cambiar el mensaje cada 2 segundos
      messageInterval = setInterval(() => {
        index = (index + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[index]);
      }, 2000);
    }
    
    // Limpiar el intervalo cuando isLoading cambia a false
    return () => {
      if (messageInterval) clearInterval(messageInterval);
    };
  }, [isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage('');
    setError(null);
    setIsLoading(true);

    setConversation(prev => [...prev, { 
      type: 'user', 
      text: userMessage, 
      timestamp: new Date() 
    }]);

    try {
      const response = await sendMessage(userMessage);
      
      // Agregar respuesta de la API a la conversación
      setConversation(prev => [...prev, { 
        type: 'bot', 
        text: response.response || 'No hubo respuesta del servidor.', 
        timestamp: new Date() 
      }]);
    } catch (err) {
      setError('Error al comunicarse con la API: ' + err.message);
      
      // Agregar mensaje de error a la conversación
      setConversation(prev => [...prev, { 
        type: 'error', 
        text: 'Lo siento, hubo un problema. ¡Bzzz! Intenta de nuevo.', 
        timestamp: new Date() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setConversation([]);
    setError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Área de conversación */}
      <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 mb-4 h-96 overflow-y-auto">
        {conversation.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white text-opacity-70">
            <p>¡Hola! Soy tu asistente Bee. ¿En qué puedo ayudarte hoy? 🐝</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversation.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.type === 'user'
                      ? 'bg-yellow-500 text-white'
                      : msg.type === 'error'
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-gray-800'
                  }`}
                >
                  {/* Usamos pre-wrap para preservar todos los caracteres y espacios */}
                  <pre className="text-sm font-sans whitespace-pre-wrap break-words m-0">{msg.text}</pre>
                  <span className="text-xs opacity-70 block mt-1">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 px-4 py-2 rounded-lg max-w-xs">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-sm">{loadingMessage}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Formulario de entrada */}
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe tu mensaje aquí..."
          className="flex-1 px-4 py-3 rounded-full border-2 border-yellow-300 focus:border-yellow-500 focus:outline-none text-gray-800 placeholder-gray-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !message.trim()}
          className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white rounded-full px-6 py-3 font-semibold transition duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          {isLoading ? '...' : 'Enviar'}
        </button>
        
        {conversation.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            className="bg-red-500 hover:bg-red-600 text-white rounded-full px-4 py-3 transition duration-300 focus:outline-none focus:ring-2 focus:ring-red-400"
            title="Limpiar chat"
          >
            🗑️
          </button>
        )}
      </form>

      {/* Mensaje de error */}
      {error && (
        <div className="mt-4 p-3 bg-red-500 bg-opacity-20 border border-red-300 rounded-lg">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default TextChat;