export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  imageUrlId: string;
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
  role: 'Owner' | 'Manager' | 'Cashier' | 'Viewer';
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
