// @ts-nocheck
import { authAdapter } from '@/infrastructure/adapters/auth.adapter';

type AuthAdapter = typeof authAdapter;

export class AuthFacade {
  constructor(private readonly adapter: AuthAdapter) {}

  login = (credentials: unknown) => this.adapter.login(credentials);
  pinLogin = (credentials: unknown) => this.adapter.pinLogin(credentials);
  staffLogin = (credentials: unknown) => this.adapter.staffLogin(credentials);
  register = (userData: unknown) => this.adapter.register(userData);
  logout = () => this.adapter.logout();
  getProfile = (userId: string | number) => this.adapter.getProfile(userId);
  updateProfile = (userId: string | number, data: unknown) =>
    this.adapter.updateProfile(userId, data);
  changePassword = (userId: string | number, data: unknown) =>
    this.adapter.changePassword(userId, data);
  getServerTime = () => this.adapter.getServerTime();
}
