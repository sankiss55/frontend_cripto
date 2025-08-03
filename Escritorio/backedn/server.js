/**
 * Servidor Express para la API de criptomonedas
 * Proporciona endpoints para obtener información de criptomonedas desde CoinMarketCap
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const port = 3000;

// Configuración de CORS para permitir solicitudes desde cualquier origen
app.use(cors());

// Configuración de headers para la API de CoinMarketCap
const headers = {
  'Accept': 'application/json',
  'X-CMC_PRO_API_KEY': '291c9dd0-dfc2-4acc-8ba9-993cac5ed485', // API key de CoinMarketCap
};

/**
 * Endpoint GET /cripto
 * Obtiene la lista de las 100 principales criptomonedas con sus precios actuales
 * y información adicional como logos
 */
app.get('/cripto', async (req, res) => {
  try {
    // Obtiene las 100 principales criptomonedas
    const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=100', {
      headers
    });

    // Obtiene información adicional (logos) para las criptomonedas encontradas
    const ids = response.data.data.map(c => c.id).join(',');
    const infoResponse = await axios.get(`https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?id=${ids}`, {
      headers
    });

    const result = response.data.data.map(c => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      price: c.quote.USD.price,
      volume_24h: c.quote.USD.volume_24h,
      percent_change_1h: c.quote.USD.percent_change_1h,
      percent_change_24h: c.quote.USD.percent_change_24h,
      market_cap: c.quote.USD.market_cap,
      logo: infoResponse.data.data[c.id]?.logo || ''
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint GET /historical/:id
 * Obtiene los datos históricos de una criptomoneda específica
 * @param {string} id - ID de la criptomoneda
 * @param {number} dias - Número de días de histórico (default: 30 días)
 */
app.get('/historical/:id', async (req, res) => {
  try {
    // Obtiene parámetros de la solicitud
    const { id } = req.params;
    const dias = parseInt(req.query.dias) || 30;
    
    // Obtiene la cotización actual y los cambios porcentuales
    const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
      headers,
      params: { id, convert: 'USD' }
    });

    // Verifica si se encontraron datos válidos
    if (!response.data?.data?.[id]?.quote?.USD) {
      throw new Error('No se encontraron datos para esta criptomoneda');
    }

    const quote = response.data.data[id].quote.USD;
    const now = new Date();

    /**
     * Genera puntos de datos históricos basados en el período seleccionado
     * @param {number} dias - Período de tiempo en días (1, 7, 30, o 90)
     * @returns {Array} Array de puntos con timestamps y cambios porcentuales
     */
    const getPoints = (dias) => {
      switch(dias) {
        case 1:
          // Para 1 día: datos de 24h, 1h y actual
          return [
            { time: now.getTime() - (24 * 60 * 60 * 1000), change: quote.percent_change_24h },
            { time: now.getTime() - (60 * 60 * 1000), change: quote.percent_change_1h },
            { time: now.getTime(), change: 0 }
          ];
        case 7:
          return [
            { time: now.getTime() - (7 * 24 * 60 * 60 * 1000), change: quote.percent_change_7d },
            { time: now.getTime() - (24 * 60 * 60 * 1000), change: quote.percent_change_24h },
            { time: now.getTime(), change: 0 }
          ];
        case 90:
          return [
            { time: now.getTime() - (90 * 24 * 60 * 60 * 1000), change: quote.percent_change_90d },
            { time: now.getTime() - (60 * 24 * 60 * 60 * 1000), change: quote.percent_change_60d },
            { time: now.getTime() - (30 * 24 * 60 * 60 * 1000), change: quote.percent_change_30d },
            { time: now.getTime() - (7 * 24 * 60 * 60 * 1000), change: quote.percent_change_7d },
            { time: now.getTime(), change: 0 }
          ];
        case 30:
        default:
          return [
            { time: now.getTime() - (30 * 24 * 60 * 60 * 1000), change: quote.percent_change_30d },
            { time: now.getTime() - (7 * 24 * 60 * 60 * 1000), change: quote.percent_change_7d },
            { time: now.getTime() - (24 * 60 * 60 * 1000), change: quote.percent_change_24h },
            { time: now.getTime(), change: 0 }
          ];
      }
    };

    // Obtiene los puntos de datos según el período solicitado
    const points = getPoints(dias);

    // Genera los datos históricos interpolados
    const data = [];
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      // Calcula los precios inicial y final para este segmento
      const startPrice = quote.price / (1 + (end.change / 100));
      const endPrice = i === points.length - 2 ? quote.price : quote.price / (1 + (points[i + 2].change / 100));

      // Interpola 5 puntos entre cada par de puntos de datos
      for (let j = 0; j <= 5; j++) {
        // Calcula el tiempo y precio interpolados
        const time = start.time + ((end.time - start.time) * (j / 5));
        const price = startPrice + ((endPrice - startPrice) * (j / 5));
        // Agrega el punto interpolado al conjunto de datos
        data.push({
          timestamp: new Date(time).toISOString(),
          price
        });
      }
    }

    // Envía los datos históricos como respuesta
    res.json(data);
  } catch (error) {
    // Maneja los errores y envía una respuesta de error
    res.status(500).json({ 
      error: 'Error al obtener datos históricos',
      details: error.message
    });
  }
});

/**
 * Inicia el servidor Express en el puerto especificado
 * El servidor proporciona una API REST para obtener datos de criptomonedas
 */
app.listen(port, () => {
  console.log(`Servidor backend escuchando en http://localhost:${port}`);
});
