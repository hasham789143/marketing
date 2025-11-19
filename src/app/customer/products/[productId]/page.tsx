'use client';

import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.productId as string;

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>
            More information about product: {productId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            This is a placeholder for the product detail page. You can add more
            images, a 3D view component, and detailed specifications here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
