import { useState } from 'react'
import { TasksTab } from '../TasksTab'

export default function TasksTabExample() {
  const [tasks, setTasks] = useState([
    {
      id: '1',
      title: 'Apply to Senior Frontend Developer position',
      company: 'Google',
      url: 'https://careers.google.com/jobs/123',
      type: 'job-application' as const,
      completed: false,
      addedDate: '2 hours ago'
    },
    {
      id: '2',
      title: 'Follow up on React Developer application',
      company: 'Meta',
      url: 'https://careers.meta.com/jobs/456',
      type: 'follow-up' as const,
      completed: true,
      addedDate: '1 day ago'
    },
    {
      id: '3',
      title: 'Prepare for technical interview',
      company: 'TechCorp Inc.',
      type: 'interview' as const,
      completed: false,
      addedDate: '3 hours ago'
    }
  ])

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id))
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <TasksTab 
        tasks={tasks} 
        onToggleTask={handleToggleTask} 
        onDeleteTask={handleDeleteTask} 
      />
    </div>
  )
}