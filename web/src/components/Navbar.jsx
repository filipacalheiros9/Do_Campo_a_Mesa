import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCarrinho } from '../context/CarrinhoContext.jsx';
import { useLeiloesEmDireto } from '../hooks/useLeiloesEmDireto.js';
import { useNotificacoes } from '../hooks/useNotificacoes.js';


function IconeNavegacao({ tipo }) {
  const formas = {
    inicio: <><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10" /></>,
    leiloes: <><path d="m14 4 6 6" /><path d="m12 6 6 6" /><path d="m13 11-8 8" /><path d="M3 21h6" /></>,
    carrinho: <><path d="M3 4h2l2 11h10l2-7H6" /><circle cx="9" cy="19" r="1" /><circle cx="17" cy="19" r="1" /></>,
    encomendas: <><path d="m4 7 8-4 8 4-8 4Z" /><path d="M4 7v10l8 4 8-4V7" /><path d="M12 11v10" /></>,
    painel: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    produtos: <><path d="m4 7 8-4 8 4-8 4Z" /><path d="M4 7v10l8 4 8-4V7" /><path d="M12 11v10" /></>,
    perfil: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    entrar: <><path d="M14 8l4 4-4 4" /><path d="M18 12H7" /><path d="M10 4H4v16h6" /></>,
    registar: <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0" /><path d="M19 8v6" /><path d="M16 11h6" /></>,
    admin: <><path d="M12 3 4 6v5c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6Z" /><path d="m9 12 2 2 4-4" /></>,
    notificacoes: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>
  };

  return (
    <svg className="navegacao-movel__icone" viewBox="0 0 24 24" aria-hidden="true">
      {formas[tipo]}
    </svg>
  );
}

function FolhaMarca() {
  return (
    <svg className="marca__folha" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 13C7 6 13 4 20 4c-1 8-5 14-12 14-3 0-5-2-4-5Z" />
      <path d="M6 17c3-4 7-7 12-11" />
    </svg>
  );
}

