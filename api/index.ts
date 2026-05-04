let app: import('express').Express;
try {
  app = require('../server/src/app').default;
} catch (err) {
  const express = require('express');
  app = express();
  app.use((_req: any, res: any) => {
    res.status(500).json({ error: 'Init failed', detail: String(err) });
  });
}
module.exports = app;
