
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingCart, Users, Activity, Store } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Order, Staff } from '@/lib/data';
import { useMemo } from 'react';

const chartConfig = {
  revenue: {
    label: 'Revenue (PKR)',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

interface UserData {
  role: string;
  shopId?: string;
}

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserData>(userDocRef);
  const role = userData?.role;
  const shopId = userData?.shopId;

  // Data fetching for Owners/Staff
  const ordersRef = useMemoFirebase(() => {
    if (role === 'admin' || !shopId) return null;
    return collection(firestore, `shops/${shopId}/orders`);
  }, [firestore, role, shopId]);
  const { data: orders } = useCollection<Order>(ordersRef);

  const staffRef = useMemoFirebase(() => {
    if (role === 'admin' || !shopId) return null;
    return collection(firestore, 'users'); // Note: This still fetches all users, might need refinement
  }, [firestore, role, shopId]);
  const { data: staff } = useCollection<Staff>(staffRef);

  // Data fetching for Admins
  const allShopsRef = useMemoFirebase(() => {
    if (role !== 'admin') return null;
    return collection(firestore, 'shops');
  }, [firestore, role]);
  const { data: allShops } = useCollection(allShopsRef);

  const allUsersRef = useMemoFirebase(() => {
    if (role !== 'admin') return null;
    return collection(firestore, 'users');
  }, [firestore, role]);
  const { data: allUsers } = useCollection(allUsersRef);


  const totalRevenue = useMemo(() => {
    if (role === 'admin') return 0; // Admin revenue calculation needs to be aggregated
    return orders?.filter(o => o.paymentStatus === 'Paid').reduce((acc, order) => acc + order.total, 0) || 0;
  }, [orders, role]);
  
  const newOrdersCount = useMemo(() => {
    if (role === 'admin') return 0;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return orders?.filter(order => new Date(order.date) > oneMonthAgo).length || 0;
  }, [orders, role]);

  const chartData = useMemo(() => {
    if (role === 'admin') return [];
    const monthlyRevenue: { [key: string]: number } = {};
    orders?.forEach(order => {
      const month = new Date(order.date).toLocaleString('default', { month: 'short' });
      if (!monthlyRevenue[month]) {
        monthlyRevenue[month] = 0;
      }
      monthlyRevenue[month] += order.total;
    });

    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    return monthOrder.map(month => ({
      month,
      revenue: monthlyRevenue[month] || 0
    })).filter(d => d.revenue > 0);

  }, [orders, role]);

  if (isUserDataLoading) {
    return <div>Loading dashboard...</div>;
  }

  if (role === 'admin') {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shops</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allShops?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total registered shops on the platform.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allUsers?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Includes owners, staff, and customers.
              </p>
            </CardContent>
          </Card>
        </div>
        <Card>
           <CardHeader>
                <CardTitle>Platform Overview</CardTitle>
                <CardDescription>
                    More platform-wide analytics and reports will be available here.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">This is the central place for managing the entire platform.</p>
            </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard for Owner/Staff
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <ResponsiveContainer>
              <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
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
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

    
