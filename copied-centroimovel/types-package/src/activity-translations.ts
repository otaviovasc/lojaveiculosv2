/**
 * Single source of truth for all activity/action translations.
 *
 * Consolidates translations previously scattered across:
 * - AuditLogFeed.tsx (ACTION_TRANSLATIONS, CATEGORY_TRANSLATIONS)
 * - LeadHistoryModal.tsx (ACTION_TRANSLATIONS, CATEGORY_TRANSLATIONS)
 * - activity-labels.ts (CARD_ACTION_LABELS, MODAL_ACTION_LABELS)
 * - utils.ts (FRIENDLY_ACTIONS)
 * - audit-feed/utils/translations.ts (ACTION_TRANSLATIONS, CATEGORY_TRANSLATIONS)
 * - BehaviorInsightsPanel.tsx (ACTION_LABELS)
 * - tracker.ts (mapActionToMetaEvent)
 */

// ─── Action Definitions ──────────────────────────────────────────────────────

export const ACTION_DEFINITIONS = {
  // ─── Conversion Events ───────────────────────────────────────────────────
  contact_click_whatsapp: {
    label: "Solicitou contato pelo WhatsApp",
    labelShort: "Contato WhatsApp",
    labelFormal: "Solicitação de Contato via WhatsApp",
    metaEvent: "Contact",
    category: "conversion",
    icon: "MessageCircle",
    color: "green",
  },
  contact_click_phone: {
    label: "Clicou para ligar",
    labelShort: "Ligação",
    labelFormal: "Clique para Ligação",
    metaEvent: "Contact",
    category: "conversion",
    icon: "Phone",
    color: "green",
  },
  contact_click_email: {
    label: "Enviou um e-mail",
    labelShort: "E-mail",
    labelFormal: "Envio de E-mail",
    metaEvent: "Contact",
    category: "conversion",
    icon: "Mail",
    color: "green",
  },
  whatsapp_click: {
    label: "Solicitou contato pelo WhatsApp",
    labelShort: "WhatsApp",
    labelFormal: "Clique no WhatsApp",
    metaEvent: "Contact",
    category: "conversion",
    icon: "MessageCircle",
    color: "green",
  },
  phone_click: {
    label: "Clicou para ligar",
    labelShort: "Telefone",
    labelFormal: "Clique no Telefone",
    metaEvent: "Contact",
    category: "conversion",
    icon: "Phone",
    color: "green",
  },
  email_click: {
    label: "Enviou um e-mail",
    labelShort: "E-mail",
    labelFormal: "Clique no E-mail",
    metaEvent: "Contact",
    category: "conversion",
    icon: "Mail",
    color: "green",
  },
  form_submit: {
    label: "Enviou uma proposta",
    labelShort: "Proposta",
    labelFormal: "Envio de Formulário",
    metaEvent: "Lead",
    category: "conversion",
    icon: "FileText",
    color: "green",
  },
  form_start: {
    label: "Iniciou o formulário",
    labelShort: "Formulário",
    labelFormal: "Início de Formulário",
    metaEvent: null,
    category: "conversion",
    icon: "FileText",
    color: "blue",
  },
  deal_closed: {
    label: "Negócio fechado com sucesso",
    labelShort: "Fechamento",
    labelFormal: "Fechamento de Negócio",
    metaEvent: null,
    category: "deal",
    icon: "CheckCircle2",
    color: "emerald",
  },
  close_deal: {
    label: "Negócio fechado com sucesso",
    labelShort: "Fechou negócio",
    labelFormal: "Fechamento de Negócio",
    metaEvent: null,
    category: "deal",
    icon: "CheckCircle2",
    color: "emerald",
  },

  // ─── Property Events ─────────────────────────────────────────────────────
  property_view: {
    label: "Visualizou o imóvel",
    labelShort: "Visualização",
    labelFormal: "Visualização de Imóvel",
    metaEvent: null,
    category: "engagement",
    icon: "Eye",
    color: "blue",
  },
  get_property_view: {
    label: "Visualizou detalhes do imóvel",
    labelShort: "Detalhes",
    labelFormal: "Visualização de Detalhes do Imóvel",
    metaEvent: "ViewContent",
    category: "engagement",
    icon: "Eye",
    color: "blue",
  },
  get_property_listing: {
    label: "Acessou o catálogo de imóveis",
    labelShort: "Catálogo",
    labelFormal: "Acesso ao Catálogo de Imóveis",
    metaEvent: "Search",
    category: "engagement",
    icon: "LayoutList",
    color: "blue",
  },
  property_save: {
    label: "Salvou um imóvel nos favoritos",
    labelShort: "Favoritou",
    labelFormal: "Salvamento de Imóvel",
    metaEvent: null,
    category: "engagement",
    icon: "Heart",
    color: "pink",
  },
  share_click: {
    label: "Compartilhou um imóvel",
    labelShort: "Compartilhou",
    labelFormal: "Compartilhamento de Imóvel",
    metaEvent: null,
    category: "engagement",
    icon: "Share2",
    color: "blue",
  },
  create_property: {
    label: "Criou um imóvel",
    labelShort: "Criou imóvel",
    labelFormal: "Criação de Imóvel",
    metaEvent: null,
    category: "user_action",
    icon: "Plus",
    color: "green",
  },
  edit_property: {
    label: "Editou um imóvel",
    labelShort: "Editou imóvel",
    labelFormal: "Edição de Imóvel",
    metaEvent: null,
    category: "user_action",
    icon: "Pencil",
    color: "blue",
  },
  delete_property: {
    label: "Excluiu um imóvel",
    labelShort: "Excluiu imóvel",
    labelFormal: "Exclusão de Imóvel",
    metaEvent: null,
    category: "user_action",
    icon: "Trash2",
    color: "red",
  },

  // ─── Lead Events ─────────────────────────────────────────────────────────
  create_lead: {
    label: "Novo lead gerado",
    labelShort: "Criou lead",
    labelFormal: "Criação de Lead",
    metaEvent: null,
    category: "user_action",
    icon: "Plus",
    color: "green",
  },
  edit_lead: {
    label: "Atualizou um lead",
    labelShort: "Editou lead",
    labelFormal: "Edição de Lead",
    metaEvent: null,
    category: "user_action",
    icon: "Pencil",
    color: "blue",
  },
  delete_lead: {
    label: "Excluiu um lead",
    labelShort: "Excluiu lead",
    labelFormal: "Exclusão de Lead",
    metaEvent: null,
    category: "user_action",
    icon: "Trash2",
    color: "red",
  },
  move_lead_column: {
    label: "Moveu um lead no funil",
    labelShort: "Moveu lead",
    labelFormal: "Movimentação no Funil",
    metaEvent: null,
    category: "user_action",
    icon: "ArrowRightLeft",
    color: "orange",
  },
  create_lead_interaction: {
    label: "Registrou interação no lead",
    labelShort: "Registrou interação",
    labelFormal: "Registro de Interação",
    metaEvent: null,
    category: "user_action",
    icon: "FileText",
    color: "blue",
  },
  lead_behavior: {
    label: "Comportamento do lead",
    labelShort: "Comportamento",
    labelFormal: "Comportamento do Lead",
    metaEvent: null,
    category: "lead_behavior",
    icon: "Activity",
    color: "cyan",
  },
  lead_qualified: {
    label: "Lead qualificado automaticamente",
    labelShort: "Qualificado",
    labelFormal: "Qualificação de Lead",
    metaEvent: null,
    category: "system",
    icon: "CheckCircle2",
    color: "green",
  },
  lead_status_update: {
    label: "Status do lead atualizado",
    labelShort: "Status atualizado",
    labelFormal: "Atualização de Status do Lead",
    metaEvent: null,
    category: "user_action",
    icon: "RefreshCw",
    color: "blue",
  },
  lead_move: {
    label: "Lead movido no funil",
    labelShort: "Movido no funil",
    labelFormal: "Movimentação de Lead",
    metaEvent: null,
    category: "user_action",
    icon: "ArrowRightLeft",
    color: "orange",
  },
  lead_identity_resolved: {
    label: "Identidade do lead resolvida",
    labelShort: "Identidade resolvida",
    labelFormal: "Resolução de Identidade",
    metaEvent: null,
    category: "identity",
    icon: "User",
    color: "purple",
  },

  // ─── Page/Navigation Events ──────────────────────────────────────────────
  page_view: {
    label: "Acessou o portal",
    labelShort: "Página",
    labelFormal: "Visualização de Página",
    metaEvent: "PageView",
    category: "engagement",
    icon: "Globe",
    color: "blue",
  },
  page_exit: {
    label: "Saiu da página",
    labelShort: "Saída",
    labelFormal: "Saída de Página",
    metaEvent: null,
    category: "engagement",
    icon: "LogOut",
    color: "gray",
  },

  // ─── Search Events ───────────────────────────────────────────────────────
  search: {
    label: "Realizou uma busca",
    labelShort: "Busca",
    labelFormal: "Busca Realizada",
    metaEvent: "Search",
    category: "engagement",
    icon: "Search",
    color: "blue",
  },
  search_properties: {
    label: "Realizou busca de imóveis",
    labelShort: "Busca de imóveis",
    labelFormal: "Busca de Imóveis",
    metaEvent: "Search",
    category: "engagement",
    icon: "Search",
    color: "blue",
  },
  filter: {
    label: "Filtrou resultados",
    labelShort: "Filtro",
    labelFormal: "Aplicação de Filtro",
    metaEvent: null,
    category: "engagement",
    icon: "Filter",
    color: "blue",
  },
  filter_apply: {
    label: "Aplicou filtros",
    labelShort: "Filtros",
    labelFormal: "Aplicação de Filtros",
    metaEvent: null,
    category: "engagement",
    icon: "Filter",
    color: "blue",
  },
  sort_change: {
    label: "Alterou ordenação",
    labelShort: "Ordenação",
    labelFormal: "Alteração de Ordenação",
    metaEvent: null,
    category: "engagement",
    icon: "ArrowUpDown",
    color: "blue",
  },
  saved_search_create: {
    label: "Salvou uma busca",
    labelShort: "Salvou busca",
    labelFormal: "Salvamento de Busca",
    metaEvent: null,
    category: "engagement",
    icon: "Bookmark",
    color: "blue",
  },
  saved_search_view: {
    label: "Visualizou busca salva",
    labelShort: "Busca salva",
    labelFormal: "Visualização de Busca Salva",
    metaEvent: null,
    category: "engagement",
    icon: "Bookmark",
    color: "blue",
  },
  saved_search_delete: {
    label: "Excluiu busca salva",
    labelShort: "Excluiu busca",
    labelFormal: "Exclusão de Busca Salva",
    metaEvent: null,
    category: "engagement",
    icon: "Bookmark",
    color: "red",
  },

  // ─── Scroll/Engagement Events ────────────────────────────────────────────
  scroll_depth: {
    label: "Aprofundou o scroll da página",
    labelShort: "Scroll",
    labelFormal: "Profundidade de Scroll",
    metaEvent: null,
    category: "engagement",
    icon: "ArrowDown",
    color: "blue",
  },
  engagement_time: {
    label: "Tempo de engajamento registrado",
    labelShort: "Permanência",
    labelFormal: "Tempo de Engajamento",
    metaEvent: null,
    category: "engagement",
    icon: "Clock",
    color: "blue",
  },
  click: {
    label: "Interagiu com elemento",
    labelShort: "Clique",
    labelFormal: "Interação com Elemento",
    metaEvent: null,
    category: "engagement",
    icon: "MousePointerClick",
    color: "blue",
  },
  hover: {
    label: "Passou o mouse",
    labelShort: "Hover",
    labelFormal: "Passagem do Mouse",
    metaEvent: null,
    category: "engagement",
    icon: "MousePointer",
    color: "gray",
  },
  element_view: {
    label: "Visualizou elemento",
    labelShort: "Visualização",
    labelFormal: "Visualização de Elemento",
    metaEvent: null,
    category: "engagement",
    icon: "Eye",
    color: "blue",
  },

  // ─── Video Events ────────────────────────────────────────────────────────
  video_play: {
    label: "Iniciou vídeo",
    labelShort: "Play",
    labelFormal: "Início de Vídeo",
    metaEvent: null,
    category: "engagement",
    icon: "Play",
    color: "blue",
  },
  video_progress: {
    label: "Progrediu no vídeo",
    labelShort: "Progresso",
    labelFormal: "Progresso de Vídeo",
    metaEvent: null,
    category: "engagement",
    icon: "Play",
    color: "blue",
  },
  video_complete: {
    label: "Concluiu o vídeo",
    labelShort: "Concluiu",
    labelFormal: "Conclusão de Vídeo",
    metaEvent: null,
    category: "engagement",
    icon: "CheckCircle2",
    color: "green",
  },
  video_pause: {
    label: "Pausou o vídeo",
    labelShort: "Pausa",
    labelFormal: "Pausa de Vídeo",
    metaEvent: null,
    category: "engagement",
    icon: "Pause",
    color: "yellow",
  },
  video_seek: {
    label: "Avançou ou retrocedeu no vídeo",
    labelShort: "Seek",
    labelFormal: "Navegação no Vídeo",
    metaEvent: null,
    category: "engagement",
    icon: "SkipForward",
    color: "blue",
  },
  video_25_percent: {
    label: "Assistiu 25% do vídeo",
    labelShort: "25%",
    labelFormal: "25% do Vídeo Assistido",
    metaEvent: null,
    category: "engagement",
    icon: "Play",
    color: "blue",
  },
  video_50_percent: {
    label: "Assistiu 50% do vídeo",
    labelShort: "50%",
    labelFormal: "50% do Vídeo Assistido",
    metaEvent: null,
    category: "engagement",
    icon: "Play",
    color: "blue",
  },
  video_75_percent: {
    label: "Assistiu 75% do vídeo",
    labelShort: "75%",
    labelFormal: "75% do Vídeo Assistido",
    metaEvent: null,
    category: "engagement",
    icon: "Play",
    color: "blue",
  },

  // ─── Gallery Events ──────────────────────────────────────────────────────
  gallery_open: {
    label: "Abriu a galeria de fotos",
    labelShort: "Galeria",
    labelFormal: "Abertura de Galeria",
    metaEvent: null,
    category: "engagement",
    icon: "Images",
    color: "blue",
  },
  gallery_navigate: {
    label: "Navegou pela galeria",
    labelShort: "Navegação",
    labelFormal: "Navegação na Galeria",
    metaEvent: null,
    category: "engagement",
    icon: "Images",
    color: "blue",
  },
  gallery_close: {
    label: "Fechou a galeria",
    labelShort: "Fechou",
    labelFormal: "Fechamento de Galeria",
    metaEvent: null,
    category: "engagement",
    icon: "Images",
    color: "gray",
  },
  gallery_photo_view: {
    label: "Visualizou uma foto da galeria",
    labelShort: "Foto",
    labelFormal: "Visualização de Foto",
    metaEvent: null,
    category: "engagement",
    icon: "Image",
    color: "blue",
  },
  gallery_zoom: {
    label: "Ampliou a foto da galeria",
    labelShort: "Zoom",
    labelFormal: "Ampliação de Foto",
    metaEvent: null,
    category: "engagement",
    icon: "ZoomIn",
    color: "blue",
  },

  // ─── Custom Page Events ──────────────────────────────────────────────────
  create_custom_page: {
    label: "Criou página personalizada",
    labelShort: "Criou página",
    labelFormal: "Criação de Página",
    metaEvent: null,
    category: "user_action",
    icon: "Plus",
    color: "green",
  },
  edit_custom_page: {
    label: "Editou página personalizada",
    labelShort: "Editou página",
    labelFormal: "Edição de Página",
    metaEvent: null,
    category: "user_action",
    icon: "Pencil",
    color: "blue",
  },
  delete_custom_page: {
    label: "Excluiu página personalizada",
    labelShort: "Excluiu página",
    labelFormal: "Exclusão de Página",
    metaEvent: null,
    category: "user_action",
    icon: "Trash2",
    color: "red",
  },

  // ─── Storefront/Workspace Events ─────────────────────────────────────────
  edit_storefront: {
    label: "Atualizou o portal",
    labelShort: "Atualizou portal",
    labelFormal: "Atualização do Portal",
    metaEvent: null,
    category: "user_action",
    icon: "LayoutTemplate",
    color: "blue",
  },
  edit_workspace: {
    label: "Atualizou configurações do workspace",
    labelShort: "Configurou loja",
    labelFormal: "Configurações da Loja",
    metaEvent: null,
    category: "user_action",
    icon: "Settings",
    color: "blue",
  },

  // ─── Member Events ───────────────────────────────────────────────────────
  invite_member: {
    label: "Convidou membro",
    labelShort: "Convite",
    labelFormal: "Convite de Membro",
    metaEvent: null,
    category: "user_action",
    icon: "Users",
    color: "green",
  },
  remove_member: {
    label: "Removeu membro",
    labelShort: "Remoção",
    labelFormal: "Remoção de Membro",
    metaEvent: null,
    category: "user_action",
    icon: "User",
    color: "red",
  },

  // ─── Subscription Events ─────────────────────────────────────────────────
  create_subscription: {
    label: "Criou assinatura",
    labelShort: "Assinatura",
    labelFormal: "Criação de Assinatura",
    metaEvent: null,
    category: "user_action",
    icon: "Plus",
    color: "green",
  },
  cancel_subscription: {
    label: "Cancelou assinatura",
    labelShort: "Cancelamento",
    labelFormal: "Cancelamento de Assinatura",
    metaEvent: null,
    category: "user_action",
    icon: "Trash2",
    color: "red",
  },
  upgrade_subscription: {
    label: "Upgrade de assinatura",
    labelShort: "Upgrade",
    labelFormal: "Upgrade de Plano",
    metaEvent: null,
    category: "user_action",
    icon: "ArrowRight",
    color: "green",
  },
  // ─── User ──────────────────────────────────────────────────────────────────
  create_user: {
    label: "Criou usuário",
    labelShort: "Novo usuário",
    labelFormal: "Criação de Usuário",
    metaEvent: null,
    category: "user_action",
    icon: "Plus",
    color: "green",
  },
  edit_user: {
    label: "Editou usuário",
    labelShort: "Editou usuário",
    labelFormal: "Edição de Usuário",
    metaEvent: null,
    category: "user_action",
    icon: "Pencil",
    color: "blue",
  },

  // ─── Lead Tasks ────────────────────────────────────────────────────────────
  create_lead_task: {
    label: "Criou tarefa no lead",
    labelShort: "Nova tarefa",
    labelFormal: "Criação de Tarefa",
    metaEvent: null,
    category: "user_action",
    icon: "ListTodo",
    color: "green",
  },
  update_lead_task: {
    label: "Atualizou tarefa do lead",
    labelShort: "Editou tarefa",
    labelFormal: "Edição de Tarefa",
    metaEvent: null,
    category: "user_action",
    icon: "Pencil",
    color: "blue",
  },
  delete_lead_task: {
    label: "Excluiu tarefa do lead",
    labelShort: "Excluiu tarefa",
    labelFormal: "Exclusão de Tarefa",
    metaEvent: null,
    category: "user_action",
    icon: "Trash2",
    color: "red",
  },

  // ─── Lead Columns ──────────────────────────────────────────────────────────
  create_lead_column: {
    label: "Criou coluna no funil",
    labelShort: "Nova coluna",
    labelFormal: "Criação de Coluna",
    metaEvent: null,
    category: "user_action",
    icon: "Plus",
    color: "green",
  },
  update_lead_column: {
    label: "Atualizou coluna do funil",
    labelShort: "Editou coluna",
    labelFormal: "Edição de Coluna",
    metaEvent: null,
    category: "user_action",
    icon: "Pencil",
    color: "blue",
  },
  delete_lead_column: {
    label: "Excluiu coluna do funil",
    labelShort: "Excluiu coluna",
    labelFormal: "Exclusão de Coluna",
    metaEvent: null,
    category: "user_action",
    icon: "Trash2",
    color: "red",
  },

  // ─── Lead Visits ───────────────────────────────────────────────────────────
  create_lead_visit: {
    label: "Agendou visita",
    labelShort: "Nova visita",
    labelFormal: "Agendamento de Visita",
    metaEvent: null,
    category: "user_action",
    icon: "CalendarCheck",
    color: "green",
  },
  update_lead_visit: {
    label: "Atualizou visita",
    labelShort: "Editou visita",
    labelFormal: "Edição de Visita",
    metaEvent: null,
    category: "user_action",
    icon: "Pencil",
    color: "blue",
  },
  delete_lead_visit: {
    label: "Cancelou visita",
    labelShort: "Cancelou visita",
    labelFormal: "Cancelamento de Visita",
    metaEvent: null,
    category: "user_action",
    icon: "Trash2",
    color: "red",
  },

  // ─── Lead Message Templates ────────────────────────────────────────────────
  create_lead_message_template: {
    label: "Criou template de mensagem",
    labelShort: "Novo template",
    labelFormal: "Criação de Template",
    metaEvent: null,
    category: "user_action",
    icon: "FileText",
    color: "green",
  },
  update_lead_message_template: {
    label: "Atualizou template de mensagem",
    labelShort: "Editou template",
    labelFormal: "Edição de Template",
    metaEvent: null,
    category: "user_action",
    icon: "Pencil",
    color: "blue",
  },
  delete_lead_message_template: {
    label: "Excluiu template de mensagem",
    labelShort: "Excluiu template",
    labelFormal: "Exclusão de Template",
    metaEvent: null,
    category: "user_action",
    icon: "Trash2",
    color: "red",
  },

  // ─── Lead Checklist Items ──────────────────────────────────────────────────
  create_lead_checklist_item: {
    label: "Adicionou item ao checklist",
    labelShort: "Novo item",
    labelFormal: "Adição de Item ao Checklist",
    metaEvent: null,
    category: "user_action",
    icon: "CheckSquare",
    color: "green",
  },
  update_lead_checklist_item: {
    label: "Atualizou item do checklist",
    labelShort: "Editou item",
    labelFormal: "Edição de Item do Checklist",
    metaEvent: null,
    category: "user_action",
    icon: "Pencil",
    color: "blue",
  },
  delete_lead_checklist_item: {
    label: "Removeu item do checklist",
    labelShort: "Removeu item",
    labelFormal: "Remoção de Item do Checklist",
    metaEvent: null,
    category: "user_action",
    icon: "Trash2",
    color: "red",
  },
  complete_lead_checklist_item: {
    label: "Concluiu item do checklist",
    labelShort: "Item concluído",
    labelFormal: "Conclusão de Item do Checklist",
    metaEvent: null,
    category: "user_action",
    icon: "CheckCircle2",
    color: "green",
  },
  uncomplete_lead_checklist_item: {
    label: "Reabriu item do checklist",
    labelShort: "Item reaberto",
    labelFormal: "Reabertura de Item do Checklist",
    metaEvent: null,
    category: "user_action",
    icon: "XCircle",
    color: "amber",
  },

  // ─── Lead Qualifications ───────────────────────────────────────────────────
  create_lead_qualification: {
    label: "Qualificou lead",
    labelShort: "Qualificou",
    labelFormal: "Qualificação de Lead",
    metaEvent: null,
    category: "user_action",
    icon: "BadgeCheck",
    color: "green",
  },
  update_lead_qualification: {
    label: "Atualizou qualificação do lead",
    labelShort: "Editou qualificação",
    labelFormal: "Edição de Qualificação",
    metaEvent: null,
    category: "user_action",
    icon: "Pencil",
    color: "blue",
  },

  // ─── Owner Submission & Captação ───────────────────────────────────────────
  create_owner_submission: {
    label: "Proprietário submeteu imóvel",
    labelShort: "Submissão",
    labelFormal: "Submissão de Imóvel pelo Proprietário",
    metaEvent: null,
    category: "lead_behavior",
    icon: "UserPlus",
    color: "green",
  },
  create_captacao_property: {
    label: "Cadastrou imóvel via captação",
    labelShort: "Captação",
    labelFormal: "Cadastro de Imóvel via Captação",
    metaEvent: null,
    category: "user_action",
    icon: "Home",
    color: "green",
  },

  // ─── Property Assignment ───────────────────────────────────────────────────
  request_assignment: {
    label: "Solicitou atribuição de imóvel",
    labelShort: "Solicitou atribuição",
    labelFormal: "Solicitação de Atribuição",
    metaEvent: null,
    category: "user_action",
    icon: "Send",
    color: "blue",
  },
  approve_assignment: {
    label: "Aprovou atribuição de imóvel",
    labelShort: "Aprovou atribuição",
    labelFormal: "Aprovação de Atribuição",
    metaEvent: null,
    category: "user_action",
    icon: "CheckCircle2",
    color: "green",
  },
  reject_assignment: {
    label: "Rejeitou atribuição de imóvel",
    labelShort: "Rejeitou atribuição",
    labelFormal: "Rejeição de Atribuição",
    metaEvent: null,
    category: "user_action",
    icon: "XCircle",
    color: "red",
  },
  revoke_assignment: {
    label: "Revogou atribuição de imóvel",
    labelShort: "Revogou atribuição",
    labelFormal: "Revogação de Atribuição",
    metaEvent: null,
    category: "user_action",
    icon: "UserMinus",
    color: "red",
  },

  // ─── System Events ─────────────────────────────────────────────────────────
  expire_assignment: {
    label: "Atribuição expirada",
    labelShort: "Atribuição expirada",
    labelFormal: "Expiração de Atribuição",
    metaEvent: null,
    category: "system",
    icon: "Clock",
    color: "amber",
  },
  expire_exclusivity: {
    label: "Exclusividade expirada",
    labelShort: "Exclusividade expirada",
    labelFormal: "Expiração de Exclusividade",
    metaEvent: null,
    category: "system",
    icon: "Lock",
    color: "amber",
  },

  // ─── Closings ──────────────────────────────────────────────────────────────
  record_closing: {
    label: "Registrou fechamento",
    labelShort: "Fechamento",
    labelFormal: "Registro de Fechamento",
    metaEvent: null,
    category: "user_action",
    icon: "FileText",
    color: "green",
  },

  // ─── Workspace ─────────────────────────────────────────────────────────────
  create_workspace: {
    label: "Criou escritório",
    labelShort: "Novo escritório",
    labelFormal: "Criação de Escritório",
    metaEvent: null,
    category: "user_action",
    icon: "Plus",
    color: "green",
  },
  delete_workspace: {
    label: "Excluiu escritório",
    labelShort: "Excluiu escritório",
    labelFormal: "Exclusão de Escritório",
    metaEvent: null,
    category: "user_action",
    icon: "Trash2",
    color: "red",
  },

  // ─── Meta Ads ──────────────────────────────────────────────────────────────
  launch_meta_campaign: {
    label: "Lançou campanha no Meta Ads",
    labelShort: "Lançou campanha",
    labelFormal: "Lançamento de Campanha Meta",
    metaEvent: null,
    category: "user_action",
    icon: "Rocket",
    color: "purple",
  },
  update_meta_campaign_budget: {
    label: "Atualizou orçamento da campanha",
    labelShort: "Editou orçamento",
    labelFormal: "Atualização de Orçamento da Campanha",
    metaEvent: null,
    category: "user_action",
    icon: "DollarSign",
    color: "blue",
  },
  update_meta_campaign_status: {
    label: "Alterou status da campanha",
    labelShort: "Status alterado",
    labelFormal: "Alteração de Status da Campanha",
    metaEvent: null,
    category: "user_action",
    icon: "ToggleLeft",
    color: "blue",
  },
  duplicate_meta_campaign: {
    label: "Duplicou campanha",
    labelShort: "Duplicou",
    labelFormal: "Duplicação de Campanha",
    metaEvent: null,
    category: "user_action",
    icon: "Copy",
    color: "blue",
  },
  delete_meta_campaign: {
    label: "Excluiu campanha",
    labelShort: "Excluiu campanha",
    labelFormal: "Exclusão de Campanha",
    metaEvent: null,
    category: "user_action",
    icon: "Trash2",
    color: "red",
  },
  update_meta_campaign_creative: {
    label: "Atualizou criativo da campanha",
    labelShort: "Editou criativo",
    labelFormal: "Atualização de Criativo",
    metaEvent: null,
    category: "user_action",
    icon: "Image",
    color: "blue",
  },

  // ─── Community Posts ───────────────────────────────────────────────────────
  create_community_post: {
    label: "Criou publicação na comunidade",
    labelShort: "Nova publicação",
    labelFormal: "Criação de Publicação",
    metaEvent: null,
    category: "user_action",
    icon: "FileEdit",
    color: "green",
  },
  edit_community_post: {
    label: "Editou publicação na comunidade",
    labelShort: "Editou publicação",
    labelFormal: "Edição de Publicação",
    metaEvent: null,
    category: "user_action",
    icon: "Pencil",
    color: "blue",
  },
  delete_community_post: {
    label: "Excluiu publicação da comunidade",
    labelShort: "Excluiu publicação",
    labelFormal: "Exclusão de Publicação",
    metaEvent: null,
    category: "user_action",
    icon: "Trash2",
    color: "red",
  },

  // ─── Community Comments ────────────────────────────────────────────────────
  create_community_comment: {
    label: "Comentou na comunidade",
    labelShort: "Novo comentário",
    labelFormal: "Criação de Comentário",
    metaEvent: null,
    category: "user_action",
    icon: "MessageCircle",
    color: "green",
  },
  edit_community_comment: {
    label: "Editou comentário na comunidade",
    labelShort: "Editou comentário",
    labelFormal: "Edição de Comentário",
    metaEvent: null,
    category: "user_action",
    icon: "Pencil",
    color: "blue",
  },
  delete_community_comment: {
    label: "Excluiu comentário da comunidade",
    labelShort: "Excluiu comentário",
    labelFormal: "Exclusão de Comentário",
    metaEvent: null,
    category: "user_action",
    icon: "Trash2",
    color: "red",
  },

  // ─── Community Channel Messages ────────────────────────────────────────────
  create_community_channel_message: {
    label: "Enviou mensagem no canal",
    labelShort: "Nova mensagem",
    labelFormal: "Envio de Mensagem no Canal",
    metaEvent: null,
    category: "user_action",
    icon: "MessageSquare",
    color: "green",
  },
  edit_community_channel_message: {
    label: "Editou mensagem do canal",
    labelShort: "Editou mensagem",
    labelFormal: "Edição de Mensagem do Canal",
    metaEvent: null,
    category: "user_action",
    icon: "Pencil",
    color: "blue",
  },
  delete_community_channel_message: {
    label: "Excluiu mensagem do canal",
    labelShort: "Excluiu mensagem",
    labelFormal: "Exclusão de Mensagem do Canal",
    metaEvent: null,
    category: "user_action",
    icon: "Trash2",
    color: "red",
  },

  // ─── Community Reactions ───────────────────────────────────────────────────
  create_community_reaction: {
    label: "Reagiu a uma publicação",
    labelShort: "Nova reação",
    labelFormal: "Criação de Reação",
    metaEvent: null,
    category: "user_action",
    icon: "Heart",
    color: "green",
  },
  delete_community_reaction: {
    label: "Removeu reação",
    labelShort: "Removeu reação",
    labelFormal: "Remoção de Reação",
    metaEvent: null,
    category: "user_action",
    icon: "Heart",
    color: "red",
  },

  // ─── Community Channels ────────────────────────────────────────────────────
  create_community_channel: {
    label: "Criou canal na comunidade",
    labelShort: "Novo canal",
    labelFormal: "Criação de Canal",
    metaEvent: null,
    category: "user_action",
    icon: "Hash",
    color: "green",
  },
  update_community_channel: {
    label: "Atualizou canal da comunidade",
    labelShort: "Editou canal",
    labelFormal: "Edição de Canal",
    metaEvent: null,
    category: "user_action",
    icon: "Pencil",
    color: "blue",
  },
  delete_community_channel: {
    label: "Excluiu canal da comunidade",
    labelShort: "Excluiu canal",
    labelFormal: "Exclusão de Canal",
    metaEvent: null,
    category: "user_action",
    icon: "Trash2",
    color: "red",
  },

  // ─── Payments & Webhooks ───────────────────────────────────────────────────
  payment_confirmed: {
    label: "Pagamento confirmado",
    labelShort: "Pagamento confirmado",
    labelFormal: "Confirmação de Pagamento",
    metaEvent: null,
    category: "user_action",
    icon: "CreditCard",
    color: "green",
  },
  payment_failed: {
    label: "Pagamento falhou",
    labelShort: "Pagamento falhou",
    labelFormal: "Falha no Pagamento",
    metaEvent: null,
    category: "user_action",
    icon: "CreditCard",
    color: "red",
  },
  payment_refunded: {
    label: "Pagamento reembolsado",
    labelShort: "Reembolsado",
    labelFormal: "Reembolso de Pagamento",
    metaEvent: null,
    category: "user_action",
    icon: "CreditCard",
    color: "amber",
  },
  webhook_received: {
    label: "Webhook recebido",
    labelShort: "Webhook",
    labelFormal: "Recebimento de Webhook",
    metaEvent: null,
    category: "system",
    icon: "Webhook",
    color: "purple",
  },

  // ─── Form Abandon ──────────────────────────────────────────────────────────
  form_abandon: {
    label: "Abandonou o formulário",
    labelShort: "Abandono",
    labelFormal: "Abandono de Formulário",
    metaEvent: null,
    category: "lead_behavior",
    icon: "FileText",
    color: "gray",
  },

  // ─── Bulk Operations ───────────────────────────────────────────────────────
  bulk_status_property: {
    label: "Alterou status de imóveis em lote",
    labelShort: "Alteração em lote",
    labelFormal: "Alteração em Lote de Status",
    metaEvent: null,
    category: "user_action",
    icon: "Layers",
    color: "blue",
  },
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionType = keyof typeof ACTION_DEFINITIONS;
export type ActionCategory =
  (typeof ACTION_DEFINITIONS)[ActionType]["category"];

// ─── Derived Maps ─────────────────────────────────────────────────────────────

export const ACTION_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(ACTION_DEFINITIONS).map(([key, def]) => [key, def.label]),
);

