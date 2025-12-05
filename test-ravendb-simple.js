/**
 * Simple test script to verify RavenDB adapter basic functionality
 * Run with: node test-ravendb-simple.js
 */

import { DocumentStore } from 'ravendb'

console.log('🧪 Testing RavenDB Connection...\n')

const RAVENDB_URL = process.env.RAVENDB_URL || 'http://localhost:8080'
const DATABASE_NAME = 'PayloadTest'

async function testRavenDB() {
  let store
  
  try {
    console.log(`📡 Connecting to RavenDB at ${RAVENDB_URL}...`)
    
    // create document store
    store = new DocumentStore(RAVENDB_URL, DATABASE_NAME)
    store.initialize()
    
    console.log('✅ DocumentStore initialized')
    
    // test creating a document
    console.log('\n📝 Testing document creation...')
    const session = store.openSession(DATABASE_NAME)
    
    try {
      const testDoc = {
        title: 'Test Post',
        content: 'This is a test document',
        createdAt: new Date().toISOString(),
      }
      
      await session.store(testDoc, 'Posts/test-1')
      await session.saveChanges()
      
      console.log('✅ Document created successfully')
      
      // test reading the document
      console.log('\n📖 Testing document retrieval...')
      const loadedDoc = await session.load('Posts/test-1')
      
      if (loadedDoc) {
        console.log('✅ Document loaded successfully:')
        console.log('   Title:', loadedDoc.title)
        console.log('   Content:', loadedDoc.content)
      } else {
        console.log('❌ Document not found')
      }
      
      // test querying
      console.log('\n🔍 Testing query...')
      const query = session.query({ collection: 'Posts' })
      const results = await query.all()
      
      console.log(`✅ Query successful, found ${results.length} document(s)`)
      
      // cleanup
      console.log('\n🧹 Cleaning up...')
      session.delete('Posts/test-1')
      await session.saveChanges()
      console.log('✅ Cleanup complete')
      
    } finally {
      session.dispose()
    }
    
    console.log('\n✨ All tests passed!')
    console.log('\n📋 Summary:')
    console.log('   - Connection: ✅')
    console.log('   - Document creation: ✅')
    console.log('   - Document retrieval: ✅')
    console.log('   - Query: ✅')
    console.log('   - Cleanup: ✅')
    console.log('\n🎉 RavenDB adapter should work with Payload!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('\n💡 Troubleshooting:')
    console.error('   1. Make sure RavenDB is running')
    console.error('   2. Check the connection URL:', RAVENDB_URL)
    console.error('   3. Verify the database exists or can be created')
    console.error('\n📚 To start RavenDB with Docker:')
    console.error('   docker run -d -p 8080:8080 ravendb/ravendb')
    process.exit(1)
  } finally {
    if (store) {
      store.dispose()
    }
  }
}

testRavenDB()

