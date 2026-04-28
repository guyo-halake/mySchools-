const fs = require('fs');
const path = require('path');
const tus = require('tus-js-client');

const supabaseUrl = 'https://vomsaqkhtturzqfuwxsn.supabase.co';
const storageHost = supabaseUrl.replace('.supabase.co', '.storage.supabase.co');
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8';
const bucket = 'classroom-files';
const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
const filePath = `${schoolId}/notes/tus-direct-host-test.bin`;
const tempFile = path.join(__dirname, 'scratch', 'tus-direct-host-test.bin');

if (!fs.existsSync(path.dirname(tempFile))) fs.mkdirSync(path.dirname(tempFile), { recursive: true });
fs.writeFileSync(tempFile, Buffer.alloc(12 * 1024 * 1024, 7));

console.log('Endpoint:', `${storageHost}/storage/v1/upload/resumable`);
console.log('File:', tempFile);
console.log('Size:', fs.statSync(tempFile).size);

const upload = new tus.Upload(fs.createReadStream(tempFile), {
  endpoint: `${storageHost}/storage/v1/upload/resumable`,
  chunkSize: 6 * 1024 * 1024,
  retryDelays: [0, 2000, 5000],
  uploadDataDuringCreation: true,
  removeFingerprintOnSuccess: true,
  headers: {
    authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
    'x-upsert': 'false'
  },
  metadata: {
    bucketName: bucket,
    objectName: filePath,
    contentType: 'application/octet-stream',
    cacheControl: '3600'
  },
  onError: (error) => {
    console.error('UPLOAD_ERROR', error);
    process.exit(1);
  },
  onProgress: (bytesUploaded, bytesTotal) => {
    const percent = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
    console.log(`PROGRESS ${bytesUploaded}/${bytesTotal} ${percent}%`);
  },
  onSuccess: () => {
    console.log('UPLOAD_SUCCESS');
    process.exit(0);
  },
});

upload.findPreviousUploads().then((previousUploads) => {
  if (previousUploads.length) upload.resumeFromPreviousUpload(previousUploads[0]);
  upload.start();
}).catch((error) => {
  console.error('FIND_PREVIOUS_ERROR', error);
  process.exit(1);
});
