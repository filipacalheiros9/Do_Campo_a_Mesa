<?php

namespace App\Http\Controllers;

use App\Services\ApiAdmin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Throwable;

class AutenticacaoController extends Controller
{
    public function formulario(Request $request): View|RedirectResponse
    {
        return $request->session()->has('token') ? redirect()->route('painel') : view('autenticacao.entrar');
    }

    public function entrar(Request $request, ApiAdmin $api): RedirectResponse
    {
        $credenciais = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);

        try {
            $sessao = $api->entrar($credenciais['email'], $credenciais['password']);
            if (($sessao['utilizador']['papel'] ?? null) !== 'admin') {
                return back()->withErrors(['email' => 'Esta conta não pertence a um administrador.'])->onlyInput('email');
            }

            $request->session()->regenerate();
            $request->session()->put(['token' => $sessao['token'], 'utilizador' => $sessao['utilizador']]);

            return redirect()->route('painel');
        } catch (Throwable) {
            return back()->withErrors(['email' => 'Credenciais inválidas.'])->onlyInput('email');
        }
    }

    public function sair(Request $request): RedirectResponse
    {
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
