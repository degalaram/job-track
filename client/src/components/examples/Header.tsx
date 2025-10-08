import { Header } from '../Header'
import { ThemeProvider } from '../ThemeProvider'

export default function HeaderExample() {
  return (
    <ThemeProvider>
      <div className="w-full">
        <Header />
      </div>
    </ThemeProvider>
  )
}