// Componente reutilizável: cartão de produto do catálogo
import { Link } from 'react-router-dom';
import { urlFicheiro } from '../api/client.js';

const euro = (v) => v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

const classeCategoria = (categoria = 'Outros') => categoria
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

export default function CartaoProduto({ produto, onAdicionar }) {
  return (
    <article className="card cartao-produto h-100">
      {produto.imagemUrl ? (
        <img src={urlFicheiro(produto.imagemUrl)} className="cartao-produto__foto" alt={produto.nome} loading="lazy" />
      ) : (
        <div className={`cartao-produto__imagem cat-${classeCategoria(produto.categoria)}`} aria-hidden="true">
          <span>{produto.nome.charAt(0)}</span>
        </div>
      )}
      <div className="card-body d-flex flex-column">
        <div className="d-flex gap-1 mb-2">
          {produto.biologico && <span className="etiqueta">BIO</span>}
          {produto.stock === 0 && <span className="etiqueta etiqueta--esgotado">ESGOTADO</span>}
        </div>
        <h3 className="h6 mb-1">{produto.nome}</h3>
        {produto.produtor?._id ? (
          <Link to={`/produtores/${produto.produtor._id}`} className="texto-secundario small mb-2">
            {produto.produtor.nome} · {produto.produtor.produtor?.localidade}
          </Link>
        ) : (
          <p className="texto-secundario small mb-2">{produto.produtor?.nome}</p>
        )}
        <p className="preco mt-auto">
          {euro(produto.preco)} <span className="texto-secundario small">/ {produto.unidade}</span>
        </p>
        {onAdicionar && (
          <button type="button" className="btn btn-success w-100" onClick={onAdicionar}
            disabled={produto.stock === 0}>
            Adicionar ao carrinho
          </button>
        )}
      </div>
    </article>
  );
}
