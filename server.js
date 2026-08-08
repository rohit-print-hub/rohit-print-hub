const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const port = process.env.PORT || 3000;

// ===============================
// FOLDERS
// ===============================

const uploadFolder = path.join(__dirname, "Upload");
const queueFolder = path.join(__dirname, "PrintQueue");

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
}

if (!fs.existsSync(queueFolder)) {
    fs.mkdirSync(queueFolder, { recursive: true });
}

// ===============================
// WEBSITE
// ===============================

app.use(express.static("Public"));


// ===============================
// MULTER STORAGE
// ===============================

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadFolder);
    },

    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const name = Date.now() + "-" + crypto.randomBytes(4).toString("hex");

        cb(null, name + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 25 * 1024 * 1024
    }
});


// ===============================
// UPLOAD / PRINT JOB
// ===============================

app.post(
    "/upload",
    upload.fields([
        { name: "fileFront", maxCount: 1 },
        { name: "fileBack", maxCount: 1 }
    ]),
    (req, res) => {

        try {

            if (!req.files || !req.files.fileFront) {
                return res.status(400).send("❌ Front file missing.");
            }

            const frontFile = req.files.fileFront[0];
            const backFile =
                req.files.fileBack && req.files.fileBack.length > 0
                    ? req.files.fileBack[0]
                    : null;


            // ===============================
            // PRINT JOB ID
            // ===============================

            const jobId =
                Date.now() +
                "-" +
                crypto.randomBytes(4).toString("hex");


            // ===============================
            // JOB DATA
            // ===============================

            const job = {

                jobId: jobId,

                status: "waiting",

                createdAt: new Date().toISOString(),

                shopId: req.body.shopId || "default_shop",

                docType: req.body.docType || "Normal",

                printType: req.body.printType || "Black",

                paperSize: req.body.paperSize || "A4",

                side: req.body.side || "Single",

                copies: parseInt(req.body.copies) || 1,

                frontFile: frontFile.filename,

                backFile: backFile ? backFile.filename : null

            };


            // ===============================
            // SAVE JOB
            // ===============================

            const jobFile = path.join(
                queueFolder,
                jobId + ".json"
            );

            fs.writeFileSync(
                jobFile,
                JSON.stringify(job, null, 2)
            );


            console.log("");
            console.log("================================");
            console.log("NEW PRINT JOB");
            console.log("================================");
            console.log(job);
            console.log("================================");


            res.status(200).send(
                "✅ Print request received. Job ID: " + jobId
            );

        } catch (error) {

            console.error(error);

            res.status(500).send(
                "❌ Server error while creating print job."
            );
        }
    }
);


// ===============================
// PRINT AGENT - GET JOBS
// ===============================

app.get("/api/print-jobs", (req, res) => {

    try {

        const files = fs.readdirSync(queueFolder);

        const jobs = [];

        for (const file of files) {

            if (!file.endsWith(".json")) {
                continue;
            }

            const filePath = path.join(queueFolder, file);

            const job = JSON.parse(
                fs.readFileSync(filePath, "utf8")
            );

            if (job.status === "waiting") {
                jobs.push(job);
            }
        }

        res.json(jobs);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Unable to read print queue"
        });
    }
});


// ===============================
// PRINT AGENT - UPDATE JOB
// ===============================

app.post("/api/print-jobs/:jobId/status", express.json(), (req, res) => {

    try {

        const jobId = req.params.jobId;

        const jobFile = path.join(
            queueFolder,
            jobId + ".json"
        );

        if (!fs.existsSync(jobFile)) {

            return res.status(404).json({
                error: "Job not found"
            });
        }

        const job = JSON.parse(
            fs.readFileSync(jobFile, "utf8")
        );

        job.status = req.body.status || "printed";

        job.updatedAt = new Date().toISOString();

        if (req.body.error) {
            job.error = req.body.error;
        }

        fs.writeFileSync(
            jobFile,
            JSON.stringify(job, null, 2)
        );

        res.json({
            success: true,
            job: job
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Unable to update job"
        });
    }
});


// ===============================
// SERVER START
// ===============================

app.listen(port, () => {

    console.log("");
    console.log("================================");
    console.log("ROHIT AUTO PRINT HUB");
    console.log("================================");
    console.log("Server running on port " + port);
    console.log("================================");
    console.log("");
});
