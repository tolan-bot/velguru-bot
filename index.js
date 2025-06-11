console.log('VelGuru bot starting...');

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('VelGuru Bot is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
