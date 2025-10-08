import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User, Lock, Mail, Phone, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import "../styles/auth.css";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isActive, setIsActive] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { refetchAuth } = useAuth();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
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
      // Force immediate auth refetch before navigation
      await refetchAuth();
      // Add a small delay to ensure auth state is updated
      setTimeout(() => {
        setLocation("/");
      }, 100);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid username or password",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
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
      toast({
        title: "Success",
        description: "Account created successfully!",
      });
      // Force immediate auth refetch and wait for it
      await refetchAuth();
      // Wait a bit longer to ensure state propagates
      await new Promise(resolve => setTimeout(resolve, 200));
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "Failed to create account",
      });
    },
  });

  const onLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="auth-page">
      <div className={`auth-container ${isActive ? "active" : ""}`}>
        <div className="curved-shape"></div>
        <div className="curved-shape2"></div>

        {/* Login Form */}
        <div className="form-box Login">
          <h2 className="animation" style={{ "--D": 0, "--S": 21 } as any}>
            Login
          </h2>
          <form onSubmit={loginForm.handleSubmit(onLogin)}>
            <div className="input-box animation" style={{ "--D": 1, "--S": 22 } as any}>
              <input
                type="text"
                {...loginForm.register("username")}
                required
                data-testid="input-login-username"
              />
              <label>Username</label>
            </div>

            <div className="input-box animation" style={{ "--D": 2, "--S": 23 } as any}>
              <input
                type={showLoginPassword ? "text" : "password"}
                {...loginForm.register("password")}
                required
                data-testid="input-login-password"
              />
              <label>Password</label>
              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                className="password-toggle"
                aria-label="Toggle password visibility"
              >
                {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="input-box animation" style={{ "--D": 3, "--S": 24 } as any}>
              <button 
                className="btn" 
                type="submit" 
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </button>
            </div>

            <div className="regi-link animation" style={{ "--D": 4, "--S": 25 } as any}>
              <p>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation("/forgot-password");
                  }}
                  className="text-primary hover:underline"
                >
                  Forgot Password?
                </a>
                <br />
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation("/mobile-login");
                  }}
                  className="text-primary hover:underline"
                >
                  Login with Mobile OTP
                </a>
                <br />
                Don't have an account? <br />
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsActive(true);
                  }}
                  data-testid="link-to-register"
                >
                  Sign Up
                </a>
              </p>
            </div>
          </form>
        </div>

        <div className="info-content Login">
          <h2 className="animation" style={{ "--D": 0, "--S": 20 } as any}>
            WELCOME BACK!
          </h2>
          <p className="animation" style={{ "--D": 1, "--S": 21 } as any}>
            We are happy to have you with us again. If you need anything, we are here to help.
          </p>
        </div>

        {/* Register Form */}
        <div className="form-box Register">
          <h2 className="animation" style={{ "--li": 17, "--S": 0 } as any}>
            Register
          </h2>
          <form onSubmit={registerForm.handleSubmit(onRegister)}>
            <div className="input-box animation" style={{ "--li": 18, "--S": 1 } as any}>
              <input
                type="text"
                {...registerForm.register("username")}
                required
                data-testid="input-register-username"
              />
              <label>Username</label>
            </div>

            <div className="input-box animation" style={{ "--li": 19, "--S": 2 } as any}>
              <input
                type="email"
                {...registerForm.register("email")}
                required
                data-testid="input-register-email"
              />
              <label>Email</label>
            </div>

            <div className="input-box animation" style={{ "--li": 19, "--S": 3 } as any}>
              <input
                type={showRegisterPassword ? "text" : "password"}
                {...registerForm.register("password")}
                required
                data-testid="input-register-password"
              />
              <label>Password</label>
              <button
                type="button"
                onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                className="password-toggle"
                aria-label="Toggle password visibility"
              >
                {showRegisterPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="input-box animation" style={{ "--li": 19, "--S": 4 } as any}>
              <input
                type="text"
                {...registerForm.register("phone")}
                required
                data-testid="input-register-phone"
              />
              <label>Phone Number</label>
            </div>

            <div className="input-box animation" style={{ "--li": 20, "--S": 5 } as any}>
              <button 
                className="btn" 
                type="submit" 
                disabled={registerMutation.isPending}
                data-testid="button-register"
              >
                {registerMutation.isPending ? "Creating account..." : "Register"}
              </button>
            </div>

            <div className="regi-link animation" style={{ "--li": 21, "--S": 6 } as any}>
              <p>
                Already have an account? <br />
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsActive(false);
                  }}
                  data-testid="link-to-login"
                >
                  Sign In
                </a>
              </p>
            </div>
          </form>
        </div>

        <div className="info-content Register">
          <h2 className="animation" style={{ "--li": 17, "--S": 0 } as any}>
            WELCOME!
          </h2>
          <p className="animation" style={{ "--li": 18, "--S": 1 } as any}>
            We're delighted to have you here. If you need any assistance, feel free to reach out.
          </p>
        </div>
      </div>
    </div>
  );
}
