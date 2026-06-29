export const pageBuilderDefaultMedia = {
  audiFront:
    "https://assets-v2.lojaveiculos.com.br/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000001/photo/1782407801644-bd8dd971-8e59-418f-9e65-5cdd1c5046f1-audi-a4-preto-1.jpg",
  audiSide:
    "https://assets-v2.lojaveiculos.com.br/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000001/photo/1782407803425-e5dab261-c732-4a7e-8ada-75768d00c2a9-audi-a4-preto-2.jpeg",
  audiRear:
    "https://assets-v2.lojaveiculos.com.br/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000001/photo/1782407804841-d61696ef-372f-4701-8910-86fd8e487813-audi-a4-preto-3.jpeg",
  bmwFront:
    "https://assets-v2.lojaveiculos.com.br/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000002/photo/1782407806409-bb4385a0-3929-4af3-a4c3-a67f6b9b4f79-bmw-m3-preto-1.webp",
  bmwGreen:
    "https://assets-v2.lojaveiculos.com.br/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000005/photo/1782407809307-81ecf89e-b6b5-4184-9fa9-c8426567ba60-bmw-m3-verde-1.webp",
} as const;

export const pageBuilderDefaultGalleryImages = [
  {
    alt: "Audi A4 em destaque",
    caption: "Curadoria premium",
    id: "gallery-default-audi-front",
    url: pageBuilderDefaultMedia.audiFront,
  },
  {
    alt: "Audi A4 lateral",
    caption: "Fotos publicadas",
    id: "gallery-default-audi-side",
    url: pageBuilderDefaultMedia.audiSide,
  },
  {
    alt: "BMW M3 em destaque",
    caption: "Estoque selecionado",
    id: "gallery-default-bmw-front",
    url: pageBuilderDefaultMedia.bmwFront,
  },
] as const;
