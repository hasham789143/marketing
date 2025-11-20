
import { Suspense } from 'react';
import OrdersClient from './orders-client';

export default function OrdersPage() {
  return (
    <Suspense fallback={<p>Loading orders...</p>}>
      <OrdersClient />
    </Suspense>
  );
}
