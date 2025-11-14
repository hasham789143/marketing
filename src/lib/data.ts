
export type ProductVariant = {
  sku: string;
  price: number;
  stockQty: number;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  description?: string;
  images?: string[];
  variants?: ProductVariant[];
};

export type Order = {
  id: string;
  customer: string;
  date: string;
  total: number;
  status: 'Pending' | 'Accepted' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  paymentStatus: 'Paid' | 'Unpaid';
};

export type Staff = {
  id: string;
  name: string;
  role: 'Admin' | 'Owner' | 'Manager' | 'Cashier' | 'Viewer';
  avatarUrlId: string;
};

export type ActivityLog = {
  id: string;
  staffName: string;
  staffRole: Staff['role'];
  action: string;
  timestamp: string;
};

export const products: Product[] = [];

export const orders: Order[] = [];

export const staff: Staff[] = [];

export const staffActivityLogs: ActivityLog[] = [];
