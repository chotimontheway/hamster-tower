// The only function on Vercel. vercel.json routes every /api/... path here.
module.exports = require('../lib/router').handler;
