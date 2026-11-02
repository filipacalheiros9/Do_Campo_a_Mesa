import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pastaDist = resolve(fileURLToPath(new URL('./dist/', import.meta.url)));
const porta = Number(process.env.PORT) || 8080;

const tipos = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

async function enviarFicheiro(res, caminho) {
  const dados = await stat(caminho);
  if (!dados.isFile()) throw new Error('Não é um ficheiro');

  res.writeHead(200, {
    'Content-Type': tipos[extname(caminho).toLowerCase()] || 'application/octet-stream',
    'Content-Length': dados.size,
    'X-Content-Type-Options': 'nosniff'
  });
  createReadStream(caminho).pipe(res);
}

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relativo = normalize(pathname).replace(/^[/\\]+/, '');
    const pedido = resolve(join(pastaDist, relativo));
    const dentroDaDist = pedido === pastaDist || pedido.startsWith(`${pastaDist}\\`) || pedido.startsWith(`${pastaDist}/`);

    if (!dentroDaDist) {
      res.writeHead(400).end('Pedido inválido');
      return;
    }

    try {
      await enviarFicheiro(res, pedido);
    } catch {
      await enviarFicheiro(res, join(pastaDist, 'index.html'));
    }
  } catch {
    res.writeHead(500).end('Erro interno');
  }
}).listen(porta, () => {
  console.log(`SPA disponível na porta ${porta}`);
});
