<?php

namespace App\Http\Controllers;

use App\Services\ApiAdmin;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\View\View;
use Throwable;

class PainelController extends Controller
{
    public function index(Request $request, ApiAdmin $api): View|RedirectResponse
    {
        try {
            $token = $request->session()->get('token');

            return view('painel', [
                'estatisticas' => $api->obter('/api/admin/estatisticas', $token),
                'pendentes' => $api->obter('/api/admin/produtores/pendentes', $token),
                'avaliacoes' => $api->obter('/api/admin/reviews/moderacao', $token),
                'utilizadores' => $api->obter('/api/admin/utilizadores', $token),
                'encomendas' => $api->obter('/api/admin/encomendas', $token),
                'leiloes' => $api->obter('/api/admin/leiloes', $token),
                'servicos' => $api->obter('/api/admin/servicos', $token),
            ]);
        } catch (Throwable $erro) {
            if ($erro instanceof RequestException && $erro->response->status() === 401) {
                $request->session()->invalidate();

                return redirect()->route('login')->withErrors(['email' => 'A sessão terminou. Inicie sessão novamente.']);
            }

            return back()->withErrors(['api' => 'Não foi possível obter os dados da API.']);
        }
    }

    public function dadosTempoReal(Request $request, ApiAdmin $api): JsonResponse
    {
        $token = $request->session()->get('token');
        $estatisticas = $api->obter('/api/admin/estatisticas', $token);
        $leiloes = $api->obter('/api/admin/leiloes', $token);
        $servicos = $api->obter('/api/admin/servicos', $token);
        $agora = now();

        $ativos = collect($leiloes)
            ->filter(fn (array $leilao): bool => ($leilao['estado'] ?? null) === 'ativo'
                && isset($leilao['terminaEm'])
                && $agora->lt($leilao['terminaEm']))
            ->values();

        return response()->json([
            'estatisticas' => $estatisticas,
            'leiloesAtivos' => $ativos,
            'servicos' => $servicos,
            'atualizadoEm' => $agora->toIso8601String(),
        ]);
    }

    public function validarProdutor(string $id, Request $request, ApiAdmin $api): RedirectResponse
    {
        $dados = $request->validate(['aprovado' => ['required', 'boolean']]);
        $api->alterar("/api/admin/produtores/{$id}/validacao", ['aprovado' => (bool) $dados['aprovado']], $request->session()->get('token'));

        return back()->with('sucesso', 'Estado do produtor atualizado.');
    }

    public function moderarAvaliacao(string $id, Request $request, ApiAdmin $api): RedirectResponse
    {
        $dados = $request->validate(['estado' => ['required', 'in:aprovada,recusada']]);
        $api->alterar("/api/admin/reviews/{$id}", ['estado' => $dados['estado']], $request->session()->get('token'));

        return back()->with('sucesso', $dados['estado'] === 'aprovada'
            ? 'Avaliação mantida.'
            : 'Avaliação recusada.');
    }

    public function eliminarUtilizador(string $id, Request $request, ApiAdmin $api): RedirectResponse
    {
        try {
            $api->eliminar("/api/admin/utilizadores/{$id}", $request->session()->get('token'));

            return back()->with('sucesso', 'Perfil eliminado.');
        } catch (RequestException $erro) {
            $mensagem = $erro->response->json('erro') ?? 'Não foi possível eliminar o perfil.';

            return back()->withErrors(['utilizador' => $mensagem]);
        }
    }
}
