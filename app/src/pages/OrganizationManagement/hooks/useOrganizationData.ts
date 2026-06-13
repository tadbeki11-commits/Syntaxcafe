import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '@/application';
import { Organization, OrgFormState } from '../types';
import { EMPTY_FORM } from '../constants';

export const useOrganizationData = () => {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Organization | null>(null);
  const [form, setForm] = useState<OrgFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.organizations.getAll(true);
      const list = (res as any)?.data?.data?.organizations ?? [];
      setOrgs(Array.isArray(list) ? list : []);
    } catch {
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setSelected(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  
  const openEdit = (org: Organization) => {
    setSelected(org);
    setForm({ 
      name: org.name ?? '', 
      contact_name: org.contact_name ?? '', 
      phone: org.phone ?? '', 
      email: org.email ?? '', 
      address: org.address ?? '', 
      notes: org.notes ?? '' 
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Organization name is required'); return; }
    try {
      setSaving(true);
      if (selected && selected.id) { await api.organizations.update(selected.id, form); toast.success('Organization updated'); }
      else { await api.organizations.create(form); toast.success('Organization created'); }
      setDialogOpen(false); load();
    } catch { toast.error('Failed to save organization'); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (org: Organization) => {
    if (!window.confirm(`Deactivate "${org.name}"?`)) return;
    if (!org.id) { toast.error('Invalid organization ID'); return; }
    try { await api.organizations.deactivate(org.id); toast.success('Deactivated'); load(); }
    catch { toast.error('Failed to deactivate'); }
  };

  return {
    orgs,
    loading,
    dialogOpen,
    setDialogOpen,
    selected,
    form,
    setForm,
    saving,
    load,
    openAdd,
    openEdit,
    handleSubmit,
    handleDeactivate,
  };
};
