import http from 'node:http';

const port = Number(process.env.PORT ?? 3020);

const server = http.createServer((req, res) => {
  const url = req.url?.split('?')[0] ?? '/';
  if (url === '/health' || url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'mtxm', mode: 'public-reference' }));
    return;
  }
  res.writeHead(501, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      error: 'MTXM signing and broadcast require private deployment configuration.',
      hint: 'Set up signers and chain registry in your own MTXM environment before enabling routes.',
    }),
  );
});

server.listen(port, () => {
  console.log(`MTXM reference listener on :${port} (sign/broadcast not enabled in this tree)`);
});
