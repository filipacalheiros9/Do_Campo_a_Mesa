<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

class ApiAdmin
{
    private function pedido(?string $token = null): PendingRequest
    {
        return Http::baseUrl(config('services.api.url'))
            ->connectTimeout(3)
            ->timeout(8)
            ->acceptJson()
            ->asJson()
            ->when($token, fn (PendingRequest $pedido) => $pedido->withToken($token));
    }

    public function obter(string $caminho, string $token): array
    {
        return $this->pedido($token)->get($caminho)->throw()->json();
    }

    public function alterar(string $caminho, array $dados, string $token): array
    {
        return $this->pedido($token)->patch($caminho, $dados)->throw()->json();
    }

    public function eliminar(string $caminho, string $token): void
    {
        $this->pedido($token)->delete($caminho)->throw();
    }
}
