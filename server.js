const express = require("express");
const multer = require("multer");
const { print } = require("pdf-to-printer");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Main Upload folder create karna agar pehle se nahi hai
if (!fs.existsSync("Uploads")) {
    fs.mkdirSync("Uploads");
}

// Multer Storage Configuration (Shop-wise folder handling)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Har dukaan ka alag folder banega taaki files mix na ho
        const shopId = req.body.shopId || "default_shop";
        const shopFolder = path.join("Uploads", shopId);
        
        if (!fs.existsSync(shopFolder)) {
            fs.mkdirSync(shopFolder, { recursive: true });
        }
        cb(null, shopFolder);
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage 
}).fields([{ name: 'fileFront', maxCount: 1 }, { name: 'fileBack', maxCount: 1 }]);

// Public folder ko serve karna
app.use(express.static("Public"));

// ID Card ke exact sizes (PDFKit Points: 72 points = 1 inch)
const ID_WIDTH = 241;
const ID_HEIGHT = 153;
const MARGIN_X = 50; 
const MARGIN_Y = 50; 

// Upload + Print Route with Shop ID Support
app.post("/upload", upload, async (req, res) => {
    
    if (!req.files || !req.files['fileFront']) {
        return res.status(400).send("❌ Front File Upload Failed");
    }

    const shopId = req.body.shopId || "default_shop";
    const docType = req.body.docType; 
    const { printType, paperSize, copies } = req.body;

    const fileFrontPath = path.resolve(req.files['fileFront'][0].path);
    let fileBackPath = null;
    
    if (req.files['fileBack']) {
        fileBackPath = path.resolve(req.files['fileBack'][0].path);
    }

    const printOptions = {
        copies: parseInt(copies) || 1,
        paperSize: paperSize || "A4",
        monochrome: printType === "Black"
    };

    let fileToPrint = fileFrontPath;
    let filesToDelete = [fileFrontPath]; 

    if (fileBackPath) {
        filesToDelete.push(fileBackPath);
    }

    try {
        if (docType !== "Normal" || ['.jpg', '.jpeg', '.png'].includes(path.extname(req.files['fileFront'][0].originalname).toLowerCase())) {
            
            fileToPrint = fileFrontPath + "_ready.pdf";
            filesToDelete.push(fileToPrint);

            await new Promise((resolve, reject) => {
                const doc = new PDFDocument({ 
                    size: paperSize === "A3" ? 'A3' : 'A4', 
                    margin: 0 
                });
                const stream = fs.createWriteStream(fileToPrint);
                doc.pipe(stream);

                if (docType === "Normal") {
                    doc.image(fileFrontPath, 0, 0, { 
                        fit: [doc.page.width, doc.page.height], 
                        align: 'center', 
                        valign: 'center' 
                    });
                
                } else if (docType === "PAN") {
                    doc.image(fileFrontPath, MARGIN_X, MARGIN_Y, { 
                        width: ID_WIDTH, 
                        height: ID_HEIGHT 
                    });
                
                } else if (docType === "Aadhaar" && fileBackPath) {
                    doc.image(fileFrontPath, MARGIN_X, MARGIN_Y, { 
                        width: ID_WIDTH, 
                        height: ID_HEIGHT 
                    });
                    
                    doc.image(fileBackPath, MARGIN_X, MARGIN_Y + ID_HEIGHT + 20, { 
                        width: ID_WIDTH, 
                        height: ID_HEIGHT 
                    });
                }

                doc.end();
                stream.on('finish', resolve);
                stream.on('error', reject);
            });
            console.log(`📄 Shop [${shopId}]: PDF Formatted and Created Successfully.`);
        }

        console.log(`🖨️ Shop [${shopId}]: Sending file to printer...`);
        await print(fileToPrint, printOptions);
        res.send(`✅ Print Job Successful for Shop: ${shopId}!`);

    } catch (err) {
        console.error("❌ Print Error:", err);
        res.status(500).send("❌ Print Error : " + err.message);

    } finally {
        filesToDelete.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, (err) => {
                    if (err) console.error("Cleanup error:", err);
                });
            }
        });
        console.log("🗑️ Temp files cleaned up.");
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Rohit Auto Print Hub Server running at http://localhost:${PORT}`);
});
// Price Calculate karne ka function
function calculateTotal() {
    const printType = document.getElementById("printType").value;
    const side = document.getElementById("side").value;
    const copies = parseInt(document.getElementById("copies").value) || 1;

    let basePricePerCopy = (printType === "Color") ? 20 : 10; // Color = 20, B&W = 10
    
    if (side === "Double") {
        basePricePerCopy += 5; // Double side hone par 5 rupya extra per copy
    }

    const totalPrice = basePricePerCopy * copies;
    document.getElementById("totalPrice").innerText = "₹" + totalPrice;
}

// Jab bhi user koi option change kare, price apne aap update ho jaye
document.getElementById("printType").addEventListener("change", calculateTotal);
document.getElementById("side").addEventListener("change", calculateTotal);
document.getElementById("copies").addEventListener("input", calculateTotal);

// Page khulte hi pehli baar price calculate karne ke liye
calculateTotal();