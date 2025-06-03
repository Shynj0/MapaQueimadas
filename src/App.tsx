// src/App.tsx
import React, { useState } from 'react'; // Importa useState
import QueimadasMap from './components/QueimadasMap';
import './App.css';

function App() {
  // Estado para controlar o mês selecionado
  // Inicializa com 'mes1' para mostrar o primeiro mês por padrão
  const [selectedMonth, setSelectedMonth] = useState('mes1');

  // Mapeamento das URLs dos arquivos GeoJSON para cada mês
  const monthToUrlMap: { [key: string]: string } = {
    'mes1': '/data/queimadas_mes1.geojson', // Janeiro de 2025
    'mes2': '/data/queimadas_mes2.geojson', // Fevereiro de 2025
    'mes3': '/data/queimadas_mes3.geojson', // Março de 2025
    'mes4': '/data/queimadas_mes4.geojson', // Abril de 2025
  };

  // Determina qual URL de queimadas deve ser carregada com base no mês selecionado
  // ATENÇÃO: É um array com APENAS a URL do mês selecionado, garantindo 1 mês por vez.
  const queimadasUrls = [monthToUrlMap[selectedMonth]]; 

  // URL para o arquivo de contorno dos biomas
  const biomasUrl = '/data/divisao_bioma.geojson';

  return (
    <div className="App">
      <header className="App-header">
        <h1>Mapa de Queimadas por Bioma</h1>
        <p>Visualizando dados de áreas queimadas por período e Bioma</p>
      </header>
      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Adiciona os botões de seleção de mês */}
        <div style={{ padding: '10px', background: '#f0f0f0', borderBottom: '1px solid #ccc', zIndex: 1000, boxShadow: '0 2px 5px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <button
            onClick={() => setSelectedMonth('mes1')}
            style={{
              padding: '8px 15px',
              borderRadius: '5px',
              border: `1px solid ${selectedMonth === 'mes1' ? '#007bff' : '#ccc'}`,
              backgroundColor: selectedMonth === 'mes1' ? '#007bff' : '#fff',
              color: selectedMonth === 'mes1' ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Janeiro
          </button>
          <button
            onClick={() => setSelectedMonth('mes2')}
            style={{
              padding: '8px 15px',
              borderRadius: '5px',
              border: `1px solid ${selectedMonth === 'mes2' ? '#007bff' : '#ccc'}`,
              backgroundColor: selectedMonth === 'mes2' ? '#007bff' : '#fff',
              color: selectedMonth === 'mes2' ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Fevereiro
          </button>
          <button
            onClick={() => setSelectedMonth('mes3')}
            style={{
              padding: '8px 15px',
              borderRadius: '5px',
              border: `1px solid ${selectedMonth === 'mes3' ? '#007bff' : '#ccc'}`,
              backgroundColor: selectedMonth === 'mes3' ? '#007bff' : '#fff',
              color: selectedMonth === 'mes3' ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Março
          </button>
          <button
            onClick={() => setSelectedMonth('mes4')}
            style={{
              padding: '8px 15px',
              borderRadius: '5px',
              border: `1px solid ${selectedMonth === 'mes4' ? '#007bff' : '#ccc'}`,
              backgroundColor: selectedMonth === 'mes4' ? '#007bff' : '#fff',
              color: selectedMonth === 'mes4' ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Abril
          </button>
        </div>

        <QueimadasMap
          queimadasDataUrls={queimadasUrls} // Passa um array com APENAS a URL do mês selecionado
          biomasOutlineUrl={biomasUrl}
        />
      </main>
      <footer className="App-footer">
        <p>© 2023 Seu Nome/Empresa. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

export default App;