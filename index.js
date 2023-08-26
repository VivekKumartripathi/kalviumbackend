require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
mongoose
  .connect(
    `mongodb+srv://aayush:${process.env.password}@mernstack.zncrf9f.mongodb.net/kalvium`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  console.log(req.path, req.method);
  next();
});

const operationSchema = new mongoose.Schema(
  {
    question: String,
    answer: Number,
  },
  { timestamps: true }
);

const Operation = mongoose.model("Operation", operationSchema);

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  const endpoints = [
    "/history",
    "/5/plus/3",
    "/3/minus/5",
    "/3/minus/5/plus/8",
    "/3/into/5/plus/8/into/6",
  ];
  res.json({ endpoints });
});

app.get("/history", async (req, res) => {
  try {
    const history = await Operation.find().limit(20).sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Error fetching history" });
  }
});

function performOperation(operand1, operator, operand2) {
  switch (operator) {
    case "plus":
      return operand1 + operand2;
    case "minus":
      return operand1 - operand2;
    case "into":
      return operand1 * operand2;
    case "divide":
      return operand1 / operand2;
    default:
      throw new Error("Invalid operator.");
  }
}

function applyBodmasRule(calculationArray) {
  const precedence = {
    into: 2,
    divide: 2,
    plus: 1,
    minus: 1,
  };

  const outputStack = [];
  const operatorStack = [];

  for (const token of calculationArray) {
    if (typeof token === "number") {
      outputStack.push(token);
    } else if (Object.keys(precedence).includes(token)) {
      while (
        operatorStack.length > 0 &&
        precedence[operatorStack[operatorStack.length - 1]] >= precedence[token]
      ) {
        const operator = operatorStack.pop();
        const operand2 = outputStack.pop();
        const operand1 = outputStack.pop();
        const result = performOperation(operand1, operator, operand2);
        outputStack.push(result);
      }
      operatorStack.push(token);
    }
  }

  while (operatorStack.length > 0) {
    const operator = operatorStack.pop();
    const operand2 = outputStack.pop();
    const operand1 = outputStack.pop();
    const result = performOperation(operand1, operator, operand2);
    outputStack.push(result);
  }

  return outputStack[0];
}
app.get("/:calculation(*)", async (req, res) => {
  const calculation = req.params.calculation;
  const segments = calculation.split("/");
  const calculationArray = [];
  for (const segment of segments) {
    if (!isNaN(segment)) {
      calculationArray.push(parseFloat(segment));
    } else {
      calculationArray.push(segment);
    }
  }
  if (!Array.isArray(calculationArray) || calculationArray.length < 3) {
    return res
      .status(400)
      .json({ error: "Input should be an array of at least length 3." });
  }
  const result = applyBodmasRule(calculationArray);
  const operators = {
    into: "*",
    plus: "+",
    minus: "-",
    divide: "/",
  };

  let expression = "";
  for (const item of calculationArray) {
    if (item in operators) {
      expression += operators[item];
    } else {
      expression += item;
    }
  }
  const operation = new Operation({
    question: expression,
    answer: result,
  });

  try {
    await operation.save();
    res.json({ question: expression, answer: result });
  } catch (error) {
    res.status(500).json({ error: "Error saving operation" });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running`);
});