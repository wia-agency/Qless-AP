export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

export interface Order {
  _id: string;
  userId?: string | null;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category: 'Main' | 'Snack' | 'Drink' | 'Beverage' | 'Dessert';
  timeTaken?: number | null;
  isAvailable: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = Order['status'];
