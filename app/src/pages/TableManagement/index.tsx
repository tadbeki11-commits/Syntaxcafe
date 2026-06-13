import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/layout/PageHeader';
import { useTableData } from './hooks/useTableData';
import { TableStats } from './components/TableStats';
import { TablesGrid } from './components/TablesGrid';
import { AddTableDialog } from './components/AddTableDialog';
import OfflineBanner from '@/components/OfflineBanner';
import { INITIAL_FORM } from './constants';

const TableManagement = () => {
  const {
    loading,
    tables,
    dialogOpen,
    setDialogOpen,
    formData,
    setFormData,
    handleSubmit,
    handleDelete,
    available,
    syncStatus,
    handleManualSync,
  } = useTableData();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Table Management"
        description="Manage your cafe tables"
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => setDialogOpen(true)} disabled={!syncStatus.online}>
              <Plus className="h-4 w-4 mr-2" />
              Add Table
            </Button>
          </div>
        }
      />

      <OfflineBanner online={syncStatus.online} />

      {/* Stats */}
      <TableStats total={tables.length} available={available} />

      {/* Tables Grid */}
      <TablesGrid
        loading={loading}
        tables={tables}
        onDelete={handleDelete}
        onAddClick={() => setDialogOpen(true)}
      />

      {/* Add Table Dialog */}
      <AddTableDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setFormData(INITIAL_FORM);
        }}
        formData={formData}
        onFormDataChange={setFormData}
        onSubmit={handleSubmit}
        onCancel={() => {
          setDialogOpen(false);
          setFormData(INITIAL_FORM);
        }}
      />
    </div>
  );
};

export default TableManagement;
