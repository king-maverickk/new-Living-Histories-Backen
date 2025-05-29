const { BlobServiceClient } = require('@azure/storage-blob');

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.BLOB_CONNECTION_STRING);
const containerName = 'podcasts-audio';
const containerClient = blobServiceClient.getContainerClient(containerName);

async function uploadAudio(fileName, buffer) {
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: 'audio/mpeg' },
  });
  return blockBlobClient.url;
}

module.exports = { uploadAudio };
