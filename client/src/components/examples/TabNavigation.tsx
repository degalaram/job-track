import { useState } from 'react'
import { TabNavigation } from '../TabNavigation'

export default function TabNavigationExample() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'tasks' | 'notes'>('jobs')

  return (
    <div className="w-full">
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="p-4 text-center">
        <p>Active tab: {activeTab}</p>
      </div>
    </div>
  )
}