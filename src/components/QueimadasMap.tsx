import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Correção para problemas de ícones padrão do Leaflet no Webpack/Create-React-App ---
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});
// --------------------------------------------------------------------------

// Função auxiliar para padronizar nomes de biomas:
// - Converte '�' para 'Ô' (se presente nos dados de origem)
// - Remove todos os acentos
// - Converte para maiúsculas para comparação consistente
const standardizeBiomaName = (name: string | undefined): string | null => {
  if (!name) return null;
  let cleanName = name.replace(/�/g, 'Ô'); // Substitui o caractere problemático
  cleanName = cleanName.normalize('NFD').replace(/[\u0300-\u036f]/g, ""); // Remove acentos
  cleanName = cleanName.toUpperCase(); // Converte para maiúsculas
  return cleanName;
};

// Definição das props para o componente QueimadasMap
interface QueimadasMapProps {
  queimadasDataUrls: string[];
  biomasOutlineUrl: string;
}

// Componente auxiliar para controlar o mapa (zoom e centralização)
const MapController = ({ selectedBioma, biomasGeoJsonRef }: { selectedBioma: string | null, biomasGeoJsonRef: React.MutableRefObject<L.GeoJSON | null> }) => {
  const map = useMap();

  useEffect(() => {
    // Se a ref do GeoJSON dos biomas ainda não foi carregada, não faça nada.
    if (!biomasGeoJsonRef.current) {
      return;
    }

    if (selectedBioma) {
      let foundBiomaLayer: L.Layer | null = null;
      // Padroniza o bioma selecionado para comparação
      const standardizedSelectedBioma = standardizeBiomaName(selectedBioma);

      if (!standardizedSelectedBioma) {
          // Se o bioma selecionado padronizado for nulo, volta para a visão geral
          map.setView([-15.78, -47.93], 4);
          return;
      }

      // Itera sobre as sub-camadas do GeoJSON dos biomas
      biomasGeoJsonRef.current.eachLayer((layer: L.Layer) => {
        const geoJsonLayer = layer as L.GeoJSON;
        // Verifica se a camada é uma Feature GeoJSON
        if (geoJsonLayer.feature && geoJsonLayer.feature.type === 'Feature') {
          const feature = geoJsonLayer.feature as GeoJSON.Feature;

          // *** CORREÇÃO AQUI: Acessa properties de forma segura e verifica CD_LEGEN1 ***
          // Usa o operador de encadeamento opcional para acessar properties e CD_LEGEN1
          // E o operador de coalescência nula para garantir que seja string ou undefined
          const biomaNameInFeature = standardizeBiomaName(feature.properties?.CD_LEGEN1 as string | undefined);

          // Agora, compara apenas se o biomaNameInFeature não for nulo
          if (biomaNameInFeature && biomaNameInFeature === standardizedSelectedBioma) {
            foundBiomaLayer = layer;
            // Interrompe o loop assim que encontrar a camada
            return;
          }
        }
      });

      if (foundBiomaLayer) {
        // Usa o cast para 'any' para evitar o erro de tipagem de 'getBounds'
        if ((foundBiomaLayer as any).getBounds) {
            map.fitBounds((foundBiomaLayer as any).getBounds(), { padding: [20, 20] });
        } else {
            console.warn(`Camada do bioma '${selectedBioma}' encontrada, mas não tem o método getBounds.`);
        }
      } else {
        console.warn(`Camada de contorno não encontrada para o bioma: '${selectedBioma}'. Redefinindo visualização.`);
        // Se a camada do bioma não for encontrada, volta para a visão geral
        map.setView([-15.78, -47.93], 4);
      }
    } else { // selectedBioma é null ou vazio, significa "Todos os Biomas"
      // Usa o cast para 'any' para evitar o erro de tipagem de 'getBounds'
      if ((biomasGeoJsonRef.current as any).getBounds) {
        map.fitBounds((biomasGeoJsonRef.current as any).getBounds(), { padding: [20, 20] });
      } else {
        // Fallback para a visão inicial se getBounds não estiver disponível
        map.setView([-15.78, -47.93], 4);
      }
    }
  }, [selectedBioma, map, biomasGeoJsonRef]);

  return null;
};