export const ACTION_LABELS_SHORT: Record<string, string> = Object.fromEntries(
  Object.entries(ACTION_DEFINITIONS).map(([key, def]) => [key, def.labelShort]),
);

export const ACTION_LABELS_FORMAL: Record<string, string> = Object.fromEntries(
  Object.entries(ACTION_DEFINITIONS).map(([key, def]) => [
    key,
    def.labelFormal,
  ]),
);

export const META_EVENT_MAP: Record<string, string | null> = Object.fromEntries(
  Object.entries(ACTION_DEFINITIONS).map(([key, def]) => [key, def.metaEvent]),
);

export const ACTION_CATEGORIES: Record<string, string> = Object.fromEntries(
  Object.entries(ACTION_DEFINITIONS).map(([key, def]) => [key, def.category]),
);

// ─── Category Translations ────────────────────────────────────────────────────

export const CATEGORY_TRANSLATIONS: Record<string, string> = {
  all: "Todas as categorias",
  identified_leads: "Apenas leads identificados",
  engagement: "Engajamento",
  conversion: "Conversão",
  system: "Sistema",
  identity: "Identidade",
  marketing: "Marketing",
  deal: "Negócio",
  lead_behavior: "Comportamento do Lead",
  LEAD_BEHAVIOR: "Comportamento do Lead",
  user_action: "Ação do Usuário",
  USER_ACTION: "Ação do Usuário",
};

