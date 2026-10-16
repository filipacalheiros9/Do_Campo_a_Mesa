<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdministradorAutenticado
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->session()->has('token') || $request->session()->get('utilizador.papel') !== 'admin') {
            return redirect()->route('login');
        }

        return $next($request);
    }
}
