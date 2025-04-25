const { MongoClient } = require('mongodb');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const mongoUrl = 'mongodb://root:password@localhost:27017';
const ferretUrl = 'mongodb://user:pass@localhost:27011';
const pgConfig = {
    user: 'user',
    host: 'localhost',
    database: 'postgres',
    password: 'pass',
    port: 5432,
};

const settings = {
    iterations: 10,
    withIndex: undefined,
    docsToInsert: 20000,
    testMongoDB: true,
    testFerretDB: true,
    testPostgreSQL: true,
    testPostgreSQLNested: false,
    benchmarkResults: {}
};

const keywords = [
    'important', 'critical', 'database', 'performance', 'benchmark', 'analysis',
    'optimization', 'scaling', 'latency', 'throughput', 'evaluation', 'comparison',
    'system', 'storage', 'retrieval', 'query', 'indexing', 'transaction', 'consistency'
];

function generateDescription(i) {
    const numKeywords = 3 + Math.floor(Math.random() * 4);
    const descKeywords = [];
    for (let k = 0; k < numKeywords; k++) {
        const keywordIndex = Math.floor(Math.random() * keywords.length);
        descKeywords.push(keywords[keywordIndex]);
    }
    return `This is a ${descKeywords.join(' and ')} test document with ID ${i}`;
}

function timeOperation(database, operation, indexSetting, callback) {
    const label = operation;
    const key = `${database}|${operation}|${indexSetting ? 'index' : 'noindex'}`;
    
    console.time(label);
    const startTime = process.hrtime();
    
    return callback().then(result => {
        console.timeEnd(label);
        const endTime = process.hrtime(startTime);
        const timeInMs = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
        
        if (!settings.benchmarkResults[database]) {
            settings.benchmarkResults[database] = {};
        }
        settings.benchmarkResults[database][key] = timeInMs;
        
        return result;
    });
}

function generateBenchmarkReport() {
    console.log('\n\n=========== BENCHMARK SUMMARY ===========');
    
    const operations = new Set();
    for (const dbName in settings.benchmarkResults) {
        for (const key in settings.benchmarkResults[dbName]) {
            const [_, operation, __] = key.split('|');
            operations.add(operation);
        }
    }
    
    const databases = Object.keys(settings.benchmarkResults);
    
    console.log('Times in milliseconds (lower is better)\n');
    
    let header = 'Operation'.padEnd(20);
    databases.forEach(db => {
        header += `| ${db.padEnd(15)} (no idx)`.padEnd(30);
        header += `| ${db.padEnd(15)} (with idx)`.padEnd(30);
    });
    console.log(header);
    console.log('-'.repeat(header.length));
    
    operations.forEach(op => {
        let row = op.padEnd(20);
        
        databases.forEach(db => {
            const resultNoIndex = settings.benchmarkResults[db][`${db}|${op}|noindex`] || 'N/A';
            const resultWithIndex = settings.benchmarkResults[db][`${db}|${op}|index`] || 'N/A';
            
            row += `| ${resultNoIndex.toString().padEnd(28)}`;
            row += `| ${resultWithIndex.toString().padEnd(28)}`;
        });
        
        console.log(row);
    });
    
    console.log('\n=========================================');
}

function parseCommandLineArgs() {
    const args = process.argv.slice(2);
    const options = { ...settings };
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--no-mongo': options.testMongoDB = false; break;
            case '--no-ferret': options.testFerretDB = false; break;
            case '--no-pg': options.testPostgreSQL = false; break;
            case '--no-pg-json': options.testPostgreSQLNested = false; break;
            case '--only-mongo':
                options.testMongoDB = true;
                options.testFerretDB = options.testPostgreSQL = options.testPostgreSQLNested = false;
                break;
            case '--only-ferret':
                options.testFerretDB = true;
                options.testMongoDB = options.testPostgreSQL = options.testPostgreSQLNested = false;
                break;
            case '--only-pg':
                options.testPostgreSQL = true;
                options.testMongoDB = options.testFerretDB = options.testPostgreSQLNested = false;
                break;
            case '--only-pg-json':
                options.testPostgreSQLNested = true;
                options.testMongoDB = options.testFerretDB = options.testPostgreSQL = false;
                break;
            case '--with-index': options.withIndex = true; break;
            case '--no-index': options.withIndex = false; break;
            case '--iterations':
                if (i + 1 < args.length) {
                    const value = parseInt(args[i + 1]);
                    if (!isNaN(value)) {
                        options.iterations = value;
                        i++;
                    }
                }
                break;
            case '--docs':
                if (i + 1 < args.length) {
                    const value = parseInt(args[i + 1]);
                    if (!isNaN(value)) {
                        options.docsToInsert = value;
                        i++;
                    }
                }
                break;
            case '--help':
                console.log(`
Database Benchmark Tool - Usage Options:
  --no-mongo        Skip MongoDB benchmarks
  --no-ferret       Skip FerretDB benchmarks
  --no-pg           Skip PostgreSQL relational benchmarks
  --no-pg-json      Skip PostgreSQL JSONB benchmarks
  --only-mongo      Run only MongoDB benchmarks
  --only-ferret     Run only FerretDB benchmarks
  --only-pg         Run only PostgreSQL relational benchmarks
  --only-pg-json    Run only PostgreSQL JSONB benchmarks
  --with-index      Run only benchmarks with indexes
  --no-index        Run only benchmarks without indexes
  --iterations N    Set number of iterations (default: 10)
  --docs N          Set number of documents per iteration (default: 20000)
  --help            Show this help message
`);
                process.exit(0);
        }
    }
    
    return options;
}

module.exports = {
    MongoClient,
    Pool,
    uuidv4,
    mongoUrl,
    ferretUrl,
    pgConfig,
    settings,
    keywords,
    generateDescription,
    timeOperation,
    generateBenchmarkReport,
    parseCommandLineArgs
};