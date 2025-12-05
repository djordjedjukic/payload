import { getPayload } from 'payload'
import { ravendbAdapter } from './packages/db-ravendb/src/index.js'

const config = {
  secret: 'TEST_SECRET_PLEASE_CHANGE',
  db: ravendbAdapter({
    url: 'http://localhost:8082',
    database: 'PayloadTest',
  }),
  collections: [
    {
      slug: 'users',
      auth: true,
      fields: [
        {
          name: 'name',
          type: 'text',
        },
      ],
    },
    {
      slug: 'posts',
      admin: {
        useAsTitle: 'title',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'content',
          type: 'textarea',
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' },
          ],
          defaultValue: 'draft',
        },
      ],
    },
  ],
}

async function test() {
  console.log('🚀 Initializing Payload with RavenDB...')
  
  try {
    const payload = await getPayload({ config })
    console.log('✅ Payload initialized successfully!')
    
    console.log('\n📝 Creating a test user...')
    const user = await payload.create({
      collection: 'users',
      data: {
        email: 'test@example.com',
        password: 'test123',
        name: 'Test User',
      },
    })
    console.log('✅ User created:', user.id)
    
    console.log('\n📝 Creating a test post...')
    const post = await payload.create({
      collection: 'posts',
      data: {
        title: 'My First RavenDB Post',
        content: 'This is a test post stored in RavenDB!',
        status: 'published',
      },
    })
    console.log('✅ Post created:', post.id)
    
    console.log('\n🔍 Finding all posts...')
    const posts = await payload.find({
      collection: 'posts',
    })
    console.log('✅ Found', posts.totalDocs, 'post(s)')
    console.log('Posts:', JSON.stringify(posts.docs, null, 2))
    
    console.log('\n✅ All tests passed! Check your RavenDB Studio at http://localhost:8082/')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

test()

