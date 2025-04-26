const { 
    Pool, 
    settings, 
    generateDescription, 
    timeOperation 
} = require('../common');

async function benchmarkPostgreSQL(pgConfig) {
    const dbName = `benchmark_${Date.now()}`;
    const tableName = 'testcollection';
    const dbType = 'PostgreSQL';
    
    console.log(`\n== ${dbType} (Relational) | Indexes: ${settings.withIndex ? 'YES' : 'NO'} ==`);
    
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
    
    const pool = new Pool(pgConfig);
    try {
        const client = await pool.connect();
        try {
            const checkResult = await client.query(`
                SELECT 1 FROM pg_database WHERE datname = $1
            `, [dbName]);
            
            if (checkResult.rows.length > 0) {
                await client.query(`
                    SELECT pg_terminate_backend(pg_stat_activity.pid)
                    FROM pg_stat_activity
                    WHERE pg_stat_activity.datname = $1
                    AND pid <> pg_backend_pid()
                `, [dbName]);
                
                await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
            }
            
            await client.query(`CREATE DATABASE ${dbName}`);
        } finally {
            client.release();
        }
        
        const benchmarkPool = new Pool({
            ...pgConfig,
            database: dbName
        });
        
        try {
            // Create table with enhanced structure to match MongoDB's capabilities
            await benchmarkPool.query(`
                CREATE TABLE ${tableName} (
                    id INTEGER,
                    batch INTEGER,
                    data TEXT,
                    description TEXT,
                    description_obj JSONB,
                    timestamp TIMESTAMP,
                    updated BOOLEAN,
                    update_count INTEGER,
                    nested JSONB,
                    tags TEXT[],
                    "references" JSONB
                )
            `);
            
            if(settings.withIndex) {
                const indexResult = await timeOperation(dbType, 'Create Indexes', settings.withIndex, async () => {
                    await benchmarkPool.query(`CREATE INDEX idx_id ON ${tableName}(id)`);
                    await benchmarkPool.query(`CREATE INDEX idx_description_gin ON ${tableName} USING gin(to_tsvector('english', description))`);
                    await benchmarkPool.query(`CREATE INDEX idx_description_obj ON ${tableName} USING gin(description_obj)`);
                    await benchmarkPool.query(`CREATE INDEX idx_nested ON ${tableName} USING gin(nested)`);
                    await benchmarkPool.query(`CREATE INDEX idx_tags ON ${tableName} USING gin(tags)`);
                    return true;
                });
                benchmarkResults.operations['createIndexes'] = indexResult;
            }
            
            const expectedTotal = settings.docsToInsert * settings.iterations;
            benchmarkResults.summary.expectedRecords = expectedTotal;
            
            const insertResult = await timeOperation(dbType, 'Insert', settings.withIndex, async () => {
                for (let index = 0; index < settings.iterations; index++) {
                    for (let i = 0; i < settings.docsToInsert; i += 100) {
                        const batchSize = Math.min(100, settings.docsToInsert - i);
                        const valueStrings = [];
                        
                        for (let j = 0; j < batchSize; j++) {
                            const description = generateDescription(i + j);
                            const nestedObj = JSON.stringify({
                                value: (i + j) * 2,
                                label: `Nested value for ${i + j}`,
                                metrics: {
                                    count: i + j,
                                    average: (i + j) / 2,
                                    factors: [1, 2, 3, 5, 7]
                                }
                            });
                            const referencesObj = JSON.stringify([
                                { id: i + j + 1, type: 'next' },
                                { id: i + j - 1, type: 'previous' }
                            ]);
                            
                            valueStrings.push(`(${i + j}, ${index}, 'Test data ${i + j}', '${description}', '{"text": "Hello World!"}'::jsonb, NOW(), NULL, NULL, '${nestedObj}'::jsonb, ARRAY['test', 'benchmark'], '${referencesObj}'::jsonb)`);
                        }
                        
                        const query = `
                            INSERT INTO ${tableName} (id, batch, data, description, description_obj, timestamp, updated, update_count, nested, tags, "references")
                            VALUES ${valueStrings.join(', ')}
                        `;
                        
                        await benchmarkPool.query(query);
                    }
                    console.log(`Inserted batch ${index + 1}/${settings.iterations}`);
                }
                return true;
            });
            benchmarkResults.operations['insert'] = insertResult;
            
            const countIterations = 5;
            const countAllResult = await timeOperation(dbType, 'Count - All', settings.withIndex, async () => {
                let totalCount;
                for (let i = 0; i < countIterations; i++) {
                    const result = await benchmarkPool.query(`SELECT COUNT(*) FROM ${tableName}`);
                    totalCount = parseInt(result.rows[0].count);
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
                    const result = await benchmarkPool.query(`SELECT COUNT(*) FROM ${tableName} WHERE id < $1::int`, [5000]);
                    filteredCount = parseInt(result.rows[0].count);
                    if (i === countIterations - 1) {
                        console.log(`Filtered (id < 5000): ${filteredCount}/${5000 * settings.iterations}`);
                    }
                }
                return { filteredCount, expected: 5000 * settings.iterations };
            });
            benchmarkResults.operations['countFiltered'] = countFilteredResult;
            
            const findIterations = settings.iterations;
            const findResult = await timeOperation(dbType, 'Find', settings.withIndex, async () => {
                let rowCount;
                for (let i = 0; i < findIterations; i++) {
                    const result = await benchmarkPool.query(`SELECT * FROM ${tableName} LIMIT 10000`);
                    rowCount = result.rows.length;
                    if (i === findIterations - 1) {
                        console.log(`Found: ${rowCount} rows`);
                    }
                }
                return { rowCount };
            });
            benchmarkResults.operations['find'] = findResult;
            
            const findByIdIterations = settings.iterations;
            const findByIdResult = await timeOperation(dbType, 'FindById', settings.withIndex, async () => {
                for (let iter = 0; iter < findByIdIterations; iter++) {
                    const promises = Array.from({ length: 100 }, (_, index) => 
                        benchmarkPool.query(`SELECT * FROM ${tableName} WHERE id = $1::int`, [index])
                    );
                    await Promise.all(promises);
                }
                return true;
            });
            benchmarkResults.operations['findById'] = findByIdResult;
            
            const findOneByIdResult = await timeOperation(dbType, 'FindOneById', settings.withIndex, async () => {
                await benchmarkPool.query(`SELECT * FROM ${tableName} WHERE id = $1::int LIMIT 1`, [expectedTotal]);
                return true;
            });
            benchmarkResults.operations['findOneById'] = findOneByIdResult;
            
            // Add nested query test (similar to MongoDB's nested query)
            const nestedQueryResult = await timeOperation(dbType, 'Nested Query', settings.withIndex, async () => {
                for (let i = 0; i < findIterations; i++) {
                    await benchmarkPool.query(`
                        SELECT * FROM ${tableName}
                        WHERE (nested->>'value')::int > 10000
                        LIMIT 1000
                    `);
                }
                return true;
            });
            benchmarkResults.operations['nestedQuery'] = nestedQueryResult;
            
            // Add object search with "o" letter time check
            const objectSearchIterations = settings.iterations;
            const objectSearchResult = await timeOperation(dbType, 'Object Text Search', settings.withIndex, async () => {
                for (let i = 0; i < objectSearchIterations; i++) {
                    if (settings.withIndex) {
                        await benchmarkPool.query(`
                            SELECT * FROM ${tableName}
                            WHERE description_obj->>'text' LIKE '%o%'
                            LIMIT 1000
                        `);
                    } else {
                        await benchmarkPool.query(`
                            SELECT * FROM ${tableName}
                            WHERE description_obj->>'text' LIKE '%o%'
                            LIMIT 1000
                        `);
                    }
                }
                const result = await benchmarkPool.query(`
                    SELECT COUNT(*) FROM ${tableName}
                    WHERE description_obj->>'text' LIKE '%o%'
                `);
                console.log(`Found ${result.rows[0].count} documents with 'o' in text field`);
                return { matchCount: parseInt(result.rows[0].count) };
            });
            benchmarkResults.operations['objectTextSearch'] = objectSearchResult;
            
            const searchIterations = settings.iterations;
            const textSearchResult = await timeOperation(dbType, 'Text Search', settings.withIndex, async () => {
                for (let i = 0; i < searchIterations; i++) {
                    const searchTerm = ["important", "critical", "database"][i % 3];
                    
                    if (settings.withIndex) {
                        await benchmarkPool.query(`
                            SELECT * FROM ${tableName}
                            WHERE to_tsvector('english', description) @@ to_tsquery('english', $1)
                            LIMIT 1000
                        `, [searchTerm]);
                    } else {
                        await benchmarkPool.query(`
                            SELECT * FROM ${tableName}
                            WHERE description ILIKE $1
                            LIMIT 1000
                        `, [`%${searchTerm}%`]);
                    }
                }
                return true;
            });
            benchmarkResults.operations['textSearch'] = textSearchResult;
            
            // Add array query test (similar to MongoDB's array query)
            const arrayQueryResult = await timeOperation(dbType, 'Array Query', settings.withIndex, async () => {
                for (let i = 0; i < findIterations; i++) {
                    await benchmarkPool.query(`
                        SELECT * FROM ${tableName}
                        WHERE 'test' = ANY(tags)
                        LIMIT 1000
                    `);
                }
                return true;
            });
            benchmarkResults.operations['arrayQuery'] = arrayQueryResult;
            
            const complexQueryIterations = 5;
            const complexQueryResult = await timeOperation(dbType, 'Complex Query', settings.withIndex, async () => {
                for (let i = 0; i < complexQueryIterations; i++) {
                    await benchmarkPool.query(`
                        SELECT * FROM ${tableName}
                        WHERE id BETWEEN 1000 AND 5000
                        AND batch IN (0, 1)
                        AND 'test' = ANY(tags)
                        ORDER BY id DESC
                        LIMIT 1000
                    `);
                }
                return true;
            });
            benchmarkResults.operations['complexQuery'] = complexQueryResult;
            
            const aggregationIterations = settings.iterations;
            const aggregationResult = await timeOperation(dbType, 'Aggregation', settings.withIndex, async () => {
                for (let i = 0; i < aggregationIterations; i++) {
                    await benchmarkPool.query(`
                        SELECT 
                            batch, 
                            COUNT(*), 
                            AVG(id) as avg_id,
                            AVG((nested->>'value')::float) as avg_nested_value
                        FROM ${tableName}
                        WHERE batch >= 0
                        GROUP BY batch
                        ORDER BY batch
                    `);
                }
                return true;
            });
            benchmarkResults.operations['aggregation'] = aggregationResult;
            
            const updateIterations = settings.iterations;
            const updateResult = await timeOperation(dbType, 'Update', settings.withIndex, async () => {
                for (let i = 0; i < updateIterations; i++) {
                    await benchmarkPool.query(`
                        UPDATE ${tableName}
                        SET updated = true, update_count = $1::int
                        WHERE id < 1000
                    `, [i]);
                }
                return true;
            });
            benchmarkResults.operations['update'] = updateResult;
            
            // Add nested update test (similar to MongoDB's nested update)
            const nestedUpdateResult = await timeOperation(dbType, 'Nested Update', settings.withIndex, async () => {
                for (let i = 0; i < Math.min(5, updateIterations); i++) {
                    await benchmarkPool.query(`
                        UPDATE ${tableName}
                        SET nested = jsonb_set(nested, '{metrics, updated_count}', to_jsonb($1::int))
                        WHERE id < 1000
                    `, [i]);
                }
                return true;
            });
            benchmarkResults.operations['nestedUpdate'] = nestedUpdateResult;
            
            // Add JSON path operations that PostgreSQL is good at
            const jsonPathResult = await timeOperation(dbType, 'JSON Path Query', settings.withIndex, async () => {
                for (let i = 0; i < Math.min(5, findIterations); i++) {
                    await benchmarkPool.query(`
                        SELECT * FROM ${tableName}
                        WHERE nested @? '$.metrics.count ? (@ > 5000)'
                        LIMIT 1000
                    `);
                }
                return true;
            });
            benchmarkResults.operations['jsonPathQuery'] = jsonPathResult;
            
            // Add JSON containment operation
            const jsonContainmentResult = await timeOperation(dbType, 'JSON Containment', settings.withIndex, async () => {
                for (let i = 0; i < Math.min(5, findIterations); i++) {
                    await benchmarkPool.query(`
                        SELECT * FROM ${tableName}
                        WHERE nested->'metrics'->'factors' @> '[3]'
                        LIMIT 1000
                    `);
                }
                return true;
            });
            benchmarkResults.operations['jsonContainment'] = jsonContainmentResult;
            
            const deleteIterations = 2;
            const deleteResult = await timeOperation(dbType, 'Delete', settings.withIndex, async () => {
                let totalDeleted = 0;
                for (let i = 0; i < deleteIterations; i++) {
                    const batchSize = Math.floor(expectedTotal / deleteIterations);
                    const result = await benchmarkPool.query(`
                        DELETE FROM ${tableName}
                        WHERE id >= $1::int AND id < $2::int
                    `, [i * batchSize, (i + 1) * batchSize]);
                    totalDeleted += parseInt(result.rowCount);
                }
                console.log(`Deleted: ${totalDeleted}`);
                return { totalDeleted };
            });
            benchmarkResults.operations['delete'] = deleteResult;
            
        } finally {
            await benchmarkPool.end();
        }
        
        const dropClient = await pool.connect();
        try {
            await dropClient.query(`
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = $1
                AND pid <> pg_backend_pid()
            `, [dbName]);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            await dropClient.query(`DROP DATABASE IF EXISTS ${dbName}`);
            console.log(`Dropped database ${dbName}`);
        } finally {
            dropClient.release();
        }
        
        return benchmarkResults;
        
    } finally {
        await pool.end();
    }
}

module.exports = benchmarkPostgreSQL;