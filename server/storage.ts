import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { users, jobs, tasks, notes, otpCodes, type User, type Job, type Task, type Note, type InsertUser, type InsertJob, type InsertTask, type InsertNote } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { nanoid } from "nanoid"; // Assuming nanoid is available for generating IDs

neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = false;
neonConfig.pipelineConnect = false;

// Setup Neon database connection with WebSocket polyfill
let db: ReturnType<typeof drizzle> | null = null;
let useInMemoryStorage = false;

try {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    db = drizzle({ client: pool });
    console.log('✅ Database connection initialized - Data will persist permanently');
  } else {
    console.warn('⚠️ WARNING: DATABASE_URL not set! Data will NOT persist. Please provision a database.');
    useInMemoryStorage = true;
  }
} catch (error) {
  console.error('❌ Database connection failed:', error);
  console.warn('⚠️ Using in-memory storage - Data will be lost on restart!');
  useInMemoryStorage = true;
}

// In-memory storage fallback
const memoryStore: {
  users: Map<string, User>;
  jobs: Map<string, Job>;
  tasks: Map<string, Task>;
  notes: Map<string, Note>;
  passwords: Map<string, string>; // Added to store passwords
  otpCodes: Map<string, { identifier: string; otp: string; type: 'email' | 'phone'; expiresAt: Date }>; // Added for in-memory OTP storage
} = {
  users: new Map(),
  jobs: new Map(),
  tasks: new Map(),
  notes: new Map(),
  passwords: new Map(), // Initialize passwords map
  otpCodes: new Map(), // Initialize OTP codes map
};

export interface IStorage {
  // Users
  createUser(user: InsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getOriginalPassword(userId: string): Promise<string | undefined>;
  updatePassword(userId: string, hashedPassword: string, newPassword?: string): Promise<boolean>;
  updatePasswordByEmail(email: string, hashedPassword: string): Promise<boolean>;

  // OTP
  storeOtp(identifier: string, otp: string, type: 'email' | 'phone'): Promise<void>;
  verifyOtp(identifier: string, otp: string, type: 'email' | 'phone'): Promise<boolean>;
  deleteOtp(identifier: string, type: 'email' | 'phone'): Promise<void>;


  // Jobs
  getAllJobs(userId: string): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: string): Promise<boolean>;

