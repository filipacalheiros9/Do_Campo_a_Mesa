// Guarda imagens no Azure Blob Storage ou localmente durante o desenvolvimento.
const { randomUUID } = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { BlobServiceClient } = require('@azure/storage-blob');

const EXTENSOES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

let container;
function obterContainer() {
  if (!container) {
    container = BlobServiceClient
      .fromConnectionString(process.env.STORAGE_CONN)
      .getContainerClient(process.env.STORAGE_CONTAINER || 'produtos');
  }
  return container;
}

/**
 * @param {{ buffer: Buffer, mimetype: string }} ficheiro ficheiro recebido pelo Multer
 * @returns {Promise<string>} URL da imagem
 */
async function guardarImagem(ficheiro) {
  if (!ficheiro) throw Object.assign(new Error('Selecione uma imagem'), { status: 400 });

  const extensao = EXTENSOES[ficheiro.mimetype];
  if (!extensao) {
    throw Object.assign(new Error('A imagem deve ser JPEG, PNG ou WebP'), { status: 400 });
  }

  const nome = `${randomUUID()}${extensao}`;
  if (process.env.STORAGE_CONN) {
    const blob = obterContainer().getBlockBlobClient(nome);
    await blob.uploadData(ficheiro.buffer, {
      blobHTTPHeaders: { blobContentType: ficheiro.mimetype }
    });
    return blob.url;
  }

  // Sem storage Cloud configurado, mantém uma alternativa funcional para desenvolvimento.
  const pasta = path.join(__dirname, '..', '..', 'uploads');
  await fs.mkdir(pasta, { recursive: true });
  await fs.writeFile(path.join(pasta, nome), ficheiro.buffer);
  return `/uploads/${nome}`;
}

module.exports = { guardarImagem };
