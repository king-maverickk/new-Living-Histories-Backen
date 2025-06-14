module.exports = async function patchAddresses(container, id, pk, index, addresses, context) {
  try {
    await container.item(id, pk).patch([{
      op: 'add',
      path: `/events/${index}/addresses`,
      value: addresses
    }]);
    context.log(`Patched ${addresses.length} addresses into event[${index}]`);
  } catch (err) {
    context.log.error(`Failed to patch addresses: ${err.message}`);
    throw err;
  }
}
// This function patches the addresses into the specified event index in the Cosmos DB item