  // Tasks
  getAllTasks(userId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  // Notes
  getAllNotes(userId: string): Promise<Note[]>;
  createNote(noteData: InsertNote): Promise<Note>;
  updateNote(id: string, noteData: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  private db = db; // Use the initialized db instance
  private useInMemoryStorage = useInMemoryStorage; // Use the initialized flag
  private otpStore = memoryStore.otpCodes; // Alias for in-memory OTP storage

  // Users
  async createUser(user: InsertUser): Promise<User> {
    if (!this.db || this.useInMemoryStorage) {
      const newUser: User = {
        id: randomUUID(),
        username: user.username,
        email: user.email,
        phone: user.phone ?? '',
        password: user.password
      };
      memoryStore.users.set(newUser.id, newUser);
      // Store original password in memory for retrieval
      memoryStore.passwords.set(newUser.id, user.password);
      console.log("User created in memory:", { id: newUser.id, username: newUser.username });
      return newUser;
    }

    try {
      console.log("Inserting user into database:", { username: user.username, email: user.email });
      const [newUser] = await this.db.insert(users).values(user).returning();
      // Store original password in memory for retrieval
      memoryStore.passwords.set(newUser.id, user.password);
      console.log("User inserted successfully:", { id: newUser.id, username: newUser.username });
      return newUser;
    } catch (error: any) {
      console.error("Database error creating user, falling back to memory:", error);
      this.useInMemoryStorage = true;
      const newUser: User = {
        id: randomUUID(),
        username: user.username,
        email: user.email,
        phone: user.phone ?? '',
        password: user.password
      };
      memoryStore.users.set(newUser.id, newUser);
      // Store original password in memory for retrieval
      memoryStore.passwords.set(newUser.id, user.password);
      return newUser;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!this.db || this.useInMemoryStorage) {
      return Array.from(memoryStore.users.values()).find(u => u.username === username);
    }

    try {
      const [user] = await this.db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Database error getting user, falling back to memory:", error);
      this.useInMemoryStorage = true;
      return Array.from(memoryStore.users.values()).find(u => u.username === username);
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!this.db || this.useInMemoryStorage) {
      return Array.from(memoryStore.users.values()).find(u => u.email === email);
    }

    try {
      const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
      return user;
    } catch (error) {
      console.error("Database error getting user by email, falling back to memory:", error);
      this.useInMemoryStorage = true;
      return Array.from(memoryStore.users.values()).find(u => u.email === email);
    }
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    if (!this.db || this.useInMemoryStorage) {
      return Array.from(memoryStore.users.values()).find(u => u.phone === phone);
    }

    try {
      const [user] = await this.db.select().from(users).where(eq(users.phone, phone)).limit(1);
      return user;
    } catch (error) {
      console.error("Database error getting user by phone, falling back to memory:", error);
      this.useInMemoryStorage = true;
      return Array.from(memoryStore.users.values()).find(u => u.phone === phone);
    }
  }

  async getUserById(id: string): Promise<User | undefined> {
    if (!this.db || this.useInMemoryStorage) {
      // Return original password if available in memory
      const originalPassword = memoryStore.passwords.get(id);
      const user = memoryStore.users.get(id);
      if (user && originalPassword) {
        return { ...user, password: originalPassword };
      }
      return user;
    }

    try {
      const [user] = await this.db.select().from(users).where(eq(users.id, id));
      if (user) {
        // Return original password if available in memory
        const originalPassword = memoryStore.passwords.get(id);
        if (originalPassword) {
          return { ...user, password: originalPassword };
        }
      }
      return user;
    } catch (error) {
      console.error("Database error getting user, falling back to memory:", error);
      this.useInMemoryStorage = true;
      // Return original password if available in memory
      const originalPassword = memoryStore.passwords.get(id);
      const user = memoryStore.users.get(id);
      if (user && originalPassword) {
        return { ...user, password: originalPassword };
      }
      return user;
    }
  }

  async getOriginalPassword(userId: string): Promise<string | undefined> {
    return memoryStore.passwords.get(userId);
  }

  async updatePassword(userId: string, hashedPassword: string, newPassword?: string): Promise<boolean> {
    if (!this.db || this.useInMemoryStorage) {
      const user = memoryStore.users.get(userId);
      if (user) {
        user.password = hashedPassword;
        if (newPassword) {
          memoryStore.passwords.set(userId, newPassword);
        }
        return true;
      }
      return false;
    }

    try {
      const result = await this.db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId))
        .returning();

      if (result.length > 0) {
        if (newPassword) {
          memoryStore.passwords.set(userId, newPassword);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Database error updating password, falling back to memory:", error);
      this.useInMemoryStorage = true;
      const user = memoryStore.users.get(userId);
      if (user) {
        user.password = hashedPassword;
        if (newPassword) {
          memoryStore.passwords.set(userId, newPassword);
        }
        return true;
      }
      return false;
    }
  }

  async updatePasswordByEmail(email: string, hashedPassword: string): Promise<boolean> {
    if (!this.db || this.useInMemoryStorage) {
      const user = Array.from(memoryStore.users.values()).find(u => u.email === email);
      if (user) {
        user.password = hashedPassword;
        return true;
      }
      return false;
    }

    try {
      const result = await this.db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.email, email));
      return result.length > 0;
    } catch (error) {
      console.error("Database error updating password by email, falling back to memory:", error);
      this.useInMemoryStorage = true;
      const user = Array.from(memoryStore.users.values()).find(u => u.email === email);
      if (user) {
        user.password = hashedPassword;
        return true;
      }
      return false;
    }
  }

  // OTP Storage Methods
  async storeOtp(identifier: string, otp: string, type: 'email' | 'phone'): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      if (this.db) {
        try {
          // Delete any existing OTP for this identifier
          await this.db.delete(otpCodes)
            .where(
              and(
                eq(otpCodes.identifier, identifier),
                eq(otpCodes.type, type)
              )
            );

          // Insert new OTP
          await this.db.insert(otpCodes).values({
            identifier,
            otp,
            type,
            expiresAt,
          });
          console.log(`OTP stored in database for ${identifier} (${type}): ${otp}`);
          return;
        } catch (dbError) {
          console.error('Database error storing OTP, using memory fallback:', dbError);
        }
      }

