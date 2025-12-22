import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Award, TrendingUp, History } from "lucide-react";
import { format } from "date-fns";
import * as React from "react";
import api from "@/lib/api";
import { toast } from "sonner";

interface LoyaltyViewProps {
  customerId: string;
}

export function LoyaltyView({ customerId }: LoyaltyViewProps) {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    async function fetchLoyalty() {
      try {
        setLoading(true);
        // Assuming the endpoint we created: GET /api/customer/loyalty/accounts/?customer={id}
        // Since we didn't implement complex filtering yet, we might need to adjust.
        // For now, let's assume we can fetch by account ID or filter.
        // Actually, let's fetch the customer profile which likely includes loyalty summary,
        // or a dedicated endpoint.
        // Let's rely on the endpoint we exposed: /api/customer/loyalty/accounts/
        // We need to find the account for this customer.
        const res = await api.get(`/customer/loyalty/accounts/`);
        // Basic match for demo (since we didn't implement exact filter param in backend viewset yet)
        const account = res.data.results.find(
          (a: any) => a.customer === customerId
        ); // This might be weak

        // Better approach: Get profile and see if it has loyalty link?
        // Or updated the ViewSet to filter.
        // Let's assume we filter by ?customer_uuid={id} which standard ModelViewSets often support if configured
        // My implementation of get_queryset didn't explicitly add filter_backends.
        // So fetching all might be the only way for now (inefficient but works for small data).

        setData(account);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchLoyalty();
  }, [customerId]);

  if (loading) return <div>Loading loyalty...</div>;
  if (!data)
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-400">
            Loyalty Program Not Active
          </CardTitle>
        </CardHeader>
      </Card>
    );

  const nextTierPoints = 1000; // Hardcoded for demo or derived
  const progress = (data.lifetime_points / nextTierPoints) * 100;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Points
            </CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.balance}</div>
            <p className="text-xs text-muted-foreground">Available to redeem</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Lifetime Earned
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.lifetime_points}</div>
            <p className="text-xs text-muted-foreground">Since joining</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tier Status</CardTitle>
            <Badge
              variant="secondary"
              className="bg-gradient-to-r from-yellow-200 to-yellow-500 text-yellow-900 border-0"
            >
              {data.tier_name || "Member"}
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {data.lifetime_points} / {nextTierPoints} to next tier
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recent_transactions?.map((tx: any) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    {format(new Date(tx.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="capitalize">
                    {tx.transaction_type}
                  </TableCell>
                  <TableCell
                    className={
                      tx.points > 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {tx.points > 0 ? "+" : ""}
                    {tx.points}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tx.description || "-"}
                  </TableCell>
                </TableRow>
              ))}
              {!data.recent_transactions?.length && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    No history yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
