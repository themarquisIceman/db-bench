require('dotenv').config(); // For environment variables
const { MongoClient } = require('mongodb');
const ProgressBar = require('progress');

// Configuration (you can use .env file for these values)
const SOURCE_URI = process.env.SOURCE_MONGODB_URI || 'mongodb://user:pass@localhost:27017';
const TARGET_URI = process.env.SOURCE_TARGET_URI||'mongodb://user:pass@localhost:27011';// FerretDB typically uses MongoDB protocol
const SOURCE_DB = process.env.SOURCE_DB_NAME || 'database';
const TARGET_DB = process.env.TARGET_DB_NAME || 'database';
const COLLECTIONS = []; // Collections to migrate, empty means all
const BATCH_SIZE = 100; // Batch size for processing
const CONCURRENT_BATCHES = 10; // Number of concurrent batch operations

// Authentication credentials
const SOURCE_USERNAME = process.env.SOURCE_USERNAME || '';
const SOURCE_PASSWORD = process.env.SOURCE_PASSWORD || '';
const TARGET_USERNAME = process.env.TARGET_USERNAME || '';
const TARGET_PASSWORD = process.env.TARGET_PASSWORD || '';

async function connectToDatabase(uri, isSource = true) {
  try {
    const options = {
      // If using older MongoDB versions, you might need different options
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };

    // Add authentication if credentials are provided
    if (isSource && (SOURCE_USERNAME && SOURCE_PASSWORD)) {
      console.log(`🔐 Using authentication for source database`);
      options.auth = {
        username: SOURCE_USERNAME,
        password: SOURCE_PASSWORD
      };
    } else if (!isSource && (TARGET_USERNAME && TARGET_PASSWORD)) {
      console.log(`🔐 Using authentication for target database`);
      options.auth = {
        username: TARGET_USERNAME,
        password: TARGET_PASSWORD
      };
    }

    const client = new MongoClient(uri, options);
    await client.connect();
    console.log(`✅ Connected to ${uri}`);
    return client;
  } catch (error) {
    console.error(`❌ Failed to connect to ${uri}:`, error);
    console.error(`💡 If this is an authentication error, make sure to set the correct USERNAME and PASSWORD environment variables`);
    throw error;
  }
}

async function getCollectionsToMigrate(sourceClient, specifiedCollections) {
  const db = sourceClient.db(SOURCE_DB);
  let collections;
  
  // Always list all available collections for debugging
  const allCollections = await db.listCollections().toArray();
  const allCollectionNames = allCollections.map(c => c.name);
  console.log(`📋 Available collections in source database: ${allCollectionNames.join(', ')}`);
  
  if (specifiedCollections.length > 0) {
    // Filter to only include existing collections
    collections = specifiedCollections.filter(name => allCollectionNames.includes(name));
    
    // Warn about non-existent collections
    const nonExistent = specifiedCollections.filter(name => !allCollectionNames.includes(name));
    if (nonExistent.length > 0) {
      console.warn(`⚠️ Some specified collections don't exist: ${nonExistent.join(', ')}`);
      console.warn(`⚠️ Make sure collection names are spelled correctly with correct case sensitivity`);
    }
  } else {
    // Get all collections
    collections = allCollectionNames;
  }
  
  return collections;
}

