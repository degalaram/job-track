
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Phone, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import "../styles/auth.css";

const phoneSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
});

type PhoneForm = z.infer<typeof phoneSchema>;

export default function MobileLoginPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { refetchAuth } = useAuth();

  const phoneForm = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (data: PhoneForm) => {
      const response = await fetch("/api/auth/mobile-login/send-otp", {
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
      setPhone(variables.phone);
      setStep("otp");
      toast({
        title: "OTP Sent to Email",
        description: "Please check your registered email for the verification code",
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
      const response = await fetch("/api/auth/mobile-login/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone, otp: otpValue }),
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      return response.json();
    },
    onSuccess: async () => {
      await refetchAuth();
      setTimeout(() => {
        setLocation("/");
      }, 100);
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

        <div className="form-box Login" style={{ width: "100%", position: "relative" }}>
          <Button
            variant="ghost"
            onClick={() => setLocation("/auth")}
            className="absolute top-4 left-4 z-10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>

          {step === "phone" && (
            <>
              <h2 className="animation" style={{ "--D": 0, "--S": 21 } as any}>
                Mobile Login
              </h2>
              <p className="text-sm text-muted-foreground mb-4 animation" style={{ "--D": 1, "--S": 22 } as any}>
                OTP will be sent to your registered email
              </p>
              <form onSubmit={phoneForm.handleSubmit((data) => sendOtpMutation.mutate(data))}>
                <div className="input-box animation" style={{ "--D": 2, "--S": 23 } as any}>
                  <input
                    type="text"
                    {...phoneForm.register("phone")}
                    required
                  />
                  <label>Phone Number</label>
                  <Phone className="icon" size={18} />
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
              <h2 className="animation" style={{ "--D": 0, "--S": 21 } as any}>
                Enter Verification Code
              </h2>
              <p className="text-sm text-muted-foreground mb-4 animation" style={{ "--D": 1, "--S": 22 } as any}>
                Check your email for the 6-digit code (Phone: {phone})
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
                  onClick={() => sendOtpMutation.mutate({ phone })}
                  disabled={sendOtpMutation.isPending}
                >
                  {sendOtpMutation.isPending ? "Resending..." : "Resend OTP"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
