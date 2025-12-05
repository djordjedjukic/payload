# Payload CMS - Enhanced Test with RavenDB

This is an enhanced Payload CMS test configuration with RavenDB that includes more realistic features than the basic test, but without the complexity of the full website template.

## What's Included

### Collections

1. **Users** - Authentication with roles (Admin, Editor, User)
2. **Pages** - Create custom pages with rich text content
3. **Posts** - Blog posts with:
   - Rich text content (Lexical editor)
   - Featured images
   - Author relationships
   - Category relationships
   - Tags
   - Draft/Published status
4. **Categories** - Organize posts with categories (with colors and slugs)
5. **Media** - Upload and manage images and PDFs

### Features

- ✅ **RavenDB Database** - Full RavenDB integration
- ✅ **Admin Panel** - Complete admin interface at `/admin`
- ✅ **Rich Text Editor** - Lexical editor for content
- ✅ **File Uploads** - Media library with image and PDF support
- ✅ **Relationships** - Posts linked to authors and categories
- ✅ **Authentication** - User roles and permissions
- ✅ **Draft/Publish Workflow** - Content status management

## Running the Test

### Prerequisites

- RavenDB running at http://localhost:8082
- Node.js and pnpm installed

### Start the Server

```bash
# From monorepo root
pnpm dev ravendb-website-simple
```

The admin panel will be available at: **http://localhost:3000/admin**

### First-Time Setup

1. Go to http://localhost:3000/admin
2. Create your first user account
3. Log in and start creating content!

## Testing Workflow

### 1. Create Categories

- Go to `/admin/collections/categories`
- Create a few categories like:
  - Technology (slug: `technology`, color: `#3B82F6`)
  - Design (slug: `design`, color: `#8B5CF6`)
  - Business (slug: `business`, color: `#10B981`)

### 2. Upload Media

- Go to `/admin/collections/media`
- Upload some images for your posts
- Add alt text and captions

### 3. Create Pages

- Go to `/admin/collections/pages`
- Create pages like:
  - About (slug: `about`)
  - Contact (slug: `contact`)
- Add rich text content
- Set status to "Published"

### 4. Create Posts

- Go to `/admin/collections/posts`
- Create blog posts with:
  - Title and slug
  - Excerpt (short description)
  - Rich text content
  - Featured image
  - Author (yourself)
  - Categories
  - Tags
  - Status: Published

### 5. Test Relationships

- Create multiple posts and assign them to different categories
- Assign different authors to posts
- Test filtering and sorting in the admin panel

### 6. Test Media

- Upload different types of images
- Use uploaded images in posts as featured images
- Test the media library search and filtering

## What Makes This Different?

### vs. Basic Test (`test/ravendb-test`)

**Basic Test:**
- 3 collections (users, posts, categories)
- Simple text fields only
- No media uploads
- No rich text editor

**This Test:**
- 5 collections (users, pages, posts, categories, media)
- Rich text editor (Lexical)
- File uploads with media library
- More realistic data relationships
- User roles
- Draft/publish workflow

### vs. Full Website Template (`templates/website`)

**Full Website:**
- Complete public frontend with Next.js pages
- Advanced features (SEO, forms, search, redirects)
- Content blocks system
- Styled with Tailwind CSS
- Production-ready

**This Test:**
- Admin panel only (no public frontend)
- Core CMS features
- Simpler configuration
- Easier to understand and modify
- Perfect for testing database adapter

## API Endpoints

You can also test the REST API:

- `GET /api/users` - List users
- `GET /api/pages` - List pages
- `GET /api/posts` - List posts
- `GET /api/categories` - List categories
- `GET /api/media` - List media files
- `GET /api/posts/{id}` - Get specific post
- `POST /api/posts` - Create new post (requires authentication)
- `PATCH /api/posts/{id}` - Update post (requires authentication)
- `DELETE /api/posts/{id}` - Delete post (requires authentication)

## RavenDB Features Being Tested

This configuration tests:

- ✅ **Document Creation** - Creating users, posts, pages, categories, media
- ✅ **Document Updates** - Editing existing documents
- ✅ **Document Deletion** - Removing documents
- ✅ **Queries** - Finding documents by various criteria
- ✅ **Relationships** - Posts → Users, Posts → Categories, Posts → Media
- ✅ **Sorting** - Ordering results by different fields
- ✅ **Filtering** - Searching and filtering collections
- ✅ **File Uploads** - Storing media metadata
- ✅ **Authentication** - User login and sessions
- ✅ **Transactions** - Multi-document operations

## Configuration

The configuration is in `config.ts`. Key settings:

```typescript
db: ravendbAdapter({
  url: process.env.RAVENDB_URL || 'http://localhost:8082',
  database: process.env.RAVENDB_DATABASE || 'PayloadWebsiteSimple',
})
```

## Troubleshooting

### Server won't start

Make sure RavenDB is running:
```bash
# Check if RavenDB is accessible
curl http://localhost:8082
```

### Build errors

Rebuild the RavenDB adapter:
```bash
cd packages/db-ravendb && pnpm build
```

### Port 3000 in use

Change the port:
```bash
PORT=3001 pnpm dev ravendb-website-simple
```

## Next Steps

After testing this configuration:

1. **Try the full website template** - See `test/ravendb-website` (when path alias issues are resolved)
2. **Create your own project** - Use this as a starting point
3. **Add custom collections** - Extend the configuration with your own data models
4. **Test advanced features** - Try hooks, access control, custom endpoints

## Summary

This test configuration provides a **realistic CMS experience** without the complexity of a full production setup. It's perfect for:

- Testing the RavenDB adapter with real-world features
- Learning Payload CMS concepts
- Prototyping your own CMS projects
- Verifying database operations work correctly

Enjoy testing! 🚀

