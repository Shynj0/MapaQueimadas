// src/components/QueimadasMap.tsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Correção para problemas de ícones padrão do Leaflet no Webpack/Create-React-App ---
// Isso garante que os marcadores padrão (se usados, embora aqui sejam círculos) funcionem corretamente.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});
// --------------------------------------------------------------------------

// Função auxiliar para padronizar nomes de biomas:
// Remove acentos e converte para maiúsculas para facilitar comparações.
const standardizeBiomaName = (name: string | undefined): string | null => {
  if (!name) return null;
  let cleanName = name.replace(/�/g, 'Ô'); // Lida com um caractere comum de codificação estranha
  cleanName = cleanName.normalize('NFD').replace(/[\u0300-\u036f]/g, ""); // Remove acentos
  cleanName = cleanName.toUpperCase(); // Converte para maiúsculas para uniformidade
  return cleanName;
};

interface QueimadasMapProps {
  queimadasDataUrls: string[]; // URLs para os arquivos GeoJSON das queimadas
  biomasOutlineUrl: string; // URL para o arquivo GeoJSON dos biomas (ex: divisao_bioma.geojson)
}

// MapController para controle do mapa (zoom, pan) baseado no bioma selecionado
const MapController = ({ selectedBioma, biomasGeoJsonRef }: { selectedBioma: string | null, biomasGeoJsonRef: React.MutableRefObject<L.GeoJSON | null> }) => {
  const map = useMap(); // Hook do Leaflet para acessar a instância do mapa

  useEffect(() => {
    // Garante que a referência ao GeoJSON dos biomas esteja pronta
    if (!biomasGeoJsonRef.current) {
      return;
    }

    if (selectedBioma) {
      let foundBiomaLayer: L.Layer | null = null;
      const standardizedSelectedBioma = standardizeBiomaName(selectedBioma);

      if (!standardizedSelectedBioma) {
          // Se o bioma selecionado for nulo (ex: "Todos os Biomas"), ajusta para a extensão total da camada de biomas
          if (biomasGeoJsonRef.current && (biomasGeoJsonRef.current as any).getBounds) {
            map.fitBounds((biomasGeoJsonRef.current as any).getBounds(), { padding: [20, 20] });
          } else {
            map.setView([-15.78, -47.93], 4); // Posição padrão do centro do Brasil
          }
          return;
      }

      // Itera sobre as camadas do GeoJSON de biomas para encontrar o bioma selecionado
      biomasGeoJsonRef.current.eachLayer((layer: L.Layer) => {
        const geoJsonLayer = layer as L.GeoJSON;
        if (geoJsonLayer.feature && geoJsonLayer.feature.type === 'Feature') {
          const feature = geoJsonLayer.feature as GeoJSON.Feature;
          // Assumindo 'CD_LEGEN1' como a propriedade do nome do bioma no seu GeoJSON
          const biomaNameInFeature = standardizeBiomaName(feature.properties?.CD_LEGEN1 as string | undefined); 

          if (biomaNameInFeature && biomaNameInFeature === standardizedSelectedBioma) {
            foundBiomaLayer = layer;
            return; // Encontrou a camada, pode sair do loop
          }
        }
      });

      if (foundBiomaLayer) {
        // Ajusta a visualização do mapa para os limites (bounds) do bioma encontrado, com padding
        if ((foundBiomaLayer as any).getBounds) {
            map.fitBounds((foundBiomaLayer as any).getBounds(), { padding: [20, 20] });
        } else {
            console.warn(`Camada do bioma '${selectedBioma}' encontrada, mas não tem o método getBounds.`);
        }
      } else {
        console.warn(`Camada de contorno não encontrada para o bioma: '${selectedBioma}'. Redefinindo visualização.`);
        map.setView([-15.78, -47.93], 4); // Volta para a visualização padrão do Brasil
      }
    } else {
      // Se nenhum bioma está selecionado (opção "Todos os Biomas"), ajusta para a extensão total da camada de biomas
      if (biomasGeoJsonRef.current && (biomasGeoJsonRef.current as any).getBounds) {
        map.fitBounds((biomasGeoJsonRef.current as any).getBounds(), { padding: [20, 20] });
      } else {
        // Define uma visualização padrão para o Brasil se os limites não puderem ser obtidos
        map.setView([-15.78, -47.93], 4);
      }
    }
  }, [selectedBioma, map, biomasGeoJsonRef]); // Dependências do useEffect

  return null; // Este componente não renderiza nada diretamente no DOM
};

