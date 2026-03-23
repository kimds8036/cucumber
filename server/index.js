/**
 * Node.js (ESModule) + express
 * 급식 API: GET /api/meal/:schulCode/:yyyymm
 */

import express from "express";
import mealRouter from "./routes/meal.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/api/meal", mealRouter);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
