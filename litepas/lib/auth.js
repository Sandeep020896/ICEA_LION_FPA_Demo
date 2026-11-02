export const authorisedIngest = (req) => !!process.env.INGEST_SECRET && req.headers.get('x-ingest-secret') === process.env.INGEST_SECRET;
