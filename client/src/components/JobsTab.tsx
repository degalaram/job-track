import { useState } from 'react'
import { Search, Plus, ExternalLink, Trash2, Pencil, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'

interface JobData {
  id: string
  url: string
  title: string
  company: string
  location: string
  type: string
  description: string
  postedDate: string
  analyzedDate?: string
}

interface JobsTabProps {
  onAddToTasks: (job: JobData) => void
}

export function JobsTab({ onAddToTasks }: JobsTabProps) {
  const { toast } = useToast()
  const [url, setUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [editingJob, setEditingJob] = useState<JobData | null>(null)
  const [editCompany, setEditCompany] = useState('')
  const [editTitle, setEditTitle] = useState('')

  const getDateKey = (date: Date = new Date()): string => {
    return date.toISOString().split('T')[0]
  }

  const [selectedDate, setSelectedDate] = useState<string>(getDateKey())

  // Use React Query for real-time sync via WebSocket
  const { data: analyzedJobs = [] } = useQuery<JobData[]>({
    queryKey: ['/api/jobs'],
    refetchOnWindowFocus: true,
  })

  const createJobMutation = useMutation({
    mutationFn: async (jobData: Omit<JobData, 'id'>) => {
      const res = await apiRequest('POST', '/api/jobs', jobData)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] })
    },
  })

  const updateJobMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { company: string; title: string } }) => {
      const res = await apiRequest('PUT', `/api/jobs/${id}`, data)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] })
    },
  })

  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/jobs/${id}`)
      if (res.status !== 204) {
        return res.json()
      }
      return null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] })
    },
  })

  const extractCompanyFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.replace('www.', '').toLowerCase()
      const pathname = urlObj.pathname.toLowerCase()
      const search = urlObj.search.toLowerCase()
      const fullUrl = url.toLowerCase()

      // Extract company name from popular job sites
      if (hostname.includes('linkedin.com')) {
        // Try multiple LinkedIn patterns
        let companyMatch = pathname.match(/\/company\/([^\/\?]+)/i)
        if (companyMatch) {
          return companyMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }

        // LinkedIn job URLs - extract company name from the URL path
        // Pattern: /jobs/view/company-name-software-engineer-123456/
        const jobViewMatch = pathname.match(/\/jobs\/view\/([^\/]+)/i)
        if (jobViewMatch) {
          const parts = jobViewMatch[1].split('-')
          // Try to find company name (usually first few words before job title)
          // Filter out common job titles and numbers
          const filtered = parts.filter(p => 
            p.length > 2 && 
            !['software', 'engineer', 'developer', 'senior', 'junior', 'lead', 'staff', 'principal'].includes(p) &&
            !/^\d+$/.test(p)
          )
          if (filtered.length > 0) {
            // Take first 1-2 words as company name
            const companyName = filtered.slice(0, 2).join(' ').replace(/\b\w/g, l => l.toUpperCase())
            if (companyName && companyName.length > 2) {
              return companyName
            }
          }
        }

        // Try extracting from URL path segments
        const segments = pathname.split('/').filter(s => s.length > 0)
        for (let i = 0; i < segments.length - 1; i++) {
          if (segments[i] === 'company' && segments[i + 1]) {
            return segments[i + 1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          }
        }

        return 'LinkedIn Company'
      } else if (hostname.includes('indeed.com')) {
        // Check for company parameter
        let companyMatch = search.match(/[?&]cmp=([^&]+)/i)
        if (companyMatch) {
          return decodeURIComponent(companyMatch[1]).replace(/\+/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }

        // Try extracting from URL query parameters
        companyMatch = fullUrl.match(/[?&]q=([^&]+)/i)
        if (companyMatch) {
          const query = decodeURIComponent(companyMatch[1]).replace(/\+/g, ' ')
          const words = query.split(' ').filter(w => 
            w.length > 2 && 
            !['software', 'engineer', 'developer', 'senior', 'junior', 'at'].includes(w.toLowerCase())
          )
          if (words.length > 0) {
            return words.slice(0, 2).join(' ').replace(/\b\w/g, l => l.toUpperCase())
          }
        }

        return 'Indeed Company'
      } else if (hostname.includes('glassdoor.com')) {
        // Try company name from path
        let companyMatch = pathname.match(/\/[Jj]obs\/([^\/]+)/i) || pathname.match(/\/[Cc]ompany\/([^\/]+)/i)
        if (companyMatch) {
          return companyMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }

        // Try from partner parameter
        companyMatch = search.match(/[?&]employer=([^&]+)/i)
        if (companyMatch) {
          return decodeURIComponent(companyMatch[1]).replace(/\+/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }

        return 'Glassdoor Company'
      } else if (hostname.includes('jobs.lever.co')) {
        const companyMatch = hostname.match(/([^\.]+)\.lever\.co/i) || pathname.match(/lever\.co\/([^\/]+)/i)
        if (companyMatch) {
          return companyMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }
        return 'Lever Company'
      } else if (hostname.includes('greenhouse.io')) {
        const companyMatch = hostname.match(/([^\.]+)\.greenhouse\.io/i)
        if (companyMatch) {
          return companyMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }
        return 'Greenhouse Company'
      } else if (hostname.includes('workday.com') || hostname.includes('myworkdayjobs.com')) {
        const companyMatch = hostname.match(/([^\.]+)\.wd\d+\.myworkdayjobs\.com/i) || hostname.match(/([^\.]+)\.workday\.com/i)
        if (companyMatch) {
          return companyMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }
        return 'Workday Company'
      } else if (hostname.includes('careers.')) {
        // Extract company from careers subdomain
        const companyMatch = hostname.match(/careers\.([^\.]+)/i)
        if (companyMatch) {
          return companyMatch[1].replace(/\b\w/g, l => l.toUpperCase())
        }
      } else if (hostname.includes('jobs.')) {
        // Extract company from jobs subdomain
        const companyMatch = hostname.match(/jobs\.([^\.]+)/i)
        if (companyMatch) {
          return companyMatch[1].replace(/\b\w/g, l => l.toUpperCase())
        }
      } else {
        // For direct company career pages, extract from domain
        const parts = hostname.split('.')
        if (parts.length >= 2) {
          const companyPart = parts[parts.length - 2]
          // Common company names mapping
          const companyMap: { [key: string]: string } = {
            'google': 'Google',
            'meta': 'Meta',
            'facebook': 'Meta',
            'microsoft': 'Microsoft',
            'amazon': 'Amazon',
            'apple': 'Apple',
            'netflix': 'Netflix',
            'uber': 'Uber',
            'airbnb': 'Airbnb',
            'twitter': 'Twitter',
            'spotify': 'Spotify',
            'stripe': 'Stripe',
            'shopify': 'Shopify',
            'salesforce': 'Salesforce',
            'adobe': 'Adobe',
            'intel': 'Intel',
            'nvidia': 'NVIDIA',
            'tesla': 'Tesla',
            'paypal': 'PayPal',
            'zoom': 'Zoom',
            'slack': 'Slack',
            'dropbox': 'Dropbox',
            'palantir': 'Palantir',
            'snowflake': 'Snowflake',
            'databricks': 'Databricks',
            'com': 'Unknown Company'
          }

          return companyMap[companyPart] || companyPart.replace(/\b\w/g, l => l.toUpperCase())
        }
      }

      // Fallback: return domain name
      const domainParts = hostname.split('.')
      const mainDomain = domainParts.length >= 2 ? domainParts[domainParts.length - 2] : domainParts[0]
      return mainDomain.replace(/\b\w/g, l => l.toUpperCase())
    } catch (error) {
      console.error('Error parsing URL:', error)
      return 'Unknown Company'
    }
  }

  const extractJobTitleFromUrl = (url: string, company: string): string => {
    try {
      const urlObj = new URL(url.toLowerCase())

      // Try to extract job title from URL path or parameters
      if (url.includes('software-engineer')) return 'Software Engineer'
      if (url.includes('frontend-developer')) return 'Frontend Developer'
      if (url.includes('backend-developer')) return 'Backend Developer'
      if (url.includes('full-stack')) return 'Full Stack Developer'
      if (url.includes('senior-software')) return 'Senior Software Engineer'
      if (url.includes('staff-engineer')) return 'Staff Engineer'
      if (url.includes('principal-engineer')) return 'Principal Engineer'
      if (url.includes('data-scientist')) return 'Data Scientist'
      if (url.includes('product-manager')) return 'Product Manager'
      if (url.includes('engineering-manager')) return 'Engineering Manager'
      if (url.includes('devops')) return 'DevOps Engineer'
      if (url.includes('mobile-developer')) return 'Mobile Developer'
      if (url.includes('react-developer')) return 'React Developer'
      if (url.includes('python-developer')) return 'Python Developer'
      if (url.includes('java-developer')) return 'Java Developer'

      // Default based on company
      return 'Software Engineer'
    } catch (error) {
      return 'Software Engineer'
    }
  }

  const isValidUrl = (string: string): boolean => {
    try {
      const urlObj = new URL(string.trim())
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch (_) {
      return false
    }
  }

  const handleAnalyze = async () => {
    if (!url.trim()) return

    // Validate URL format
    if (!isValidUrl(url.trim())) {
      toast({
        variant: 'destructive',
        title: 'Invalid URL',
        description: 'Please enter a valid URL (must start with http:// or https://)',
      })
      return
    }

    // Check for duplicate URLs - normalize URL for comparison and check database
    const normalizedUrl = url.trim().toLowerCase().replace(/\/$/, '')

    try {
      const response = await fetch('/api/jobs') // Corrected API endpoint
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const allJobs = await response.json()
      const isDuplicate = allJobs.some((job: JobData) => 
        job.url.toLowerCase().replace(/\/$/, '') === normalizedUrl
      )
      if (isDuplicate) {
        toast({
          title: '✅ URL Already Analysed!',
          description: 'This job URL has already been analysed and added to your list.',
          className: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
        })
        setUrl('')
        return
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred while checking for duplicate jobs.',
      })
      return
    }

    setIsAnalyzing(true)
    console.log('Analyzing URL:', url)

    // Extract company name and validate
    const companyName = extractCompanyFromUrl(url.trim())
    if (!companyName || companyName === 'Unknown Company' || companyName === 'Com') {
      setIsAnalyzing(false)
      toast({
        variant: 'destructive',
        title: 'Invalid Company',
        description: 'Unable to identify company name from this URL. Please ensure the URL is from a supported job site.',
      })
      return
    }

    // Analyze URL and save to database
    setTimeout(async () => {
      const jobTitle = extractJobTitleFromUrl(url, companyName)

      const newJobData = {
        url: url.trim(),
        title: jobTitle,
        company: companyName,
        location: 'Remote / On-site',
        type: 'Full-time',
        description: `Join ${companyName} as a ${jobTitle}. We are looking for passionate developers to help build innovative solutions and drive our technology forward.`,
        postedDate: 'Recently posted',
        analyzedDate: getDateKey()
      }

      try {
        await createJobMutation.mutateAsync(newJobData)
        toast({
          title: 'Success',
          description: 'Job added successfully.',
        })
      } catch (error: any) {
        console.error('Error saving job:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Failed to add job.',
        })
      }

      setUrl('')
      setIsAnalyzing(false)
    }, 1500)
  }

  const handleDeleteJob = async (jobId: string) => {
    try {
      await deleteJobMutation.mutateAsync(jobId)
      toast({
        title: 'Success',
        description: 'Job deleted successfully.',
      })
    } catch (error: any) {
      console.error('Error deleting job:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete job.',
      })
    }
  }

  const handleEditJob = (job: JobData) => {
    setEditingJob(job)
    setEditCompany(job.company)
    setEditTitle(job.title)
  }

  const handleSaveEdit = async () => {
    if (editingJob) {
      try {
        await updateJobMutation.mutateAsync({
          id: editingJob.id,
          data: { company: editCompany, title: editTitle }
        })
        toast({
          title: 'Success',
          description: 'Job updated successfully.',
        })
        setEditingJob(null)
      } catch (error: any) {
        console.error('Error updating job:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Failed to update job.',
        })
      }
    }
  }

  const getLast4Days = () => {
    const days = []
    for (let i = 0; i < 4; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const key = getDateKey(date)
      const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      days.push({ key, label })
    }
    return days
  }

  const filteredJobs = analyzedJobs.filter(job => job.analyzedDate === selectedDate)

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-8">
      <div className="space-y-3 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-lg sm:text-xl font-semibold" data-testid="text-jobs-title">
            Job URL Analysis
          </h2>
          <Badge variant="secondary" className="text-xs sm:text-sm">
            {analyzedJobs.length} Analyses
          </Badge>
        </div>

        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
          {getLast4Days().map((day) => (
            <Button
              key={day.key}
              variant={selectedDate === day.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDate(day.key)}
              className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
              data-testid={`button-date-filter-${day.key}`}
            >
              <Calendar className="w-3 h-3" />
              {day.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Paste job URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              className="pl-10 w-full h-10 sm:h-10"
              data-testid="input-job-url"
            />
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={!url.trim() || isAnalyzing}
            data-testid="button-analyze"
            className="w-full sm:w-auto h-10 sm:h-10"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-6">
        <h3 className="text-base sm:text-lg font-medium" data-testid="text-analyzed-jobs">
          Analyzed Jobs ({filteredJobs.length})
        </h3>

        {filteredJobs.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <Search className="mx-auto h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 opacity-50" />
            <p className="text-sm sm:text-base px-4" data-testid="text-no-jobs">No jobs analyzed for this date. Paste a job URL above to get started.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-6">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="hover-elevate" data-testid={`card-job-${job.id}`}>
                <CardHeader className="p-3 sm:p-6 pb-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <CardTitle className="text-sm sm:text-lg break-words leading-tight pr-2">{job.title}</CardTitle>
                        <p className="text-primary font-medium text-xs sm:text-base break-words">{job.company}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditJob(job)}
                          className="h-8 w-8 sm:h-9 sm:w-9"
                          data-testid={`button-edit-job-${job.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            handleDeleteJob(job.id)
                            console.log('Deleted job:', job.title)
                          }}
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground h-8 w-8 sm:h-9 sm:w-9"
                          data-testid={`button-delete-job-${job.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs">{job.type}</Badge>
                      <Badge variant="outline" className="text-xs">{job.postedDate}</Badge>
                      <span className="text-xs text-muted-foreground">{job.location}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
                  <p className="text-xs sm:text-sm text-muted-foreground break-words line-clamp-3">{job.description}</p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(job.url, '_blank')}
                      data-testid={`button-view-job-${job.id}`}
                      className="w-full sm:flex-1 h-9"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-2" />
                      View Job
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        onAddToTasks(job)
                        console.log('Added job to tasks:', job.title)
                      }}
                      data-testid={`button-add-task-${job.id}`}
                      className="w-full sm:flex-1 h-9"
                    >
                      <Plus className="w-3.5 h-3.5 mr-2" />
                      Add to Tasks
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editingJob} onOpenChange={(open) => !open && setEditingJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Job Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-company">Company Name</Label>
              <Input
                id="edit-company"
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title">Job Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter job title"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingJob(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}