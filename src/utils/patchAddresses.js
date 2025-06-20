module.exports = async function patchAddresses(container, id, pk, index, addresses, context) {
  try {
    const ops = [{ op: 'add', path: `/events/${index}/addresses`, value: addresses }];
    await container
      .item(id, pk)
      .patch(ops);
    context.log(`Patched ${addresses.length} addresses into event[${index}]`);
  } catch (err) {
    context.log(`[ERORR] Failed to patch addresses: ${err.message}`);
    throw err;
  }
}
// This function patches the addresses into the specified event index in the Cosmos DB item