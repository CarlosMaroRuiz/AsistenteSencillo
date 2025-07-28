import React, { useState, useEffect, useRef } from 'react';
import { sendMessage } from './api';

const TextChat = () => {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('Pensando...');
  const [isListening, setIsListening] = useState(false);
  const [micPermission, setMicPermission] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const recognitionRef = useRef(null);
  const speechSynthesisRef = useRef(null);

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
      
      // Detener cualquier síntesis de voz en curso
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Cargar voces disponibles cuando el componente se monta
  useEffect(() => {
    if (!window.speechSynthesis) return;
    
    // Función para cargar voces
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      
      // Filtrar voces en español
      const spanishVoices = voices.filter(voice => 
        voice.lang.includes('es') || 
        voice.name.toLowerCase().includes('spanish') || 
        voice.name.toLowerCase().includes('español')
      );
      
      // Intentar identificar voces femeninas buscando patrones comunes en los nombres
      const femalePatterns = ['female', 'woman', 'mujer', 'femenina', 'girl', 'chica', 'monica', 'maria', 'laura', 'carmen', 'elena', 'lucia', 'paulina', 'ava'];
      
      const femaleVoices = spanishVoices.filter(voice => 
        femalePatterns.some(pattern => 
          voice.name.toLowerCase().includes(pattern)
        )
      );
      
      // Si encontramos voces femeninas en español, usarlas primero
      const sortedVoices = [
        ...femaleVoices,
        ...spanishVoices.filter(voice => !femaleVoices.includes(voice)),
        ...voices.filter(voice => !spanishVoices.includes(voice))
      ];
      
      setAvailableVoices(sortedVoices);
      
      // Seleccionar la primera voz femenina en español o la primera en español disponible
      if (femaleVoices.length > 0) {
        setSelectedVoice(femaleVoices[0]);
      } else if (spanishVoices.length > 0) {
        setSelectedVoice(spanishVoices[0]);
      } else if (voices.length > 0) {
        setSelectedVoice(voices[0]);
      }
    };
    
    // Cargar voces inicialmente
    loadVoices();
    
    // En algunos navegadores las voces se cargan asincrónicamente
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
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

  // Función para convertir texto a voz
  const speakText = (text) => {
    // Detener cualquier síntesis de voz anterior
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    if (!audioEnabled || !window.speechSynthesis) return;
    
    // Crear nueva instancia de SpeechSynthesisUtterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0; // Velocidad normal
    utterance.pitch = 1.0; // Tono normal
    
    // Usar la voz seleccionada si existe
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Eventos para controlar estado de reproducción
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error('Error en la síntesis de voz:', event);
      setIsSpeaking(false);
    };
    
    // Guardar referencia a la utterance actual
    speechSynthesisRef.current = utterance;
    
    // Reproducir
    window.speechSynthesis.speak(utterance);
  };

  // Detener reproducción de voz
  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
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

    // Detener cualquier reproducción de voz en curso
    stopSpeaking();

    setConversation(prev => [...prev, { 
      type: 'user', 
      text: userMessage, 
      timestamp: new Date() 
    }]);

    try {
      const response = await sendMessage(userMessage);
      
      const botResponse = response.response || 'No hubo respuesta del servidor.';
      
      // Agregar respuesta de la API a la conversación
      setConversation(prev => [...prev, { 
        type: 'bot', 
        text: botResponse, 
        timestamp: new Date() 
      }]);
      
      // Reproducir respuesta por voz si está habilitado
      if (audioEnabled) {
        speakText(botResponse);
      }
    } catch (err) {
      const errorMessage = 'Lo siento, hubo un problema. ¡Bzzz! Intenta de nuevo.';
      
      setError('Error al comunicarse con la API: ' + err.message);
      
      // Agregar mensaje de error a la conversación
      setConversation(prev => [...prev, { 
        type: 'error', 
        text: errorMessage, 
        timestamp: new Date() 
      }]);
      
      // Reproducir mensaje de error por voz si está habilitado
      if (audioEnabled) {
        speakText(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitVoice = async (voiceMessage) => {
    if (!voiceMessage.trim()) return;

    const userMessage = voiceMessage.trim();
    setError(null);
    setIsLoading(true);

    // Detener cualquier reproducción de voz en curso
    stopSpeaking();

    setConversation(prev => [...prev, { 
      type: 'user', 
      text: userMessage, 
      timestamp: new Date(),
      isVoice: true
    }]);

    try {
      const response = await sendMessage(userMessage);
      
      const botResponse = response.response || 'No hubo respuesta del servidor.';
      
      // Agregar respuesta de la API a la conversación
      setConversation(prev => [...prev, { 
        type: 'bot', 
        text: botResponse, 
        timestamp: new Date() 
      }]);
      
      // Reproducir respuesta por voz si está habilitado
      if (audioEnabled) {
        speakText(botResponse);
      }
    } catch (err) {
      const errorMessage = 'Lo siento, hubo un problema. ¡Bzzz! Intenta de nuevo.';
      
      setError('Error al comunicarse con la API: ' + err.message);
      
      // Agregar mensaje de error a la conversación
      setConversation(prev => [...prev, { 
        type: 'error', 
        text: errorMessage, 
        timestamp: new Date() 
      }]);
      
      // Reproducir mensaje de error por voz si está habilitado
      if (audioEnabled) {
        speakText(errorMessage);
      }
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
    
    // Detener cualquier reproducción de voz en curso
    stopSpeaking();
    
    // Todo bien, iniciar escucha
    setError(null);
    setIsListening(true);
  };

  const toggleAudio = () => {
    if (isSpeaking) {
      stopSpeaking();
    }
    setAudioEnabled(!audioEnabled);
  };

  const clearChat = () => {
    setConversation([]);
    setError(null);
    stopSpeaking();
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
                  } relative`}
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
                  
                  {/* Mostrar botón de reproducir en respuestas del bot */}
                  {msg.type === 'bot' && audioEnabled && (
                    <button
                      onClick={() => speakText(msg.text)}
                      className="absolute top-2 right-2 text-yellow-500 hover:text-yellow-600 focus:outline-none"
                      title="Reproducir mensaje"
                    >
                      <svg 
                        className="w-4 h-4" 
                        fill="currentColor" 
                        viewBox="0 0 20 20" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path>
                      </svg>
                    </button>
                  )}
                  
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
            
            {isSpeaking && (
              <div className="flex justify-center">
                <div className="bg-white text-gray-800 px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg 
                      className="w-5 h-5 text-yellow-500 animate-pulse" 
                      fill="currentColor" 
                      viewBox="0 0 20 20" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd"></path>
                    </svg>
                    <span className="text-sm">Hablando...</span>
                    <button 
                      onClick={stopSpeaking}
                      className="ml-2 text-red-500 hover:text-red-600 focus:outline-none"
                      title="Detener voz"
                    >
                      <svg 
                        className="w-4 h-4" 
                        fill="currentColor" 
                        viewBox="0 0 20 20" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controles de audio y selector de voces */}
      <div className="flex justify-end mb-2 space-x-2">
        {/* Selector de voces */}
        {availableVoices.length > 0 && audioEnabled && (
          <div className="relative inline-block text-left">
            <select
              value={selectedVoice ? selectedVoice.name : ''}
              onChange={(e) => {
                const selected = availableVoices.find(voice => voice.name === e.target.value);
                if (selected) setSelectedVoice(selected);
              }}
              className="block w-32 md:w-40 bg-white border border-yellow-300 text-xs rounded-full px-2 py-1 appearance-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              {availableVoices.map(voice => (
                <option key={voice.name} value={voice.name}>
                  {voice.name.length > 20 ? `${voice.name.substring(0, 18)}...` : voice.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-yellow-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        )}
        
        {/* Botón de activar/desactivar audio */}
        <button
          type="button"
          onClick={toggleAudio}
          className={`${
            audioEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'
          } text-white rounded-full p-2 transition duration-300 focus:outline-none focus:ring-2 focus:ring-green-400 flex items-center space-x-1`}
          title={audioEnabled ? "Desactivar respuesta por voz" : "Activar respuesta por voz"}
        >
          <svg 
            className="w-4 h-4" 
            fill="currentColor" 
            viewBox="0 0 20 20" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {audioEnabled ? (
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd"></path>
            ) : (
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 1.414L10.414 12l3.293 3.293a1 1 0 01-1.414 1.414L9 13.414l-3.293 3.293a1 1 0 01-1.414-1.414L7.586 12 4.293 8.707a1 1 0 011.414-1.414L9 10.586l3.293-3.293z" clipRule="evenodd"></path>
            )}
          </svg>
          <span className="text-xs">{audioEnabled ? "Audio ON" : "Audio OFF"}</span>
        </button>
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