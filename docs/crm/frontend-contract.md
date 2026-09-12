# Contrato do frontend CRM multicanal

Este contrato rege somente as superfícies em `apps/web/src/features/crm`. As
regras globais de tokens, acessibilidade, segurança e qualidade continuam no
`AGENTS.md` raiz e em `docs/ui-ux-visual-quality.md`.

## Resultado operacional

O CRM atende lojas de veículos usadas que precisam responder rapidamente sem
confundir pessoa, oportunidade, canal ou conexão. O leading metric é o tempo
entre a chegada de uma mensagem elegível e a primeira resposta aceita pelo
provider correto. Billing e entitlement são server-owned. O suporte de CRM e
integrações é responsável por conexões degradadas; a UI nunca simula sucesso.

## Informação canônica

Toda conversa mostra, em texto e ícone, os três eixos independentes:

- canal: `whatsapp`, `instagram` ou `olx_chat`;
- transporte: `meta_cloud`, `zapi` ou `olx`;
- broker da credencial: `composio` ou `direct`.

Composio não é canal, OLX como fonte de aquisição não determina o transporte e
Credere não é provider de mensagem. O composer usa exclusivamente a conexão da
thread ativa. O frontend nunca escolhe fallback entre providers.

## Layout

Em desktop, a área Conversas usa três zonas persistentes:

```text
Fila e busca | Thread ativa e composer | Cliente e oportunidade
```

Em mobile/PWA, as mesmas zonas formam uma pilha navegável:

```text
Fila → Thread → Contexto
```

Uma viewport contém no máximo uma thread ativa e um composer. O contexto não
pode cobrir o composer nem introduzir uma segunda ação de envio. A densidade é
alta, com tipografia tabular para tempos/contagens, linhas compactas e touch
targets globais preservados. Não adicionar cards genéricos ou headers grandes
para repetir o contexto já fornecido pelo shell.

## Estado e efeito

- Feedback otimista é permitido apenas para efeitos locais e reversíveis.
- Envio permanece pendente até aceitação durável pelo backend.
- `failed` e `indeterminate` são visualmente distintos e nunca parecem
  entregues; um efeito indeterminado oferece reconciliação, não reenvio cego.
- Bot e humano aparecem como estado textual explícito. Durante atendimento
  humano, o composer do bot e suas mutações ficam indisponíveis.
- Capabilities vêm do servidor. Ações sem capability são desabilitadas com
  explicação antes do clique. OLX Chat V1 envia apenas texto e não oferece mídia,
  reação ou quoted reply.
- Listas grandes são paginadas e, quando necessário, virtualizadas sem quebrar
  foco, seleção ou leitura por tecnologia assistiva.

## Central de canais

A central sempre apresenta Z-API, WhatsApp Oficial, Instagram Oficial e OLX.
Z-API respeita a capacidade contratada e usa `aguardando provisionamento` se
faltarem credenciais; capacidade paga nunca é apresentada como limite zero.
WhatsApp Oficial usa o fluxo Composio disponível. Instagram permanece com
ativação inicial/assistida enquanto o Auth Config oficial não existir.

OLX apresenta uma autorização e estados operacionais separados para:

- CRM: Leads e Chat;
- Marketplace: publicação/sincronização de estoque.

Falha ou pausa em uma capacidade não altera visualmente as demais. Scopes
faltantes geram pedido incremental; não sugerem reconectar uma conta já válida.

## Acessibilidade e motion

Fluxos completos funcionam por teclado, inclusive busca, seleção de conversa,
volta mobile, abertura/fechamento do contexto e envio. Atalhos são documentados
na própria superfície. Menus restauram foco ao gatilho. Canal e urgência não
dependem somente de cor. Focus rings permanecem visíveis e Axe não pode reportar
violações serious/critical.

Motion usa 120–260 ms para feedback e continuidade, somente `transform` e
`opacity`, com caminho equivalente sob `prefers-reduced-motion`.

## Gate visual

Mudanças amplas exigem capturas reais atual/candidata em `1440x900` e
`390x844`, comparação read-only com `agy`, testes de overflow e Axe. Pontuar
velocidade de resposta, clareza canal/conexão, densidade, passos, prevenção de
envio incorreto, mobile, acessibilidade, identidade automotiva e consistência
entre inbox, pipeline e canais. Entram apenas partes que vencem o atual.
