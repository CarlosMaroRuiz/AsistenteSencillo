import React, { useState, useEffect, useRef } from 'react';
import { sendMessage } from './api';

const TextChat = () => {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('Pensando...');
  const [isListening, setIsListening] = useState(false);
  const [micPermission, setMicPermission] = useState(null); // Estado para el permiso del micrófono
  const recognitionRef = useRef(null); // Referencia para mantener la instancia de reconocimiento

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

  // Inicializar reconocimiento de voz al cargar el componente
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setMicPermission('unsupported');
      return;
    }

    // Crear instancia de reconocimiento
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    
    // Guardar la instancia en la referencia
    recognitionRef.current = recognition;
    
    // Verificar si la conexión es segura
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      console.warn('El reconocimiento de voz requiere una conexión HTTPS excepto en localhost');
      setMicPermission('insecure');
    }
    
    // Limpiar al desmontar
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignorar errores al detener si ya estaba inactivo
        }
      }
    };
  }, []);

  // Controlar el estado de escucha
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      // Configurar manejadores de eventos antes de iniciar
      setupRecognitionHandlers();
      
      // Iniciar reconocimiento
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error al iniciar reconocimiento:", error);
        setIsListening(false);
        setError("No se pudo iniciar el reconocimiento de voz. Inténtalo de nuevo.");
      }
    } else {
      // Detener reconocimiento si estaba activo
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignorar errores al detener si ya estaba inactivo
      }
    }
  }, [isListening]);

  // Configurar manejadores de eventos para el reconocimiento
  const setupRecognitionHandlers = () => {
    if (!recognitionRef.current) return;
    
    recognitionRef.current.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      setMessage(speechResult);
      // Automáticamente enviar el mensaje reconocido
      handleSubmitVoice(speechResult);
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Error en el reconocimiento de voz:', event.error);
      
      let errorMessage = '';
      switch (event.error) {
        case 'network':
          errorMessage = 'Error de conexión. Verifica tu internet y asegúrate de estar usando HTTPS.';
          break;
        case 'not-allowed':
        case 'permission-denied':
          setMicPermission('denied');
          errorMessage = 'Permiso del micrófono denegado. Por favor, permite el acceso al micrófono.';
          break;
        case 'no-speech':
          errorMessage = 'No se detectó ninguna voz. Por favor, intenta hablar más fuerte.';
          break;
        case 'aborted':
          // No mostrar error si fue cancelado intencionalmente
          break;
        default:
          errorMessage = `Error de reconocimiento de voz: ${event.error}`;
      }
      
      if (errorMessage) {
        setError(errorMessage);
      }
      
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };
  };

  // Verificar y solicitar permiso del micrófono
  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Cerrar la transmisión inmediatamente después de obtener acceso
      stream.getTracks().forEach(track => track.stop());
      setMicPermission('granted');
      return true;
    } catch (err) {
      console.error('Error al solicitar permiso del micrófono:', err);
      setMicPermission('denied');
      setError('Por favor, permite el acceso al micrófono para usar la entrada de voz.');
      return false;
    }
  };

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

  const handleSubmitVoice = async (voiceMessage) => {
    if (!voiceMessage.trim()) return;

    const userMessage = voiceMessage.trim();
    setError(null);
    setIsLoading(true);

    setConversation(prev => [...prev, { 
      type: 'user', 
      text: userMessage, 
      timestamp: new Date(),
      isVoice: true
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

  const toggleVoiceInput = async () => {
    if (isListening) {
      // Si ya está escuchando, detener
      setIsListening(false);
      return;
    }
    
    // Si no es compatible con el navegador
    if (micPermission === 'unsupported') {
      setError('Tu navegador no soporta el reconocimiento de voz. Intenta con Chrome, Edge o Safari.');
      return;
    }
    
    // Si es una conexión insegura
    if (micPermission === 'insecure') {
      setError('El reconocimiento de voz requiere una conexión HTTPS. Por favor, usa un sitio seguro.');
      return;
    }
    
    // Si no estamos seguros del permiso, verificar
    if (micPermission !== 'granted') {
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) return;
    }
    
    // Todo bien, iniciar escucha
    setError(null);
    setIsListening(true);
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
                  {/* Icono de micrófono para mensajes por voz */}
                  {msg.isVoice && (
                    <div className="flex items-center mb-1">
                      <svg 
                        className="w-3 h-3 mr-1" 
                        fill="currentColor" 
                        viewBox="0 0 20 20" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"></path>
                      </svg>
                      <span className="text-xs">Mensaje de voz</span>
                    </div>
                  )}
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
            
            {isListening && (
              <div className="flex justify-center">
                <div className="bg-white text-gray-800 px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg 
                      className="w-5 h-5 text-yellow-500 animate-pulse" 
                      fill="currentColor" 
                      viewBox="0 0 20 20" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"></path>
                    </svg>
                    <span className="text-sm">Escuchando...</span>
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
          disabled={isLoading || isListening}
        />
        <button
          type="button"
          onClick={toggleVoiceInput}
          disabled={isLoading}
          className={`${
            isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600'
          } disabled:bg-gray-400 text-white rounded-full p-3 transition duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-400`}
          title={isListening ? "Detener grabación" : "Hablar"}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isListening ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            )}
          </svg>
        </button>
        <button
          type="submit"
          disabled={isLoading || isListening || !message.trim()}
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