const QueimadasMap: React.FC<QueimadasMapProps> = ({ queimadasDataUrls, biomasOutlineUrl }) => {
  const [selectedBioma, setSelectedBioma] = useState<string | null>(null); // Estado para o bioma selecionado no filtro
  const [biomasList, setBiomasList] = useState<string[]>([]); // Lista de biomas para o dropdown
  const biomasGeoJsonRef = useRef<L.GeoJSON | null>(null); // Ref para a camada GeoJSON dos biomas
  const [biomasData, setBiomasData] = useState<GeoJSON.GeoJSON | null>(null); // Dados GeoJSON dos biomas
  const [allQueimadasData, setAllQueimadasData] = useState<GeoJSON.FeatureCollection[]>([]); // Dados GeoJSON de todas as queimadas

  // Efeito para carregar os dados dos contornos dos biomas
  useEffect(() => {
    fetch(biomasOutlineUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erro HTTP! Status: ${response.status} da URL: ${biomasOutlineUrl}`);
        }
        return response.json();
      })
      .then(data => {
        setBiomasData(data); // Define os dados carregados
        if (data && data.features) {
          const uniqueBiomas = new Set<string>();
          data.features.forEach((feature: GeoJSON.Feature) => {
            // Adiciona o nome do bioma à lista para o dropdown, excluindo a feição do "Brasil" se houver
            // ATENÇÃO: Verifique a propriedade e valor corretos no seu GeoJSON para identificar o Brasil
            if (feature.properties?.NomeDoPais !== 'Brasil') {
                const biomaName = standardizeBiomaName(feature.properties?.CD_LEGEN1 as string | undefined);
                if (biomaName) {
                    uniqueBiomas.add(biomaName);
                }
            }
          });
          setBiomasList(Array.from(uniqueBiomas).sort()); // Converte para array e ordena alfabeticamente
        }
      })
      .catch(error => console.error("Erro ao carregar dados dos biomas:", error));
  }, [biomasOutlineUrl]); // Executa apenas quando a URL do bioma muda

  // Efeito para carregar os dados de queimadas
  useEffect(() => {
    const loadQueimadasData = async () => {
      setAllQueimadasData([]); // Limpa dados anteriores antes de carregar novos
      const fetchedData: GeoJSON.FeatureCollection[] = [];
      for (const url of queimadasDataUrls) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Erro HTTP! Status: ${response.status} da URL: ${url}`);
          }
          const data = await response.json();
          fetchedData.push(data);
        } catch (error) {
          console.error(`Erro ao carregar dados de queimadas de ${url}:`, error);
        }
      }
      setAllQueimadasData(fetchedData); // Define os dados de todas as queimadas carregadas
    };

    if (queimadasDataUrls.length > 0) {
      loadQueimadasData();
    } else {
      setAllQueimadasData([]); // Se não há URLs, limpa os dados
    }
  }, [queimadasDataUrls]); // Executa apenas quando as URLs das queimadas mudam

  // Este useMemo simplesmente retorna TODAS as queimadas carregadas.
  // O filtro do dropdown agora só controla o zoom do mapa para o bioma,
  // mas NÃO a visibilidade dos pontos/polígonos de queimada.
  const filteredQueimadasData = useMemo(() => {
    return allQueimadasData;
  }, [allQueimadasData]); // Depende apenas de 'allQueimadasData'

  // FUNÇÃO DE ESTILO: Para o contorno do Brasil e as LINHAS AZUIS de delimitação dos BIOMAS
  const styleBiomasOutline = (feature: GeoJSON.Feature<GeoJSON.Geometry, any> | undefined) => {
    // Estilo para o contorno do Brasil (preto e preenchimento ouro/laranja)
    // ATENÇÃO: Confirme 'NomeDoPais' e 'Brasil' com as propriedades reais do seu GeoJSON
    if (feature?.properties?.NomeDoPais === 'Brasil') {
        return {
            color: '#000000',      // Cor do contorno do país: PRETO
            weight: 3,             // Espessura do contorno do país: 3 pixels
            opacity: 1,            // Opacidade total para o contorno
            fillColor: '#DAA520',  // Cor de preenchimento do país: OURO/LARANJA
            fillOpacity: 1         // Opacidade total para o preenchimento do país
        };
    }

    // Estilo para as divisões internas dos biomas (linhas AZUIS, sem preenchimento)
    return {
      color: '#0000FF',        // **Cor da LINHA de delimitação dos biomas: AZUL (#0000FF)**
      weight: 1.5,             // Espessura da linha dos biomas: 1.5 pixels
      opacity: 0.8,            // Opacidade da linha dos biomas: 80% (semi-transparente)
      fillColor: 'transparent',// Preenchimento dos biomas: TOTALMENTE TRANSPARENTE
      fillOpacity: 0           // Opacidade do preenchimento: ZERO
    };
  };

  // FUNÇÃO DE ESTILO: Para os polígonos de QUEIMADAS (contorno e preenchimento vermelhos semi-transparentes)
  const styleQueimadasPolygons = (feature: GeoJSON.Feature<GeoJSON.Geometry, any> | undefined) => {
    return {
      color: "#FF0000",      // Cor do contorno do polígono de queimada: VERMELHO
      weight: 1,             // Espessura do contorno: 1 pixel
      opacity: 0.7,          // Opacidade do contorno: 70%
      fillColor: '#FF0000',  // Cor de preenchimento do polígono de queimada: VERMELHO
      fillOpacity: 0.4       // Opacidade do preenchimento: 40% (semi-transparente)
    };
  };

  // Funções para definir o conteúdo dos popups ao clicar nas feições
  const onEachBiomaFeature = (feature: GeoJSON.Feature<GeoJSON.Geometry, any> | undefined, layer: L.Layer) => {
    const biomaDisplayName = standardizeBiomaName(feature?.properties?.CD_LEGEN1 as string | undefined);
    // Popup para o contorno do país (se aplicável)
    if (feature?.properties?.NomeDoPais === 'Brasil') { // Verifique a propriedade e valor corretos
        layer.bindPopup('Contorno do Brasil');
    } else if (biomaDisplayName) {
      // Popup para as delimitações dos biomas
      layer.bindPopup(`Bioma: <b>${biomaDisplayName}</b>`);
    }
  };

  const pointToLayerQueimadas = (feature: GeoJSON.Feature, latlng: L.LatLng) => {
    // Renderiza pontos de queimada como círculos
    return L.circleMarker(latlng, {
      radius: 4,
      fillColor: "#FF0000", // Cor de preenchimento do círculo: VERMELHO
      color: "#000",        // Cor do contorno do círculo: PRETO
      weight: 0.5,          // Espessura do contorno: 0.5 pixels
      opacity: 1,           // Opacidade do contorno: 100%
      fillOpacity: 0.8      // Opacidade do preenchimento: 80%
    });
  };

  const onEachQueimadaFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
    // Extrai e padroniza o nome do bioma da propriedade 'bioma' (se existir)
    const biomaProperty = standardizeBiomaName(feature.properties?.bioma as string | undefined);

    // Conteúdo HTML para o popup das queimadas
    const popupContent = `
        <div>
          <strong>Queimada Detectada</strong><br/>
          ${feature.geometry.type === 'Point' ? `Latitude: ${feature.geometry.coordinates[1].toFixed(4)}<br/>` : ''}
          ${feature.geometry.type === 'Point' ? `Longitude: ${feature.geometry.coordinates[0].toFixed(4)}<br/>` : ''}
          ${feature.geometry.type !== 'Point' ? `Tipo de Geometria: ${feature.geometry.type}<br/>` : ''}
          ${feature.properties?.data ? `Data: ${feature.properties.data}<br/>` : ''}
          ${feature.properties?.satelite ? `Satélite: ${feature.properties.satelite}<br/>` : ''}
          ${feature.properties?.confianca ? `Confiança: ${feature.properties.confianca}<br/>` : ''}
          ${biomaProperty ? `Bioma: ${biomaProperty}<br/>` : ''}
        </div>
      `;
      layer.bindPopup(popupContent);
  };

  return (
    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '0' }}>
      {/* Barra de filtro de biomas */}
      <div style={{ padding: '10px', background: '#f0f0f0', borderBottom: '1px solid #ccc', zIndex: 1000, boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <label htmlFor="bioma-select" style={{ marginRight: '10px', fontWeight: 'bold', color: '#333' }}>Filtrar por Bioma:</label>
        <select
          id="bioma-select"
          onChange={(e) => setSelectedBioma(e.target.value === '' ? null : e.target.value)}
          value={selectedBioma || ''}
          style={{ padding: '8px 12px', borderRadius: '5px', border: '1px solid #aaa', minWidth: '180px', fontSize: '1rem' }}
        >
          <option value="">Todos os Biomas</option>
          {biomasList.map((bioma) => (
            <option key={bioma} value={bioma}>
              {bioma}
            </option>
          ))}
        </select>
      </div>

      {/* Container do Mapa Leaflet */}
      <MapContainer
        center={[-15.78, -47.93]} // Centro inicial do mapa (Brasília)
        zoom={4} // Zoom inicial
        style={{ flexGrow: 1, height: '100%', width: '100%' }} // Estilo para preencher o espaço disponível
        maxBounds={[ // Limita a área navegável do mapa
          [-35.0, -75.0], // Sudoeste (Lat, Lng)
          [6.0, -32.0]    // Nordeste (Lat, Lng)
        ]}
        maxBoundsViscosity={1.0} // Impede o usuário de arrastar o mapa para fora dos limites
        minZoom={4} // Zoom mínimo permitido
      >
        {/* Camada de Tiles (mapa base OpenStreetMap) */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Camada GeoJSON para os contornos dos biomas E o contorno do Brasil */}
        {biomasData && (
          <GeoJSON
            data={biomasData as GeoJSON.GeoJSON}
            style={styleBiomasOutline} // Função de estilo para biomas e contorno do Brasil
            onEachFeature={onEachBiomaFeature} // Função para popups dos biomas
            ref={biomasGeoJsonRef} // Referência para controle do mapa
          />
        )}

        {/* Camadas GeoJSON para os dados de queimadas (filtradas, mas sempre visíveis) */}
        {filteredQueimadasData.map((dataCollection, index) => (
          <GeoJSON
            key={`queimadas-${index}-${queimadasDataUrls[index] || 'no-url'}-${selectedBioma || 'no-bioma'}`}
            data={dataCollection as GeoJSON.GeoJSON}
            style={styleQueimadasPolygons} // Estilo para polígonos de queimadas
            pointToLayer={pointToLayerQueimadas} // Função para customizar a renderização de pontos (focos de calor)
            onEachFeature={onEachQueimadaFeature} // Função para popups das queimadas
          />
        ))}

        {/* Componente para controlar o zoom e pan do mapa baseado no bioma selecionado */}
        <MapController selectedBioma={selectedBioma} biomasGeoJsonRef={biomasGeoJsonRef} />
      </MapContainer>
    </div>
  );
};

export default QueimadasMap;