// ─── Resource Translations ────────────────────────────────────────────────────

export const RESOURCE_TRANSLATIONS: Record<string, string> = {
  Property: "Imóvel",
  property: "Imóvel",
  lead: "Lead",
  Lead: "Lead",
  storefront: "Portal",
  Storefront: "Portal",
  Form: "Formulário",
  form: "Formulário",
  User: "Usuário",
  user: "Usuário",
  Workspace: "Escritório",
  workspace: "Escritório",
  custom_page: "Página",
  page: "Página",
  subscription: "Assinatura",
  member: "Membro",
  interaction: "Interação",
  deal: "Negócio",
  vehicle: "Veículo",
  closure: "Fechamento",
  community_post: "Publicação",
  community_comment: "Comentário",
  community_channel_message: "Mensagem do Canal",
  community_reaction: "Reação",
  community_channel: "Canal",
  meta_campaign: "Campanha Meta",
  charge: "Cobrança",
  webhook: "Webhook",
  captacao: "Captação",
  owner_submission: "Submissão de Proprietário",
  lead_task: "Tarefa",
  lead_column: "Coluna",
  lead_visit: "Visita",
  lead_message_template: "Template de Mensagem",
  lead_checklist: "Checklist",
  lead_qualification: "Qualificação",
  assignment: "Atribuição",
  exclusivity: "Exclusividade",
  workspace_member: "Membro do Escritório",
};

