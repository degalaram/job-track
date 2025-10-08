import { ThemeProvider } from '../ThemeProvider'

export default function ThemeProviderExample() {
  return (
    <ThemeProvider>
      <div className="p-4 bg-background text-foreground">
        <p>Theme provider is working! This text adapts to light/dark mode.</p>
      </div>
    </ThemeProvider>
  )
}