      // In-memory fallback
      this.otpStore.set(`${identifier}:${type}`, { otp, expiresAt });
      console.log(`OTP stored in memory for ${identifier} (${type}): ${otp}`);
    } catch (error) {
      console.error('Error storing OTP:', error);
      // Fallback to in-memory
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      this.otpStore.set(`${identifier}:${type}`, { otp, expiresAt });
      console.log(`OTP stored in memory for ${identifier} (${type}): ${otp}`);
    }
  }

  async verifyOtp(identifier: string, otp: string, type: 'email' | 'phone'): Promise<boolean> {
    try {
      if (this.db) {
        try {
          const result = await this.db.select()
            .from(otpCodes)
            .where(
              and(
                eq(otpCodes.identifier, identifier),
                eq(otpCodes.type, type),
                eq(otpCodes.otp, otp)
              )
            )
            .limit(1);

          if (result.length > 0) {
            const otpRecord = result[0];
            // Check if OTP is expired
            if (new Date() > otpRecord.expiresAt) {
              await this.deleteOtp(identifier, type);
              console.log(`OTP expired for ${identifier} (${type})`);
              return false;
            }
            console.log(`OTP verified successfully for ${identifier} (${type})`);
            return true;
          }
          console.log(`No OTP found in database for ${identifier} (${type}), checking memory`);
        } catch (dbError) {
          console.error('Database error verifying OTP, checking memory fallback:', dbError);
        }
      }

      // In-memory fallback
      const stored = this.otpStore.get(`${identifier}:${type}`);
      if (!stored) {
        console.log(`No OTP found in memory for ${identifier} (${type})`);
        return false;
      }

      if (new Date() > stored.expiresAt) {
        this.otpStore.delete(`${identifier}:${type}`);
        console.log(`OTP expired in memory for ${identifier} (${type})`);
        return false;
      }

      const isValid = stored.otp === otp;
      console.log(`OTP ${isValid ? 'verified' : 'invalid'} in memory for ${identifier} (${type})`);
      return isValid;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return false;
    }
  }

  async deleteOtp(identifier: string, type: 'email' | 'phone'): Promise<void> {
    if (!this.db || this.useInMemoryStorage) {
      memoryStore.otpCodes.delete(`${identifier}-${type}`);
      return;
    }

    try {
      await this.db
        .delete(otpCodes)
        .where(
          and(
            eq(otpCodes.identifier, identifier),
            eq(otpCodes.type, type)
          )
        );
    } catch (error) {
      console.error("Database error deleting OTP, falling back to memory:", error);
      this.useInMemoryStorage = true;
      memoryStore.otpCodes.delete(`${identifier}-${type}`);
    }
  }


  // Jobs
  async getAllJobs(userId: string = 'default-user'): Promise<Job[]> {
    if (!this.db || this.useInMemoryStorage) {
      return Array.from(memoryStore.jobs.values())
        .filter(j => j.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    try {
      return await this.db.select().from(jobs).where(eq(jobs.userId, userId)).orderBy(desc(jobs.createdAt));
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      return Array.from(memoryStore.jobs.values())
        .filter(j => j.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  }

  async createJob(job: InsertJob): Promise<Job> {
    if (!this.db || this.useInMemoryStorage) {
      const newJob: Job = {
        ...job,
        id: randomUUID(),
        userId: job.userId || 'default-user',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.jobs.set(newJob.id, newJob);
      return newJob;
    }

    try {
      const [newJob] = await this.db.insert(jobs).values(job).returning();
      return newJob;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      const newJob: Job = {
        ...job,
        id: randomUUID(),
        userId: job.userId || 'default-user',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.jobs.set(newJob.id, newJob);
      return newJob;
    }
  }

  async updateJob(id: string, jobUpdate: Partial<InsertJob>): Promise<Job | undefined> {
    if (!this.db || this.useInMemoryStorage) {
      const job = memoryStore.jobs.get(id);
      if (!job) return undefined;
      const updated = { ...job, ...jobUpdate, updatedAt: new Date() };
      memoryStore.jobs.set(id, updated);
      return updated;
    }

    try {
      const [updated] = await this.db.update(jobs)
        .set({ ...jobUpdate, updatedAt: new Date() })
        .where(eq(jobs.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      const job = memoryStore.jobs.get(id);
      if (!job) return undefined;
      const updated = { ...job, ...jobUpdate, updatedAt: new Date() };
      memoryStore.jobs.set(id, updated);
      return updated;
    }
  }

  async deleteJob(id: string): Promise<boolean> {
    if (!this.db || this.useInMemoryStorage) {
      return memoryStore.jobs.delete(id);
    }

    try {
      const result = await this.db.delete(jobs).where(eq(jobs.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      return memoryStore.jobs.delete(id);
    }
  }

  // Tasks
  async getAllTasks(userId: string = 'default-user'): Promise<Task[]> {
    if (!this.db || this.useInMemoryStorage) {
      return Array.from(memoryStore.tasks.values())
        .filter(t => t.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    try {
      return await this.db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt));
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      return Array.from(memoryStore.tasks.values())
        .filter(t => t.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  }

  async createTask(task: InsertTask): Promise<Task> {
    if (!this.db || this.useInMemoryStorage) {
      const newTask: Task = {
        ...task,
        id: randomUUID(),
        userId: task.userId || 'default-user',
        url: task.url ?? null,
        completed: task.completed ?? false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.tasks.set(newTask.id, newTask);
      return newTask;
    }

    try {
      const [newTask] = await this.db.insert(tasks).values(task).returning();
      return newTask;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      const newTask: Task = {
        ...task,
        id: randomUUID(),
        userId: task.userId || 'default-user',
        url: task.url ?? null,
        completed: task.completed ?? false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.tasks.set(newTask.id, newTask);
      return newTask;
    }
  }

  async updateTask(id: string, taskUpdate: Partial<InsertTask>): Promise<Task | undefined> {
    if (!this.db || this.useInMemoryStorage) {
      const task = memoryStore.tasks.get(id);
      if (!task) return undefined;
      const updated = { ...task, ...taskUpdate, updatedAt: new Date() };
      memoryStore.tasks.set(id, updated);
      return updated;
    }

    try {
      const [updated] = await this.db.update(tasks)
        .set({ ...taskUpdate, updatedAt: new Date() })
        .where(eq(tasks.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      const task = memoryStore.tasks.get(id);
      if (!task) return undefined;
      const updated = { ...task, ...taskUpdate, updatedAt: new Date() };
      memoryStore.tasks.set(id, updated);
      return updated;
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    if (!this.db || this.useInMemoryStorage) {
      return memoryStore.tasks.delete(id);
    }

    try {
      const result = await this.db.delete(tasks).where(eq(tasks.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      return memoryStore.tasks.delete(id);
    }
  }

  // Notes
  async getAllNotes(userId: string = 'default-user'): Promise<Note[]> {
    if (!this.db || this.useInMemoryStorage) {
      return Array.from(memoryStore.notes.values())
        .filter(n => n.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    try {
      const result = await this.db
        .select()
        .from(notes)
        .where(eq(notes.userId, userId))
        .orderBy(desc(notes.createdAt));
      return result;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      return Array.from(memoryStore.notes.values())
        .filter(n => n.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  }

  async createNote(noteData: InsertNote): Promise<Note> {
    if (!this.db || this.useInMemoryStorage) {
      const newNote: Note = {
        ...noteData,
        id: randomUUID(),
        userId: noteData.userId || 'default-user',
        title: noteData.title || '',
        content: noteData.content || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.notes.set(newNote.id, newNote);
      return newNote;
    }

    try {
      const created = await this.db
        .insert(notes)
        .values(noteData)
        .returning();
      return created[0];
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      const newNote: Note = {
        ...noteData,
        id: randomUUID(),
        userId: noteData.userId || 'default-user',
        title: noteData.title || '',
        content: noteData.content || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.notes.set(newNote.id, newNote);
      return newNote;
    }
  }

  async updateNote(id: string, noteData: Partial<InsertNote>): Promise<Note | undefined> {
    if (!this.db || this.useInMemoryStorage) {
      const existing = memoryStore.notes.get(id);
      if (!existing) return undefined;
      const updated: Note = {
        ...existing,
        ...noteData,
        updatedAt: new Date()
      };
      memoryStore.notes.set(id, updated);
      return updated;
    }

    try {
      const result = await this.db
        .update(notes)
        .set({ ...noteData, updatedAt: new Date() })
        .where(eq(notes.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      const existing = memoryStore.notes.get(id);
      if (!existing) return undefined;
      const updated: Note = {
        ...existing,
        ...noteData,
        updatedAt: new Date()
      };
      memoryStore.notes.set(id, updated);
      return updated;
    }
  }

  async deleteNote(id: string): Promise<boolean> {
    if (!this.db || this.useInMemoryStorage) {
      return memoryStore.notes.delete(id);
    }

    try {
      const result = await this.db
        .delete(notes)
        .where(eq(notes.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Database error, using memory:", error);
      this.useInMemoryStorage = true;
      return memoryStore.notes.delete(id);
    }
  }
}

export const storage = new DatabaseStorage();