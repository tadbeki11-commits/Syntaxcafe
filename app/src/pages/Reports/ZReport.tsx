import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Printer, Download, Calendar as CalendarIcon } from 'lucide-react';
import { printZReport } from '@/utils/receiptPrinter';
import api from '@/application';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';

interface ZReportData {
  report_date: string;
  period_start: string;
  period_end: string;
  summary: {
    total_orders: number;
    total_sales_cents: number;
    total_sales: number;
    gross_sales_cents: number;
    gross_sales: number;
    refunds_cents: number;
    refunds: number;
    discounts_cents: number;
    discounts: number;
    net_sales_cents: number;
    net_sales: number;
  };
  payment_breakdown: Array<{
    method: string;
    amount_cents: number;
    amount: number;
    count: number;
    percentage: number;
  }>;
  employee_activity: Array<{
    employee_id: number;
    employee_name: string;
    orders_count: number;
    total_sales_cents: number;
    total_sales: number;
  }>;
  voided_transactions: Array<{
    order_id: number;
    employee_id: number;
    employee_name: string;
    amount_cents: number;
    amount: number;
    created_at: string;
  }>;
  category_breakdown: Array<{
    category: string;
    amount_cents: number;
    amount: number;
    count: number;
  }>;
}

const ZReport = () => {
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);
  const [zReport, setZReport] = useState<ZReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchZReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      }
      const response = await api.orders.getZReport(params);
      console.log('Z-Report response:', response);
      const zReportData = response.data.data.zReport;
      setZReport(zReportData);
    } catch (err: any) {
      console.error('Z-Report error:', err);
      setError(err.message || 'Failed to generate Z-report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!zReport) return;
    try {
      await printZReport(zReport);
    } catch (err) {
      console.error('Print failed:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Z-Report</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Start Date</Label>
              <DatePicker
                date={startDate}
                onSelect={setStartDate}
                placeholder="Pick start date"
              />
            </div>
            <div className="flex-1">
              <Label>End Date</Label>
              <DatePicker
                date={endDate}
                onSelect={setEndDate}
                placeholder="Pick end date"
              />
            </div>
            <Button onClick={fetchZReport} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {zReport && (
        <>
          <div className="flex justify-end gap-2">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Print Report
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold">{zReport.summary.total_orders}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gross Sales</p>
                  <p className="text-2xl font-bold">{formatCurrency(zReport.summary.gross_sales)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Refunds</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(zReport.summary.refunds)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Net Sales</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(zReport.summary.net_sales)}</p>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                <p>Period: {formatDate(zReport.period_start)} - {formatDate(zReport.period_end)}</p>
                <p>Generated: {formatDate(zReport.report_date)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Method</th>
                    <th className="text-right py-2">Count</th>
                    <th className="text-right py-2">Amount</th>
                    <th className="text-right py-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {zReport.payment_breakdown.map((payment, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2 capitalize">{payment.method}</td>
                      <td className="text-right py-2">{payment.count}</td>
                      <td className="text-right py-2">{formatCurrency(payment.amount)}</td>
                      <td className="text-right py-2">{payment.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employee Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Employee</th>
                    <th className="text-right py-2">Orders</th>
                    <th className="text-right py-2">Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {zReport.employee_activity.map((employee, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2">{employee.employee_name}</td>
                      <td className="text-right py-2">{employee.orders_count}</td>
                      <td className="text-right py-2">{formatCurrency(employee.total_sales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Category</th>
                    <th className="text-right py-2">Count</th>
                    <th className="text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {zReport.category_breakdown.map((category, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2 capitalize">{category.category}</td>
                      <td className="text-right py-2">{category.count}</td>
                      <td className="text-right py-2">{formatCurrency(category.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {zReport.voided_transactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Voided Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Order ID</th>
                      <th className="text-left py-2">Employee</th>
                      <th className="text-right py-2">Amount</th>
                      <th className="text-left py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zReport.voided_transactions.map((txn, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2">#{txn.order_id}</td>
                        <td className="py-2">{txn.employee_name}</td>
                        <td className="text-right py-2 text-red-600">{formatCurrency(txn.amount)}</td>
                        <td className="py-2">{formatDate(txn.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ZReport;
