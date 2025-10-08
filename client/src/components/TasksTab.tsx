import { useState, useEffect } from 'react'
import { Check, Trash2, Calendar, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'

interface Task {
  id: string
  title: string
  company: string
  url?: string
  type: 'job-application' | 'follow-up' | 'interview' | 'other'
  completed: boolean
  addedDate: string
}

interface TasksTabProps {
  tasks: Task[]
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
}

export function TasksTab({ tasks, onToggleTask, onDeleteTask }: TasksTabProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')

  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') return !task.completed
    if (filter === 'completed') return task.completed
    return true
  })

  const getTypeColor = (type: Task['type']) => {
    switch (type) {
      case 'job-application': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'follow-up': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'interview': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-semibold" data-testid="text-tasks-title">
          Daily Tasks
        </h2>
        
        <div className="flex gap-1.5 sm:gap-3 flex-wrap">
          {(['all', 'pending', 'completed'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              data-testid={`button-filter-${f}`}
              className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <Badge variant={filter === f ? 'secondary' : 'outline'} className="text-xs">
                {f === 'all' ? tasks.length : 
                 f === 'pending' ? tasks.filter(t => !t.completed).length :
                 tasks.filter(t => t.completed).length}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-8 sm:py-12 text-muted-foreground">
          <Calendar className="mx-auto h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 opacity-50" />
          <p className="text-sm sm:text-base px-4" data-testid="text-no-tasks">
            {filter === 'all' ? 'No tasks yet. Add jobs from the Jobs tab to get started.' :
             filter === 'pending' ? 'No pending tasks.' :
             'No completed tasks.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <Card
              key={task.id}
              className={`hover-elevate transition-opacity ${
                task.completed ? 'opacity-75' : ''
              }`}
              data-testid={`card-task-${task.id}`}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => {
                      onToggleTask(task.id)
                      console.log('Toggled task:', task.title)
                    }}
                    className="mt-0.5 flex-shrink-0"
                    data-testid={`checkbox-task-${task.id}`}
                  />
                  
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-medium text-sm sm:text-base break-words leading-tight ${
                          task.completed ? 'line-through text-muted-foreground' : ''
                        }`}>
                          {task.title}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-primary break-words">{task.company}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <Badge className={`${getTypeColor(task.type)} text-xs`}>
                          {task.type.replace('-', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {task.addedDate}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-1">
                      {task.url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(task.url, '_blank')}
                          data-testid={`button-view-task-${task.id}`}
                          className="flex-1 h-8 text-xs"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onDeleteTask(task.id)
                          console.log('Deleted task:', task.title)
                        }}
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground flex-1 h-8 text-xs"
                        data-testid={`button-delete-task-${task.id}`}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
