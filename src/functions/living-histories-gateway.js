const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');
const crypto = require('crypto');

// Import orchestrator function
const { createStoryOrchestration } = require('./orchestrator');

// Initialize Azure Blob Storage
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AzureWebJobsStorage
);
const containerClient = blobServiceClient.getContainerClient('rate-limiting');

// Configuration
const MAX_FREE_USES = parseInt(process.env.MAX_FREE_USES || '1');
const FREE_USERS_BLOB = 'FREE_USER.json';
const PAID_USERS_BLOB = 'PAIDUSER.json';
const CACHE_TTL = 600000; // 10 minutes cache

// In-memory cache
let freeUsersCache = null;
let paidUsersCache = null;
let cacheTime = null;
let initializationPromise = null; // Track initialization state

// Helper: Get client IP
function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

// Helper: Hash IP for privacy
function hashIP(ip) {
  return crypto.createHash('sha256').update(ip + (process.env.IP_SALT || 'default-salt')).digest('hex');
}

// Helper: Get today's date in EST
function getTodayEST() {
  return new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

// Helper: Convert stream to buffer
async function streamToBuffer(readableStream) {
  const chunks = [];
  for await (const chunk of readableStream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// Helper: Ensure blob exists with valid JSON
async function ensureBlobExists(blobName) {
  const blobClient = containerClient.getBlobClient(blobName);
  const blockBlobClient = blobClient.getBlockBlobClient(); // ✅ Get the right client
  
  try {
    const exists = await blobClient.exists();
    
    if (!exists) {
      const emptyJson = '{}';
      const buffer = Buffer.from(emptyJson, 'utf-8');
      
      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: { blobContentType: 'application/json' }
      });
      
      console.log(`Created blob: ${blobName}`);
    }
  } catch (error) {
    console.error(`Error ensuring blob exists (${blobName}):`, error);
    throw error;
  }
}

// Initialize: Create container and blobs if they don't exist
async function initializeStorage() {
  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      // Create container
      const createResult = await containerClient.createIfNotExists();
      if (createResult.succeeded) {
        console.log('Created rate-limiting container');
      }

      // Create both blobs
      await Promise.all([
        ensureBlobExists(FREE_USERS_BLOB),
        ensureBlobExists(PAID_USERS_BLOB)
      ]);

      console.log('Storage initialization complete');
      return true;
    } catch (error) {
      console.error('Error initializing storage:', error);
      // Reset promise so next request can retry
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

// Load users from blob with caching
async function loadUsers(blobName, useCache = true) {
  // Check cache
  if (useCache && cacheTime && Date.now() - cacheTime < CACHE_TTL) {
    if (blobName === FREE_USERS_BLOB && freeUsersCache) return freeUsersCache;
    if (blobName === PAID_USERS_BLOB && paidUsersCache) return paidUsersCache;
  }

  try {
    // Fetch from blob
    const blobClient = containerClient.getBlobClient(blobName);
    const downloadResponse = await blobClient.download();
    const content = await streamToBuffer(downloadResponse.readableStreamBody);
    const users = JSON.parse(content || '{}');

    // Update cache
    if (blobName === FREE_USERS_BLOB) {
      freeUsersCache = users;
    } else if (blobName === PAID_USERS_BLOB) {
      paidUsersCache = users;
    }
    cacheTime = Date.now();

    return users;
  } catch (error) {
    if (error.statusCode === 404) {
      // Blob doesn't exist, try to create it
      console.warn(`Blob ${blobName} not found, attempting to create...`);
      await ensureBlobExists(blobName);
      return {}; // Return empty object for new blob
    }
    throw error;
  }
}

// Save users to blob with optimistic concurrency
async function saveUsers(blobName, users, maxRetries = 3) {
  const blobClient = containerClient.getBlobClient(blobName);
  const blockBlobClient = blobClient.getBlockBlobClient(); // ✅ for upload()

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Get current ETag
      const properties = await blobClient.getProperties();
      const etag = properties.etag;

      // Upload with ETag check
      const content = JSON.stringify(users, null, 2);
      const buffer = Buffer.from(content, 'utf-8');

      await blockBlobClient.upload(buffer, buffer.length, {
        conditions: { ifMatch: etag },
        blobHTTPHeaders: { blobContentType: 'application/json' },
      });

      // Update cache
      if (blobName === FREE_USERS_BLOB) {
        freeUsersCache = users;
      } else if (blobName === PAID_USERS_BLOB) {
        paidUsersCache = users;
      }
      cacheTime = Date.now();

      return true;
    } catch (error) {
      if (error.statusCode === 412 && attempt < maxRetries - 1) {
        // Concurrent modification, retry
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        users = await loadUsers(blobName, false); // Reload latest version
        continue;
      }

      console.error(`Error saving users (${blobName}), attempt ${attempt + 1}:`, error);
      throw error;
    }
  }

  throw new Error('Failed to save users after max retries');
}


