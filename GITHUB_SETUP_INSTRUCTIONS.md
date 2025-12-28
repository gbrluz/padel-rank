# Setup dos 3 Repositórios no GitHub

Os 3 repositórios foram criados e estão prontos para serem publicados no GitHub:

1. **padel-types** - Pacote de tipos TypeScript compartilhados
2. **padel-api** - Backend API (Express + Node.js)
3. **padel-frontend** - Frontend React

## Localização dos Repositórios

Os repositórios foram criados em:
- `/tmp/repos/padel-types/`
- `/tmp/repos/padel-api/`
- `/tmp/repos/padel-frontend/`

## Passo a Passo para Publicar no GitHub

### 1. Criar os Repositórios no GitHub

Acesse [github.com](https://github.com) e crie 3 novos repositórios:

1. **padel-types**
   - Nome: `padel-types`
   - Descrição: "Shared TypeScript types for Padel Management System"
   - Visibilidade: Public ou Private (sua escolha)
   - NÃO inicialize com README, .gitignore ou license

2. **padel-api**
   - Nome: `padel-api`
   - Descrição: "Backend API for Padel Management System"
   - Visibilidade: Public ou Private (sua escolha)
   - NÃO inicialize com README, .gitignore ou license

3. **padel-frontend**
   - Nome: `padel-frontend`
   - Descrição: "Frontend React application for Padel Management System"
   - Visibilidade: Public ou Private (sua escolha)
   - NÃO inicialize com README, .gitignore ou license

### 2. Fazer Push dos Repositórios

Depois de criar os repositórios no GitHub, execute os seguintes comandos:

#### Para padel-types:
```bash
cd /tmp/repos/padel-types
git remote add origin https://github.com/SEU_USUARIO/padel-types.git
git push -u origin main
```

#### Para padel-api:
```bash
cd /tmp/repos/padel-api
git remote add origin https://github.com/SEU_USUARIO/padel-api.git
git push -u origin main
```

#### Para padel-frontend:
```bash
cd /tmp/repos/padel-frontend
git remote add origin https://github.com/SEU_USUARIO/padel-frontend.git
git push -u origin main
```

**IMPORTANTE:** Substitua `SEU_USUARIO` pelo seu username do GitHub!

### 3. Autenticação

Se solicitado, você precisará se autenticar. Recomendo usar um Personal Access Token:

1. Acesse: https://github.com/settings/tokens
2. Clique em "Generate new token (classic)"
3. Dê um nome (ex: "Padel Repos")
4. Selecione os escopos: `repo` (todos)
5. Clique em "Generate token"
6. Copie o token e use como senha quando fizer push

## Estrutura de Cada Repositório

### padel-types
```
padel-types/
├── src/
│   ├── domain.ts      # Tipos de domínio
│   ├── api.ts         # Tipos de API
│   └── index.ts       # Exportações
├── package.json
├── tsconfig.json
└── README.md
```

**Próximos passos:**
- Publicar no NPM: `npm publish`
- Ou usar como dependência Git nos outros repos

### padel-api
```
padel-api/
├── src/
│   ├── config/        # Configurações
│   ├── controllers/   # Controladores
│   ├── middleware/    # Middlewares
│   ├── routes/        # Rotas
│   └── server.ts      # Entry point
├── supabase/
│   ├── migrations/    # Migrações do banco
│   └── functions/     # Edge functions (antigas)
├── Dockerfile
├── .env.example
├── package.json
└── README.md
```

**Próximos passos:**
1. Copiar `.env.example` para `.env`
2. Configurar variáveis de ambiente
3. Deploy no Railway: https://railway.app

**Variáveis de ambiente necessárias:**
```env
PORT=3000
NODE_ENV=production
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
ALLOWED_ORIGINS=https://seu-app.vercel.app
```

### padel-frontend
```
padel-frontend/
├── src/
│   ├── components/    # Componentes React
│   ├── contexts/      # Contexts (Auth, etc)
│   ├── lib/           # Utilitários (api, supabase)
│   ├── pages/         # Páginas
│   ├── services/      # Camada de serviços
│   ├── types/         # Tipos locais
│   └── App.tsx
├── public/
├── .env.example
├── vercel.json
├── package.json
└── README.md
```

**Próximos passos:**
1. Copiar `.env.example` para `.env.local`
2. Configurar variáveis de ambiente
3. Deploy no Vercel: https://vercel.com

**Variáveis de ambiente necessárias:**
```env
VITE_API_URL=https://seu-api.railway.app
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

## Ordem de Deploy Recomendada

1. **Types** → Publicar no NPM ou usar como dependência Git
2. **API** → Deploy no Railway primeiro
3. **Frontend** → Deploy no Vercel apontando para a API

## Configuração das Dependências

### Usando NPM Package (Recomendado)

Se publicar o `padel-types` no NPM:

```bash
# No padel-api e padel-frontend
npm install @padel/types
```

### Usando Git Dependency (Alternativa)

Se não quiser publicar no NPM, pode usar como dependência Git:

```json
// package.json do padel-api e padel-frontend
{
  "dependencies": {
    "@padel/types": "git+https://github.com/SEU_USUARIO/padel-types.git"
  }
}
```

## Fluxo de Trabalho

### Atualizando Tipos
1. Fazer mudanças em `padel-types`
2. Commit e push
3. Publicar nova versão: `npm version patch && npm publish`
4. Atualizar nos outros repos: `npm update @padel/types`

### Atualizando Backend
1. Fazer mudanças em `padel-api`
2. Commit e push
3. Railway faz deploy automático

### Atualizando Frontend
1. Fazer mudanças em `padel-frontend`
2. Commit e push
3. Vercel faz deploy automático

## Links Úteis

- **GitHub**: https://github.com
- **NPM**: https://www.npmjs.com
- **Railway**: https://railway.app
- **Vercel**: https://vercel.com
- **Supabase**: https://supabase.com

## Troubleshooting

### Erro de autenticação no push
- Use Personal Access Token como senha
- Ou configure SSH: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

### Erro de permissão
- Verifique se você é owner/admin do repositório
- Verifique se o token tem as permissões corretas

### API não conecta ao banco
- Verifique as variáveis de ambiente
- Teste a connection string do Supabase
- Verifique se o SERVICE_ROLE_KEY está correto

### Frontend não conecta à API
- Verifique se VITE_API_URL está correto
- Verifique CORS no backend (ALLOWED_ORIGINS)
- Verifique se a API está rodando

## Próximos Passos

1. ✅ Criar os 3 repositórios no GitHub
2. ✅ Fazer push de cada um
3. ⏳ Configurar CI/CD (opcional)
4. ⏳ Deploy do backend no Railway
5. ⏳ Deploy do frontend no Vercel
6. ⏳ Testar integração end-to-end
7. ⏳ Configurar domínios customizados (opcional)

---

## Comandos Rápidos (Resumo)

```bash
# 1. Push padel-types
cd /tmp/repos/padel-types
git remote add origin https://github.com/SEU_USUARIO/padel-types.git
git push -u origin main

# 2. Push padel-api
cd /tmp/repos/padel-api
git remote add origin https://github.com/SEU_USUARIO/padel-api.git
git push -u origin main

# 3. Push padel-frontend
cd /tmp/repos/padel-frontend
git remote add origin https://github.com/SEU_USUARIO/padel-frontend.git
git push -u origin main
```

**Lembre-se de substituir `SEU_USUARIO` pelo seu username do GitHub!**

---

Boa sorte com o deploy! 🚀
