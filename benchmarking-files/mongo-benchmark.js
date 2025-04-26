const { 
    MongoClient, 
    settings, 
    generateDescription, 
    timeOperation 
} = require('../common');

async function benchmarkMongoDatabase(url, isFerretDB = false) {
    const dbName = `benchmark_${Date.now()}`;
    const collectionName = 'testcollection';
    const dbType = isFerretDB ? 'FerretDB' : 'MongoDB';
    
    console.log(`\n== ${dbType} | Indexes: ${settings.withIndex ? 'YES' : 'NO'} ==`);
    
    // Create an object to store benchmark results
    const benchmarkResults = {
        database: dbType,
        withIndexes: settings.withIndex,
        timestamp: new Date().toISOString(),
        operations: {},
        summary: {
            totalRecords: 0,
            expectedRecords: 0
        }
    };
    
    const client = new MongoClient(url);
    try {
        await client.connect();
        
        const db = client.db(dbName);
        const collection = db.collection(collectionName);
        
        if(settings.withIndex) {
            const indexResult = await timeOperation(dbType, 'Create Indexes', settings.withIndex, async () => {
                await collection.createIndex({ id: 1 });
                await collection.createIndex({ description: "text" });
                await collection.createIndex({ "description_obj.text": 1 });
                return true;
            });
            benchmarkResults.operations['createIndexes'] = indexResult;
        }
        
        const expectedTotal = settings.docsToInsert * settings.iterations;
        benchmarkResults.summary.expectedRecords = expectedTotal;
        
        const insertResult = await timeOperation(dbType, 'Insert', settings.withIndex, async () => {
            for (let index = 0; index < settings.iterations; index++) {
                await collection.insertMany(
                    Array.from({ length: settings.docsToInsert }, (_, i) => ({
                        id: i,
                        batch: index,
                        data: `Test data ${i}`,
                        description: generateDescription(i),
                        description_obj: { text: "Hello World!" },
                        timestamp: new Date(),
                        nested: {
                            value: i * 2,
                            label: `Nested value for ${i}`,
                            metrics: {
                                count: i,
                                average: i / 2,
                                factors: [1, 2, 3, 5, 7]
                            }
                        },
                        tags: ['test', 'benchmark'],
                        references: [
                            { id: i + 1, type: 'next' },
                            { id: i - 1, type: 'previous' }
                        ]
                    }))
                );
                console.log(`Inserted batch ${index + 1}/${settings.iterations}`);
            }
            return true;
        });
        benchmarkResults.operations['insert'] = insertResult;
        
        const countIterations = 5;
        const countAllResult = await timeOperation(dbType, 'Count - All', settings.withIndex, async () => {
            let totalCount;
            for (let i = 0; i < countIterations; i++) {
                totalCount = await collection.countDocuments({});
                if (i === countIterations - 1) {
                    console.log(`Total: ${totalCount}/${expectedTotal}`);
                }
            }
            return { totalCount, expectedTotal };
        });
        benchmarkResults.operations['countAll'] = countAllResult;
        
        const countFilteredResult = await timeOperation(dbType, 'Count - Filtered', settings.withIndex, async () => {
            let filteredCount;
            for (let i = 0; i < countIterations; i++) {
                filteredCount = await collection.countDocuments({ id: { $lt: 5000 } });
                if (i === countIterations - 1) {
                    console.log(`Filtered (id < 5000): ${filteredCount}/${5000 * settings.iterations}`);
                }
            }
            return { filteredCount, expected: 5000 * settings.iterations };
        });
        benchmarkResults.operations['countFiltered'] = countFilteredResult;
        
        const findIterations = settings.iterations;
        const findResult = await timeOperation(dbType, 'Find', settings.withIndex, async () => {
            let docCount;
            for (let i = 0; i < findIterations; i++) {
                const docs = await collection.find({}).limit(10000).toArray();
                docCount = docs.length;
                if (i === findIterations - 1) {
                    console.log(`Found: ${docCount} docs`);
                }
            }
            return { docCount };
        });
        benchmarkResults.operations['find'] = findResult;
        
        const findByIdIterations = settings.iterations;
        const findByIdResult = await timeOperation(dbType, 'FindById', settings.withIndex, async () => {
            for (let iter = 0; iter < findByIdIterations; iter++) {
                await Promise.all(
                    Array.from({ length: 100 }, (_, index) =>
                      collection.find({ id: index }).toArray()
                    )
                );
            }
            return true;
        });
        benchmarkResults.operations['findById'] = findByIdResult;
        
        const findOneByIdResult = await timeOperation(dbType, 'FindOneById', settings.withIndex, async () => {
            await collection.findOne({ id: expectedTotal });
            return true;
        });
        benchmarkResults.operations['findOneById'] = findOneByIdResult;

        const nestedQueryResult = await timeOperation(dbType, 'Nested Query', settings.withIndex, async () => {
            for (let i = 0; i < findIterations; i++) {
                await collection.find({
                    "nested.value": { $gt: 10000 }
                }).limit(1000).toArray();
            }
            return true;
        });
        benchmarkResults.operations['nestedQuery'] = nestedQueryResult;
        
        // Add object search with "o" letter time check
        const objectSearchIterations = settings.iterations;
        const objectSearchResult = await timeOperation(dbType, 'Object Text Search', settings.withIndex, async () => {
            let matchCount;
            for (let i = 0; i < objectSearchIterations; i++) {
                await collection.find({
                    "description_obj.text": { $regex: "o", $options: "i" }
                }).limit(1000).toArray();
            }
            matchCount = await collection.countDocuments({
                "description_obj.text": { $regex: "o", $options: "i" }
            });
            console.log(`Found ${matchCount} documents with 'o' in text field`);
            return { matchCount };
        });
        benchmarkResults.operations['objectTextSearch'] = objectSearchResult;
        
        const searchIterations = settings.iterations;
        const textSearchResult = await timeOperation(dbType, 'Text Search', settings.withIndex, async () => {
            for (let i = 0; i < searchIterations; i++) {
                const searchTerm = ["important", "critical", "database"][i % 3];
                
                if (settings.withIndex) {
                    await collection.find({
                        $text: { $search: searchTerm }
                    }).limit(1000).toArray();
                } else {
                    await collection.find({
                        description: { $regex: searchTerm, $options: 'i' }
                    }).limit(1000).toArray();
                }
            }
            return true;
        });
        benchmarkResults.operations['textSearch'] = textSearchResult;

        const arrayQueryResult = await timeOperation(dbType, 'Array Query', settings.withIndex, async () => {
            for (let i = 0; i < findIterations; i++) {
                await collection.find({
                    tags: "test"
                }).limit(1000).toArray();
            }
            return true;
        });
        benchmarkResults.operations['arrayQuery'] = arrayQueryResult;
        
        const complexQueryIterations = 5;
        const complexQueryResult = await timeOperation(dbType, 'Complex Query', settings.withIndex, async () => {
            for (let i = 0; i < complexQueryIterations; i++) {
                await collection.find({
                    id: { $gte: 1000, $lte: 5000 },
                    batch: { $in: [0, 1] },
                    tags: "test"
                }).sort({ id: -1 }).limit(1000).toArray();
            }
            return true;
        });
        benchmarkResults.operations['complexQuery'] = complexQueryResult;
        
        const aggregationIterations = settings.iterations;
        const aggregationResult = await timeOperation(dbType, 'Aggregation', settings.withIndex, async () => {
            for (let i = 0; i < aggregationIterations; i++) {
                await collection.aggregate([
                    { $match: { batch: { $gte: 0 } } },
                    { $group: { _id: "$batch", count: { $sum: 1 }, avgId: { $avg: "$id" }, avgNestedValue: { $avg: "$nested.value" } } },
                    { $sort: { _id: 1 } }
                ]).toArray();
            }
            return true;
        });
        benchmarkResults.operations['aggregation'] = aggregationResult;
        
        const updateIterations = settings.iterations;
        const updateResult = await timeOperation(dbType, 'Update', settings.withIndex, async () => {
            for (let i = 0; i < updateIterations; i++) {
                await collection.updateMany(
                    { id: { $lt: 1000 } },
                    { $set: { updated: true, updateCount: i } }
                );
            }
            return true;
        });
        benchmarkResults.operations['update'] = updateResult;

        const nestedUpdateResult = await timeOperation(dbType, 'Nested Update', settings.withIndex, async () => {
            for (let i = 0; i < Math.min(5, updateIterations); i++) {
                await collection.updateMany(
                    { id: { $lt: 1000 } },
                    { $set: { "nested.metrics.updated_count": i } }
                );
            }
            return true;
        });
        benchmarkResults.operations['nestedUpdate'] = nestedUpdateResult;
        
        // Add JSONB Path operations (mimic PostgreSQL's capability)
        const jsonPathResult = await timeOperation(dbType, 'JSON Path Query', settings.withIndex, async () => {
            for (let i = 0; i < Math.min(5, findIterations); i++) {
                // MongoDB's equivalent of PostgreSQL's jsonb_path_query
                await collection.find({
                    "nested.metrics.count": { $gt: 5000 }
                }).limit(1000).toArray();
            }
            return true;
        });
        benchmarkResults.operations['jsonPathQuery'] = jsonPathResult;
        
        const jsonContainmentResult = await timeOperation(dbType, 'JSON Containment', settings.withIndex, async () => {
            for (let i = 0; i < Math.min(5, findIterations); i++) {
                // MongoDB's equivalent to PostgreSQL's @> operator
                await collection.find({
                    "nested.metrics": { $elemMatch: { $eq: 3 } }
                }).limit(1000).toArray();
            }
            return true;
        });
        benchmarkResults.operations['jsonContainment'] = jsonContainmentResult;
        
        const deleteIterations = 2;
        const deleteResult = await timeOperation(dbType, 'Delete', settings.withIndex, async () => {
            let totalDeleted = 0;
            for (let i = 0; i < deleteIterations; i++) {
                const batchSize = Math.floor(expectedTotal / deleteIterations);
                const deleteResult = await collection.deleteMany({ 
                    id: { $gte: i * batchSize, $lt: (i+1) * batchSize }
                });
                totalDeleted += deleteResult.deletedCount;
            }
            console.log(`Deleted: ${totalDeleted}`);
            return { totalDeleted };
        });
        benchmarkResults.operations['delete'] = deleteResult;
        
        await db.dropDatabase();
        console.log(`Dropped database ${dbName}`);
        
        return benchmarkResults;
        
    } finally {
        await client.close();
    }
}

module.exports = benchmarkMongoDatabase;