// Check and update rate limit
async function checkAndUpdateRateLimit(hashedIP, context) {
  const today = getTodayEST();
  
  // Check if paid user
  const paidUsers = await loadUsers(PAID_USERS_BLOB);
  if (paidUsers[hashedIP]) {
    context.log(`Paid user: ${hashedIP}`);
    return { allowed: true, isPaid: true, remaining: 'unlimited' };
  }
  
  // Check free user
  const freeUsers = await loadUsers(FREE_USERS_BLOB);
  const user = freeUsers[hashedIP];
  
  // New user
  if (!user) {
    freeUsers[hashedIP] = {
      count: 1,
      lastReset: today
    };
    await saveUsers(FREE_USERS_BLOB, freeUsers);
    context.log(`New free user: ${hashedIP}`);
    return { allowed: true, isPaid: false, remaining: MAX_FREE_USES - 1 };
  }
  
  // Reset count if new day
  if (user.lastReset !== today) {
    user.count = 1;
    user.lastReset = today;
    await saveUsers(FREE_USERS_BLOB, freeUsers);
    context.log(`Reset count for user: ${hashedIP}`);
    return { allowed: true, isPaid: false, remaining: MAX_FREE_USES - 1 };
  }
  
  // Check if under limit
  if (user.count < MAX_FREE_USES) {
    user.count += 1;
    await saveUsers(FREE_USERS_BLOB, freeUsers);
    context.log(`Incremented count for user: ${hashedIP} (${user.count}/${MAX_FREE_USES})`);
    return { allowed: true, isPaid: false, remaining: MAX_FREE_USES - user.count };
  }
  
  // Over limit
  context.log(`Rate limit exceeded for user: ${hashedIP}`);
  return { 
    allowed: false, 
    isPaid: false, 
    remaining: 0,
    message: `Daily limit of ${MAX_FREE_USES} stories reached. Resets at midnight EST.`
  };
}

// Main HTTP trigger - Gateway
app.http('living-histories-gateway', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      // Ensure storage is initialized before proceeding
      await initializeStorage();
      
      // Get and hash IP
      const clientIP = getClientIP(request);
      const hashedIP = hashIP(clientIP);
      context.log(`Request from IP: ${clientIP.substring(0, 8)}... (hashed)`);
      
      // Check rate limit
      const rateLimitResult = await checkAndUpdateRateLimit(hashedIP, context);
      
      if (!rateLimitResult.allowed) {
        return {
          status: 429,
          jsonBody: {
            error: 'Rate limit exceeded',
            message: rateLimitResult.message,
            remaining: 0,
            upgradeUrl: process.env.STRIPE_UPGRADE_URL || '/upgrade'
          }
        };
      }
      
      // Parse request body
      const requestBody = await request.json();
      const { eventName, town, country } = requestBody;
      
      if (!eventName || !town || !country) {
        return { 
          status: 400, 
          jsonBody: { error: 'Missing required fields: eventName, town, country' }
        };
      }

      // Call orchestrator to create the story
      const result = await createStoryOrchestration(requestBody, context);
      
      // Add rate limit info to response
      result.jsonBody.rateLimit = {
        remaining: rateLimitResult.remaining,
        isPaid: rateLimitResult.isPaid
      };

      return result;
      
    } catch (error) {
      context.error('Error in gateway:', error);
      return { 
        status: 500, 
        jsonBody: { error: 'Something went wrong.', details: error.message } 
      };
    }
  }
});