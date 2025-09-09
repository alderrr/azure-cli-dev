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

// List Files
app.get("/files", async (req, res) => {
  try {
    const files = [];
    const containerClient =
      blobServiceClient.getContainerClient(CONTAINER_NAME);

    for await (const file of containerClient.listBlobsFlat()) {
      files.push({
        name: file.name,
        contentType: file.properties.contentType,
        size: file.properties.contentLength,
        lastModified: file.properties.lastModified,
      });
    }
    res.status(200).json({
      message: "Files listed successfully",
      files,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

// List Container
app.get("/containers", async (req, res) => {
  try {
    const containers = [];

    for await (const container of blobServiceClient.listContainers()) {
      console.log(`- ${container.name}`);
      containers.push(container.name);
    }

    res.status(200).json({
      message: "Containers listed successfully",
      containers,
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ error: err.message });
  }
});

// Create Container
app.post("/container/create/:name", async (req, res) => {
  try {
    const containerName = req.params.name.toLowerCase();
    const containerClient = blobServiceClient.getContainerClient(containerName);

    const result = await containerClient.createIfNotExists();
    if (result.succeeded) {
      return res
        .status(201)
        .json({ message: `Container ${containerName} created.` });
    } else {
      return res
        .status(200)
        .json({ message: `Container ${containerName} already exists.` });
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete Container
app.post("/container/delete/:name", async (req, res) => {
  try {
    const containerName = req.params.name.toLowerCase();
    const containerClient = blobServiceClient.getContainerClient(containerName);

    const result = await containerClient.deleteIfExists();
    console.log(result);
    if (result.succeeded) {
      return res
        .status(201)
        .json({ message: `Container ${containerName} deleted.` });
    } else {
      return res
        .status(200)
        .json({ message: `Container ${containerName} does not exist.` });
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ error: err.message });
  }
});

// Upload API
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    console.log("Upload Running");
    console.log(req.file);
    console.log(req.file.originalname);
    const containerClient =
      blobServiceClient.getContainerClient(CONTAINER_NAME);
    const blobClient = containerClient.getBlockBlobClient(
      req.file.originalname
    );

    await blobClient.uploadFile(req.file.path);

    return res.status(201).json({
      message: "File uploaded successfully",
      fileName: req.file.originalname,
      container: CONTAINER_NAME,
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ error: err.message });
  }
});

// Download API
app.get("/download/:name", async (req, res) => {
  try {
    console.log("Download Running");
    const containerClient =
      blobServiceClient.getContainerClient(CONTAINER_NAME);
    const blobClient = containerClient.getBlockBlobClient(req.params.name);
    const download = await blobClient.download();

    download.readableStreamBody.pipe(res);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Azure running on port: ${port}`);
});
