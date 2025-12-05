# Payload Website Template with RavenDB

This is a full-featured Payload CMS website template configured to use RavenDB as the database adapter.

## Features

- ✅ **Full Website Template** - Complete production-ready website with public frontend
- ✅ **RavenDB Database** - Uses RavenDB instead of MongoDB
- ✅ **Admin Panel** - Full-featured admin interface at `/admin`
- ✅ **Public Frontend** - Pages, blog posts, navigation at `/`
- ✅ **Advanced Features**:
  - SEO plugin
  - Form builder
  - Search functionality
  - Redirects management
  - Nested documents
  - Live preview
  - Draft/publish workflow
- ✅ **Rich Content**:
  - Hero sections (High/Medium/Low impact)
  - Content blocks
  - Media management
  - Categories and tags
- ✅ **Styled with Tailwind CSS**

## Prerequisites

- Node.js ^18.20.2 || >=20.9.0
- pnpm ^9.7.0
- RavenDB running at http://localhost:8082

## Getting Started

### 1. Make sure RavenDB is running

```bash
# RavenDB should be accessible at http://localhost:8082
```

### 2. Install dependencies (from monorepo root)

```bash
cd /Users/dd/projects/raven/payload
pnpm install
```

### 3. Build the RavenDB adapter

```bash
cd packages/db-ravendb
pnpm build
cd ../..
```

### 4. Run the website

**IMPORTANT:** This template must be run directly with Next.js, not through the test runner:

```bash
# Navigate to the test directory
cd test/ravendb-website

# Run with Next.js directly
PAYLOAD_DATABASE=ravendb RAVENDB_URL=http://localhost:8082 RAVENDB_DATABASE=PayloadWebsite PAYLOAD_SECRET=test-secret-key pnpm dev
```

The website will be available at:
- **Public Frontend**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin

**Note:** The first time you visit the site, Next.js will compile the pages, which may take a minute or two.

### 5. First-time setup

On first run, you'll need to create an admin user:
1. Go to http://localhost:3000/admin
2. Create your first user account
3. Log in and start creating content!

## What's Different from the Basic Test?

### Basic Test (`test/ravendb-test`)
- Minimal configuration
- Only admin panel (no public frontend)
- Basic collections: users, posts, categories
- No styling or advanced features

### Website Template (`test/ravendb-website`)
- **Complete website** with public frontend
- **Pages collection** - Create custom pages with flexible layouts
- **Blog functionality** - Posts with authors, categories, hero images
- **Media library** - Upload and manage images/files
- **Navigation** - Header and footer with configurable menus
- **Content blocks** - Modular content system (Archive, Banner, CTA, Code, Media, etc.)
- **SEO** - Meta tags, Open Graph, sitemap generation
- **Forms** - Build custom forms with the form builder
- **Search** - Full-text search across content
- **Redirects** - Manage URL redirects
- **Live preview** - Preview content before publishing
- **Responsive design** - Mobile, tablet, desktop breakpoints

## Project Structure

```
test/ravendb-website/
├── src/
│   ├── app/
│   │   ├── (frontend)/     # Public website pages
│   │   └── (payload)/      # Admin panel
│   ├── collections/        # Data models
│   │   ├── Pages.ts
│   │   ├── Posts/
│   │   ├── Media.ts
│   │   ├── Categories.ts
│   │   └── Users/
│   ├── blocks/            # Content blocks
│   ├── components/        # React components
│   ├── Header/           # Site header
│   ├── Footer/           # Site footer
│   ├── heros/            # Hero sections
│   ├── plugins/          # Payload plugins
│   └── payload.config.ts # Main configuration
├── public/               # Static assets
├── package.json
├── next.config.js
└── tailwind.config.mjs
```

## Environment Variables

See `.env` file for configuration options:

- `RAVENDB_URL` - RavenDB server URL (default: http://localhost:8082)
- `RAVENDB_DATABASE` - Database name (default: PayloadWebsite)
- `PAYLOAD_SECRET` - Secret key for JWT tokens
- `PAYLOAD_PUBLIC_SERVER_URL` - Public URL of your site
- `PAYLOAD_DROP_DATABASE` - Drop database on startup (default: false)

## Testing the Website

### Create Content

1. **Create Categories**:
   - Go to `/admin/collections/categories`
   - Add categories like "Technology", "Design", "Business"

2. **Upload Media**:
   - Go to `/admin/collections/media`
   - Upload images for your posts and pages

3. **Create Posts**:
   - Go to `/admin/collections/posts`
   - Create blog posts with titles, content, hero images
   - Assign categories and authors
   - Set status to "Published"

4. **Create Pages**:
   - Go to `/admin/collections/pages`
   - Create custom pages with flexible layouts
   - Use content blocks to build rich pages

5. **Configure Navigation**:
   - Go to `/admin/globals/header`
   - Add navigation links
   - Go to `/admin/globals/footer`
   - Configure footer content

### View Public Site

Visit http://localhost:3000 to see your public website with:
- Homepage
- Blog posts at `/posts`
- Individual post pages at `/posts/[slug]`
- Custom pages at `/[slug]`
- Search functionality

## Differences from MongoDB Version

The RavenDB adapter handles:
- Document IDs with collection prefixes (e.g., `Posts/abc-123`)
- Eventual consistency with `waitForNonStaleResults()`
- Collection metadata for proper indexing
- Relationship queries across collections

Everything else works exactly the same as the MongoDB version!

## Troubleshooting

### Database not found
Make sure RavenDB is running at http://localhost:8082. The adapter will automatically create the database if it doesn't exist.

### Build errors
Make sure you've built the RavenDB adapter first:
```bash
cd packages/db-ravendb && pnpm build
```

### Port already in use
If port 3000 is already in use, you can change it:
```bash
PORT=3001 pnpm dev ravendb-website
```

## Next Steps

- Customize the design in `tailwind.config.mjs`
- Add custom collections in `src/collections/`
- Create custom blocks in `src/blocks/`
- Configure plugins in `src/plugins/`
- Deploy to production (Vercel, Netlify, etc.)

