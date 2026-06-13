import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  Param,
  Put,
} from "@nestjs/common";
import {
  ApiBody,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import {
  AuthLoginResponseDto,
  AuthProfileResponseDto,
  AuthUserResponseDto,
  LoginRequestDto,
  LogoutResponseDto,
  PinLoginRequestDto,
  RegisterUserRequestDto,
  StaffLoginRequestDto,
  UpdateProfileRequestDto,
} from "./dto/auth.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  private getServerTime() {
    return new Date().toISOString();
  }

  @ApiOperation({ summary: "Authenticate a user with username and password" })
  @ApiBody({ type: LoginRequestDto })
  @ApiOkResponse({ type: AuthLoginResponseDto })
  @Post("login")
  async login(@Body() body: LoginRequestDto) {
    const { username, password } = body;
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new UnauthorizedException("Invalid credentials");
    if (!user.is_active)
      throw new UnauthorizedException("Account is deactivated");
    const valid = await this.usersService.verifyPassword(user, password);
    if (!valid) throw new UnauthorizedException("Invalid credentials");
    const token = await this.authService.login(user);
    return {
      status: "success",
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
      },
      token,
      server_time: this.getServerTime(),
    };
  }

  @ApiOperation({ summary: "Authenticate a user with PIN and display name" })
  @ApiBody({ type: PinLoginRequestDto })
  @ApiOkResponse({ type: AuthUserResponseDto })
  @Post("pin-login")
  async pinLogin(@Body() body: PinLoginRequestDto) {
    const { name, pin } = body;
    const user = await this.usersService.findByName(name);
    if (!user) throw new UnauthorizedException("Invalid credentials");
    if (!user.is_active)
      throw new UnauthorizedException("Account is deactivated");
    const ok = await this.usersService.verifyPin(user, pin);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    return {
      status: "success",
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
      },
      server_time: this.getServerTime(),
    };
  }

  @ApiOperation({ summary: "Authenticate staff by name and password" })
  @ApiBody({ type: StaffLoginRequestDto })
  @ApiOkResponse({ type: AuthUserResponseDto })
  @Post("staff-login")
  async staffLogin(@Body() body: StaffLoginRequestDto) {
    const { name, password } = body;
    const user = await this.usersService.findByName(name);
    if (!user) throw new UnauthorizedException("Invalid credentials");
    if (!user.is_active)
      throw new UnauthorizedException("Account is deactivated");
    const ok = await this.usersService.verifyPassword(user, password);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    return {
      status: "success",
      message: "Staff login successful",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
      },
      server_time: this.getServerTime(),
    };
  }

  @ApiOperation({ summary: "Register a new user" })
  @ApiBody({ type: RegisterUserRequestDto })
  @ApiOkResponse({ type: AuthUserResponseDto })
  @Post("register")
  async register(@Body() body: RegisterUserRequestDto) {
    const user = await this.usersService.register(body);
    return {
      status: "success",
      message: "User created successfully",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        role_id: user.role_id,
        full_name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
      },
    };
  }

  @ApiOperation({ summary: "Get current server time" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        status: { type: "string" },
        server_time: { type: "string", format: "date-time" },
      },
    },
  })
  @Get("time")
  async getCurrentTime() {
    return {
      status: "success",
      server_time: this.getServerTime(),
    };
  }

  @ApiOperation({ summary: "Log out the current user" })
  @ApiOkResponse({ type: LogoutResponseDto })
  @Post("logout")
  async logout() {
    return { status: "success", message: "Logout successful" };
  }

  @ApiOperation({ summary: "Get a user profile by ID" })
  @ApiParam({ name: "userId", required: true, description: "User ID" })
  @ApiOkResponse({ type: AuthProfileResponseDto })
  @Get("profile/:userId?")
  async getProfile(@Param("userId") userId: string) {
    if (!userId) throw new UnauthorizedException("User ID is required");
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException("User not found");
    return {
      status: "success",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        role_id: user.role_id,
        full_name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        created_at: user.created_at,
        is_active: user.is_active,
      },
    };
  }

  @ApiOperation({ summary: "Update a user profile by ID" })
  @ApiParam({ name: "userId", required: true, description: "User ID" })
  @ApiBody({ type: UpdateProfileRequestDto })
  @ApiOkResponse({ type: AuthUserResponseDto })
  @Put("profile/:userId")
  async updateProfile(
    @Param("userId") userId: string,
    @Body() body: UpdateProfileRequestDto,
  ) {
    const updated = await this.usersService.updateProfile(userId, body);
    return {
      status: "success",
      message: "Profile updated successfully",
      user: {
        id: updated.id,
        username: updated.username,
        role: updated.role,
        role_id: updated.role_id,
        full_name:
          `${updated.first_name || ""} ${updated.last_name || ""}`.trim(),
        first_name: updated.first_name,
        last_name: updated.last_name,
        phone: updated.phone,
        updated_at: updated.updated_at,
        is_active: updated.is_active,
      },
    };
  }
}
