import { Pencil, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditBadge } from './CreditBadge';
import { Organization } from '../types';

interface OrganizationsTableProps {
  orgs: Organization[];
  loading: boolean;
  onEdit: (org: Organization) => void;
  onDeactivate: (org: Organization) => void;
}

export const OrganizationsTable = ({ orgs, loading, onEdit, onDeactivate }: OrganizationsTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Credit Balance</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
        ) : orgs.length === 0 ? (
          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
            No organizations yet.
          </TableCell></TableRow>
        ) : orgs.map(org => {
          const active = org.is_active !== false && org.is_active !== 0 && org.is_active !== '0' && org.is_active !== 'false';
          const balance = Number(org.credit_balance ?? 0);
          return (
            <TableRow key={org.id ?? org.localId}>
              <TableCell className="font-medium">{org.name}</TableCell>
              <TableCell>{org.contact_name || '—'}</TableCell>
              <TableCell>{org.phone || '—'}</TableCell>
              <TableCell><CreditBadge balance={balance} /></TableCell>
              <TableCell><Badge variant={active ? 'default' : 'secondary'}>{active ? 'Active' : 'Inactive'}</Badge></TableCell>
              <TableCell className="text-right space-x-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(org)}><Pencil className="h-4 w-4" /></Button>
                {active && <Button variant="ghost" size="sm" onClick={() => onDeactivate(org)}><Ban className="h-4 w-4 text-destructive" /></Button>}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
