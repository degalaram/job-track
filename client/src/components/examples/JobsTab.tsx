import { JobsTab } from '../JobsTab'

export default function JobsTabExample() {
  const handleAddToTasks = (job: any) => {
    console.log('Job added to tasks:', job)
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <JobsTab onAddToTasks={handleAddToTasks} />
    </div>
  )
}