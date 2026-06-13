import React from 'react';
import { ArrowLeftRight, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import useInventoryData from '../InventoryManagement/hooks/useInventoryData';
import StockTransferDialog from '../InventoryManagement/components/StockTransferDialog';
import StockTransfersTable from '../InventoryManagement/components/StockTransfersTable';
import OfflineBanner from '@/components/OfflineBanner';

export const StockTransferManagement: React.FC = () => {
  const {
    transfers,
    users,
    transferDialog,
    setTransferDialog,
    transferData,
    setTransferData,
    normalizedItems,
    openTransfer,
    submitTransfer,
    receiveTransfer,
    printTransferReceipts,
    syncStatus,
  } = useInventoryData();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Stock Transfer"
        description="Move stock between locations and review transfer history."
        actions={
          <div className="flex gap-2">
            <Button onClick={() => openTransfer()} disabled={!syncStatus.online}>
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              New Transfer
            </Button>
          </div>
        }
      />

      <OfflineBanner online={syncStatus.online} />

      <StockTransfersTable
        transfers={transfers}
        items={normalizedItems}
        showAll
        onReceive={receiveTransfer}
        onPrintReceipts={printTransferReceipts}
      />

      <StockTransferDialog
        transferDialog={transferDialog}
        setTransferDialog={setTransferDialog}
        items={normalizedItems}
        transferData={transferData}
        setTransferData={setTransferData}
        submitTransfer={submitTransfer}
      />
    </div>
  );
};

export default StockTransferManagement;
