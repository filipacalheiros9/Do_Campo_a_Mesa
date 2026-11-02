// Passo 2: routing no cliente
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Notificacoes from './components/Notificacoes.jsx';
import RotaProtegida from './components/RotaProtegida.jsx';
import Catalogo from './pages/Catalogo.jsx';
import Produtor from './pages/Produtor.jsx';
import Leiloes from './pages/Leiloes.jsx';
import SalaLeilao from './pages/SalaLeilao.jsx';
import Carrinho from './pages/Carrinho.jsx';
import Encomendas from './pages/Encomendas.jsx';
import Login from './pages/Login.jsx';
import TerminarSessao from './pages/TerminarSessao.jsx';
import Registo from './pages/Registo.jsx';
import PainelProdutor from './pages/produtor/Painel.jsx';
import ProdutosProdutor from './pages/produtor/Produtos.jsx';
import PerfilProdutor from './pages/produtor/Perfil.jsx';
import NovoLeilao from './pages/produtor/NovoLeilao.jsx';
import PainelAdmin from './pages/admin/Painel.jsx';
import NaoEncontrado from './pages/NaoEncontrado.jsx';
import CentroNotificacoes from './pages/CentroNotificacoes.jsx';
import PerfilComprador from './pages/PerfilComprador.jsx';
import IrParaTopo from './components/IrParaTopo.jsx';

export default function App() {
  return (
    <>
      <a className="btn btn-light saltar-conteudo" href="#conteudo">Saltar para o conteúdo</a>
      <IrParaTopo />
      <Navbar />
      <Notificacoes />
      <main id="conteudo" className="container-xl py-4" tabIndex="-1">
        <Routes>
          {/* Visitante */}
          <Route path="/" element={<Catalogo />} />
          <Route path="/produtores/:id" element={<Produtor />} />
          <Route path="/leiloes" element={<Leiloes />} />
          <Route path="/login" element={<Login />} />
          <Route path="/sair" element={<TerminarSessao />} />
          <Route path="/registo" element={<Registo />} />

          {/* Qualquer utilizador autenticado pode assistir; só compradores licitam */}
          <Route element={<RotaProtegida />}>
            <Route path="/leiloes/:id" element={<SalaLeilao />} />
            <Route path="/notificacoes" element={<CentroNotificacoes />} />
          </Route>

          {/* Comprador */}
          <Route element={<RotaProtegida papeis={['comprador']} />}>
            <Route path="/carrinho" element={<Carrinho />} />
            <Route path="/encomendas" element={<Encomendas />} />
            <Route path="/perfil" element={<PerfilComprador />} />
          </Route>

          {/* Produtor */}
          <Route element={<RotaProtegida papeis={['produtor']} />}>
            <Route path="/produtor" element={<PainelProdutor />} />
            <Route path="/produtor/produtos" element={<ProdutosProdutor />} />
            <Route path="/produtor/perfil" element={<PerfilProdutor />} />
            <Route path="/produtor/leiloes/novo" element={<NovoLeilao />} />
          </Route>

          {/* Administrador */}
          <Route element={<RotaProtegida papeis={['admin']} />}>
            <Route path="/admin" element={<PainelAdmin />} />
          </Route>

          <Route path="*" element={<NaoEncontrado />} />
        </Routes>
      </main>
    </>
  );
}
