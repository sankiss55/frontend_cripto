import axios from "axios";
import Chart from 'chart.js/auto';
import url_API from "../config/url";

/**
 * Clase que maneja las peticiones y la lógica de la aplicación de criptomonedas
 * @class Peticiones
 */
class Peticiones {
  /**
   * Crea una instancia de la clase Peticiones
   * Inicializa el array de criptomonedas y el conjunto de criptos seleccionadas
   * @constructor
   */
  constructor() {
    this.cripto_all = [];          // Almacena todas las criptomonedas
    this.selectedCryptos = new Set(); // Almacena los IDs de las criptos seleccionadas para comparación
    this.setupPeriodSelector();    // Configura el selector de período
   // this.startPriceUpdates();    // Comentado: Actualización automática de precios
  }

  /**
   * Inicia la actualización automática de precios cada 5 segundos
   * @method startPriceUpdates
   */
  startPriceUpdates() {
    this.updateInterval = setInterval(async () => {
      try {
        const response = await axios.get(`${url_API}cripto`);
        
        this.cripto_all = response.data;
        this.updatePricesUI();
      } catch (error) {
        console.error("Error al actualizar precios:", error);
      }
    }, 5000); 
  }

  /**
   * Actualiza la interfaz de usuario con los precios más recientes
   * @method updatePricesUI
   */
  updatePricesUI() {
    this.cripto_all.forEach(cripto => {
      const element = document.getElementById(cripto.id);
      if (element) {
        const priceElement = element.querySelector('p');
        if (priceElement) {
          // Actualiza el precio y el porcentaje de cambio con formato
          priceElement.innerHTML = `
            $${Number(cripto.price).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            <span style="color: ${cripto.percent_change_24h >= 0 ? '#4caf50' : '#ff4444'}">
              ${cripto.percent_change_24h >= 0 ? '+' : ''}${cripto.percent_change_24h.toFixed(2)}%
            </span>
          `;
        }
      }
    });
  }

  /**
   * Configura el selector de período para actualizar el gráfico cuando cambie
   * @method setupPeriodSelector
   */
  setupPeriodSelector() {
    const selector = document.getElementById('periodo-selector');
    if (selector) {
      selector.addEventListener('change', () => {
        if (this.selectedCryptos.size > 0) {
          this.updateComparisonChart();
        }
      });
    }
  }

  /**
   * Obtiene los precios actuales de todas las criptomonedas
   * @method precio_cripto
   * @async
   * @throws {Error} Si hay un error al obtener los precios
   */
   async precio_cripto() {
    try {
      const response = await axios.get(`${url_API}cripto`);
      this.create_element_cripto(response);
      this.cripto_all = response.data;
    } catch (error) {
      console.error("Error al obtener el precio de las criptomonedas:", error);
      throw error;
    }
  }
  /**
   * Crea los elementos HTML para mostrar la lista de criptomonedas
   * @method create_element_cripto
   * @param {Object} response - Respuesta de la API con los datos de las criptomonedas
   */
   create_element_cripto(response) {
    let cripto_list = document.getElementById('cripto_list');
    cripto_list.innerHTML = ''; // Limpia la lista existente
    
    for (let i = 0; i < response.data.length; i++) {
      const cripto = response.data[i];
      let new_element_cripto = document.createElement('div');
      new_element_cripto.className = 'cripto_list_element';
      // Agrega la clase 'selected' si la cripto está seleccionada
      if (this.selectedCryptos.has(cripto.id)) {
        new_element_cripto.className += ' selected';
      }
      new_element_cripto.id = cripto.id;
      new_element_cripto.innerHTML = `
        <spam>
          <img src="${cripto.logo}" alt="${cripto.name} logo"/>
          <div>
            <h2>${cripto.name} <span style="color: #8bb9ff">${cripto.symbol}</span></h2>
            <p>$${Number(cripto.price).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              <span style="color: ${cripto.percent_change_24h >= 0 ? '#4caf50' : '#ff4444'}">
                ${cripto.percent_change_24h >= 0 ? '+' : ''}${cripto.percent_change_24h.toFixed(2)}%
              </span>
            </p>
          </div>
        </spam>
        <div class="cripto-buttons">
          <button class="btn-info">Ver información</button>
          <button class="btn-graph">Ver gráfico comparativa</button>
        </div>
      `;
      const btnInfo = new_element_cripto.querySelector('.btn-info');
      const btnGraph = new_element_cripto.querySelector('.btn-graph');
      
      btnInfo.addEventListener('click', (e) => {
        e.stopPropagation(); 
        this.mostrarDetalleCripto(cripto);
      });
      
      btnGraph.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCryptoSelection(cripto);
      });

