import { Briefcase, ClipboardList, FileText, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils' // Assuming cn is available for class merging

interface TabNavigationProps {
  activeTab: 'jobs' | 'tasks' | 'notes' | 'chatgpt'
  onTabChange: (tab: 'jobs' | 'tasks' | 'notes' | 'chatgpt') => void
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: 'jobs' as const, label: 'Internal Jobs', icon: Briefcase },
    { id: 'tasks' as const, label: 'Pending Tasks', icon: ClipboardList },
    { id: 'notes' as const, label: 'Notes', icon: FileText },
    { id: 'chatgpt' as const, label: 'ChatGPT', icon: MessageSquare },
  ]

  const handleTabClick = (id: typeof tabs[number]['id']) => {
    if (id === 'chatgpt') {
      window.open('https://chat.openai.com', '_blank')
    } else {
      onTabChange(id)
    }
  }

  return (
    <nav className="border-b bg-card sticky top-0 z-10">
      <div className="flex justify-around md:justify-between overflow-x-auto scrollbar-hide px-2 sm:px-4 md:px-8 lg:px-16">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap border-b-2 flex-shrink-0',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              data-testid={`tab-${tab.id}`}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}