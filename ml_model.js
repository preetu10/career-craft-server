// ml_model.js
import * as tf from "@tensorflow/tfjs"; // pure JS version
import * as use from "@tensorflow-models/universal-sentence-encoder";

let modelPromise = null;

// Load the model once
export async function getModel() {
  if (!modelPromise) {
    modelPromise = use.load();
  }
  return modelPromise;
}

// Preprocess text (optional)
export function preprocess(text) {
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Compute cosine similarity between two texts
export async function computeSimilarity(text1, text2) {
  const model = await getModel();

  const embeddings = await model.embed([text1, text2]);
  const vec1 = embeddings.slice([0, 0], [1, -1]);
  const vec2 = embeddings.slice([1, 0], [1, -1]);

  const cosineSim = vec1
    .dot(vec2.transpose())
    .div(vec1.norm().mul(vec2.norm()))
    .arraySync()[0][0];

  return cosineSim; // 0 to 1
}
