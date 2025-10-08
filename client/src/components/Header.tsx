import { Moon, Sun, LogOut, Settings, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from './ThemeProvider'
import logoImage from '@assets/image_1758850436132.png'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiRequest } from '@/lib/queryClient'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useEffect } from 'react'

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { toast } = useToast()
  const { logout } = useAuth()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Added state for confirm password visibility

  const { data: userData } = useQuery<{ id: string; username: string; email: string; password: string }>({
    queryKey: ['/api/auth/me'],
    enabled: isSettingsOpen,
  })

  const updatePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest('POST', '/api/auth/change-password', { 
        currentPassword: userData?.password || '',
        newPassword: password 
      })
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully",
      })
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      })
    }
  })

  useEffect(() => {
    if (isSettingsOpen) {
      const storedName = localStorage.getItem('fullName') || '';
      const storedEmail = localStorage.getItem('email') || '';
      setFullName(storedName);
      setEmail(storedEmail);
      setNewPassword('');
      setConfirmPassword(''); // Clear passwords when opening settings
      setShowNewPassword(false);
      setShowConfirmPassword(false); // Reset password visibility
    }
  }, [isSettingsOpen]);

  const handleSaveChanges = async () => {
    try {
      // Validate password fields if any password field is filled
      if (newPassword || confirmPassword) {
        // Don't trim - compare exact values
        if (!newPassword) {
          toast({
            title: "Password Required",
            description: "Please enter a new password",
            variant: "destructive",
          });
          return;
        }
        
        if (!confirmPassword) {
          toast({
            title: "Confirmation Required",
            description: "Please confirm your new password",
            variant: "destructive",
          });
          return;
        }

        if (newPassword.length < 6) {
          toast({
            title: "Invalid Password",
            description: "Password must be at least 6 characters",
            variant: "destructive",
          });
          return;
        }
        
        if (newPassword !== confirmPassword) {
          toast({
            title: "Password Mismatch",
            description: "New passwords do not match. Please ensure both fields are identical.",
            variant: "destructive",
          });
          return;
        }

        // Update password first
        await updatePasswordMutation.mutateAsync(newPassword);
      }

      // Update profile information
      localStorage.setItem('fullName', fullName);
      localStorage.setItem('email', email);

      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully",
      })

      setIsSettingsOpen(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      console.error('Save settings error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      })
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      setIsSettingsOpen(false)
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <header className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <img
            src={logoImage}
            alt="Daily Tracker"
            className="w-6 h-6"
            data-testid="img-logo"
          />
          <h1 className="text-lg font-semibold text-foreground" data-testid="text-app-title">
            Daily Tracker
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            data-testid="button-settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" hideCloseButton>
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-center">Edit Profile</DialogTitle>
          </DialogHeader>

          {/* Content */}
          <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ramram"
                    className="bg-muted/50"
                    data-testid="input-fullname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ram3@gmail.com"
                    className="bg-muted/50"
                    data-testid="input-email"
                  />
                </div>
              </div>

              {/* Password Section */}
              <div className="mb-6 space-y-4">
                <h3 className="text-lg font-semibold">Edit Password</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="bg-muted/50 pr-10"
                        data-testid="input-new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-new-password"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {newPassword && newPassword.length < 6 && (
                      <p className="text-xs text-destructive">Password must be at least 6 characters</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="bg-muted/50 pr-10"
                        data-testid="input-confirm-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-confirm-password"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleSaveChanges}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  data-testid="button-save-changes"
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1"
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>

              {/* Logout Button */}
              <div className="mt-6 pt-6 border-t">
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="w-full"
                  data-testid="button-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
        </DialogContent>
      </Dialog>
    </>
  )
}