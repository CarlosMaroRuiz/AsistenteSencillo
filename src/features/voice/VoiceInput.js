import React, { useState, useEffect } from 'react';
import { sendMessage } from './api';

const VoiceInput = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Tu navegador no soporta la API de reconocimiento de voz.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event) => {
      const speechResult = event.results[0][0].transcript;
      setTranscript(speechResult);
      try {
        const apiResponse = await sendMessage(speechResult);
        setResponse(apiResponse.response || 'No hubo respuesta del servidor.');
      } catch (err) {
        setError('Error al comunicarse con la API: ' + err.message);
      }
      setError(null);
    };

    recognition.onerror = (event) => {
      console.error('Error en el reconocimiento de voz:', event.error);
      if (event.error === 'network') {
        setError('Error de red. Verifica tu conexión o asegúrate de que la API esté corriendo.');
      } else {
        setError(`Error: ${event.error}`);
      }
      setIsListening(false);
    };

    if (isListening) {
      recognition.start();
    }

    return () => {
      recognition.stop();
    };
  }, [isListening]);

  const toggleListening = () => {
    if (error) setError(null);
    setIsListening(!isListening);
    setTranscript('');
    setResponse('');
  };

  return (
    <div className="mt-4">
      <button
        className="bg-black text-white rounded-full p-4 shadow-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition duration-300"
        onClick={toggleListening}
        disabled={!navigator.onLine}
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      </button>
      {transcript && <p className="text-white mt-2">Transcripción: {transcript}</p>}
      {response && <p className="text-white mt-2">Respuesta: {response}</p>}
      {error && <p className="text-red-200 mt-2">{error}</p>}
    </div>
  );
};

export default VoiceInput;