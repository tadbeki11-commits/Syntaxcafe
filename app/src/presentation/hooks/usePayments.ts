import { useApplication } from '@/presentation/hooks/useApplication';

export const usePayments = () => useApplication().payments;
