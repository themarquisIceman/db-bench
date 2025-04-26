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


| Operation            | MongoDB (no idx) | MongoDB (with idx) | FerretDB (no idx) | FerretDB (with idx) | PostgreSQL (no idx) | PostgreSQL (with idx) |
|----------------------|------------------|---------------------|-------------------|----------------------|----------------------|------------------------|
| **Insert**           | 10.53s           | 23.98s              | 12.70s            | 74.18s               | 36.93s               | 47.89s                 |
| **Count - All**      | 464.46m          | 446.83m             | 613.83m           | 442.34m              | 216.12m              | 241.30m                |
| **Count - Filtered** | 483.21m          | 130.17m             | 658.98m           | 412.41m              | 279.06m              | 131.56m                |
| **Find**             | 3.42s            | 3.56s               | 6.63s             | 4.39s                | 1.11s                | 1.05s                  |
| **FindById**         | 103.55s          | 1.50s               | 54.10s            | 1.43s                | 26.46s               | 1.47s                  |
| **FindOneById**      | 136.32m          | 26.26m              | 122.94m           | 14.71m               | 47.20m               | 24.90m                 |
| **Nested Query**     | 532.98m          | 581.45m             | 698.93m           | 692.10m              | 295.15m              | 462.19m                |
| **Object Text Search**| 977.52m          | 739.19m             | 741.51m           | 2.40s                | 416.27m              | 461.37m                |
| **Text Search**      | 750.60m          | 562.01m             | 562.56m           | 2.90s                | 325.13m              | 888.11m                |
| **Array Query**      | 622.25m          | 779.38m             | 529.04m           | 630.89m              | 212.82m              | 326.44m                |
| **Complex Query**    | 1.35s            | 443.98m             | 1.08s             | 766.75m              | 420.65m              | 164.37m                |
| **Aggregation**      | 1.96s            | 1.99s               | 13.34s            | 13.77s               | 937.53m              | 1.03s                  |
| **Update**           | 2.92s            | 1.86s               | 2.77s             | 34.06s               | 955.80m              | 5.74s                  |
| **Nested Update**    | 1.75s            | 1.09s               | 1.43s             | 18.98s               | 695.25m              | 3.36s                  |
| **JSON Path Query**  | 351.49m          | 419.67m             | 542.92m           | 529.17m              | 162.89m              | 287.08m                |
| **JSON Containment** | 690.46m          | 683.62m             | 659.38m           | 1.03s                | 148.97m              | 153.93m                |
| **Delete**           | 1.78s            | 28.48s              | 718.41m           | 2.55s                | 316.34m              | 1.64s                  |
| **Create Indexes**   | N/A              | 93.17m              | N/A               | 127.90m              | N/A                  | 75.72m                 |

## Observations
- **MongoDB** generally performs well for document-based operations, particularly with indexes applied
- **FerretDB** shows competitive performance for basic operations but has significant slowdowns with indexed updates
- **PostgreSQL** excels in count operations and aggregations, even without indexes
- Nested and array operations are not applicable to PostgreSQL as these are document database features

## Environment
 This benchmark was conducted on my personal PC with all databases running in Docker containers. Resource usage was monitored and was relatively consistent across all tested databases(I saw it with my eyes its not accurate).

## License
MIT