import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApi } from '../../hooks/useApi.js';

export default function NovoLeilao() {
  const { utilizador, token } = useAuth();
  const navigate = useNavigate();
  const { dados: produtos, erro: erroProdutos } = useApi(`/products?produtor=${utilizador._id}`);
  const [dados, setDados] = useState({
    produto: '', lote: '', descricao: '', quantidade: '', precoBase: '', incremento: '', iniciaEm: '', duracaoMinutos: 30
  });
  const [erro, setErro] = useState('');
  const [aEnviar, setAEnviar] = useState(false);
  const produtoSelecionado = (produtos || []).find((produto) => produto._id === dados.produto);

  async function submeter(e) {
    e.preventDefault();
    setAEnviar(true);
    setErro('');
    try {
      const leilao = await api('/auctions', {
        metodo: 'POST', token,
        corpo: {
          ...dados,
          ...(dados.produto ? { produto: dados.produto } : {}),
          ...(dados.iniciaEm ? { iniciaEm: new Date(dados.iniciaEm).toISOString() } : {}),
          precoBase: Number(dados.precoBase),
          incremento: Number(dados.incremento),
          duracaoMinutos: Number(dados.duracaoMinutos)
        }
      });
      navigate(`/leiloes/${leilao._id}`);
    } catch (err) {
      setErro(err.message);
    } finally {
      setAEnviar(false);
    }
  }

  const alterar = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value });

  return (
    <form className="formulario-estreito" onSubmit={submeter}>
      <h1>Criar leilão</h1>
      <label className="form-label" htmlFor="leilao-produto">Produto</label>
      <select id="leilao-produto" className="form-select mb-3" value={dados.produto} onChange={alterar('produto')}>
        <option value="">Lote sem produto associado</option>
        {(produtos || []).map((produto) => <option value={produto._id} key={produto._id}>{produto.nome}</option>)}
      </select>
      <label className="form-label" htmlFor="leilao-lote">Nome do lote</label>
      <input id="leilao-lote" className="form-control mb-3" required maxLength="150"
        value={dados.lote} onChange={alterar('lote')} />
      <label className="form-label" htmlFor="leilao-descricao">Descrição</label>
      <textarea id="leilao-descricao" className="form-control mb-3" rows="3" maxLength="1000"
        value={dados.descricao} onChange={alterar('descricao')} />
      <label className="form-label" htmlFor="leilao-quantidade">
        Quantidade{produtoSelecionado ? ` (${produtoSelecionado.unidade})` : ''}
      </label>
      <input id="leilao-quantidade" type={produtoSelecionado ? 'number' : 'text'}
        min={produtoSelecionado ? '1' : undefined} step={produtoSelecionado ? '1' : undefined}
        required={Boolean(produtoSelecionado)} className="form-control mb-3"
        placeholder={produtoSelecionado ? `Disponível: ${produtoSelecionado.stock}` : 'Ex.: lote completo'}
        value={dados.quantidade} onChange={alterar('quantidade')} />
      <div className="row g-3 mb-3">
        <div className="col-6"><label className="form-label" htmlFor="preco-base">Preço base</label>
          <input id="preco-base" type="number" min="0" step="0.01" className="form-control" required
            value={dados.precoBase} onChange={alterar('precoBase')} /></div>
        <div className="col-6"><label className="form-label" htmlFor="incremento">Incremento mínimo</label>
          <input id="incremento" type="number" min="0.01" step="0.01" className="form-control" required
            value={dados.incremento} onChange={alterar('incremento')} /></div>
      </div>
      <label className="form-label" htmlFor="inicio">Data de início (vazio para começar agora)</label>
      <input id="inicio" type="datetime-local" className="form-control mb-3"
        value={dados.iniciaEm} onChange={alterar('iniciaEm')} />
      <label className="form-label" htmlFor="duracao">Duração em minutos</label>
      <input id="duracao" type="number" min="1" step="1" className="form-control mb-3" required
        value={dados.duracaoMinutos} onChange={alterar('duracaoMinutos')} />
      {(erro || erroProdutos) && <div className="alert alert-danger">{erro || erroProdutos}</div>}
      <button className="btn btn-success w-100" disabled={aEnviar}>
        {aEnviar ? 'A criar…' : 'Criar leilão'}
      </button>
    </form>
  );
}
