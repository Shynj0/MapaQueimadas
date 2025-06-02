// src/App.tsx
import React, { useState } from 'react';
import QueimadasMap from './components/QueimadasMap';
import './App.css'; // Mantenha se tiver estilos CSS globais

const App: React.FC = () => {
  // ATENÇÃO: Nomes dos arquivos de pontos ajustados para corresponder à sua pasta 'public/data'!
  // Para que o navegador consiga acessar esses arquivos via fetch, eles devem estar na pasta 'public'
  // e o caminho deve começar com '/'.
  const monthGeoJsonMap: { [key: string]: string } = {
    '2024-05': '/data/queimadas_pontos1.geojson',
    '2024-06': '/data/queimadas_pontos2.geojson',
    '2024-07': '/data/queimadas_pontos3.geojson',
  };

  // ATENÇÃO: Nome do arquivo de biomas ajustado para corresponder à sua pasta 'public/data'!
  const biomasOutlineUrl = '/data/divisao_bioma.geojson';

  const [selectedMonth, setSelectedMonth] = useState<string>('2024-05'); // Inicia com o primeiro mês '2024-05'

  // A URL dos dados de queimadas será sempre a do mês selecionado
  const currentQueimadasUrls = selectedMonth ? [monthGeoJsonMap[selectedMonth]] : [];

  return (
    // O estilo garante que o componente App ocupe a altura total da viewport (tela visível).
    // display: flex e flexDirection: column ajudam a organizar cabeçalho, conteúdo principal e rodapé.
    <div className="App" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', margin: 0, padding: 0 }}>
      {/* Cabeçalho da aplicação */}
      <header style={{ textAlign: 'center', padding: '20px', background: '#282c34', color: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', zIndex: 10 }}>
        <h1>Mapa de Queimadas por Bioma</h1>
        <p>Visualizando dados de focos de calor por período e bioma</p>
      </header>

      {/* Seção principal com os botões de seleção de mês e o mapa */}
      {/* Certifica-se de que main também é um flex container para que seu filho QueimadasMap.tsx possa crescer */}
      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', padding: '0 20px 20px 20px' }}>
        {/* Contêiner para os botões de seleção de mês */}
        <div style={{ marginBottom: '15px', padding: '10px 0', textAlign: 'center', background: '#e9ecef', borderBottom: '1px solid #dee2e6', borderRadius: '0 0 8px 8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
          {/* Mapeia sobre as chaves do monthGeoJsonMap para criar um botão para cada mês */}
          {Object.keys(monthGeoJsonMap).map((monthKey) => (
            <button
              key={monthKey}
              onClick={() => setSelectedMonth(monthKey)}
              style={{
                margin: '5px 8px',
                padding: '10px 18px',
                fontSize: '16px',
                cursor: 'pointer',
                backgroundColor: selectedMonth === monthKey ? '#007bff' : '#f0f0f0',
                color: selectedMonth === monthKey ? 'white' : '#333',
                border: selectedMonth === monthKey ? '1px solid #007bff' : '1px solid #ccc',
                borderRadius: '5px',
                transition: 'background-color 0.3s, color 0.3s, border-color 0.3s',
                fontWeight: selectedMonth === monthKey ? 'bold' : 'normal',
                boxShadow: selectedMonth === monthKey ? '0 2px 5px rgba(0, 123, 255, 0.3)' : 'none'
              }}
            >
              {/* Exibe apenas os dois últimos dígitos (o número do mês) no botão */}
              {monthKey.split('-')[1]}
            </button>
          ))}
          {/* Se você quiser adicionar o botão "Todos os Meses" novamente, adicione aqui */}
          {/* <button
            onClick={() => setSelectedMonth('all')}
            // ... estilos ...
          >
            Todos os Meses
          </button> */}
        </div>

        <QueimadasMap
          queimadasDataUrls={currentQueimadasUrls} // Isso será um array com uma única URL ou vazio
          biomasOutlineUrl={biomasOutlineUrl}
        />
      </main>

      {/* Rodapé da aplicação */}
      <footer style={{ textAlign: 'center', padding: '10px', background: '#282c34', color: 'white', borderTop: '1px solid #eee', fontSize: '0.9em', zIndex: 10 }}>
        <p>&copy; {new Date().getFullYear()} Seu Nome/Empresa. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default App;