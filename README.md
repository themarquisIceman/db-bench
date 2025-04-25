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

The results are presented in milliseconds, where lower values indicate better performance. The following benchmarks are performed for each database with and without indexes:

| Operation           | MongoDB (no idx) | MongoDB (with idx) | FerretDB (no idx) | FerretDB (with idx) | PostgreSQL (no idx) | PostgreSQL (with idx) |
|---------------------|------------------|--------------------|-------------------|---------------------|---------------------|-----------------------|
| **Insert**          | 15762.53         | 11824.42           | 20759.35          | 63967.62            | 6441.16             | 11922.42              |
| **Count - All**     | 429.88           | 321.89             | 1019.79           | 246.76              | 988.20              | 133.46                |
| **Count - Filtered**| 398.32           | 202.50             | 704.83            | 503.86              | 73.84               | 52.21                 |
| **Find**            | 2109.01          | 2213.86            | 2975.78           | 2822.10             | 554.98              | 554.88                |
| **FindById**        | 18756.85         | 618.40             | 20900.38          | 940.33              | 10321.34            | 298.58                |
| **FindOneById**     | 70.03            | 1.46               | 94.20             | 1.68                | 23.93               | 1.27                  |
| **Nested Query**    | 342.88           | 195.47             | 426.87            | 288.61              | N/A                 | N/A                   |
| **Object Text Search** | 845.61        | 417.19             | 634.49            | 2402.55             | 114.04              | 81.24                 |
| **Text Search**     | 188.84           | 199.64             | 446.50            | 2476.87             | 127.82              | 97.85                 |
| **Array Query**     | 285.01           | 168.00             | 339.96            | 562.36              | N/A                 | N/A                   |
| **Complex Query**   | 2188.53          | 115.34             | 1476.90           | 750.94              | 120.61              | 30.04                 |
| **Aggregation**     | 3289.74          | 2631.57            | 4514.41           | 4906.73             | 339.02              | 261.91                |
| **Update**          | 10063.92         | 2055.17            | 4209.16           | 29905.59            | 580.35              | 3717.94               |
| **Nested Update**   | 4552.26          | 970.32             | 2270.18           | 18554.39            | N/A                 | N/A                   |
| **Delete**          | 3239.96          | 8590.98            | 451.66            | 346.26              | 152.40              | 126.22                |
| **Create Indexes**  | N/A              | 928.52             | N/A               | 148.65              | N/A                 | 3.50                  |
