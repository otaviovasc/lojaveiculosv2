export interface UpcomingTask {
  id: string;
  title: string;
  dueDate: string;
  leadName: string;
  vehicleTitle?: string;
  columnName?: string;
  isOverdue?: boolean;
}

export interface AgingVehicle {
  id: string;
  title: string;
  price: number;
  daysInStock: number;
  leadsCount: number;
  foto?: string;
  image?: string;
}

export interface SellerPerformance {
  name: string;
  leadsConverted: number;
  totalSalesValue: number;
}

export const MOCK_TASKS: UpcomingTask[] = [
  {
    id: "1",
    title: "Retornar contato WhatsApp",
    dueDate: "2026-06-25",
    leadName: "Carlos Eduardo Nogueira",
    vehicleTitle: "Chevrolet Onix 2021",
    columnName: "Primeiro Contato",
    isOverdue: false,
  },
  {
    id: "2",
    title: "Enviar proposta comercial",
    dueDate: "2026-06-21",
    leadName: "Maria da Penha Silva",
    vehicleTitle: "Jeep Compass 2022",
    columnName: "Negociação",
    isOverdue: true,
  },
  {
    id: "3",
    title: "Confirmar vistoria física",
    dueDate: "2026-06-24",
    leadName: "Pedro Henrique Ramos",
    vehicleTitle: "Toyota Corolla 2020",
    columnName: "Vistoria",
    isOverdue: false,
  },
];

export const MOCK_AGING_VEHICLES: AgingVehicle[] = [
  {
    id: "1",
    title: "BMW 320i Active Flex 2.0",
    price: 189900,
    daysInStock: 45,
    leadsCount: 14,
    foto: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&q=80",
  },
  {
    id: "2",
    title: "Volkswagen Golf GTI 2.0 Tsi",
    price: 142000,
    daysInStock: 32,
    leadsCount: 22,
    foto: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=400&q=80",
  },
  {
    id: "3",
    title: "Hyundai Creta Prestige 2.0",
    price: 104900,
    daysInStock: 28,
    leadsCount: 9,
    foto: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&q=80",
  },
];

export const MOCK_SELLERS: SellerPerformance[] = [
  { name: "Juliana Mendes", leadsConverted: 14, totalSalesValue: 1240000 },
  { name: "Rodrigo Almeida", leadsConverted: 9, totalSalesValue: 780000 },
  { name: "Marlos Pires", leadsConverted: 6, totalSalesValue: 490000 },
];
