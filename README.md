# Database Benchmark Tool

## Important Note
This tool was developed for my personal benchmarking and decision-making process. It is not intended for general use, and the code is currently undocumented and messy. If you choose to use it, you will need to edit and adapt it to suit your needs.

# Commands to run testig db instance:
## Netowrk for the freet instances communication
docker network create ferretdb-network
## docker -freet/postgreesql
docker run --hostname=6dfd9b9284b1 --env=POSTGRES_USER=user --env=POSTGRES_PASSWORD=pass --env=POSTGRES_DB=postgres --env=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/lib/postgresql/17/bin --env=GOSU_VERSION=1.17 --env=LANG=en_US.utf8 --env=PG_MAJOR=17 --env=PG_VERSION=17.4-1.pgdg120+2 --env=PGDATA=/var/lib/postgresql/data --volume=postgres-data-new:/var/lib/postgresql/data --volume=/var/lib/postgresql/data --network=ferretdb-network --workdir=/ -p 5432:5432 --restart=always --label='org.opencontainers.image.description=PostgreSQL with DocumentDB extension' --label='org.opencontainers.image.source=https://github.com/FerretDB/documentdb' --label='org.opencontainers.image.title=PostgreSQL+DocumentDB' --label='org.opencontainers.image.url=https://www.ferretdb.com/' --label='org.opencontainers.image.vendor=FerretDB Inc.' --runtime=runc -d ghcr.io/ferretdb/postgres-documentdb:latest
## docker -freet client
docker run --hostname=9ab3cb4f7ef9 --user=ferretdb:ferretdb --env=FERRETDB_POSTGRESQL_URL=postgres://user:pass@ferretdb-postgres:5432/postgres --env=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin --env=FERRETDB_LISTEN_ADDR=:27017 --env=FERRETDB_DEBUG_ADDR=:8088 --env=FERRETDB_STATE_DIR=/state --volume=/state --network=ferretdb-network --workdir=/ -p 27017:27017 --restart=always --label='org.opencontainers.image.description=A truly Open Source MongoDB alternative' --label='org.opencontainers.image.revision=05ed2b952c612533cb12c1ff1a0319a4e7f2e4b5' --label='org.opencontainers.image.source=https://github.com/FerretDB/FerretDB' --label='org.opencontainers.image.title=FerretDB' --label='org.opencontainers.image.url=https://www.ferretdb.com/' --label='org.opencontainers.image.vendor=FerretDB Inc.' --label='org.opencontainers.image.version=v2.1.0' --runtime=runc -d ferretdb/ferretdb:latest
## docker -mongodb
do##cker run --hostname=99a932030b0e --mac-address=96:3b:93:9c:26:2a --env=MONGO_INITDB_ROOT_PASSWORD=password --env=MONGO_INITDB_ROOT_USERNAME=root --env=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin --env=GOSU_VERSION=1.17 --env=JSYAML_VERSION=3.13.1 --env=JSYAML_CHECKSUM=662e32319bdd378e91f67578e56a34954b0a2e33aca11d70ab9f4826af24b941 --env=MONGO_PACKAGE=mongodb-org --env=MONGO_REPO=repo.mongodb.org --env=MONGO_MAJOR=8.0 --env=MONGO_VERSION=8.0.8 --env=HOME=/data/db --env=GLIBC_TUNABLES=glibc.pthread.rseq=0 --volume=/data/configdb --volume=/data/db --network=bridge -p 27011:27017 --restart=no --label='org.opencontainers.image.ref.name=ubuntu' --label='org.opencontainers.image.version=24.04' --runtime=runc -d mongo:latest


# All of the text below is chatgpt generated.

This tool is designed to benchmark the performance of various databases (MongoDB, FerretDB, and PostgreSQL) across different operations such as insertion, querying, updating, deletion, and indexing. The benchmark measures the time taken for each operation, both with and without indexes, to evaluate how well each database handles different types of workloads.

