# Reddit-Style Post Creation System

A comprehensive post creation system for your Next.js + Supabase application that supports multiple post types with rich text editing, similar to Reddit.

## Features

### 📝 Post Types
- **Text Posts**: Headline + rich text description with formatting
- **Image Posts**: Multiple image uploads with optional descriptions
- **Video Posts**: Video URLs or file uploads with descriptions
- **Link Posts**: URL sharing with automatic metadata preview
- **Poll Posts**: Create polls with multiple options and expiry times

### 🎨 Rich Text Editor
- Bold, Italic, Strikethrough formatting
- Inline code blocks
- Block quotes
- Headings (H1, H2, H3)
- Bullet and numbered lists
- Keyboard shortcuts (Ctrl+B for bold, Ctrl+I for italic)
- Reddit-style dark theme

### 🏷️ Additional Features
- Tags system with suggestions
- Community selection
- Anonymous posting options
- Draft saving
- Character limits and validation
- Drag-and-drop file uploads
- Link metadata preview
- Poll expiry management

## Installation

### 1. Database Setup
Run the enhanced post schema migration:

```sql
-- Run the contents of enhanced-post-schema.sql in your Supabase SQL editor
```

### 2. Dependencies
The system uses the following packages (already installed):
- `react-quill` - Rich text editor
- `quill` - Core Quill library

### 3. Components Structure
```
src/components/
├── EnhancedCreatePostForm.tsx    # Main form component
├── PostTypeSelector.tsx          # Post type selection
├── RichTextEditor.tsx            # Rich text editor
├── TextPostForm.tsx              # Text post form
├── ImagePostForm.tsx             # Image post form
├── VideoPostForm.tsx             # Video post form
├── LinkPostForm.tsx              # Link post form
├── PollPostForm.tsx              # Poll post form
├── TagsInput.tsx                 # Tags input component
└── CommunitySelector.tsx         # Community selection
```

## Usage

### Basic Implementation
```tsx
import EnhancedCreatePostForm from '@/components/EnhancedCreatePostForm';

function MyPage() {
  return (
    <EnhancedCreatePostForm
      profile={userProfile}
      communities={communities}
      defaultCommunity="campus"
      onPostCreated={() => {
        // Refresh posts or navigate
      }}
    />
  );
}
```

### Props
- `profile`: User profile object
- `communities`: Array of available communities
- `defaultCommunity`: Default community slug (optional)
- `onPostCreated`: Callback function after successful post creation
- `className`: Additional CSS classes (optional)

## Database Schema

### Enhanced Posts Table
The posts table now includes:
- `post_type`: Type of post (text, image, video, poll, link)
- `headline`: Post headline
- `description`: Rich text description
- `tags`: Array of tags
- `community_slug`: Community reference
- `is_draft`: Draft status
- `video_url`: Video URL
- `link_url`: Link URL
- `link_metadata`: Link preview metadata
- `poll_options`: Poll options array
- `poll_expires_at`: Poll expiry timestamp

### Additional Tables
- `poll_votes`: For poll voting
- `poll_results`: View for poll results

## API Endpoints

### Link Preview API
`GET /api/link-preview?url=<url>`

Fetches metadata for a given URL including title, description, and images.

## Styling

The system uses Tailwind CSS with a Reddit-inspired dark theme:
- Background: `#1a1a1b`
- Borders: `#343536`
- Text: `#d7dadc`
- Accent: Indigo/Purple gradient

## File Uploads

### Images
- Storage bucket: `post-images`
- Max size: 10MB per image
- Max count: 10 images per post
- Supported formats: JPG, PNG, GIF, WebP

### Videos
- Storage bucket: `post-videos`
- Max size: 100MB per video
- Supported formats: MP4, WebM, MOV

## Validation Rules

### Text Posts
- Headline: Required, max 300 characters
- Description: Optional, max 5000 characters

### Image Posts
- Headline: Required, max 300 characters
- Images: Required, max 10 images
- Description: Optional, max 5000 characters

### Video Posts
- Headline: Required, max 300 characters
- Video: Required (URL or file)
- Description: Optional, max 5000 characters

### Link Posts
- Headline: Required, max 300 characters
- URL: Required, must be valid
- Description: Optional, max 5000 characters

### Poll Posts
- Headline: Required, max 300 characters
- Question: Required, max 200 characters
- Options: Min 2, max 6 options
- Description: Optional, max 5000 characters

## Tags System

- Max 10 tags per post
- Tags are automatically converted to lowercase
- Duplicate tags are prevented
- Suggestions system available
- Keyboard: Enter or comma to add tags

## Anonymous Posting

Three display modes available:
1. **Full**: Complete identity shown
2. **Partial**: Only branch/year shown (requires email verification)
3. **Anonymous**: Completely anonymous

## Draft Saving

Posts can be saved as drafts for later editing. Drafts are only visible to the author.

## Poll System

### Expiry Options
- 1 hour
- 6 hours
- 1 day
- 3 days
- 1 week
- Never (1 year)

### Voting
- One vote per user
- Real-time results
- Automatic expiry handling

## Future Enhancements

- Scheduled posting
- Post editing
- Rich media embedding
- Advanced moderation tools
- Post analytics
- Cross-posting to multiple communities

## Troubleshooting

### Common Issues

1. **Rich text editor not loading**
   - Ensure `react-quill` is installed
   - Check CSS imports

2. **File upload failures**
   - Verify storage bucket permissions
   - Check file size limits

3. **Link preview not working**
   - Check API endpoint accessibility
   - Verify CORS settings

4. **Database errors**
   - Run the migration script
   - Check RLS policies

## Contributing

When adding new post types or features:
1. Update the database schema
2. Create corresponding form component
3. Add validation rules
4. Update TypeScript types
5. Test with various content types