const QueimadasMap: React.FC<QueimadasMapProps> = ({ queimadasDataUrls, biomasOutlineUrl }) => {
  const [selectedBioma, setSelectedBioma] = useState<string | null>(null);
  const [biomasList, setBiomasList] = useState<string[]>([]);
  const biomasGeoJsonRef = useRef<L.GeoJSON | null>(null);
  const [biomasData, setBiomasData] = useState<GeoJSON.GeoJSON | null>(null);
  const [allQueimadasData, setAllQueimadasData] = useState<GeoJSON.FeatureCollection[]>([]);

  // Carrega os dados dos contornos dos biomas
  useEffect(() => {
    fetch(biomasOutlineUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erro HTTP! Status: ${response.status} da URL: ${biomasOutlineUrl}`);
        }
        return response.json();
      })
      .then(data => {
        setBiomasData(data);
        if (data && data.features) {
          const uniqueBiomas = new Set<string>();
          data.features.forEach((feature: GeoJSON.Feature) => {
            // *** CORREÇÃO AQUI para o `useEffect` de carregamento dos biomas ***
            // Usa o operador de encadeamento opcional para acessar properties e CD_LEGEN1
            const biomaName = standardizeBiomaName(feature.properties?.CD_LEGEN1 as string | undefined);
            if (biomaName) {
                uniqueBiomas.add(biomaName);
            }
          });
          setBiomasList(Array.from(uniqueBiomas).sort());
        }
      })
      .catch(error => console.error("Erro ao carregar dados dos biomas:", error));
  }, [biomasOutlineUrl]);

  // Carrega os dados de queimadas (pontos)
  useEffect(() => {
    const loadQueimadasData = async () => {
      setAllQueimadasData([]); // Limpa dados anteriores ao carregar novos
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
      setAllQueimadasData(fetchedData);
    };

    if (queimadasDataUrls.length > 0) {
      loadQueimadasData();
    } else {
      setAllQueimadasData([]); // Se não houver URLs, limpa os dados
    }
  }, [queimadasDataUrls]);

  // Use useMemo para filtrar os dados de queimada com base no bioma selecionado
  const filteredQueimadasData = useMemo(() => {
    if (!selectedBioma || allQueimadasData.length === 0) {
      // Retorna todos os dados se nenhum bioma estiver selecionado ou se não houver dados carregados
      return allQueimadasData;
    }

    const standardizedSelectedBioma = standardizeBiomaName(selectedBioma);
    if (!standardizedSelectedBioma) {
        // Se o nome do bioma selecionado for inválido após padronização, retorna todos os dados
        return allQueimadasData;
    }

    // Filtra as features de cada coleção de dados
    const filteredCollections: GeoJSON.FeatureCollection[] = allQueimadasData.map(collection => {
      const filteredFeatures = collection.features.filter(feature => {
        // Assegura que a propriedade 'bioma' existe nos dados de queimada
        // *** CORREÇÃO AQUI no `useMemo` de filtragem ***
        const biomaQueimada = standardizeBiomaName(feature.properties?.bioma as string | undefined);
        return biomaQueimada === standardizedSelectedBioma;
      });
      return { ...collection, features: filteredFeatures }; // Retorna uma nova coleção com as features filtradas
    });

    return filteredCollections;
  }, [selectedBioma, allQueimadasData]);


  // Estilo para os contornos dos biomas
  const styleBiomasOutline = (feature: GeoJSON.Feature<GeoJSON.Geometry, any> | undefined) => {
    // *** CORREÇÃO AQUI no `styleBiomasOutline` ***
    // Usa o operador de encadeamento opcional para acessar properties e CD_LEGEN1
    const biomaName = standardizeBiomaName(feature?.properties?.CD_LEGEN1 as string | undefined);

    let color = '#808080'; // Cor padrão

    // Usa nomes padronizados para o switch case
    switch (biomaName) {
      case 'AMAZONIA':
        color = '#33A02C'; // Verde
        break;
      case 'CERRADO':
        color = '#B2DF8A'; // Verde claro
        break;
      case 'MATA ATLANTICA':
        color = '#1F78B4'; // Azul
        break;
      case 'CAATINGA':
        color = '#E31A1C'; // Vermelho
        break;
      case 'PAMPA':
        color = '#FF7F00'; // Laranja
        break;
      case 'PANTANAL':
        color = '#6A3D9A'; // Roxo
        break;
      default:
        color = '#808080';
    }

    return {
      color: color,
      weight: 1.5,
      fillOpacity: 0.05
    };
  };

  // Funções para popups
  const onEachBiomaFeature = (feature: GeoJSON.Feature<GeoJSON.Geometry, any> | undefined, layer: L.Layer) => {
    // *** CORREÇÃO AQUI no `onEachBiomaFeature` ***
    // Usa o operador de encadeamento opcional para acessar properties e CD_LEGEN1
    const biomaDisplayName = standardizeBiomaName(feature?.properties?.CD_LEGEN1 as string | undefined);
    if (biomaDisplayName) {
      layer.bindPopup(`Bioma: <b>${biomaDisplayName}</b>`);
    }
  };

  const pointToLayerQueimadas = (feature: GeoJSON.Feature, latlng: L.LatLng) => {
    return L.circleMarker(latlng, {
      radius: 4,
      fillColor: "#FF0000",
      color: "#000",
      weight: 0.5,
      opacity: 1,
      fillOpacity: 0.8
    });
  };

  const onEachQueimadaFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
    // *** CORREÇÃO AQUI no `onEachQueimadaFeature` ***
    // Usa o operador de encadeamento opcional para acessar properties e bioma
    const biomaProperty = standardizeBiomaName(feature.properties?.bioma as string | undefined);

    const popupContent = `
        <div>
          <strong>Queimada Detectada</strong><br/>
          Latitude: ${feature.geometry.type === 'Point' ? feature.geometry.coordinates[1].toFixed(4) : 'N/A'}<br/>
          Longitude: ${feature.geometry.type === 'Point' ? feature.geometry.coordinates[0].toFixed(4) : 'N/A'}<br/>
          ${feature.properties?.data ? `Data: ${feature.properties.data}<br/>` : ''}
          ${feature.properties?.satelite ? `Satélite: ${feature.properties.satelite}<br/>` : ''}
          ${feature.properties?.confianca ? `Confiança: ${feature.properties.confianca}<br/>` : ''}
          ${biomaProperty ? `Bioma: ${biomaProperty}<br/>` : ''}
        </div>
      `;
      layer.bindPopup(popupContent);
  };

  return (
    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
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

      <MapContainer
        center={[-15.78, -47.93]}
        zoom={4}
        style={{ flexGrow: 1, height: '100%', width: '100%' }}
        maxBounds={[
          [-35.0, -75.0],
          [6.0, -32.0]
        ]}
        maxBoundsViscosity={1.0}
        minZoom={4}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {biomasData && (
          <GeoJSON
            data={biomasData as GeoJSON.GeoJSON}
            style={styleBiomasOutline}
            onEachFeature={onEachBiomaFeature}
            ref={biomasGeoJsonRef}
          />
        )}

        {/* Renderiza as camadas GeoJSON das queimadas FILTRADAS */}
        {filteredQueimadasData.map((dataCollection, index) => (
          <GeoJSON
            key={`queimadas-${index}-${queimadasDataUrls[index] || 'no-url'}-${selectedBioma || 'no-bioma'}`}
            data={dataCollection as GeoJSON.GeoJSON}
            pointToLayer={pointToLayerQueimadas}
            onEachFeature={onEachQueimadaFeature}
          />
        ))}

        <MapController selectedBioma={selectedBioma} biomasGeoJsonRef={biomasGeoJsonRef} />
      </MapContainer>
    </div>
  );
};

export default QueimadasMap;