async function processBatch(documents, targetCollection, existingIds, bar) {
  let migratedCount = 0;
  const documentsToInsert = documents.filter(doc => !existingIds.has(doc._id.toString()));
  
  // Add all these IDs to the existing set to prevent future duplicates
  documentsToInsert.forEach(doc => existingIds.add(doc._id.toString()));
  
  if (documentsToInsert.length === 0) {
    return 0;
  }

  try {
    // Process each document individually for better error tracking
    const insertPromises = documentsToInsert.map(async (doc) => {
      try {
        await targetCollection.insertOne(doc);
        return 1;
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️ Skipping duplicate document with _id: ${doc._id}`);
        } else {
          console.error(`❌ Error inserting document: ${error.message}`);
        }
        return 0;
      }
    });

    const results = await Promise.all(insertPromises);
    const insertedCount = results.reduce((acc, val) => acc + val, 0);
    bar.tick(documents.length);
    return insertedCount;
  } catch (error) {
    console.error(`❌ Batch error: ${error.message}`);
    return 0;
  }
}

async function migrateCollection(sourceClient, targetClient, collectionName) {
  const sourceDb = sourceClient.db(SOURCE_DB);
  const targetDb = targetClient.db(TARGET_DB);
  
  // Get source collection
  const sourceCollection = sourceDb.collection(collectionName);
  const totalDocs = await sourceCollection.countDocuments({});
  
  // Create target collection (if it doesn't exist)
  const targetCollection = targetDb.collection(collectionName);
  
  // Count documents for progress bar
  console.log(`📊 Migrating ${totalDocs} documents from ${collectionName}`);
  
  if (totalDocs === 0) {
    console.log(`ℹ️ Collection ${collectionName} is empty. Skipping.`);
    return 0;
  }

  // Create progress bar
  const bar = new ProgressBar('🔄 Migrating [:bar] :current/:total documents (:percent) - :rate/docs per second - ETA: :eta s', {
    total: totalDocs,
    width: 30,
    complete: '=',
    incomplete: ' ',
  });
  
  // Store all existing _id values from target to avoid duplicates
  console.log(`🔍 Checking for existing documents in target collection...`);
  const existingIds = new Set();
  const existingCursor = targetCollection.find({}, { projection: { _id: 1 } });
  while (await existingCursor.hasNext()) {
    const doc = await existingCursor.next();
    existingIds.add(doc._id.toString());
  }
  console.log(`🔍 Found ${existingIds.size} existing documents in target collection`);
  
  let migratedCount = 0;
  
  try {
    // Calculate number of batches needed
    const totalBatches = Math.ceil(totalDocs / BATCH_SIZE);
    console.log(`📊 Will process ${totalBatches} batches with up to ${CONCURRENT_BATCHES} in parallel`);
    
    // Create an array of batch operations to run in parallel
    const batchPromises = [];
    
    // Process documents in parallel batches with skip/limit
    for (let i = 0; i < Math.min(totalBatches, CONCURRENT_BATCHES); i++) {
      batchPromises.push(processBatchWithSkipLimit(
        i, 
        sourceCollection, 
        targetCollection, 
        existingIds, 
        totalDocs, 
        totalBatches, 
        bar
      ));
    }
    
    // Process all batches and collect results
    const results = await Promise.all(batchPromises);
    migratedCount = results.reduce((total, count) => total + count, 0);
    
    // Process any remaining batches in case the first set finished early
    if (totalBatches > CONCURRENT_BATCHES) {
      console.log(`📊 Processing remaining batches...`);
      const remainingBatchPromises = [];
      for (let i = CONCURRENT_BATCHES; i < totalBatches; i++) {
        remainingBatchPromises.push(processBatchWithSkipLimit(
          i, 
          sourceCollection, 
          targetCollection, 
          existingIds, 
          totalDocs, 
          totalBatches, 
          bar
        ));
      }
      
      const remainingResults = await Promise.all(remainingBatchPromises);
      migratedCount += remainingResults.reduce((total, count) => total + count, 0);
    }
    
    console.log(`✅ Completed migration of ${migratedCount} documents from ${collectionName}`);
    return migratedCount;
  } catch (error) {
    console.error(`❌ Error migrating collection ${collectionName}:`, error);
    return migratedCount;
  }
}

async function migrateIndexes(sourceClient, targetClient, collectionName) {
  const sourceDb = sourceClient.db(SOURCE_DB);
  const targetDb = targetClient.db(TARGET_DB);
  
  try {
    // Get source collection indexes
    const sourceIndexes = await sourceDb.collection(collectionName).indexes();
    
    // Filter out the default _id index that's created automatically
    const indexesToCreate = sourceIndexes.filter(index => index.name !== '_id_');
    
    if (indexesToCreate.length === 0) {
      console.log(`ℹ️ No custom indexes to migrate for ${collectionName}`);
      return;
    }
    
    console.log(`📊 Migrating ${indexesToCreate.length} indexes for ${collectionName}`);
    
    // Create indexes concurrently
    const indexPromises = indexesToCreate.map(async (indexSpec) => {
      try {
        const { name, key, ...options } = indexSpec;
        
        // Remove unsupported options that might cause issues with FerretDB
        delete options.partialFilterExpression;
        delete options.weights;
        delete options.default_language;
        delete options.language_override;
        delete options.textIndexVersion;
        
        await targetDb.collection(collectionName).createIndex(key, {
          name,
          ...options,
        });
        console.log(`✅ Created index ${name} on ${collectionName}`);
      } catch (indexError) {
        console.error(`❌ Error creating index ${indexSpec.name} for ${collectionName}:`, indexError.message);
        if (indexError.message && indexError.message.includes('authentication')) {
          console.error(`💡 This appears to be an authentication error. Check your TARGET_USERNAME and TARGET_PASSWORD environment variables.`);
        }
      }
    });
    
    await Promise.all(indexPromises);
  } catch (error) {
    console.error(`❌ Error retrieving indexes for ${collectionName}:`, error);
    if (error.message && error.message.includes('authentication')) {
      console.error(`💡 This appears to be an authentication error. Check your credentials.`);
    }
  }
}

async function main() {
  console.log('🚀 Starting MongoDB to FerretDB migration');
  console.log(`📊 Source: ${SOURCE_URI}/${SOURCE_DB}`);
  console.log(`📊 Target: ${TARGET_URI}/${TARGET_DB}`);
  console.log(`📊 Concurrent batches: ${CONCURRENT_BATCHES}`);
  
  const startTime = Date.now();
  let sourceClient;
  let targetClient;
  
  try {
    // Connect to both MongoDB instances
    sourceClient = await connectToDatabase(SOURCE_URI, true);
    targetClient = await connectToDatabase(TARGET_URI, false);
    
    // Get collections to migrate
    const collections = await getCollectionsToMigrate(sourceClient, COLLECTIONS);
    console.log(`📋 Collections to migrate: ${collections.join(', ')}`);
    
    // Migrate each collection
    let totalDocsMigrated = 0;
    for (const collectionName of collections) {
      console.log(`\n📂 Migrating collection: ${collectionName}`);
      const migratedCount = await migrateCollection(sourceClient, targetClient, collectionName);
      totalDocsMigrated += migratedCount;
      
      // Migrate indexes after data
      await migrateIndexes(sourceClient, targetClient, collectionName);
    }
    
    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n✅ Migration completed successfully!`);
    console.log(`📊 Total documents migrated: ${totalDocsMigrated}`);
    console.log(`⏱️ Total time: ${duration.toFixed(2)} seconds`);
    console.log(`📈 Average rate: ${(totalDocsMigrated / duration).toFixed(2)} docs/second`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Close connections
    if (sourceClient) await sourceClient.close();
    if (targetClient) await targetClient.close();
    console.log('🔌 Database connections closed');
  }
}

// Helper function to process a batch with skip/limit for parallel processing
async function processBatchWithSkipLimit(batchIndex, sourceCollection, targetCollection, existingIds, totalDocs, totalBatches, bar) {
  const skip = batchIndex * BATCH_SIZE;
  const remainingDocs = totalDocs - skip;
  const limit = Math.min(BATCH_SIZE, remainingDocs);
  
  if (limit <= 0) return 0;
  
  try {
    // Use skip/limit for parallel fetching
    const documents = await sourceCollection.find({})
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Process this batch
    const insertedCount = await processBatch(documents, targetCollection, existingIds, bar);
    return insertedCount;
  } catch (error) {
    console.error(`❌ Error processing batch ${batchIndex + 1}/${totalBatches}: ${error.message}`);
    return 0;
  }
}

// Run the migration
main().catch(console.error);