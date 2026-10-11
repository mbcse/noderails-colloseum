import http from 'node:http';

const port = Number(process.env.PORT ?? 3030);

const server = http.createServer((req, res) => {
  const url = req.url?.split('?')[0] ?? '/';
  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'indexer', mode: 'public-reference' }));
    return;
  }
  if (url === '/webhooks/inbound' && req.method === 'POST') {
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ accepted: true, mode: 'stub' }));
    return;
  }
  res.writeHead(501, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      error: 'Indexer ingestion requires private deployment configuration.',
      hint: 'Register contracts and webhook targets in your Indexer deployment.',
    }),
  );
});

server.listen(port, () => {
  console.log(`Indexer reference listener on :${port} (ingestion not enabled in this tree)`);
});
