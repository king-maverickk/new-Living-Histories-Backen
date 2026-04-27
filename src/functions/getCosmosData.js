const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;

const databaseId = 'Living-Histories-DB';
const containerId = 'Living-Histories-Container';

const client = new CosmosClient({ endpoint, key });

app.http('getCosmosData', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (req, context) => {
        context.log(`HTTP function processed request: ${req.url}`);

        const url = new URL(req.url);
        const id = url.searchParams.get('id').toLowerCase();
        const partitionKey = url.searchParams.get('partitionKey').toLowerCase();

        if (!id || !partitionKey) {
            return {
                status: 400,
                body: "Missing 'id' or 'partitionKey' in query string"
            };
        }

        try {
            const database = client.database(databaseId);
            const container = database.container(containerId);

            const { resource } = await container.item(id, partitionKey).read();
            context.log(`Item read successfully: ${JSON.stringify(resource)}`);

            return {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resource) 
            };
        } catch (err) {
            context.log.error(`Error reading item: ${err.message}`);

            if (err.code === 404) {
                return {
                    status: 404,
                    body: `Item with id '${id}' and partition key '${partitionKey}' not found.`
                };
            }

            return {
                status: 500,
                body: `Error reading item from Cosmos DB: ${err.message}`
            };
        }
    }
});
