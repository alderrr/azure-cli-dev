const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const { BlobServiceClient } = require("@azure/storage-blob");

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });
const port = process.env.POST || 3000;
const AZURE_CONN = process.env.AZURE_STORAGE_CONN;
const CONTAINER_NAME = process.env.AZURE_CONTAINER || "development";
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_CONN);

// Upload API
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const containerClient =
      blobServiceClient.getContainerClient(CONTAINER_NAME);
    const result = await containerClient.createIfNotExists();
    if (result.succeeded) {
      console.log(`Container ${CONTAINER_NAME} created`);
    } else {
      console.log(`Container ${CONTAINER_NAME} already exist`);
    }
    console.log("Upload Running...");
    const blobClient = containerClient.getBlockBlobClient(
      req.file.originalname
    );
    await blobClient.uploadFile(req.file.path);

    // Success Message
    console.log(
      `File "${req.file.originalname}" uploaded successfully to container "${CONTAINER_NAME}"`
    );
    return res.status(201).json({
      message: "File uploaded successfully",
      fileName: req.file.originalname,
      container: CONTAINER_NAME,
    });
  } catch (err) {
    // Error Message
    console.log(err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Azure running on port: ${port}`);
});
