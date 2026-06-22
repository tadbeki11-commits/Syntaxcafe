"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MonitorSmartphoneIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  StoreIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { operatorLogin } from "@/lib/auth";
import { landingRoute } from "@/lib/permissions";
import {
  clearDeviceEnrollment,
  enrollDevice,
  getDeviceEnrollment,
  type DeviceEnrollment,
} from "@/lib/device";

/**
 * Enrollment QR codes encode the branch's plain enrollment code. Tolerate a
 * JSON wrapper ({ "code": "..." }) too, in case the admin format evolves.
 */
function extractCode(raw: string): string {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed.code === "string") return parsed.code.trim();
  } catch {
    /* not JSON — treat as a bare code */
  }
  return trimmed;
}

const HIGHLIGHTS = [
  {
    icon: StoreIcon,
    title: "Built for your branch",
    description: "Sign in scoped to the branch this device is set up for.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Secure by design",
    description: "Device enrollment keeps each branch's data isolated.",
  },
];

export default function BranchLoginPage() {
  const router = useRouter();

  // Device enrollment must happen before anyone can sign in here — the device
  // token pins this browser to a branch so the backend can resolve the operator.
  const [enrollment, setEnrollment] = useState<DeviceEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [scanning, setScanning] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEnrollment(getDeviceEnrollment());
  }, []);

  async function enroll(rawCode: string) {
    const trimmed = rawCode.trim();
    if (!trimmed || enrolling) return;
    setEnrolling(true);
    try {
      const result = await enrollDevice(trimmed, deviceName);
      setEnrollment(result);
      setCode("");
      setDeviceName("");
      toast.success("Device enrolled — you can now sign in.");
    } catch (err: any) {
      toast.error(err.message || "Enrollment failed");
    } finally {
      setEnrolling(false);
    }
  }

  function onEnroll(e: React.FormEvent) {
    e.preventDefault();
    enroll(code);
  }

  // A successful scan fills the code and immediately redeems it — point the
  // camera at the QR shown in the admin dashboard's Devices page.
  function onScan(results: IDetectedBarcode[]) {
    const raw = results?.[0]?.rawValue;
    if (!raw) return;
    const scanned = extractCode(raw).toUpperCase();
    setScanning(false);
    setCode(scanned);
    enroll(scanned);
  }

  function onChangeDevice() {
    clearDeviceEnrollment();
    setEnrollment(null);
    toast.success("Device removed — enter a new enrollment code.");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await operatorLogin(username.trim(), password);
      toast.success("Welcome back");
      router.push(landingRoute(user.role));
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Branding panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-zinc-950 p-12 text-zinc-50 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(60% 60% at 80% 0%, rgba(255,255,255,0.10) 0%, transparent 60%), radial-gradient(50% 50% at 0% 100%, rgba(255,255,255,0.06) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15">
            <Image
              src="/logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <span className="text-lg font-semibold tracking-tight">Syntax Branch</span>
        </div>

        <div className="relative space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              Run your branch from anywhere.
            </h1>
            <p className="max-w-md text-sm text-zinc-400">
              Set up this device once, then sign in to manage your
              branch&apos;s orders, menu, staff and reports.
            </p>
          </div>

          <div className="space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
                  <Icon className="size-4.5 text-zinc-100" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-100">{title}</p>
                  <p className="text-sm text-zinc-400">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-zinc-500">
          © {new Date().getFullYear()} Syntax. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-muted/30 p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center overflow-hidden rounded-xl bg-primary/10">
              <Image
                src="/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Syntax Branch
            </span>
          </div>

          {enrollment ? (
            <>
              <div className="mb-8 space-y-1.5">
                <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
                <p className="text-sm text-muted-foreground">
                  Branch admins and F&amp;B managers — sign in to your branch.
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      autoComplete="username"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <LockIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="px-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOffIcon className="size-4" />
                      ) : (
                        <EyeIcon className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <MonitorSmartphoneIcon className="size-4 shrink-0 text-emerald-600" />
                  <span className="text-muted-foreground">
                    This device
                    {enrollment.deviceName ? (
                      <span className="text-foreground"> · {enrollment.deviceName}</span>
                    ) : null}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onChangeDevice}
                  className="text-xs text-muted-foreground transition-colors hover:text-destructive"
                >
                  Change device
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8 space-y-1.5">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Set up this device
                </h2>
                <p className="text-sm text-muted-foreground">
                  Scan the QR code from your owner or admin — or enter the
                  enrollment code manually — to link this device to its branch.
                </p>
              </div>

              {scanning ? (
                <div className="mb-5 space-y-3">
                  <div className="overflow-hidden rounded-lg border bg-black">
                    <Scanner
                      onScan={onScan}
                      onError={() =>
                        toast.error(
                          "Couldn't access the camera. Allow camera access or enter the code manually.",
                        )
                      }
                      formats={["qr_code"]}
                      components={{ finder: true }}
                      styles={{ container: { width: "100%" } }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setScanning(false)}>
                    <XIcon className="size-4" />
                    Cancel scan
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  className="mb-5 w-full"
                  disabled={enrolling}
                  onClick={() => setScanning(true)}>
                  <QrCodeIcon className="size-4" />
                  Scan QR code
                </Button>
              )}

              {!scanning && (
                <div className="mb-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    or enter manually
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}

              <form onSubmit={onEnroll} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="enroll-code">Enrollment code</Label>
                  <Input
                    id="enroll-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A1B2C3D4E5F6"
                    autoComplete="off"
                    spellCheck={false}
                    autoFocus
                    className="text-center font-mono tracking-widest"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enroll-name">
                    Device name{" "}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="enroll-name"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="e.g. Manager Laptop"
                    autoComplete="off"
                  />
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={enrolling || !code.trim()}
                >
                  {enrolling ? "Enrolling…" : "Enroll device"}
                </Button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Owner or platform admin?{" "}
            <Link
              href="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in here
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Protected area · Authorized personnel only
          </p>
        </div>
      </div>
    </div>
  );
}
