<?php

namespace App\Http\Controllers;

use App\Services\ApiAdmin;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
                'avaliacoes' => $api->obter('/api/admin/reviews/denunciadas', $token),
                'utilizadores' => $api->obter('/api/admin/utilizadores', $token),
                'encomendas' => $api->obter('/api/admin/encomendas', $token),
                'leiloes' => $api->obter('/api/admin/leiloes', $token),
            ]);
        } catch (Throwable $erro) {
            if ($erro instanceof RequestException && $erro->response->status() === 401) {
                $request->session()->invalidate();

                return redirect()->route('login')->withErrors(['email' => 'A sessão terminou. Inicie sessão novamente.']);
            }

            return back()->withErrors(['api' => 'Não foi possível obter os dados da API.']);
        }
    }

    public function validarProdutor(string $id, Request $request, ApiAdmin $api): RedirectResponse
    {
        $dados = $request->validate(['aprovado' => ['required', 'boolean']]);
        $api->alterar("/api/admin/produtores/{$id}/validacao", ['aprovado' => (bool) $dados['aprovado']], $request->session()->get('token'));

        return back()->with('sucesso', 'Estado do produtor atualizado.');
    }

    public function moderarAvaliacao(string $id, Request $request, ApiAdmin $api): RedirectResponse
    {
        $dados = $request->validate(['visivel' => ['required', 'boolean']]);
        $api->alterar("/api/admin/reviews/{$id}", ['visivel' => (bool) $dados['visivel']], $request->session()->get('token'));

        return back()->with('sucesso', 'Avaliação moderada.');
    }
}
