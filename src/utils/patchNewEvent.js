module.exports = async function patchNewEvent(container, id, pk, event, context) {
  try {
    const ops = [{ op: 'add', path: '/events/-', value: event }];
    await container
      .item(id, pk)
      .patch(ops);

    context.log(`Appended event to existing document ${id}`);
  } catch (patchErr) {
    // If it fails because events doesn't exist, create the array with one element
    if (patchErr.code === 400) {
      context.log(`Array 'events' missing; initializing for document ${id}`);
      await container
        .item(id, partitionKey)
        .patch([{ op: 'add', path: '/events', value: [event] }]);

        context.log(`Initialized 'events' with one event for document ${id}`);
    } else if (patchErr.code === 404) {
      // Document missing entirely—create new document
      context.log(`Document ${id} not found. Creating new with event.`);
      const newDoc = {
        id,
        partitionKey: pk, // Make sure this matches your container's partition key path
        
        events: [event],
      };
      await container.items.create(newDoc);
      context.log(`Created new item with id: ${id}, partitionKey: ${pk}`);
    } else {
      throw patchErr; // Unexpected error
    }
  }
};

// This function patches to an existing item or creates a new one if it doesn't exist