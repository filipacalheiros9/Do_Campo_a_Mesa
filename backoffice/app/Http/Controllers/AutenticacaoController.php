<?php

namespace App\Http\Controllers;

use App\Services\ApiAdmin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Throwable;

class AutenticacaoController extends Controller
{
    public function formulario(Request $request): RedirectResponse
    {
        return $request->session()->has('token')
            ? redirect()->route('painel')
            : redirect()->away(rtrim((string) config('services.spa.url'), '/').'/login');
    }

    public function iniciarComToken(Request $request, ApiAdmin $api): RedirectResponse
    {
        $origemPermitida = rtrim((string) config('services.spa.url'), '/');
        if (! hash_equals($origemPermitida, (string) $request->header('Origin'))) {
            abort(403);
        }

        $dados = $request->validate(['token' => ['required', 'string']]);

        try {
            $utilizador = $api->obter('/api/auth/eu', $dados['token']);
            if (($utilizador['papel'] ?? null) !== 'admin') {
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()->away(rtrim((string) config('services.spa.url'), '/').'/sair');
            }

            $request->session()->regenerate();
            $request->session()->put(['token' => $dados['token'], 'utilizador' => $utilizador]);

            return redirect()->route('painel');
        } catch (Throwable) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->away(rtrim((string) config('services.spa.url'), '/').'/sair');
        }
    }

    public function sair(Request $request): RedirectResponse
    {
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->away(rtrim((string) config('services.spa.url'), '/').'/sair');
    }
}
