require('dotenv').config(); // For environment variables
const { 
    mongoUrl, 
    ferretUrl, 
    pgConfig,
    settings, 
    parseCommandLineArgs, 
    generateBenchmarkReport 
} = require('./common');

const benchmarkMongoDatabase = require('./benchmarking-files/mongo-benchmark');
const benchmarkPostgreSQL = require('./benchmarking-files/pg-benchmark');

async function runBenchmarks() {
    const options = parseCommandLineArgs();
    Object.assign(settings, options);
    
    console.log('=========== DATABASE BENCHMARK TOOL ===========');
    console.log(`Document count: ${settings.docsToInsert} × ${settings.iterations} iterations`);
    
    if (settings.withIndex === undefined) {
        // Run without indexes first
        settings.withIndex = false;
        console.log('\n===== BENCHMARKS WITHOUT INDEXES =====');
        
        if (settings.testMongoDB) await benchmarkMongoDatabase(mongoUrl, false);
        if (settings.testFerretDB) await benchmarkMongoDatabase(ferretUrl, true);
        if (settings.testPostgreSQL) await benchmarkPostgreSQL(pgConfig);
        
        // Then run with indexes
        settings.withIndex = true;
        console.log('\n===== BENCHMARKS WITH INDEXES =====');
        
        if (settings.testMongoDB) await benchmarkMongoDatabase(mongoUrl, false);
        if (settings.testFerretDB) await benchmarkMongoDatabase(ferretUrl, true);
        if (settings.testPostgreSQL) await benchmarkPostgreSQL(pgConfig);
    } else {
        // Run only with specified index setting
        console.log(`\n===== BENCHMARKS ${settings.withIndex ? 'WITH' : 'WITHOUT'} INDEXES =====`);
        
        if (settings.testMongoDB) await benchmarkMongoDatabase(mongoUrl, false);
        if (settings.testFerretDB) await benchmarkMongoDatabase(ferretUrl, true);
        if (settings.testPostgreSQL) await benchmarkPostgreSQL(pgConfig);
    }
    
    console.log('\n======= BENCHMARK COMPLETE =======');
    
    generateBenchmarkReport();
}

runBenchmarks().catch(err => {
    console.error('Error running benchmarks:', err);
});