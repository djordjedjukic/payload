# RavenDB Adapter Test

This is a simple test configuration to verify the RavenDB adapter works.

## Prerequisites

You need a RavenDB server running. You can:

1. **Use Docker** (easiest):
   ```bash
   docker run -d -p 8080:8080 ravendb/ravendb
   ```

2. **Download RavenDB** from https://ravendb.net/download

3. **Use RavenDB Cloud** (free tier available)

## Running the Test

1. Make sure RavenDB is running on `http://localhost:8080` (or set `RAVENDB_URL` env var)

2. Build the adapter:
   ```bash
   cd packages/db-ravendb
   pnpm build
   ```

3. Run from the root:
   ```bash
   pnpm dev test-ravendb
   ```

## What to Expect

The test will:
1. Initialize Payload with the RavenDB adapter
2. Create a test user
3. Create a test post
4. Query for posts
5. Start the admin panel at http://localhost:3000

## Troubleshooting

If you see errors, check:
- RavenDB server is running
- Connection URL is correct
- Database name is valid
- Check the console for detailed error messages

