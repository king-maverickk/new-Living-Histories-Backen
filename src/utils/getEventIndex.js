module.exports = async function getEventIndex(container, id, pk, context) {
  const { resource } = await container.item(id, pk).read();
  const events = resource.events || [];
  const index = events.length - 1;
  context.log(`Event index resolved: ${index}`);
  return index;
}
// This function retrieves the index of the last event in the events array of a Cosmos DB item