import { buildConfig } from 'payload'
import { ravendbAdapter } from '../packages/db-ravendb/src/index.js'

export default buildConfig({
  secret: 'test-secret-key',
  db: ravendbAdapter({
    url: process.env.RAVENDB_URL || 'http://localhost:8080',
    database: process.env.RAVENDB_DATABASE || 'PayloadTest',
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
  admin: {
    autoLogin: {
      email: 'test@example.com',
      password: 'test',
    },
  },
  onInit: async (payload) => {
    console.log('Payload initialized with RavenDB adapter!')
    
    // create a test user
    try {
      await payload.create({
        collection: 'users',
        data: {
          email: 'test@example.com',
          password: 'test',
          name: 'Test User',
        },
      })
      console.log('✅ Created test user')
    } catch (error) {
      console.log('User might already exist:', error.message)
    }
    
    // create a test post
    try {
      const post = await payload.create({
        collection: 'posts',
        data: {
          title: 'Hello RavenDB!',
          content: 'This is a test post using the RavenDB adapter.',
          status: 'published',
        },
      })
      console.log('✅ Created test post:', post.id)
    } catch (error) {
      console.log('❌ Error creating post:', error.message)
    }
    
    // try to find posts
    try {
      const posts = await payload.find({
        collection: 'posts',
      })
      console.log('✅ Found posts:', posts.totalDocs)
    } catch (error) {
      console.log('❌ Error finding posts:', error.message)
    }
  },
})