// ─── Metadata Key Translations ────────────────────────────────────────────────

export const METADATA_KEY_TRANSLATIONS: Record<string, string> = {
  source: "Origem",
  medium: "Mídia",
  campaign: "Campanha",
  url: "Link",
  referrer: "Referência",
  device: "Dispositivo",
  location: "Localização",
  ip: "IP",
  userAgent: "Navegador",
  propertyTitle: "Título do Imóvel",
  title: "Título",
  type: "Tipo",
  purpose: "Finalidade",
  updatedFields: "Campos alterados",
  fieldDiff: "Alterações",
  duration: "Duração",
  viewport: "Viewport",
  progress: "Progresso",
  sourceType: "Tipo de origem",
  campaignId: "ID da campanha",
  term: "Termo",
  content: "Conteúdo",
  path: "Página",
  time_label: "Faixa de tempo",
  time_seconds: "Tempo (segundos)",
  resource_type: "Tipo de recurso",
  interaction_count: "Interações",
  depth_percent: "Profundidade do scroll",
  scroll_pixels: "Pixels rolados",
  max_scroll_depth: "Maior profundidade de scroll",
  total_interactions: "Interações totais",
  total_time_seconds: "Tempo total (segundos)",
  photo_index: "Índice da foto",
  photo_number: "Número da foto",
  total_photos: "Total de fotos",
};

