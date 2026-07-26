# Constelação Molecular

Plataforma pública e independente para mapear pessoas, projetos, áreas de
pesquisa e experiências em disciplinas da comunidade do Ciências Moleculares
da USP.

## Requisitos

- Node.js 22 ou mais recente
- Um projeto no Supabase

## Configuração local

1. Copie `.env.example` para `.env.local`.
2. Preencha as variáveis públicas do Supabase:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua-chave-publica
```

3. Instale as dependências e inicie o site:

```bash
npm install
npm run dev
```

## Comandos

- `npm run dev`: inicia o ambiente local.
- `npm run build`: cria a versão de produção.
- `npm run start`: executa a versão de produção.
- `npm run lint`: verifica o código.
- `npm test`: executa a verificação e a compilação.

## Autenticação

O site usa links mágicos enviados a e-mails institucionais da USP. A validade
do link é configurada no painel do Supabase. No código, a sessão expira após
duas horas sem atividade ou doze horas no total.

Nunca coloque no repositório a senha do banco, uma `Secret key` ou uma chave
`service_role`.
