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
  id: number;
  staffName: string;
  staffRole: Staff['role'];
  action: string;
  timestamp: string;
};

export const products: Product[] = [
  { id: 'prod_500', name: 'Classic Denim Jacket', sku: 'DJ-001', category: 'Apparel', price: 3500, stock: 12, imageUrlId: 'product-1' },
  { id: 'prod_501', name: 'Leather Handbag', sku: 'LH-002', category: 'Accessories', price: 4200, stock: 8, imageUrlId: 'product-2' },
  { id: 'prod_502', name: 'Modern Sneakers', sku: 'SN-003', category: 'Footwear', price: 2800, stock: 25, imageUrlId: 'product-3' },
  { id: 'prod_503', name: 'Formal Wrist Watch', sku: 'WW-004', category: 'Accessories', price: 8500, stock: 5, imageUrlId: 'product-4' },
  { id: 'prod_504', name: 'Aviator Sunglasses', sku: 'SG-005', category: 'Accessories', price: 1500, stock: 30, imageUrlId: 'product-5' },
  { id: 'prod_505', name: 'Cotton T-Shirt', sku: 'TS-006', category: 'Apparel', price: 950, stock: 50, imageUrlId: 'product-6' },
];

export const orders: Order[] = [
  { id: 'order_900', customer: 'Ahmed Ali', date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), total: 3650, status: 'Pending', paymentStatus: 'Paid' },
  { id: 'order_901', customer: 'Fatima Khan', date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), total: 4350, status: 'Delivered', paymentStatus: 'Paid' },
  { id: 'order_902', customer: 'Zainab Bibi', date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), total: 2950, status: 'Out for Delivery', paymentStatus: 'Paid' },
  { id: 'order_903', customer: 'Bilal Ahmed', date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(), total: 8650, status: 'Cancelled', paymentStatus: 'Unpaid' },
  { id: 'order_904', customer: 'Sana Javed', date: new Date(new Date().setDate(new Date().getDate() - 4)).toISOString(), total: 1650, status: 'Delivered', paymentStatus: 'Paid' },
  { id: 'order_905', customer: 'Usman Tariq', date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(), total: 1100, status: 'Preparing', paymentStatus: 'Paid' },
];

export const staff: Staff[] = [
  { id: 'user_100', name: 'Ali Hasham', role: 'Owner', avatarUrlId: 'avatar-1' },
  { id: 'user_101', name: 'Sara Khan', role: 'Cashier', avatarUrlId: 'avatar-2' },
];

export const staffActivityLogs: ActivityLog[] = [
  { id: 1, staffName: 'Sara Khan', staffRole: 'Cashier', action: 'Updated order #order_905 status to "Preparing".', timestamp: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString() },
  { id: 2, staffName: 'Ali Hasham', staffRole: 'Owner', action: 'Added new product "Cotton T-Shirt" (TS-006).', timestamp: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString() },
  { id: 3, staffName: 'Sara Khan', staffRole: 'Cashier', action: 'Processed refund for order #order_903.', timestamp: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString() },
  { id: 4, staffName: 'Ali Hasham', staffRole: 'Owner', action: 'Updated stock for "Classic Denim Jacket" to 12.', timestamp: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString() },
  { id: 5, staffName: 'Sara Khan', staffRole: 'Cashier', action: 'Updated order #order_902 status to "Out for Delivery".', timestamp: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString() },
  { id: 6, staffName: 'Ali Hasham', staffRole: 'Owner', action: 'Changed default delivery charge to 150 PKR.', timestamp: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString() },
  { id: 7, staffName: 'Sara Khan', staffRole: 'Cashier', action: 'Accepted order #order_901.', timestamp: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString() },
  { id: 8, staffName: 'Ali Hasham', staffRole: 'Owner', action: 'Viewed monthly revenue report.', timestamp: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString() },
  { id: 9, staffName: 'Sara Khan', staffRole: 'Cashier', action: 'Logged in to the system.', timestamp: new Date().toISOString() },
  { id: 10, staffName: 'Ali Hasham', staffRole: 'Owner', action: 'Deleted product "Old Scarf" (OS-001).', timestamp: new Date(new Date().setDate(new Date().getDate() - 15)).toISOString() }
];
