import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string) {
    const user = await this.usersService.findByUsername(username);
    if (user && (await this.usersService.verifyPassword(user, pass))) {
      // strip sensitive fields
      const { password_hash, ...safe } = user;
      return safe;
    }
    return null;
  }

  async login(user: any) {
    // Platform super admins have no business and may cross tenants; owners act on
    // any branch of their business; everyone else is pinned to a single branch.
    const scope =
      user.role === "super_admin"
        ? "platform"
        : user.role === "owner" || user.role === "business_admin"
          ? "owner"
          : "branch";
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      role_id: user.role_id,
      business_id: user.business_id ?? null,
      branch_id: user.branch_id ?? null,
      scope,
    };
    return { access_token: this.jwtService.sign(payload) };
  }
}
