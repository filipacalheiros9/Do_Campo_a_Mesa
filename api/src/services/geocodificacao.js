// Converte um código postal português em coordenadas através do Nominatim/OpenStreetMap.
const cache = new Map();
let fila = Promise.resolve();
let ultimoPedido = 0;

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

async function pesquisar(parametrosPesquisa) {
  const atraso = Math.max(0, 1100 - (Date.now() - ultimoPedido));
  if (atraso) await esperar(atraso);

  const parametros = new URLSearchParams({
    ...parametrosPesquisa,
    countrycodes: 'pt',
    format: 'jsonv2',
    limit: '1'
  });
  ultimoPedido = Date.now();
  const resposta = await fetch(`https://nominatim.openstreetmap.org/search?${parametros}`, {
    headers: {
      'User-Agent': process.env.NOMINATIM_USER_AGENT || 'DoCampoAMesa/0.1 (projeto academico)',
      'Accept-Language': 'pt'
    },
    signal: AbortSignal.timeout(5000)
  });
  if (!resposta.ok) return null;

  const [resultado] = await resposta.json();
  const lat = Number(resultado?.lat);
  const lng = Number(resultado?.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

async function consultarNominatim(codigoPostal, localidade) {
  const peloCodigoPostal = await pesquisar({ postalcode: codigoPostal });
  if (peloCodigoPostal || !localidade) return peloCodigoPostal;

  return pesquisar({ q: `${localidade}, Portugal` });
}

async function geocodificarCodigoPostal(codigoPostal, localidade = '') {
  const codigoNormalizado = String(codigoPostal).trim();
  const localidadeNormalizada = String(localidade).trim();
  const chave = `${codigoNormalizado}|${localidadeNormalizada.toLowerCase()}`;
  const guardado = cache.get(chave);
  if (guardado && guardado.expiraEm > Date.now()) return guardado.valor;

  const pedido = fila.then(() => consultarNominatim(codigoNormalizado, localidadeNormalizada));
  fila = pedido.catch(() => null);

  try {
    const valor = await pedido;
    cache.set(chave, {
      valor,
      expiraEm: Date.now() + (valor ? 24 * 60 * 60 * 1000 : 5 * 60 * 1000)
    });
    return valor;
  } catch {
    return null;
  }
}

module.exports = { geocodificarCodigoPostal };
