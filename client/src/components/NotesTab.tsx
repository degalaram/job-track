import { useState, useRef, KeyboardEvent } from 'react'
import { Plus, Trash2, ArrowLeft, Image as ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'
import type { Note } from '@shared/schema'

interface UploadedImage {
  id: string
  dataUrl: string
  file: File
}

export function NotesTab() {
  const { data: savedNotes = [], isLoading } = useQuery<Note[]>({ 
    queryKey: ['/api/notes'],
    refetchOnWindowFocus: false
  })
  
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null)
  const [hasContentChanged, setHasContentChanged] = useState(false)
  
  const titleEditableRef = useRef<HTMLDivElement>(null)
  const contentEditableRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const createNoteMutation = useMutation({
    mutationFn: async (noteData: { title: string; content: string; userId: string }) => {
      return await apiRequest('POST', '/api/notes', noteData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] })
    }
  })

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title: string; content: string } }) => {
      return await apiRequest('PATCH', `/api/notes/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] })
    }
  })

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/notes/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] })
    }
  })

  const applyBold = (elementRef: React.RefObject<HTMLDivElement>) => {
    if (!elementRef.current) return
    
    elementRef.current.focus()
    document.execCommand('bold', false)
  }

  const applyNormal = (elementRef: React.RefObject<HTMLDivElement>) => {
    if (!elementRef.current) return
    
    elementRef.current.focus()
    
    // Check if we're currently in bold state
    const isBold = document.queryCommandState('bold')
    
    // If bold is active, turn it off
    if (isBold) {
      document.execCommand('bold', false)
    }
    
    // Also remove formatting from any selected text
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed) {
      document.execCommand('removeFormat', false)
    }
  }

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault()
      applyBold(titleEditableRef)
    }
  }

  const handleContentKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault()
      applyBold(contentEditableRef)
    }
  }

  const processImageFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const imageData = event.target?.result as string
      const newImage: UploadedImage = {
        id: Date.now().toString(),
        dataUrl: imageData,
        file: file
      }
      setUploadedImages(prev => {
        const updated = [...prev, newImage]
        setTimeout(checkHasContent, 0)
        return updated
      })
    }
    reader.readAsDataURL(file)
  }

  const handleImageUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      processImageFile(file)
    }
  }

  const removeImage = (imageId: string) => {
    setUploadedImages(prev => {
      const updated = prev.filter(img => img.id !== imageId)
      setTimeout(checkHasContent, 0)
      return updated
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find(file => file.type.startsWith('image/'))

    if (imageFile) {
      processImageFile(imageFile)
    }
  }

  const getHTMLContent = (elementRef: React.RefObject<HTMLDivElement>): string => {
    if (!elementRef.current) return ''
    return elementRef.current.innerHTML
  }

  const getTextContent = (elementRef: React.RefObject<HTMLDivElement>): string => {
    if (!elementRef.current) return ''
    return elementRef.current.textContent?.trim() || ''
  }

  const checkHasContent = () => {
    const titleText = getTextContent(titleEditableRef)
    const contentText = getTextContent(contentEditableRef)
    const result = titleText.length > 0 || contentText.length > 0 || uploadedImages.length > 0
    console.log('Checking content:', { titleText, contentText, imagesCount: uploadedImages.length, result })
    setHasContentChanged(result)
  }

  const handleSaveNote = async () => {
    const titleText = getTextContent(titleEditableRef)
    const contentText = getTextContent(contentEditableRef)
    
    if (!titleText && !contentText && uploadedImages.length === 0) {
      return
    }

    const titleHtml = getHTMLContent(titleEditableRef)
    const contentHtml = getHTMLContent(contentEditableRef)

    const imagesHtml = uploadedImages.map(img =>
      `<img src="${img.dataUrl}" style="max-width: 100%; height: auto; border-radius: 0.5rem; margin: 0.5em 0; display: block; cursor: pointer;" alt="Uploaded image" />`
    ).join('')

    const fullContentHtml = contentHtml + (imagesHtml ? '<br>' + imagesHtml : '')

    const noteData = {
      title: titleHtml.trim() || 'Untitled',
      content: fullContentHtml || '',
      userId: 'default-user'
    }

    await createNoteMutation.mutateAsync(noteData)

    setUploadedImages([])
    setHasContentChanged(false)
    
    if (titleEditableRef.current) titleEditableRef.current.innerHTML = ''
    if (contentEditableRef.current) contentEditableRef.current.innerHTML = ''
  }

  const handleDeleteNote = async (id: string) => {
    await deleteNoteMutation.mutateAsync(id)
    if (expandedNoteId === id) {
      setExpandedNoteId(null)
    }
  }

  const formatDate = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const openNote = (note: Note) => {
    setExpandedNoteId(note.id)

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = note.content
    const images = Array.from(tempDiv.querySelectorAll('img'))
    
    const imageData = images.map((img, idx) => ({
      id: `${note.id}-${idx}`,
      dataUrl: img.src,
      file: new File([], '')
    }))
    
    setUploadedImages(imageData)

    images.forEach(img => img.remove())
    
    let contentWithoutImages = tempDiv.innerHTML
    const match = contentWithoutImages.match(/^(.*?)(<br\s*\/?>)?\s*$/i)
    if (match) {
      contentWithoutImages = match[1]
    }

    if (titleEditableRef.current) {
      titleEditableRef.current.innerHTML = note.title
    }
    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = contentWithoutImages
    }
    
    setHasContentChanged(true)
  }

  const closeExpandedNote = () => {
    setExpandedNoteId(null)
    setUploadedImages([])
    setHasContentChanged(false)
    
    if (titleEditableRef.current) titleEditableRef.current.innerHTML = ''
    if (contentEditableRef.current) contentEditableRef.current.innerHTML = ''
  }

  const handleUpdateNote = async () => {
    if (!expandedNoteId) return

    const titleText = getTextContent(titleEditableRef)
    const contentText = getTextContent(contentEditableRef)
    
    if (!titleText && !contentText && uploadedImages.length === 0) {
      return
    }

    const titleHtml = getHTMLContent(titleEditableRef)
    const contentHtml = getHTMLContent(contentEditableRef)

    const imagesHtml = uploadedImages.map(img =>
      `<img src="${img.dataUrl}" style="max-width: 100%; height: auto; border-radius: 0.5rem; margin: 0.5em 0; display: block; cursor: pointer;" alt="Uploaded image" />`
    ).join('')

    const fullContentHtml = contentHtml + (imagesHtml ? '<br>' + imagesHtml : '')

    await updateNoteMutation.mutateAsync({
      id: expandedNoteId,
      data: {
        title: titleHtml.trim() || 'Untitled',
        content: fullContentHtml
      }
    })

    setHasContentChanged(false)
    closeExpandedNote()
  }

  const handleImageClick = (src: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFullScreenImage(src)
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 h-full flex flex-col overflow-auto">
      {fullScreenImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="p-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFullScreenImage(null)}
              data-testid="button-back-fullscreen"
              className="bg-background"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <img
              src={fullScreenImage}
              alt="Full screen view"
              className="max-w-full max-h-full object-contain"
              data-testid="img-fullscreen"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {expandedNoteId && (
            <Button
              variant="outline"
              size="sm"
              onClick={closeExpandedNote}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold">{expandedNoteId ? 'Edit Note' : 'Notes'}</h2>
            <p className="text-sm text-muted-foreground">
              {expandedNoteId ? 'Make changes to your note' : 'Keep track of important information'}
            </p>
          </div>
        </div>
      </div>

      <Card className="flex-shrink-0">
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyBold(titleEditableRef)}
                className="h-8 w-8 p-0 font-bold"
                data-testid="button-title-bold"
              >
                B
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyNormal(titleEditableRef)}
                className="h-8 w-8 p-0"
                data-testid="button-title-normal"
              >
                N
              </Button>
              <span className="text-xs text-muted-foreground">Title Style (Ctrl+B)</span>
            </div>
            <div
              ref={titleEditableRef}
              contentEditable
              onKeyDown={handleTitleKeyDown}
              onInput={() => {
                checkHasContent()
              }}
              onBlur={checkHasContent}
              className="flex-1 px-3 py-2 border rounded-md min-h-[2.5rem] focus:outline-none focus:ring-2 focus:ring-ring"
              data-placeholder="Note title"
              data-testid="input-note-title"
              suppressContentEditableWarning
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyBold(contentEditableRef)}
                className="h-8 w-8 p-0 font-bold"
                data-testid="button-content-bold"
              >
                B
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyNormal(contentEditableRef)}
                className="h-8 w-8 p-0"
                data-testid="button-content-normal"
              >
                N
              </Button>
              <span className="text-xs text-muted-foreground">Content Style (Ctrl+B)</span>
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleImageUpload}
                className="h-8 px-3"
                data-testid="button-upload-image"
              >
                <ImageIcon className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Upload</span>
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              className={`relative border rounded-md ${isDragging ? 'border-primary border-2 bg-primary/5' : 'border-input'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded-md">
                  <p className="text-lg font-semibold text-primary">Drop image here</p>
                </div>
              )}

              <div
                ref={contentEditableRef}
                contentEditable
                onKeyDown={handleContentKeyDown}
                onInput={() => {
                  checkHasContent()
                }}
                onBlur={checkHasContent}
                className="min-h-[120px] p-3 focus:outline-none"
                data-placeholder="Type your notes here... (or drag & drop images)"
                data-testid="textarea-note-content"
                suppressContentEditableWarning
              />

              {uploadedImages.length > 0 && (
                <div className="px-3 pb-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {uploadedImages.map((img) => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.dataUrl}
                          alt="Preview"
                          className="w-full h-24 object-cover rounded-md cursor-pointer"
                          onClick={(e) => handleImageClick(img.dataUrl, e)}
                          data-testid={`img-preview-${img.id}`}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeImage(img.id)}
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-remove-image-${img.id}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={expandedNoteId ? handleUpdateNote : handleSaveNote}
            disabled={createNoteMutation.isPending || updateNoteMutation.isPending || !hasContentChanged}
            className="w-full sm:w-auto"
            data-testid="button-save-note"
          >
            <Plus className="w-4 h-4 mr-2" />
            {(createNoteMutation.isPending || updateNoteMutation.isPending) ? 'Saving...' : (expandedNoteId ? 'Update Note' : 'Save Note')}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3 flex-1 overflow-auto">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Loading notes...</p>
          </div>
        ) : savedNotes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No notes yet. Create your first note above!</p>
          </div>
        ) : (
          Array.isArray(savedNotes) && savedNotes.map((note) => (
            <Card
              key={note.id}
              className="overflow-hidden border-2 hover:border-primary/50 transition-all duration-200 hover:shadow-md"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => openNote(note)}
                  >
                    <h3
                      className="font-semibold text-base mb-1 truncate hover:text-primary transition-colors"
                      dangerouslySetInnerHTML={{ __html: note.title }}
                    />
                    <p className="text-xs text-muted-foreground mb-2">
                      {formatDate(note.createdAt)}
                    </p>
                    <div
                      className="text-sm text-foreground line-clamp-2 prose prose-sm max-w-none [&_img]:hidden"
                      dangerouslySetInnerHTML={{ __html: note.content.replace(/<img[^>]*>/g, '') }}
                    />
                    {note.content.includes('<img') && (
                      <div className="flex gap-1 mt-2">
                        {note.content.match(/<img[^>]*src="([^"]*)"[^>]*>/g)?.slice(0, 3).map((imgTag, idx) => {
                          const srcMatch = imgTag.match(/src="([^"]*)"/)
                          const src = srcMatch ? srcMatch[1] : ''
                          return (
                            <img
                              key={idx}
                              src={src}
                              alt="Thumbnail"
                              className="w-12 h-12 object-cover rounded border cursor-pointer hover:ring-2 hover:ring-primary"
                              onClick={(e) => handleImageClick(src, e)}
                              data-testid={`img-thumbnail-${idx}`}
                            />
                          )
                        })}
                        {(note.content.match(/<img/g)?.length ?? 0) > 3 && (
                          <div className="w-12 h-12 flex items-center justify-center bg-muted rounded border text-xs">
                            +{(note.content.match(/<img/g)?.length ?? 0) - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        openNote(note)
                      }}
                      className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                      title="Edit note"
                      data-testid={`button-edit-note-${note.id}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                        <path d="m15 5 4 4"/>
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteNote(note.id)
                      }}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      title="Delete note"
                      data-testid={`button-delete-note-${note.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
