// src/index.tsx
import React from 'react'; // 'React' é importado, mas pode ser otimizado
import ReactDOM from 'react-dom/client'; // Importa a nova API de cliente
import './index.css'; // Importa os estilos globais
import App from './App'; // Importa o componente principal da sua aplicação

// Encontra o elemento 'root' no seu HTML (geralmente em public/index.html)
const rootElement = document.getElementById('root');

// Cria o root para renderização do React
// Certifique-se de que rootElement não é nulo antes de criar o root
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);

  // Renderiza o componente App dentro do root
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Elemento 'root' não encontrado no DOM. Não foi possível montar a aplicação React.");
}