import React, { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import useReceiptData from './hooks/useReceiptData';
import ReceiptSelector from './components/CashierReceipt/ReceiptSelector';
import ReceiptPreview from './components/CashierReceipt/ReceiptPreview';
import ReceiptFormatSettings from './components/CashierReceipt/ReceiptFormatSettings';

export const CashierReceipt: React.FC = () => {
  const {
    loading,
    loadingOrder,
    orders,
    selectedOrder,
    searchTerm,
    setSearchTerm,
    selectOrder,
    receiptFormat,
    setReceiptFormat
  } = useReceiptData();

  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Cashier Receipt"
        description="Print payment receipts with custom formatting"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Selection */}
        <div className="lg:col-span-1 space-y-4">
          <ReceiptSelector
            loading={loading}
            orders={orders}
            selectedOrder={selectedOrder}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectOrder={selectOrder}
          />

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            {showSettings ? 'Hide Format Settings' : 'Show Format Settings'}
          </button>

          {showSettings && (
            <ReceiptFormatSettings
              format={receiptFormat}
              setFormat={setReceiptFormat}
            />
          )}
        </div>

        {/* Right Panel - Preview */}
        <div className="lg:col-span-2">
          <ReceiptPreview
            order={selectedOrder}
            format={receiptFormat}
            loading={loadingOrder}
          />
        </div>
      </div>
    </div>
  );
};

export default CashierReceipt;
