import { StaffActivity } from '@/components/staff-activity';

export default function StaffPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-2 font-headline">Staff Management</h1>
      <p className="text-muted-foreground mb-8">
        View staff activity and generate performance insights.
      </p>
      <StaffActivity />
    </div>
  );
}
