import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { PaymentMethodStats } from './components/PaymentMethodStats';
import { PaymentMethodsTable } from './components/PaymentMethodsTable';
import { PaymentMethodFormDialog } from './components/PaymentMethodFormDialog';
import { usePaymentMethodData } from './hooks/usePaymentMethodData';
import OfflineBanner from '@/components/OfflineBanner';
import { useSyncOnline } from '@/hooks/useSyncOnline';

export const PaymentMethodManagement: React.FC = () => {
  const {
    loading,
    methods,
    dialogOpen,
    setDialogOpen,
    selectedMethod,
    formData,
    setFormData,
    saving,
    openAdd,
    openEdit,
    handleSubmit,
    handleDelete,
    fetchMethods,
  } = usePaymentMethodData();
  const online = useSyncOnline();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Payment Methods"
        description="Manage the payment methods displayed at checkout"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchMethods} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={openAdd} disabled={!online}>
              <Plus className="h-4 w-4 mr-2" />
              Add Method
            </Button>
          </div>
        }
      />

      <OfflineBanner online={online} />

      <PaymentMethodStats methods={methods} />

      <PaymentMethodsTable
        loading={loading}
        methods={methods}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      <PaymentMethodFormDialog
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        selectedMethod={selectedMethod}
        formData={formData}
        setFormData={setFormData}
        saving={saving}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default PaymentMethodManagement;
