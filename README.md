# Relatório de Inadimplência B2B no Brasil — Sinky

Página pública de dados consolidados de inadimplência B2B, atualizada mensalmente.

## Estrutura de arquivos

```
relatorio-inadimplencia/
├── index.html   # Página completa (self-contained para preview local)
├── data.json    # Dados mensais — ESTE É O ARQUIVO QUE O SQUAD ATUALIZA
├── style.css    # Estilos externos (opcional — já embutido no index.html)
├── app.js       # JavaScript externo (opcional — já embutido no index.html)
└── README.md    # Este arquivo
```

## Deploy no Vercel

### 1. Criar repositório GitHub

```bash
git init
git add .
git commit -m "feat: relatório inadimplência B2B — versão inicial"
git remote add origin https://github.com/sinky/relatorio-inadimplencia.git
git push -u origin main
```

### 2. Conectar ao Vercel

1. Acesse [vercel.com](https://vercel.com) → "Add New Project"
2. Importe o repositório `sinky/relatorio-inadimplencia`
3. Framework Preset: **Other** (é HTML estático, sem build)
4. Root Directory: `/` (raiz do repo)
5. Clique em **Deploy**

### 3. Domínio personalizado

No Vercel → Project Settings → Domains:
- Adicionar `relatorio.besinky.com`
- No DNS do domínio, criar um CNAME: `relatorio` → `cname.vercel-dns.com`

---

## Atualização mensal (feita pelo squad)

O squad de coleta mensal atualiza **apenas** o arquivo `data.json`.  
Ao fazer commit, o Vercel faz o deploy automaticamente em ~30 segundos.

### O que o squad atualiza no data.json:

- `meta.ultima_atualizacao` e `ultima_atualizacao_label` → mês de referência
- `nacional.*` → taxas nacionais do mês
- Adicionar novo item em `historico[]` com o mês atual
- Atualizar `por_setor[].taxa` e `variacao_anual` se houver dados novos
- Atualizar `por_porte[].taxa` se houver dados novos
- Atualizar `destaques[]` com os números de destaque do mês

---

## Webhook de leads (configuração)

Para receber os leads do formulário no CRM (Attio):

1. Criar um webhook no **Zapier**, **Make** ou **n8n** que receba POST com:
   ```json
   {
     "nome": "...",
     "email": "...",
     "empresa": "...",
     "cargo": "...",
     "segmento": "...",
     "ts": "ISO timestamp",
     "fonte": "relatorio-inadimplencia-b2b-2025"
   }
   ```
2. No `index.html`, linha com `const GATE_WEBHOOK_URL = '';`, inserir a URL do webhook:
   ```javascript
   const GATE_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/xxx/yyy/';
   ```
3. Fazer commit → Vercel deploya automaticamente

---

## Preview local

Abrir diretamente no browser:
```
file:///caminho/para/relatorio-inadimplencia/index.html
```

Funciona sem servidor — dados embutidos no HTML como fallback.
