import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2 font-headline">Settings</h1>
        <p className="text-muted-foreground mb-8">
            Manage your shop settings and preferences.
        </p>
      <Card>
        <CardHeader>
          <CardTitle>Shop Details</CardTitle>
          <CardDescription>
            Update your shop's information.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="shop-name">Shop Name</Label>
            <Input id="shop-name" defaultValue="Ali's Fashion Store" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="shop-id">Shop ID</Label>
            <Input id="shop-id" defaultValue="SHOP-X8Y1" readOnly disabled />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="grid gap-2">
                <Label htmlFor="delivery-charge">Default Delivery Charge</Label>
                <Input id="delivery-charge" type="number" defaultValue="150" />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" defaultValue="PKR" />
            </div>
          </div>
           <div className="grid gap-2">
            <Label htmlFor="owner-email">Owner Email</Label>
            <Input id="owner-email" type="email" defaultValue="ali.hasham@example.com" />
          </div>
        </CardContent>
        <CardFooter>
          <Button>Save Changes</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