// ─── Enum Translations ────────────────────────────────────────────────────────

export const ENUM_TRANSLATIONS: Record<string, string> = {
  COBERTURA: "Cobertura",
  APARTAMENTO: "Apartamento",
  CASA: "Casa",
  VENDA: "Venda",
  ALUGUEL: "Aluguel",
  TERRENO: "Terreno",
  COMERCIAL: "Comercial",
  CENTRO_IMOVEL_FORM: "Formulário da sua página",
  direct: "Direto",
  none: "Não informado",
  organic: "Orgânico",
  paid: "Pago",
  referral: "Referência",
  social: "Social",
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  storefront_homepage: "Página inicial do portal",
  property: "Imóvel",
  unknown: "Não identificado",
  tenant_lp_home: "LP do corretor (home)",
  tenant_lp_listing: "LP do corretor (listagem)",
  tenant_lp_property: "LP do corretor (detalhe do imóvel)",
  portal_root_home: "Portal raiz (home)",
  portal_root_listing: "Portal raiz (listagem)",
  portal_root_property: "Portal raiz (detalhe do imóvel)",
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

export function getActionDefinition(action: string) {
  const known = ACTION_DEFINITIONS[action as ActionType];
  if (known) return known;

  return {
    label: action.replace(/_/g, " "),
    labelShort: action.replace(/_/g, " "),
    labelFormal: action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase()),
    metaEvent: null,
    category: "system",
    icon: "Activity",
    color: "gray",
  };
}

export function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action.replace(/_/g, " ");
}

export function getActionLabelShort(action: string): string {
  return ACTION_LABELS_SHORT[action] || action.replace(/_/g, " ");
}

export function getActionLabelFormal(action: string): string {
  return (
    ACTION_LABELS_FORMAL[action] ||
    action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

export function mapActionToMetaEvent(action: string): string | null {
  return META_EVENT_MAP[action] ?? null;
}

export function getCategoryLabel(category: string): string {
  return CATEGORY_TRANSLATIONS[category] || category;
}

export function getResourceLabel(resource: string): string {
  return RESOURCE_TRANSLATIONS[resource] || resource;
}

export function translateMetadataValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Sim" : "Não";

  if (key === "scroll_pixels") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return `${Math.round(numeric)}`;
  }

  const str = String(value);
  return ENUM_TRANSLATIONS[str] || ENUM_TRANSLATIONS[str.toUpperCase()] || str;
}
