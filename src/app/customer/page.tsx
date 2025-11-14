import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function CustomerDashboardPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome, Customer!</CardTitle>
        <CardDescription>This is your personal dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Here you can view your orders, manage your profile, and more.</p>
      </CardContent>
    </Card>
  );
}
