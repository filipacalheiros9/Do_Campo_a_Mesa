const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || 'http://localhost:8000';

export default function PainelAdmin() {
  return (
    <div className="formulario-estreito text-center">
      <p className="texto-secundario">Componente de valorização</p>
      <h1>Backoffice Laravel</h1>
      <p>
        A validação de produtores, moderação de avaliações e visão global da plataforma
        encontram-se no backoffice dedicado.
      </p>
      <a className="btn btn-success" href={ADMIN_URL}>Abrir administração</a>
    </div>
  );
}
