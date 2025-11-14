'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DollarSign, ShoppingCart, Users, Activity } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Order, Staff } from '@/lib/data';
import { useMemo } from 'react';

const chartConfig = {
  revenue: {
    label: 'Revenue (PKR)',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const firestore = useFirestore();
  
  const ordersRef = useMemoFirebase(() => collection(firestore, 'shops/SHOP-X8Y1/orders'), [firestore]);
  const { data: orders } = useCollection<Order>(ordersRef);
  
  const staffRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: staff } = useCollection<Staff>(staffRef);

  const totalRevenue = useMemo(() => {
    return orders?.filter(o => o.paymentStatus === 'Paid').reduce((acc, order) => acc + order.total, 0) || 0;
  }, [orders]);
  
  const newOrdersCount = useMemo(() => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return orders?.filter(order => new Date(order.date) > oneMonthAgo).length || 0;
  }, [orders]);

  const chartData = useMemo(() => {
    const monthlyRevenue: { [key: string]: number } = {};
    orders?.forEach(order => {
      const month = new Date(order.date).toLocaleString('default', { month: 'long' });
      if (!monthlyRevenue[month]) {
        monthlyRevenue[month] = 0;
      }
      monthlyRevenue[month] += order.total;
    });

    const monthOrder = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    return monthOrder.map(month => ({
      month,
      revenue: monthlyRevenue[month] || 0
    })).filter(d => d.revenue > 0);

  }, [orders]);


  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card className="transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PKR {totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card className="transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{newOrdersCount}</div>
            <p className="text-xs text-muted-foreground">
              in the last month
            </p>
          </CardContent>
        </Card>
        <Card className="transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{staff?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              All staff members active
            </p>
          </CardContent>
        </Card>
        <Card className="transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Growth</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+5.3%</div>
            <p className="text-xs text-muted-foreground">
              Compared to last week
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
          <CardDescription>
            A look at your revenue over the last months.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={chartData} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <YAxis
                tickFormatter={(value) => `PKR ${Number(value) / 1000}k`}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