      cripto_list.appendChild(new_element_cripto);
    }
  }

  /**
   * Busca criptomonedas por nombre o símbolo
   * @method buscarCriptomonedas
   * @param {string} cripto_search - Término de búsqueda
   */
  buscarCriptomonedas(cripto_search) {
    let cripto_list = document.getElementById('cripto_list');
    cripto_list.innerHTML = '';
    
    // Si la búsqueda está vacía, muestra todas las criptomonedas
    if (cripto_search === '') {
      this.create_element_cripto({data: this.cripto_all});
      return;
    }

    // Filtra las criptomonedas que coincidan con la búsqueda
    let element_search = [];
    for (let index = 0; index < this.cripto_all.length; index++) {
      const element = this.cripto_all[index];
      if(element.name.toLowerCase().includes(cripto_search.toLowerCase()) || 
         element.symbol.toLowerCase().includes(cripto_search.toLowerCase())) {
        element_search.push(element);
      }
    }
    this.create_element_cripto({data: element_search});
  }

  /**
   * Obtiene los datos históricos de una criptomoneda
   * @method historical
   * @async
   * @param {string} cryptoId - ID de la criptomoneda
   * @param {number} dias - Número de días de histórico (default: 30)
   * @returns {Promise<Array>} Datos históricos de la criptomoneda
   * @throws {Error} Si hay un error al obtener los datos históricos
   */
   async historical(cryptoId, dias = 30) {
    try {
      console.log('Solicitando datos históricos para:', cryptoId, 'días:', dias);
      const response = await axios.get(`${url_API}historical/${cryptoId}`, {
        params: { dias }
      });
      
      if (!Array.isArray(response.data)) {
        throw new Error('Formato de respuesta inválido: se esperaba un array');
      }
      
      if (response.data.length === 0) {
        throw new Error('No hay datos históricos disponibles');
      }
      
      console.log('Datos históricos recibidos:', response.data.length, 'registros');
      return response.data;
    } catch (error) {
      console.error('Error al obtener datos históricos:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Propagar un error más informativo
      throw new Error(
        error.response?.data?.details || 
        error.response?.data?.error || 
        error.message || 
        'Error desconocido al obtener datos históricos'
      );
    }
  }

  /**
   * Alterna la selección de una criptomoneda para la comparación
   * @method toggleCryptoSelection
   * @async
   * @param {Object} cripto - Objeto con la información de la criptomoneda
   */
  async toggleCryptoSelection(cripto) {
    // Añade o elimina la criptomoneda del conjunto de seleccionadas
    if (this.selectedCryptos.has(cripto.id)) {
      this.selectedCryptos.delete(cripto.id);
    } else {
      this.selectedCryptos.add(cripto.id);
    }
    
    // Actualiza la interfaz de usuario
    document.getElementById(cripto.id).classList.toggle('selected');
    this.updateSelectedList();
    await this.updateComparisonChart();
  }

  /**
   * Actualiza la lista visual de criptomonedas seleccionadas
   * @method updateSelectedList
   */
  updateSelectedList() {
    const selectedList = document.getElementById('selected-list');
    selectedList.innerHTML = '';
    
    this.cripto_all.forEach(cripto => {
      if (this.selectedCryptos.has(cripto.id)) {
        const tag = document.createElement('div');
        tag.className = 'selected-crypto-tag';
        tag.innerHTML = `
          <img src="${cripto.logo}" alt="${cripto.name}"/>
          <span>${cripto.name}</span>
          <button>×</button>
        `;
        const removeButton = tag.querySelector('button');
        removeButton.addEventListener('click', () => this.toggleCryptoSelection(cripto));
        selectedList.appendChild(tag);
      }
    });
  }

  async updateComparisonChart() {
    try {
      if (this.selectedCryptos.size === 0) {
        document.getElementById('comparison-chart-container').innerHTML = 
          '<p>Selecciona las criptomonedas para comparar sus precios</p>';
        return;
      }

      // Obtener el período seleccionado
      const periodoSelector = document.getElementById('periodo-selector');
      const dias = periodoSelector ? parseInt(periodoSelector.value) : 30;

      // Mostrar estado de carga
      const chartContainer = document.getElementById('comparison-chart-container');
      chartContainer.innerHTML = '<p>Cargando datos históricos...</p>';
      
      const colors = ['#8bb9ff', '#ff9f7f', '#7fff8e', '#ff7fb6', '#7fddff'];
      const datasets = [];
      let colorIndex = 0;
      
      // Recolectar todos los datos históricos primero
      const historicalDataPromises = Array.from(this.selectedCryptos).map(async cryptoId => {
        const cripto = this.cripto_all.find(c => c.id === cryptoId);
        if (!cripto) return null;
        
        try {
          const data = await this.historical(cryptoId, dias); // Pasamos el período seleccionado
          return {
            cryptoId,
            name: cripto.name,
            data
          };
        } catch (error) {
          console.warn(`Error al obtener datos históricos para ${cripto.name}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(historicalDataPromises);
      const validResults = results.filter(result => result !== null);
      
      if (validResults.length === 0) {
        chartContainer.innerHTML = '<p>No se pudieron obtener datos históricos. Por favor, intenta más tarde.</p>';
        return;
      }
      
      // Crear el canvas para el gráfico
      chartContainer.innerHTML = '<canvas id="comparison-chart"></canvas>';
      const ctx = document.getElementById('comparison-chart').getContext('2d');
      
      // Obtener las fechas de los datos históricos
      const dates = results[0]?.data.map(d => 
        new Date(d.timestamp).toLocaleDateString()
      ) || [];

      // Usar los datos ya obtenidos de validResults en lugar de hacer nuevas peticiones
      for (const result of validResults) {
        const cripto = this.cripto_all.find(c => c.id === result.cryptoId);
        if (!cripto) continue;
        
        datasets.push({
          label: cripto.name,
          data: result.data.map(d => d.price),
          borderColor: colors[colorIndex % colors.length],
          backgroundColor: `${colors[colorIndex % colors.length]}33`,
          borderWidth: 2,
          fill: true,
          tension: 0.4
        });
        
        colorIndex++;
      }

      new Chart(ctx, {
        type: 'line',
        data: {
          labels: dates,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { color: '#fff' }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(26, 31, 46, 0.9)',
              titleColor: '#fff',
              bodyColor: '#8bb9ff'
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.1)' },
              ticks: { color: '#fff' }
            },
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.1)' },
              ticks: {
                color: '#fff',
                callback: value => '$' + value.toLocaleString()
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error al actualizar el gráfico comparativo:', error);
    }
  }
   async getGlobalMetrics() {
   
  }

  /**
   * Muestra el gráfico de precios históricos de una criptomoneda
   * @method mostrarGrafico
   * @async
   * @param {string} cryptoId - ID de la criptomoneda
   * @param {string} cryptoName - Nombre de la criptomoneda
   */
  async mostrarGrafico(cryptoId, cryptoName) {
    try {
      // Obtiene el período seleccionado o usa 30 días por defecto
      const periodoSelector = document.getElementById('periodo-selector');
      const dias = periodoSelector ? parseInt(periodoSelector.value) : 30;
      const historicalData = await this.historical(cryptoId, dias);
      const ctx = document.getElementById('chart-container');
      ctx.innerHTML = '<canvas id="price-chart"></canvas>';
      
      const chart = new Chart(document.getElementById('price-chart'), {
        type: 'line',
        data: {
          labels: historicalData.map(d => new Date(d.timestamp).toLocaleDateString()),
          datasets: [{
            label: cryptoName,
            data: historicalData.map(d => d.price),
            borderColor: '#8bb9ff',
            backgroundColor: '#8bb9ff33',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { color: '#fff' }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(26, 31, 46, 0.9)',
              titleColor: '#fff',
              bodyColor: '#8bb9ff'
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.1)' },
              ticks: { color: '#fff' }
            },
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.1)' },
              ticks: {
                color: '#fff',
                callback: value => '$' + value.toLocaleString()
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error al mostrar el gráfico:', error);
      document.getElementById('chart-container').innerHTML = 
        '<p>Error al cargar el gráfico. Por favor, intenta de nuevo.</p>';
    }
  }

  /**
   * Muestra los detalles completos de una criptomoneda
   * @method mostrarDetalleCripto
   * @param {Object} cripto - Objeto con la información completa de la criptomoneda
   */
  mostrarDetalleCripto(cripto) {
    const detalleContainer = document.querySelector('#detalle-cripto');
    if (!detalleContainer) return;

    // Calcula el color del cambio de precio según sea positivo o negativo
    const cambio24h = cripto.percent_change_24h;
    const colorCambio = cambio24h >= 0 ? '#4caf50' : '#ff4444';
    
    detalleContainer.innerHTML = `
      <div class="cripto-detalle">
        <div class="cripto-header">
          <img src="${cripto.logo}" alt="${cripto.name} logo" />
          <h2>${cripto.name} <span class="symbol">${cripto.symbol}</span></h2>
        </div>
        
        <div class="cripto-stats">
          <div class="stat-item">
            <h3>Precio actual</h3>
            <p class="precio">$${Number(cripto.price).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
          
          <div class="stat-item">
            <h3>Cambio 24h</h3>
            <p class="cambio" style="color: ${colorCambio}">
              ${cambio24h >= 0 ? '+' : ''}${cambio24h.toFixed(2)}%
            </p>
          </div>
          
          <div class="stat-item">
            <h3>Volumen 24h</h3>
            <p>$${Number(cripto.volume_24h).toLocaleString('es-ES', {maximumFractionDigits: 0})}</p>
          </div>

          <div class="stat-item">
            <h3>Market Cap</h3>
            <p>$${Number(cripto.market_cap).toLocaleString('es-ES', {maximumFractionDigits: 0})}</p>
          </div>
        </div>
      </div>
    `;

    // Mostrar el gráfico después de mostrar los detalles
    this.mostrarGrafico(cripto.id, cripto.name);
  }
  /**
   * Limpia los intervalos y recursos cuando el componente se destruye
   * @method destruir
   */
  destruir() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

export default Peticiones;
