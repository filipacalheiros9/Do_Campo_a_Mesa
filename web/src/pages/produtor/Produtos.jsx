import { useState } from 'react';
import { api, enviarFicheiro, urlFicheiro } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useEventoSocket } from '../../context/SocketContext.jsx';
import { useApi } from '../../hooks/useApi.js';

const CATEGORIAS = ['Hortícolas', 'Fruta', 'Mel', 'Vinho', 'Queijo', 'Padaria', 'Outros'];
const EPOCAS = ['Primavera', 'Verão', 'Outono', 'Inverno'];
const VAZIO = { nome: '', categoria: 'Hortícolas', preco: '', unidade: 'kg', stock: '', biologico: false, epocas: [] };

export default function ProdutosProdutor() {
  const { utilizador, token } = useAuth();
  const { dados, erro, aCarregar, recarregar } = useApi(`/products?produtor=${utilizador._id}`);
  const [formulario, setFormulario] = useState(VAZIO);
  const [edicao, setEdicao] = useState(null);
  const [imagem, setImagem] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [erroForm, setErroForm] = useState('');
  const [aEnviar, setAEnviar] = useState(false);

  // Uma nova encomenda já descontou o stock na API; atualiza a lista sem refresh manual.
  useEventoSocket('nova-encomenda', recarregar);
  useEventoSocket('leilao-terminado', recarregar);

  function editar(produto) {
    setEdicao(produto._id);
    setFormulario({
      nome: produto.nome,
      categoria: produto.categoria,
      preco: produto.preco,
      unidade: produto.unidade,
      stock: produto.stock,
      biologico: produto.biologico,
      epocas: produto.epocas || []
    });
    setImagem(null);
    setMensagem('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function alterarEpoca(epoca) {
    setFormulario((atual) => ({
      ...atual,
      epocas: atual.epocas.includes(epoca)
        ? atual.epocas.filter((item) => item !== epoca)
        : [...atual.epocas, epoca]
    }));
  }

  async function guardar(e) {
    e.preventDefault();
    setAEnviar(true);
    setErroForm('');
    try {
      const corpo = {
        ...formulario,
        preco: Number(formulario.preco),
        stock: Number(formulario.stock)
      };
      const produto = await api(edicao ? `/products/${edicao}` : '/products', {
        metodo: edicao ? 'PUT' : 'POST', corpo, token
      });
      if (imagem) await enviarFicheiro(`/products/${produto._id}/imagem`, 'imagem', imagem, token);
      setMensagem(edicao ? 'Produto atualizado.' : 'Produto criado.');
      setFormulario(VAZIO);
      setEdicao(null);
      setImagem(null);
      await recarregar();
    } catch (err) {
      setErroForm(err.message);
    } finally {
      setAEnviar(false);
    }
  }

  async function eliminar(produto) {
    if (!window.confirm(`Eliminar «${produto.nome}»?`)) return;
    try {
      await api(`/products/${produto._id}`, { metodo: 'DELETE', token });
      await recarregar();
    } catch (err) {
      setErroForm(err.message);
    }
  }

  return (
    <>
      <header className="destaque mb-4">
        <h1 className="mb-0">Os meus produtos</h1>
      </header>

      <form className="card card-body mb-4" onSubmit={guardar}>
        <h2 className="h4">{edicao ? 'Editar produto' : 'Adicionar produto'}</h2>
        <div className="row g-3">
          <div className="col-md-6"><label className="form-label" htmlFor="produto-nome">Nome</label>
            <input id="produto-nome" className="form-control" required value={formulario.nome}
              onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })} /></div>
          <div className="col-md-3"><label className="form-label" htmlFor="produto-categoria">Categoria</label>
            <select id="produto-categoria" className="form-select" value={formulario.categoria}
              onChange={(e) => setFormulario({ ...formulario, categoria: e.target.value })}>
              {CATEGORIAS.map((item) => <option key={item}>{item}</option>)}
            </select></div>
          <div className="col-md-3"><label className="form-label" htmlFor="produto-unidade">Unidade</label>
            <input id="produto-unidade" className="form-control" required value={formulario.unidade}
              onChange={(e) => setFormulario({ ...formulario, unidade: e.target.value })} /></div>
          <div className="col-md-3"><label className="form-label" htmlFor="produto-preco">Preço</label>
            <input id="produto-preco" type="number" min="0" step="0.01" className="form-control" required
              value={formulario.preco} onChange={(e) => setFormulario({ ...formulario, preco: e.target.value })} /></div>
          <div className="col-md-3"><label className="form-label" htmlFor="produto-stock">Stock</label>
            <input id="produto-stock" type="number" min="0" step="1" className="form-control" required
              value={formulario.stock} onChange={(e) => setFormulario({ ...formulario, stock: e.target.value })} /></div>
          <div className="col-md-6"><label className="form-label" htmlFor="produto-imagem">Fotografia</label>
            <input id="produto-imagem" type="file" accept="image/jpeg,image/png,image/webp" className="form-control"
              onChange={(e) => setImagem(e.target.files?.[0] || null)} /></div>
          <div className="col-12 d-flex flex-wrap gap-3">
            {EPOCAS.map((epoca) => <label className="form-check" key={epoca}>
              <input className="form-check-input" type="checkbox" checked={formulario.epocas.includes(epoca)}
                onChange={() => alterarEpoca(epoca)} /> <span className="form-check-label">{epoca}</span>
            </label>)}
            <label className="form-check"><input className="form-check-input" type="checkbox"
              checked={formulario.biologico} onChange={(e) => setFormulario({ ...formulario, biologico: e.target.checked })} />
              <span className="form-check-label">Produção biológica</span></label>
          </div>
        </div>
        {erroForm && <div className="alert alert-danger mt-3 mb-0">{erroForm}</div>}
        {mensagem && <div className="alert alert-success mt-3 mb-0">{mensagem}</div>}
        <div className="d-flex gap-2 mt-3">
          <button className="btn btn-success" disabled={aEnviar}>{aEnviar ? 'A guardar…' : 'Guardar produto'}</button>
          {edicao && <button type="button" className="btn btn-outline-secondary"
            onClick={() => { setEdicao(null); setFormulario(VAZIO); }}>Cancelar</button>}
        </div>
      </form>

      <h2 className="h4">Catálogo</h2>
      {(erro || erroForm) && !dados && <div className="alert alert-danger">{erro || erroForm}</div>}
      {aCarregar && !dados && <p>A carregar produtos…</p>}
      <div className="row g-3">
        {(dados || []).map((produto) => (
          <div className="col-md-6 col-xl-4" key={produto._id}>
            <article className="card h-100 overflow-hidden">
              {produto.imagemUrl && <img src={urlFicheiro(produto.imagemUrl)} alt={produto.nome}
                style={{ height: '10rem', objectFit: 'cover' }} />}
              <div className="card-body">
                <h3 className="h5">{produto.nome}</h3>
                <p>{Number(produto.preco).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })} / {produto.unidade}</p>
                <p className={produto.stock <= 5 ? 'text-danger fw-semibold' : ''}>Stock: {produto.stock}</p>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-success" type="button" onClick={() => editar(produto)}>Editar</button>
                  <button className="btn btn-sm btn-danger" type="button" onClick={() => eliminar(produto)}>Eliminar</button>
                </div>
              </div>
            </article>
          </div>
        ))}
      </div>
      {!aCarregar && !dados?.length && <p className="texto-secundario">Ainda não tem produtos.</p>}
    </>
  );
}
