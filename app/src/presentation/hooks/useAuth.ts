import { useApplication } from '@/presentation/hooks/useApplication';

export const useAuthApi = () => useApplication().auth;
