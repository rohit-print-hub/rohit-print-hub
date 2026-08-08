const express = require('express');
const multer = require('multer');
const path = require('path');
const { print } = require('pdf-to-printer');

const app = express();
const port = process.env.PORT || 3000;

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

app.use(express.static('Public'));
app.use(express.json());

// File upload route
app.post('/upload', upload.single('printFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }
    
    console.log('File received:', req.file.path);
    
    // Agar aap local computer par hain toh yeh seedha print bhej dega
    await print(req.file.path);
    
    res.send('File uploaded and sent to printer successfully!');
  } catch (error) {
    console.error(error);
    res.status(500).send('Printing failed, but file uploaded.');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
