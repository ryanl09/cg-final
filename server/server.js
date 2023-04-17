const express = require('express')
const app = express()
const port = 3000

const HELP_STRING = "";


app.get('/favicon.ico', (req, res) => res.sendStatus(204));
app.get('/help', (req, res) => res.send(HELP_STRING));
app.use('/', express.static('..'));

app.listen(port, () => {
  console.log(`WebGLServer listening on port ${port}`)
})

