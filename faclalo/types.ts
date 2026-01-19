
export interface InvoiceLine {
  description: string;
  units: number;
  priceUnit: number;
  total: number;
}

export interface BudgetData {
  id: string;
  fileName: string;
  clientName: string;
  date: string;
  lines: InvoiceLine[];
  subtotal: number;
  iva: number;
  total: number;
}

export interface InvoiceConfig {
  number: number;
  date: string;
}

export const MONTHS_ABREV = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
];

export const EMISOR_DATA = {
  name: "LALO SERVICIOS",
  nif: "B12345678",
  address: "Calle Principal 123",
  city: "Madrid, 28001",
  email: "contacto@lalo.es",
  phone: "+34 600 000 000"
};
