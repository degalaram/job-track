import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { queryClient, apiRequest } from '@/lib/queryClient'
import { Header } from './Header'
import { TabNavigation } from './TabNavigation'
import { JobsTab } from './JobsTab'
import { TasksTab } from './TasksTab'
import { NotesTab } from './NotesTab'
import { ThemeProvider } from './ThemeProvider'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'

interface Task {
  id: string
  title: string
  company: string
  url?: string
  type: 'job-application' | 'follow-up' | 'interview' | 'other'
  completed: boolean
  addedDate: string
}

interface JobData {
  id: string
  url: string
  title: string
  company: string
  location: string
  type: string
  description: string
  postedDate: string
}

interface User {
  id: string
  username: string
  email: string
  password?: string
}

interface ProfileFormValues {
  fullName: string
  email: string
  currentPassword?: string
  newPassword?: string
}

function DailyTrackerContent() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'jobs' | 'tasks' | 'notes' | 'chatgpt'>('jobs')
  const [showEditProfile, setShowEditProfile] = useState(false)

  // Fetch user data
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  // Use React Query for tasks - this enables real-time sync via WebSocket
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  })

  const addTaskMutation = useMutation({
    mutationFn: async (newTaskData: Omit<Task, 'id'>) => {
      // apiRequest throws on !res.ok, so we only reach here on success
      const res = await apiRequest('POST', '/api/tasks', newTaskData)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] })
    },
  })

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await apiRequest('DELETE', `/api/jobs/${jobId}`)
      if (res.status !== 204) {
        return res.json()
      }
      return null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] })
    },
  })

  const handleAddToTasks = async (job: JobData) => {
    const newTaskData = {
      title: `Apply to ${job.title} position`,
      company: job.company,
      url: job.url,
      type: 'job-application' as const,
      completed: false,
      addedDate: 'just now'
    }

    try {
      await addTaskMutation.mutateAsync(newTaskData)
      await deleteJobMutation.mutateAsync(job.id)
      setActiveTab('tasks')
    } catch (error: any) {
      if (error.message && error.message.includes('Task with this URL already exists')) {
        toast({
          title: '✅ Application Already Added!',
          description: 'The job has already been added to your list.',
          className: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
        })
        return
      }
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add task',
      })
    }
  }

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await apiRequest('PUT', `/api/tasks/${id}`, { completed })
      if (!res.ok) {
        throw new Error('Failed to update task')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update task",
      });
    }
  })

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/tasks/${id}`)
      if (res.status !== 204) {
        return res.json()
      }
      return null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] })
    },
  })

  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    try {
      await toggleTaskMutation.mutateAsync({ id, completed: !task.completed })
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTaskMutation.mutateAsync(id)
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const updateProfileMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      const res = await apiRequest('PATCH', '/api/auth/user', userData)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] })
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update profile",
      });
    }
  })

  const handleProfileUpdate = async (data: ProfileFormValues) => {
    updateProfileMutation.mutate({
      username: data.fullName,
      email: data.email,
    })
  }

  const handlePasswordChange = async (data: ProfileFormValues) => {
    if (!data.currentPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your current password",
      });
      return;
    }

    if (!data.newPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a new password",
      });
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
      }

      toast({
        title: "Success",
        description: "Password changed successfully",
      });

      setShowEditProfile(false);
      profileForm.reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to change password",
      });
    }
  };

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(zod.object({
      fullName: zod.string().min(1, { message: "Full name is required" }),
      email: zod.string().email({ message: "Invalid email address" }),
      currentPassword: zod.string().optional(),
      newPassword: zod.string().optional(),
    })),
    defaultValues: {
      fullName: user?.username || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
    },
  });

  // Fetch user's current password for display
  const { data: userData } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    enabled: showEditProfile,
  });

  // Pre-fill with user data
  useEffect(() => {
    if (showEditProfile && user) {
      profileForm.reset({
        fullName: user.username || '',
        email: user.email || '',
        currentPassword: userData?.password || '',
        newPassword: '',
      });
    }
  }, [showEditProfile, user, userData]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-0 sm:px-4">
        {activeTab === 'jobs' && (
          <JobsTab onAddToTasks={handleAddToTasks} />
        )}
        {activeTab === 'tasks' && (
          <TasksTab
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
          />
        )}
        {activeTab === 'notes' && (
          <NotesTab />
        )}

        {/* Edit Profile Section */}
        {!showEditProfile && user && (
          <div className="mt-8 p-6 border rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <p className="text-gray-700 dark:text-gray-300">{user.username}</p>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <p className="text-gray-700 dark:text-gray-300">{user.email}</p>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <p className="text-gray-700 dark:text-gray-300 font-mono text-sm break-all">{user.password || '••••••••'}</p>
              </div>
            </div>
            <Button className="mt-4" onClick={() => setShowEditProfile(true)}>Edit Profile</Button>
          </div>
        )}

        {showEditProfile && (
          <div className="mt-8 p-6 border rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
            <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Full name"
                  {...profileForm.register("fullName")}
                />
                {profileForm.formState.errors.fullName && (
                  <p className="text-red-500 text-sm">{profileForm.formState.errors.fullName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="Email"
                  {...profileForm.register("email")}
                />
                {profileForm.formState.errors.email && (
                  <p className="text-red-500 text-sm">{profileForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
                </Button>
                <Button type="button" variant="outline" className="ml-2" onClick={() => setShowEditProfile(false)}>
                  Cancel
                </Button>
              </div>
            </form>

            <hr className="my-6 border-gray-200 dark:border-gray-700" />

            <h3 className="text-xl font-semibold mb-4">Change Password</h3>
            <form onSubmit={profileForm.handleSubmit(handlePasswordChange)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  type="password"
                  placeholder="Current password"
                  {...profileForm.register("currentPassword")}
                  readOnly
                  className="bg-muted/50"
                />
                {profileForm.formState.errors.currentPassword && (
                  <p className="text-red-500 text-sm">{profileForm.formState.errors.currentPassword.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  type="password"
                  placeholder="New password"
                  {...profileForm.register("newPassword")}
                />
                {profileForm.formState.errors.newPassword && (
                  <p className="text-red-500 text-sm">{profileForm.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}

export function DailyTracker() {
  return (
    <ThemeProvider>
      <DailyTrackerContent />
    </ThemeProvider>
  )
}

export default DailyTracker