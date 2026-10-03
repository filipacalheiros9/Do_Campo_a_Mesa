// Cliente HTTP da API: junta o URL base e o token JWT a cada pedido
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const USAR_DADOS_SIMULADOS = import.meta.env.VITE_USAR_DADOS_SIMULADOS === 'true';

// Preserva o código HTTP para a interface poder distinguir cada tipo de erro.
export class ErroApi extends Error {
  constructor(mensagem, codigo, detalhes = null) {
    super(mensagem);
    this.name = 'ErroApi';
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

async function tratar(resposta) {
  if (resposta.status === 204) return null;

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new ErroApi(
      dados?.erro || `Erro ${resposta.status}`,
      resposta.status,
      dados?.detalhes,
    );
  }

  return dados;
}

export async function api(caminho, { metodo = 'GET', corpo, token } = {}) {
  const resposta = await fetch(`${API_URL}/api${caminho}`, {
    method: metodo,
    headers: {
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: corpo ? JSON.stringify(corpo) : undefined
  });

  return tratar(resposta);
}

// O browser define automaticamente o Content-Type e o limite do multipart.
export async function enviarFicheiro(caminho, campo, ficheiro, token) {
  const dados = new FormData();
  dados.append(campo, ficheiro);

  const resposta = await fetch(`${API_URL}/api${caminho}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: dados
  });

  return tratar(resposta);
}
