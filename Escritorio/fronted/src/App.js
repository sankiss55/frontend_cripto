import { useEffect, useRef } from 'react';
import './App.css';
import Peticiones from './func/peticiones';

export default function App() {
  const peticiones = useRef(null);

  useEffect(() => {
    peticiones.current = new Peticiones();
    peticiones.current.precio_cripto();
    
    // Limpiar al desmontar
    return () => {
      if (peticiones.current) {
        peticiones.current.destruir();
      }
    };
  }, []);

  return (
    <main>
      <section className="seccion-lista">
        <h1>mercado cripto</h1>
        <div className="contenedor-busqueda">
          <div className="grupo-busqueda">
            <input
              type="text"
              className="entrada-busqueda"
              placeholder="buscar por nombre o símbolo..."
              onChange={(e) =>
                peticiones.current?.buscarCriptomonedas(e.target.value)
              }
              aria-label="buscar criptomonedas"
            />
           
        </div>
        
        </div>
        <div id="cripto_list" className="lista-cripto"></div>
      </section>

      <div>
  <h1>Detalles de la Criptomoneda</h1>
  <div id="detalle-cripto">
    <p>Escoje una cripto para ver su información</p>
  </div>
  <div id="chart-container">
    <p>Selecciona una criptomoneda para ver su gráfico</p>
  </div>
</div>

      <div>
        <h1>Gráfico Comparativo</h1>
        <div className="selected-cryptos">
          <div className="selected-header">
            <h3>Criptomonedas seleccionadas:</h3>
            <select id="periodo-selector" className="period-selector">
              <option value="1">24 horas</option>
              <option value="7">7 días</option>
              <option value="30" selected>30 días</option>
              <option value="90">90 días</option>
            </select>
          </div>
          <div id="selected-list"></div>
        </div>
        <div id="comparison-chart-container">
          <p>Selecciona las criptomonedas para comparar sus precios</p>
        </div>
      </div>
    </main>
  );
}
