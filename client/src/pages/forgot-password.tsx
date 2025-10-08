
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import "../styles/auth.css";

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type EmailForm = z.infer<typeof emailSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "otp" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
  });

  const resetForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (data: EmailForm) => {
      const response = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      setEmail(variables.email);
      setStep("otp");
      toast({
        title: "OTP Sent",
        description: "Please check your email for the verification code",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to send OTP",
        description: error.message,
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (otpValue: string) => {
      const response = await fetch("/api/auth/forgot-password/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp: otpValue }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      return response.json();
    },
    onSuccess: () => {
      setStep("reset");
      toast({
        title: "OTP Verified",
        description: "Please enter your new password",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Invalid OTP",
        description: error.message,
      });
      setOtp("");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordForm) => {
      const response = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        body: JSON.stringify({ email, otp, password: data.password }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Reset Successful",
        description: "You can now login with your new password",
      });
      setLocation("/auth");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to reset password",
        description: error.message,
      });
    },
  });

  const handleOtpComplete = (value: string) => {
    setOtp(value);
    if (value.length === 6) {
      verifyOtpMutation.mutate(value);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="curved-shape"></div>
        <div className="curved-shape2"></div>

        <div className="form-box Login" style={{ width: "100%", position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 30px" }}>
          <Button
            variant="ghost"
            onClick={() => setLocation("/auth")}
            className="absolute top-4 left-4 z-10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>

          {step === "email" && (
            <>
              <h2 className="animation text-center" style={{ "--D": 0, "--S": 21 } as any}>
                Forgot Password
              </h2>
              <p className="text-sm text-muted-foreground mb-4 text-center animation" style={{ "--D": 1, "--S": 22 } as any}>
                Enter your email to receive a verification code
              </p>
              <form onSubmit={emailForm.handleSubmit((data) => sendOtpMutation.mutate(data))}>
                <div className="input-box animation" style={{ "--D": 2, "--S": 23 } as any}>
                  <input
                    type="email"
                    {...emailForm.register("email")}
                    required
                  />
                  <label>Email Address</label>
                  <Mail className="icon" size={18} style={{ right: '10px', top: '50%', transform: 'translateY(-50%)', position: 'absolute' }} />
                </div>

                <div className="input-box animation" style={{ "--D": 3, "--S": 24 } as any}>
                  <button
                    className="btn"
                    type="submit"
                    disabled={sendOtpMutation.isPending}
                  >
                    {sendOtpMutation.isPending ? "Sending OTP..." : "Send OTP"}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <h2 className="animation text-center" style={{ "--D": 0, "--S": 21 } as any}>
                Enter Verification Code
              </h2>
              <p className="text-sm text-muted-foreground mb-4 text-center animation" style={{ "--D": 1, "--S": 22 } as any}>
                We sent a 6-digit code to {email}
              </p>
              <div className="flex justify-center mb-6 animation" style={{ "--D": 2, "--S": 23 } as any}>
                <InputOTP maxLength={6} value={otp} onChange={handleOtpComplete}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="input-box animation" style={{ "--D": 3, "--S": 24 } as any}>
                <button
                  className="btn"
                  onClick={() => sendOtpMutation.mutate({ email })}
                  disabled={sendOtpMutation.isPending}
                >
                  {sendOtpMutation.isPending ? "Resending..." : "Resend OTP"}
                </button>
              </div>
            </>
          )}

          {step === "reset" && (
            <>
              <h2 className="animation text-center" style={{ "--D": 0, "--S": 21 } as any}>
                Reset Password
              </h2>
              <form onSubmit={resetForm.handleSubmit((data) => resetPasswordMutation.mutate(data))}>
                <div className="input-box animation" style={{ "--D": 1, "--S": 22 } as any}>
                  <input
                    type={showPassword ? "text" : "password"}
                    {...resetForm.register("password")}
                    required
                  />
                  <label>New Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="input-box animation" style={{ "--D": 2, "--S": 23 } as any}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    {...resetForm.register("confirmPassword")}
                    required
                  />
                  <label>Confirm Password</label>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="password-toggle"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="input-box animation" style={{ "--D": 3, "--S": 24 } as any}>
                  <button
                    className="btn"
                    type="submit"
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
