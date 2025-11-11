import express, { json } from "express";
import cors from "cors";
import multer from "multer";
import { PDFExtract } from "pdf.js-extract";
import fs from "fs";
import { computeSimilarity, preprocess } from "./ml_model.js";
const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(json());
import dotenv from "dotenv";
dotenv.config();

const upload = multer({ dest: "uploads/" });
import pkg from "jsonwebtoken";
const { sign, verify } = pkg;
import { GoogleGenAI } from "@google/genai";
// import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

import { MongoClient, ServerApiVersion } from "mongodb";
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.fxxuhv1.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.post("/resume-match", upload.single("resume"), async (req, res) => {
  try {
    const file = req.file;
    const jobDescriptionRaw = req.body.jobDescription;
    console.log("Job Description:", jobDescriptionRaw);

    if (!file) return res.status(400).send("No PDF uploaded!");
    if (!jobDescriptionRaw)
      return res.status(400).send("No job description provided!");

    // Initialize pdf.js-extract
    const pdfExtract = new PDFExtract();
    const options = {}; // default options

    // Extract PDF text
    pdfExtract.extract(file.path, options, async (err, data) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Error parsing PDF");
      }

      // Combine text from all pages
      const resumeTextRaw = data.pages
        .map((page) => page.content.map((c) => c.str).join(" "))
        .join("\n\n");

      console.log("Resume Text:", resumeTextRaw);
      fs.unlink(file.path, (err) => {
        if (err) {
          console.error("Failed to delete file:", err);
        } else {
          console.log("Uploaded file deleted successfully");
        }
      });

      const resumeText = preprocess(resumeTextRaw);
      const jobDescription = preprocess(jobDescriptionRaw);

      const similarityScore = await computeSimilarity(
        resumeText,
        jobDescription
      );

      res.json({
        similarityScore,
        percentage: (similarityScore * 100).toFixed(2) + "%",
        resumeText,
        jobDescription,
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.get("/prompts", async (req, res) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "What is AI in 1 line?",
    });
    //   console.log(response?.text);
    //   return response?.text;
    const text = response?.text || "No response text.";
    console.log("Gemini response:", text);
    res.send({ text });
  } catch (err) {
    console.error("Error in /prompts:", err);
    res.status(500).send({ message: "Failed to fetch response from AI" });
  }
});

app.post("/jwt", async (req, res) => {
  const user = req.body;
  const token = sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "24h",
  });
  res.send({ token });
});
async function run() {
  try {
    await client.connect();
    const db = client.db("careercraft");
    const usersCollection = db.collection("users");

    const verifyToken = (req, res, next) => {
      console.log("hi", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Access Denied" });
      }
      const token = req.headers.authorization.split(" ")[1];
      verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Access Denied" });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    app.post("/users", async (req, res) => {
      console.log("hi");
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/user/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log(email);
      if (email != req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access." });
      }
      const query = { email: email };
      const existingUser = await usersCollection.findOne(query);
      res.send(existingUser);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email != req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access." });
      }
      const query = { email: email };
      const existingUser = await userCol.findOne(query);
      let admin = false;
      if (existingUser) admin = existingUser?.role === "admin";
      res.send({ admin });
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello");
});

app.listen(port, () => {
  console.log(`Running on port ${port}`);
});
