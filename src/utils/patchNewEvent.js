module.exports = async function patchNewEvent(container, id, pk, event, context) {
  try {
    await container.item(id, pk).patch([{ op: 'add', path: '/events/-', value: event }]);
    context.log(`Patched newEvent into item with id: ${id}, partitionKey: ${pk}`);
  } catch (err) {
    context.log.error(`Failed to patch newEvent: ${err.message}`);
    throw err;
  }
}
// This function adds a new event to the events array in the specified Cosmos DB item