## Supported Databases
- **MongoDB** (both with and without indexes)
- **FerretDB** (both with and without indexes)
- **PostgreSQL** (both with and without indexes)

## Benchmark Operations
The tool measures the time taken for the following operations:

1. **Insert**: Inserting new data into the database.
2. **Count - All**: Counting all documents/records in the database.
3. **Count - Filtered**: Counting documents/records in the database with a filter applied.
4. **Find**: Performing a general search based on query conditions.
5. **FindById**: Finding a document/record by its ID.
6. **FindOneById**: Finding a single document/record by its unique ID.
7. **Nested Query**: Performing a query that involves nested fields.
8. **Object Text Search**: Searching for text within object fields.
9. **Text Search**: Searching for text across various fields.
10. **Array Query**: Querying for specific array elements.
11. **Complex Query**: Performing a complex query with multiple conditions.
12. **Aggregation**: Aggregating data based on specified conditions.
13. **Update**: Updating existing documents/records.
14. **Nested Update**: Updating documents with nested fields.
15. **Delete**: Deleting documents/records from the database.
16. **Create Indexes**: Time taken to create indexes for the database.


## Benchmark Results
Times are in Seconds (s) or Milliseconds (ms) - lower is better, where lower values indicate better performance. The following benchmarks are performed for each database with and without indexes:

| Operation | MongoDB<br/>(no idx) | MongoDB<br/>(with idx) | FerretDB<br/>(no idx) | FerretDB<br/>(with idx) | PostgreSQL<br/>(no idx) | PostgreSQL<br/>(with idx) |
|-----------|----------------------|------------------------|------------------------|--------------------------|--------------------------|----------------------------|
| Insert | 6.81s | 8.84s | 5.04s | 49.33s | 8.62s | 11.23s |
| Count - All | 253.40ms | 259.57ms | 353.49ms | 351.36ms | 82.67ms | 132.08ms |
| Count - Filtered | 434.45ms | 62.77ms | 541.14ms | 415.18ms | 62.26ms | 55.06ms |
| Find | 1.88s | 1.48s | 2.44s | 2.66s | 474.05ms | 611.55ms |
| FindById | 18.37s | 590.43ms | 21.06s | 731.73ms | 4.41s | 248.81ms |
| FindOneById | 81.08ms | 1.36ms | 62.65ms | 80.08ms | 14.53ms | 0.94ms |
| Nested Query | 286.70ms | 169.04ms | 255.39ms | 377.65ms | N/A | N/A |
| Object Text Search | 524.57ms | 306.55ms | 348.67ms | 2.86s | 79.41ms | 90.80ms |
| Text Search | 256.56ms | 181.06ms | 231.62ms | 1.63s | 144.99ms | 405.63ms |
| Array Query | 212.89ms | 147.19ms | 218.62ms | 478.95ms | N/A | N/A |
| Complex Query | 696.47ms | 107.03ms | 761.47ms | 501.03ms | 118.33ms | 30.08ms |
| Aggregation | 2.61s | 2.51s | 4.30s | 4.39s | 225.17ms | 249.14ms |
| Update | 2.29s | 1.22s | 2.29s | 26.44s | 294.92ms | 3.52s |
| Nested Update | 1.84s | 833.76ms | 1.10s | 14.18s | N/A | N/A |
| Delete | 1.07s | 8.11s | 215.53ms | 416.62ms | 101.13ms | 90.12ms |
| Create Indexes | N/A | 11.95s | N/A | 15.46ms | N/A | 2.94ms |

## Observations
- **MongoDB** generally performs well for document-based operations, particularly with indexes applied
- **FerretDB** shows competitive performance for basic operations but has significant slowdowns with indexed updates
- **PostgreSQL** excels in count operations and aggregations, even without indexes
- Nested and array operations are not applicable to PostgreSQL as these are document database features

## Environment
 This benchmark was conducted on my personal PC with all databases running in Docker containers. Resource usage was monitored and was relatively consistent across all tested databases(I saw it with my eyes its not accurate).

## License
MIT