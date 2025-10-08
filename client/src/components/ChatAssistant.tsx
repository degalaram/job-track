
import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Mic, Volume2, RefreshCw, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
  imageUrl?: string
  isVoice?: boolean
}

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load messages from localStorage on initial render
    const savedMessages = localStorage.getItem('chatMessages')
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages)
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      } catch (e) {
        console.error('Failed to parse saved messages:', e)
      }
    }
    return [
      {
        id: '1',
        text: "How may I help you!",
        isUser: false,
        timestamp: new Date()
      }
    ]
  })
  const [inputValue, setInputValue] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isVoiceInput, setIsVoiceInput] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInputValue(transcript)
        setIsListening(false)
        setIsVoiceInput(true)
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis

      // Load voices on initialization
      const loadVoices = () => {
        synthRef.current?.getVoices()
      }

      // Chrome needs this to load voices properly
      if (synthRef.current.onvoiceschanged !== undefined) {
        synthRef.current.onvoiceschanged = loadVoices
      }

      // Load voices immediately
      loadVoices()
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
    // Save messages to localStorage whenever they change
    localStorage.setItem('chatMessages', JSON.stringify(messages))
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleStartListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const speakText = (text: string) => {
    if (synthRef.current && !isSpeaking) {
      // Cancel any ongoing speech
      synthRef.current.cancel()

      const utterance = new SpeechSynthesisUtterance(text)

      // Get available voices
      const voices = synthRef.current.getVoices()

      // Try to find a good English voice (female preferred)
      const femaleVoice = voices.find(voice => 
        voice.lang.startsWith('en') && (
          voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('samantha') ||
          voice.name.toLowerCase().includes('karen') ||
          voice.name.toLowerCase().includes('victoria') ||
          voice.name.toLowerCase().includes('zira') ||
          voice.name.toLowerCase().includes('susan') ||
          voice.name.toLowerCase().includes('fiona') ||
          (voice.gender && voice.gender === 'female')
        )
      )

      // Fall back to any English voice
      const englishVoice = voices.find(voice => voice.lang.startsWith('en'))

      // Use the best available voice
      const selectedVoice = femaleVoice || englishVoice || voices[0]

      if (selectedVoice) {
        utterance.voice = selectedVoice
      }

      utterance.rate = 1.5
      utterance.pitch = 1.1
      utterance.volume = 0.8

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = (e) => {
        console.log('Speech synthesis error:', e)
        setIsSpeaking(false)
      }

      setIsSpeaking(true)

      // Small delay to ensure voice is loaded
      setTimeout(() => {
        synthRef.current?.speak(utterance)
      }, 100)
    }
  }

  const generateResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase()

    if (message.includes('job') && message.includes('track')) {
      return "I can see you have analyzed jobs in your Jobs tab. To track more jobs, paste job URLs from LinkedIn, Indeed, Glassdoor, or company career pages. I'll extract the company name and job details automatically."
    }

    if (message.includes('task') || message.includes('application')) {
      return "Your Tasks tab shows your pending applications and follow-ups. You can add jobs directly to tasks from the Jobs tab, or create custom tasks. Mark them complete when done!"
    }

    if (message.includes('company') || message.includes('extract')) {
      return "I extract company names from job URLs automatically. I support LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, Workday, and direct company career pages. Make sure to use valid URLs starting with https://"
    }

    if (message.includes('note')) {
      return "The Notes tab is perfect for storing interview notes, company research, salary negotiations, or any other job search thoughts. Your notes are automatically saved as you type."
    }

    if (message.includes('how many') || message.includes('count')) {
      const jobCount = JSON.parse(localStorage.getItem('analyzedJobs') || '[]').length
      const taskCount = JSON.parse(localStorage.getItem('tasks') || '[]').length
      return `You currently have ${jobCount} analyzed jobs and ${taskCount} pending tasks. Keep up the great work on your job search!`
    }

    if (message.includes('help') || message.includes('what can you')) {
      return "I can help you with:\n• Analyzing job URLs and extracting company info\n• Managing your tasks and applications\n• Tracking your job search progress\n• Taking notes and storing research\n• Answering questions about Daily Tracker features\n\nWhat would you like to know more about?"
    }

    if (message.includes('voice') || message.includes('speak')) {
      return "I can speak my responses! Click the speaker icon next to any of my messages to hear them read aloud with a nice female voice. You can also use the microphone to send voice messages."
    }

    return "I'm here to help with your job search and Daily Tracker questions! You can ask me about analyzing job URLs, managing tasks, taking notes, or tracking your progress. What would you like to know?"
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !selectedImage) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim() || 'What can you tell me about this image?',
      isUser: true,
      timestamp: new Date(),
      imageUrl: selectedImage || undefined,
      isVoice: isVoiceInput
    }

    setMessages(prev => [...prev, userMessage])
    const wasVoiceInput = isVoiceInput
    setInputValue('')
    setSelectedImage(null)
    setIsVoiceInput(false)
    setIsLoading(true)

    // Simulate thinking time
    setTimeout(() => {
      let responseText = generateResponse(userMessage.text)
      
      if (userMessage.imageUrl) {
        responseText = "I can see your image! As an AI assistant, I can help analyze job-related images, screenshots of job postings, or company information. For the best experience with image analysis, I recommend using advanced AI tools like ChatGPT or Google Gemini AI which have full image understanding capabilities."
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isUser: false,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)

      // Auto-speak the response if the input was voice
      if (wasVoiceInput) {
        setTimeout(() => {
          speakText(responseText)
        }, 200)
      }
    }, 1200)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage()
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="!fixed !bottom-4 !right-4 !left-auto rounded-full w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 shadow-lg hover:shadow-xl transition-all duration-200 z-[9998] bg-primary hover:bg-primary/90"
        size="icon"
        data-testid="button-chat-toggle"
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
      </Button>
    )
  }

  return (
    <Card className="!fixed !bottom-4 !right-4 !left-auto w-72 sm:w-80 md:w-96 lg:w-[26rem] h-80 sm:h-96 md:h-[28rem] lg:h-[32rem] shadow-xl z-[9998] flex flex-col max-w-[calc(100vw-2rem)]">
      <CardHeader className="pb-2 sm:pb-3 flex-shrink-0 px-3 sm:px-4 md:px-6 lg:px-4 pt-3 sm:pt-4 md:pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 md:w-4 md:h-4 text-primary" />
            </div>
            <CardTitle className="text-xs sm:text-sm md:text-base lg:text-lg truncate">Daily Assistant</CardTitle>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const initialMessage: Message = {
                  id: '1',
                  text: "How may I help you!",
                  isUser: false,
                  timestamp: new Date()
                }
                setMessages([initialMessage])
                localStorage.setItem('chatMessages', JSON.stringify([initialMessage]))
              }}
              className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7"
              title="Clear chat"
            >
              <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7"
              title="Close chat"
            >
              <X className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
            </Button>
          </div>
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground">Ready to assist with your job search</p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-2 sm:p-3 md:p-4 lg:p-4 gap-2 sm:gap-3 min-h-0">
        <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 pr-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent relative">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[80%] md:max-w-[75%] lg:max-w-[85%] rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm shadow-sm border ${
                  message.isUser
                    ? 'bg-primary text-primary-foreground border-primary/20'
                    : 'bg-card text-card-foreground border-border'
                }`}
              >
                {message.imageUrl && (
                  <img 
                    src={message.imageUrl} 
                    alt="Uploaded content" 
                    className="rounded-md mb-2 max-w-full h-auto max-h-48 object-contain"
                  />
                )}
                {message.isVoice && message.isUser && (
                  <div className="flex items-center gap-1 mb-1 text-[9px] sm:text-[10px] opacity-70">
                    <Mic className="w-2 h-2" />
                    <span>Voice message</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed break-words">{message.text}</p>
                {!message.isUser && (
                  <div className="flex justify-end mt-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => speakText(message.text)}
                      className="h-4 w-4 sm:h-5 sm:w-5 opacity-70 hover:opacity-100 transition-opacity"
                      disabled={isSpeaking}
                      title="Speak message"
                    >
                      <Volume2 className={`w-2 h-2 sm:w-3 sm:h-3 ${isSpeaking ? 'animate-pulse text-primary' : ''}`} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 min-w-12 sm:min-w-16">
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce delay-75" />
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce delay-150" />
                  <span className="text-[10px] sm:text-xs text-muted-foreground ml-2 animate-pulse">typing</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
          
          {/* Floating Voice Assistant Button */}
          <Button
            variant={isListening ? "default" : "outline"}
            size="icon"
            onClick={handleStartListening}
            disabled={isListening || !recognitionRef.current}
            className={`absolute bottom-2 right-2 h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full shadow-lg ${
              isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-background hover:bg-accent'
            }`}
            title="Voice input"
            data-testid="button-voice-assistant"
          >
            <Mic className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${isListening ? 'text-white' : ''}`} />
          </Button>
        </div>

        <div className="border-t pt-2 sm:pt-3 space-y-2">
          {selectedImage && (
            <div className="relative inline-block">
              <img 
                src={selectedImage} 
                alt="Selected" 
                className="h-16 sm:h-20 rounded-md border border-border"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                onClick={() => setSelectedImage(null)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
          <div className="flex gap-1.5 sm:gap-2 items-center">
            <Input
              placeholder="How may I help you!"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                setIsVoiceInput(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              className="flex-1 text-[10px] sm:text-xs md:text-sm h-8 sm:h-9 md:h-10 border-border focus:ring-2 focus:ring-primary/20"
              data-testid="input-chat-message"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 border-border hover:bg-accent"
              title="Upload image"
              data-testid="button-upload-image"
            >
              <ImageIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={(!inputValue.trim() && !selectedImage) || isLoading}
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10"
              title="Send message"
              data-testid="button-send-message"
            >
              <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
            </Button>
          </div>

          {isListening && (
            <Badge variant="secondary" className="text-[10px] sm:text-xs self-center py-1 animate-pulse">
              🎤 Listening... Speak now
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
