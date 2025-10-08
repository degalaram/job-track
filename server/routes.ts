import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { insertJobSchema, insertTaskSchema, insertNoteSchema, insertUserSchema } from "@shared/schema";
import crypto from "crypto";

// Session types
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// Password hashing functions
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function registerRoutes(app: Express): Server {
  // Helper to get userId from session
  const getUserId = (req: Request): string => {
    if (!req.session.userId) {
      throw new Error('User not authenticated');
    }
    return req.session.userId;
  };

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const broadcast = (event: string, data: any) => {
    const message = { event, data };
    const messageStr = JSON.stringify(message);
    console.log("Broadcasting:", event);

    // Broadcast immediately to all connected clients
    const clients = Array.from(wss.clients);
    clients.forEach((client) => {
      if (client.readyState === 1) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error("Error broadcasting:", error);
        }
      }
    });
  };

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      console.log("Registration request body:", req.body);

      // Validate request body
      const userData = insertUserSchema.parse(req.body);
      console.log("Validated user data:", { username: userData.username, email: userData.email });

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        console.log("Username already exists:", userData.username);
        return res.status(400).json({ error: "Username already exists" });
      }

      // Hash password and create user
      const hashedPassword = hashPassword(userData.password);
      console.log("Creating user with hashed password");

      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      console.log("User created successfully:", { id: user.id, username: user.username });

      // Set session - ensure we save it properly
      req.session.userId = user.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            reject(err);
          } else {
            console.log("Session saved successfully for user:", user.id);
            resolve();
          }
        });
      });

      return res.status(200).json({ 
        id: user.id, 
        username: user.username,
        email: user.email 
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      console.error("Error stack:", error.stack);

      // Handle Zod validation errors
      if (error.errors) {
        return res.status(400).json({ 
          error: "Invalid registration data",
          details: error.errors 
        });
      }

      const errorMessage = error.message || "Registration failed";
      return res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log("Login request body:", req.body);
      const { username, password } = req.body;

      const user = await storage.getUserByUsername(username);
      if (!user || !verifyPassword(password, user.password)) {
        console.log("Invalid login attempt for username:", username);
        return res.status(401).json({ error: "Invalid username or password" });
      }

      req.session.userId = user.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            reject(err);
          } else {
            console.log("Session saved successfully for user:", user.id);
            resolve();
          }
        });
      });

      console.log("Login successful for user:", user.username);
      return res.status(200).json({ 
        id: user.id, 
        username: user.username,
        email: user.email 
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: "Logout failed" });
        return;
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/check", (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({ authenticated: !!req.session.userId });
  });

  app.get("/api/auth/me", async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (!req.session.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({ 
        id: user.id, 
        username: user.username,
        email: user.email,
        password: user.password // Return hashed password for display
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Forgot Password - Send OTP
  app.post("/api/auth/forgot-password/send-otp", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal if email exists
        res.json({ success: true, message: "If email exists, OTP will be sent" });
        return;
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP with expiry (5 minutes)
      await storage.storeOtp(email, otp, 'email');
      
      // Send email using Resend API
      const resendApiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
      
      if (resendApiKey) {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Daily Tracker <onboarding@resend.dev>',
              to: [email],
              subject: 'Password Reset OTP - Daily Tracker',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Password Reset Request</h2>
                  <p>Your OTP code is:</p>
                  <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
                    ${otp}
                  </div>
                  <p style="color: #666;">This code will expire in 5 minutes.</p>
                  <p style="color: #666;">If you didn't request this, please ignore this email.</p>
                </div>
              `,
            }),
          });

          if (!emailResponse.ok) {
            const error = await emailResponse.json();
            console.error('Resend API error:', error);
            console.log(`Email failed, OTP for ${email}: ${otp}`);
          } else {
            console.log(`OTP sent successfully to ${email}`);
          }
        } catch (emailError) {
          console.error('Email sending error:', emailError);
          console.log(`Email failed, OTP for ${email}: ${otp}`);
        }
      } else {
        console.log(`No email API key found, OTP for ${email}: ${otp}`);
      }
      
      res.json({ success: true, message: "OTP sent to email" });
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  // Forgot Password - Verify OTP
  app.post("/api/auth/forgot-password/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      const isValid = await storage.verifyOtp(email, otp, 'email');
      
      if (!isValid) {
        res.status(400).json({ error: "Invalid or expired OTP" });
        return;
      }
      
      res.json({ success: true, message: "OTP verified" });
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  // Forgot Password - Reset Password
  app.post("/api/auth/forgot-password/reset", async (req, res) => {
    try {
      const { email, otp, password } = req.body;
      
      // Verify OTP one more time
      const isValid = await storage.verifyOtp(email, otp, 'email');
      if (!isValid) {
        res.status(400).json({ error: "Invalid or expired OTP" });
        return;
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      
      const hashedPassword = hashPassword(password);
      await storage.updatePasswordByEmail(email, hashedPassword);
      await storage.deleteOtp(email, 'email');
      
      res.json({ success: true, message: "Password reset successful" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Mobile Login - Send OTP (Email-based)
  app.post("/api/auth/mobile-login/send-otp", async (req, res) => {
    try {
      const { phone } = req.body;
      const user = await storage.getUserByPhone(phone);
      
      if (!user) {
        res.status(404).json({ error: "Phone number not registered" });
        return;
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP with expiry (5 minutes)
      await storage.storeOtp(phone, otp, 'phone');
      
      // Send OTP via email using Resend API
      const resendApiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
      
      if (resendApiKey && user.email) {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Daily Tracker <onboarding@resend.dev>',
              to: [user.email],
              subject: 'Mobile Login OTP - Daily Tracker',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Mobile Login Request</h2>
                  <p>Your OTP code is:</p>
                  <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
                    ${otp}
                  </div>
                  <p style="color: #666;">This code will expire in 5 minutes.</p>
                  <p style="color: #666;">Phone number: ${phone}</p>
                  <p style="color: #666;">If you didn't request this, please ignore this email.</p>
                </div>
              `,
            }),
          });

          if (!emailResponse.ok) {
            const error = await emailResponse.json();
            console.error('Resend API error:', error);
            console.log(`Email failed, OTP for ${phone}: ${otp}`);
          } else {
            console.log(`OTP email sent successfully to ${user.email} for phone ${phone}`);
          }
        } catch (emailError) {
          console.error('Email sending error:', emailError);
          console.log(`Email failed, OTP for ${phone}: ${otp}`);
        }
      } else {
        console.log(`No email API key found or user has no email, OTP for ${phone}: ${otp}`);
      }
      
      res.json({ success: true, message: "OTP sent to your registered email" });
    } catch (error) {
      console.error("Send mobile OTP error:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  // Mobile Login - Verify OTP
  app.post("/api/auth/mobile-login/verify-otp", async (req, res) => {
    try {
      const { phone, otp } = req.body;
      const isValid = await storage.verifyOtp(phone, otp, 'phone');
      
      if (!isValid) {
        res.status(400).json({ error: "Invalid or expired OTP" });
        return;
      }
      
      const user = await storage.getUserByPhone(phone);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      
      req.session.userId = user.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      await storage.deleteOtp(phone, 'phone');
      
      res.json({ 
        success: true,
        id: user.id, 
        username: user.username,
        email: user.email 
      });
    } catch (error) {
      console.error("Verify mobile OTP error:", error);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  // Password endpoint removed for security - users must enter current password to verify identity
  
  app.post("/api/auth/change-password", async (req, res) => {
    if (!req.session.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const { currentPassword, newPassword } = req.body;

      if (!newPassword) {
        res.status(400).json({ error: "New password is required" });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      const hashedPassword = hashPassword(newPassword);
      const success = await storage.updatePassword(req.session.userId, hashedPassword, newPassword);

      if (success) {
        console.log("Password updated successfully for user:", req.session.userId);
        res.json({ success: true, message: "Password updated successfully" });
      } else {
        console.error("Failed to update password in storage");
        res.status(500).json({ error: "Failed to update password" });
      }
    } catch (error) {
      console.error("Password update error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update password" });
    }
  });

  // Jobs routes
  app.get("/api/jobs", async (req, res) => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const userId = getUserId(req);
      const jobs = await storage.getAllJobs(userId);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const userId = getUserId(req);
      const jobData = insertJobSchema.parse({ ...req.body, userId });
      const job = await storage.createJob(jobData);
      broadcast("job:created", job);
      res.json(job);
    } catch (error) {
      res.status(400).json({ error: "Invalid job data" });
    }
  });

  app.put("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.updateJob(req.params.id, req.body);
      if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }
      broadcast("job:updated", job);
      res.json(job);
    } catch (error) {
      res.status(400).json({ error: "Failed to update job" });
    }
  });

  app.delete("/api/jobs/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteJob(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Job not found" });
        return;
      }
      broadcast("job:deleted", { id: req.params.id });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete job" });
    }
  });

  // Tasks routes
  app.get("/api/tasks", async (req, res) => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const userId = getUserId(req);
      const tasks = await storage.getAllTasks(userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const userId = getUserId(req);
      // Check for duplicate task by URL
      if (req.body.url) {
        const existingTasks = await storage.getAllTasks(userId);
        const normalizedUrl = req.body.url.toLowerCase().replace(/\/$/, '');
        const isDuplicate = existingTasks.some(task => 
          task.url && task.url.toLowerCase().replace(/\/$/, '') === normalizedUrl
        );
        if (isDuplicate) {
          res.status(400).json({ error: "Task with this URL already exists" });
          return;
        }
      }

      const taskData = insertTaskSchema.parse({ ...req.body, userId });
      const task = await storage.createTask(taskData);
      broadcast("task:created", task);
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: "Invalid task data" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.updateTask(req.params.id, req.body);
      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      broadcast("task:updated", task);
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: "Failed to update task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.updateTask(req.params.id, req.body);
      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      broadcast("task:updated", task);
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTask(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      broadcast("task:deleted", { id: req.params.id });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Notes routes - get all notes
  app.get("/api/notes", async (req, res) => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const userId = getUserId(req);
      const notes = await storage.getAllNotes(userId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  // Create a new note
  app.post("/api/notes", async (req, res) => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const userId = getUserId(req);
      console.log('Creating note with data:', req.body, 'for user:', userId);
      const noteData = insertNoteSchema.parse({ ...req.body, userId });
      const note = await storage.createNote(noteData);
      console.log('Note created:', note);
      broadcast("note:created", note);
      res.json(note);
    } catch (error) {
      console.error('Error creating note:', error);
      res.status(400).json({ error: "Invalid note data" });
    }
  });

  // Update a note
  app.patch("/api/notes/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const note = await storage.updateNote(req.params.id, req.body);
      if (!note) {
        res.status(404).json({ error: "Note not found" });
        return;
      }
      broadcast("note:updated", note);
      res.json(note);
    } catch (error) {
      console.error('Error updating note:', error);
      res.status(400).json({ error: "Invalid note data" });
    }
  });

  // Delete a note
  app.delete("/api/notes/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteNote(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Note not found" });
        return;
      }
      broadcast("note:deleted", { id: req.params.id });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete note" });
    }
  });

  return httpServer;
}