export default function Navbar() {
  const { utilizador, sair } = useAuth();
  const { totalArtigos } = useCarrinho();
  const { naoLidas } = useNotificacoes();
  const leiloesEmDireto = useLeiloesEmDireto(15000);
  const iniciais = utilizador?.nome
    ?.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
  const papeis = { comprador: 'Comprador', produtor: 'Produtor', admin: 'Administrador' };
  const abas = [
    { to: '/', fim: true, icone: 'inicio', texto: 'Início' },
    { to: '/leiloes', icone: 'leiloes', texto: 'Leilões', direto: leiloesEmDireto.length }
  ];

  if (utilizador?.papel === 'comprador') {
    abas.shift();
    abas.push(
      { to: '/carrinho', icone: 'carrinho', texto: 'Carrinho', contador: totalArtigos },
      { to: '/encomendas', icone: 'encomendas', texto: 'Encomendas' },
      { to: '/perfil', icone: 'perfil', texto: 'Perfil' }
    );
  } else if (utilizador?.papel === 'produtor') {
    abas[0].texto = 'Produtos';
    abas.push(
      { to: '/produtor', fim: true, icone: 'painel', texto: 'Painel' },
      { to: '/produtor/produtos', icone: 'produtos', texto: 'Catálogo' },
      {
        to: utilizador.produtor?.validado ? `/produtores/${utilizador._id}` : '/produtor/perfil',
        icone: 'perfil', texto: 'Perfil'
      }
    );
  } else if (utilizador?.papel === 'admin') {
    abas.push({ href: '/admin', icone: 'admin', texto: 'Administração' });
  } else {
    abas.push(
      { to: '/login', icone: 'entrar', texto: 'Entrar' },
      { to: '/registo', icone: 'registar', texto: 'Registar' }
    );
  }

  if (utilizador) {
    abas.push({ to: '/notificacoes', icone: 'notificacoes', texto: 'Avisos', contador: naoLidas });
  }

  return (
    <header className="barra-topo">
      <nav className="navbar navbar-expand-lg container-xl" aria-label="Navegação principal">
        <Link to="/" className="navbar-brand marca">
          <FolhaMarca />
          <span>Do Campo à Mesa</span>
        </Link>
        {utilizador && (
          <button type="button" className="btn btn-sm btn-outline-secondary d-lg-none ms-auto" onClick={sair}>Sair</button>
        )}
        <div className="menu-principal d-none d-lg-flex navbar-collapse" id="menu">
          <ul className="navbar-nav me-auto">
            <li className="nav-item"><NavLink to="/" end className="nav-link">Produtos</NavLink></li>
            <li className="nav-item">
              <NavLink to="/leiloes" className="nav-link d-flex align-items-center gap-1">
                Leilões
                {leiloesEmDireto.length > 0 && (
                  <span className="badge text-bg-danger">{leiloesEmDireto.length} em direto</span>
                )}
              </NavLink>
            </li>
            {utilizador?.papel === 'comprador' && (
              <li className="nav-item"><NavLink to="/encomendas" className="nav-link">Encomendas</NavLink></li>
            )}
            {utilizador?.papel === 'produtor' && (
              <>
                <li className="nav-item"><NavLink to="/produtor" end className="nav-link">Painel</NavLink></li>
                <li className="nav-item"><NavLink to="/produtor/produtos" className="nav-link">Catálogo</NavLink></li>
                <li className="nav-item">
                  <NavLink
                    to={utilizador.produtor?.validado ? `/produtores/${utilizador._id}` : '/produtor/perfil'}
                    className="nav-link"
                  >Perfil público</NavLink>
                </li>
              </>
            )}
            {utilizador?.papel === 'admin' && (
              <li className="nav-item"><a href="/admin" className="nav-link">Administração</a></li>
            )}
          </ul>
          <div className="acoes-menu d-flex gap-2 align-items-center">
            {utilizador && (
              <NavLink
                to="/notificacoes"
                className="botao-acao-circular position-relative"
                aria-label={naoLidas ? `Notificações: ${naoLidas} não lidas` : 'Notificações'}
                title="Notificações"
              >
                <IconeNavegacao tipo="notificacoes" />
                {naoLidas > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-danger">
                    {naoLidas}
                  </span>
                )}
              </NavLink>
            )}
            {utilizador?.papel === 'comprador' && (
              <Link to="/carrinho" className="botao-acao-circular position-relative"
                aria-label={`Carrinho: ${totalArtigos} artigos`} title="Carrinho">
                <IconeNavegacao tipo="carrinho" />
                {totalArtigos > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-success">
                    {totalArtigos}
                  </span>
                )}
              </Link>
            )}
            {utilizador ? (
              <div className="dropdown">
                <button type="button" className="botao-utilizador btn dropdown-toggle"
                  data-bs-toggle="dropdown" aria-expanded="false">
                  <span className="botao-utilizador__avatar">{iniciais || 'U'}</span>
                  <span className="botao-utilizador__texto">
                    <strong>{utilizador.nome}</strong>
                    <small>{papeis[utilizador.papel] || utilizador.papel}</small>
                  </span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end">
                  {utilizador.papel === 'comprador' && (
                    <li><NavLink className="dropdown-item" to="/perfil">Editar perfil</NavLink></li>
                  )}
                  {utilizador.papel === 'produtor' && (
                    <li><NavLink className="dropdown-item" to="/produtor/perfil">Editar perfil público</NavLink></li>
                  )}
                  <li><NavLink className="dropdown-item" to="/notificacoes">Notificações</NavLink></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><button type="button" className="dropdown-item" onClick={sair}>Sair</button></li>
                </ul>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline-secondary">Entrar</Link>
                <Link to="/registo" className="btn btn-success">Registar</Link>
              </>
            )}
          </div>
        </div>
      </nav>
      <nav className="navegacao-movel d-lg-none" aria-label="Navegação móvel">
        {abas.map((aba) => {
          const conteudo = (
            <>
              <span className="navegacao-movel__icone-caixa">
                <IconeNavegacao tipo={aba.icone} />
                {aba.contador > 0 && <span className="navegacao-movel__contador">{aba.contador}</span>}
                {aba.direto > 0 && <span className="navegacao-movel__direto" />}
              </span>
              <span>{aba.texto}</span>
            </>
          );

          return aba.href ? (
            <a className="navegacao-movel__aba" href={aba.href} key={aba.texto}>{conteudo}</a>
          ) : (
            <NavLink className="navegacao-movel__aba" to={aba.to} end={aba.fim} key={aba.texto}>
              {conteudo}
            </NavLink>
          );
        })}
      </nav>
    </header>
  );
}
