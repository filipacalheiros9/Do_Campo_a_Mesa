const ADMIN_URL = (import.meta.env.VITE_ADMIN_URL || 'http://localhost:8000').replace(/\/$/, '');

export function abrirBackoffice(token) {
  const formulario = document.createElement('form');
  formulario.method = 'POST';
  formulario.action = `${ADMIN_URL}/sessao`;

  const campoToken = document.createElement('input');
  campoToken.type = 'hidden';
  campoToken.name = 'token';
  campoToken.value = token;

  formulario.appendChild(campoToken);
  document.body.appendChild(formulario);
  formulario.submit();
}
