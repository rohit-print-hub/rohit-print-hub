const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Yeh aapke 'Public' folder ke design (HTML/CSS) ko online dikhayega
app.use(express.static('Public'));

app.listen(port, () => {
  console.log(`Server is running perfectly on port ${port}`);
});
