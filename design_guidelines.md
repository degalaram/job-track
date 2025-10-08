# Daily Tracker App Design Guidelines

## Design Approach
**Selected Approach:** Reference-Based Design inspired by modern productivity apps like Notion and Linear, with mobile-first design principles for PWA optimization.

**Key Design Principles:**
- Clean, minimal interface optimizing for mobile productivity
- Clear visual hierarchy with focused task completion
- Professional aesthetic suitable for job tracking workflow

## Core Design Elements

### A. Color Palette
**Light Mode:**
- Primary: 219 85% 35% (professional blue)
- Background: 0 0% 98% (near white)
- Card backgrounds: 0 0% 100% (pure white)
- Text primary: 220 15% 25% (dark gray)
- Text secondary: 220 10% 55% (medium gray)
- Border: 220 15% 90% (light gray)
- Success: 142 70% 45% (green for completed tasks)

**Dark Mode:**
- Primary: 219 85% 55% (lighter blue)
- Background: 220 15% 8% (very dark gray)
- Card backgrounds: 220 15% 12% (dark gray cards)
- Text primary: 0 0% 95% (near white)
- Text secondary: 220 10% 65% (light gray)
- Border: 220 15% 20% (dark border)

### B. Typography
- **Primary Font:** Inter (Google Fonts) for excellent mobile readability
- **Headings:** font-semibold (600 weight)
- **Body:** font-normal (400 weight)
- **UI Labels:** font-medium (500 weight)
- **Scale:** text-sm for mobile, text-base for desktop

### C. Layout System
**Spacing Units:** Tailwind units of 2, 4, 6, and 8 (p-2, m-4, gap-6, h-8)
- Consistent 4-unit spacing for most elements
- 2-unit spacing for tight layouts
- 6-unit spacing for section separation
- 8-unit spacing for major layout breaks

### D. Component Library

**Navigation:**
- Bottom tab bar for mobile (3 tabs: Internal Jobs, Pending Tasks, Notes)
- Active tab with primary color background, inactive with secondary text
- Tab icons from Heroicons (briefcase, clipboard-document-list, document-text)

**Job Analysis Section:**
- Prominent URL input field with rounded-lg borders
- "Analyze" button with primary color, full width on mobile
- Loading state with subtle spinner during analysis

**Job Cards:**
- Clean white/dark cards with subtle shadows
- Company name as heading, job role as subheading
- Job details in secondary text
- "Add to Pending" button with outline variant, positioned bottom-right
- Card hover states with slight elevation increase

**Pending Tasks:**
- Checkbox-style task items with completion states
- Swipe-to-delete on mobile
- Priority indicators with color coding
- Task metadata (date added, source)

**Notes Section:**
- Simple text area with auto-resize
- Auto-save indicator
- Minimal formatting options (bold, italic)
- Search functionality for notes

**General UI:**
- Rounded corners (rounded-lg) throughout
- Subtle shadows for depth (shadow-sm on cards)
- Consistent button sizes and padding
- Error states with gentle red accents

### E. Mobile Optimization
- Touch-friendly button sizes (minimum 44px height)
- Swipe gestures for task management
- Bottom sheet modals for detailed views
- Safe area considerations for iOS notch
- Offline-first data persistence

## Images
**Logo Integration:**
The provided clipboard logo should be used in the top header area, sized appropriately for mobile (approximately 24x24px). No large hero image is needed - the focus should be on functional productivity interface.

**Empty States:**
Simple illustration placeholders for empty job lists, tasks, and notes using the same blue color palette.

This design prioritizes mobile usability while maintaining professional aesthetics suitable for job tracking workflows.