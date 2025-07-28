import React from 'react';
import './App.css';
import TextChat from './features/voice/TextChat'; 

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-yellow-300 to-yellow-600 overflow-hidden text-center p-4">
      {/* Burbujas animadas */}
      <div className="bubble bubble1"></div>
      <div className="bubble bubble2"></div>
      <div className="bubble bubble3"></div>
      <div className="bubble bubble4"></div>

      {/* Imagen de abeja como asistente */}
      <img
        src="/images/bee.png"
        alt="Bee Assistant"
        className="w-24 h-24 mb-4 animate-bounce-slow"
      />

      {/* Título y subtítulo centrados */}
      <h1 className="text-3xl font-bold text-white drop-shadow-lg mb-2">
        ¡Bienvenido a Bee Assistant!
      </h1>
      <p className="text-lg text-white text-center px-4 mb-6">
        Tu asistente personal con un toque de miel. ¡Escribe o habla!
      </p>

      {/* Componente de chat con texto y voz integrados */}
      <TextChat />
    </div>
  );
}

export default App;