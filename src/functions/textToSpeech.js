const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, SASProtocol, StorageSharedKeyCredential } = require('@azure/storage-blob');

// Parse connection string
const connectionString = process.env.BLOB_CONNECTION_STRING;

// Extract account name and key from the connection string
const accountNameMatch = connectionString.match(/AccountName=([^;]+);/);
const accountKeyMatch = connectionString.match(/AccountKey=([^;]+);/);

if (!accountNameMatch || !accountKeyMatch) {
  throw new Error("Invalid connection string: cannot extract account name/key");
}

const accountName = accountNameMatch[1];
const accountKey = accountKeyMatch[1];

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerName = 'podcasts-audio';
const containerClient = blobServiceClient.getContainerClient(containerName);

async function uploadAudio(fileName, buffer) {
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);

  // Upload the MP3 file
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: 'audio/mpeg' },
  });

  // Set expiry time (e.g., 24 hours from now)
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 24);

  // Generate SAS token
  const sasToken = generateBlobSASQueryParameters({
    containerName,
    blobName: fileName,
    expiresOn: expiryDate,
    permissions: BlobSASPermissions.parse("r"), // read-only
    protocol: SASProtocol.Https,
  }, new StorageSharedKeyCredential(accountName, accountKey)).toString();

  // Return signed URL
  return `${blockBlobClient.url}?${sasToken}`;
}

module.exports = { uploadAudio };
