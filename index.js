const express = require("express");
const { body, validationResult } = require("express-validator");

const app = express();

app.use(express.json());

// List of transactions
const transactionList = [];
// Map of payer and point values
const payerPoints = {};
// Sum of points
let totalPoints = 0;

app.get("/", (req, res) => {
  res.send("Fetch Backend Assessment");
});

/**
 * Add a transaction
 *
 * @route POST /add
 *
 */
app.post(
  "/add",
  body("payer")
    .notEmpty()
    .withMessage("Payer must not be empty")
    .isString()
    .withMessage("Payer must be a string"),
  body("points")
    .notEmpty()
    .withMessage("Points must not be empty")
    .isInt()
    .withMessage("Points must be an integer"),
  body("timestamp")
    .notEmpty()
    .withMessage("Timestamp must not be empty")
    .isISO8601()
    .withMessage("Timestamp must be a valid date"),
  (req, res) => {
    // Validation
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(400).send({ errors: result.array() });
    }

    const { payer, points, timestamp } = req.body;

    // Update total points
    totalPoints += points;

    // Update payer balance
    if (payer in payerPoints) {
      payerPoints[payer] += points;
    } else {
      payerPoints[payer] = points;
    }

    // Update list of transactions and keep it sorted by timestamp
    transactionList.push({ payer, points, timestamp });
    transactionList.sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    return res.status(200).send();
  }
);

/**
 * Spend points
 *
 * @route POST /spend
 *
 */
app.post(
  "/spend",
  body("points")
    .notEmpty()
    .withMessage("Points must not be empty")
    .isInt()
    .withMessage("Points must be an integer")
    .custom((value) => {
      if (totalPoints < value) {
        throw new Error(`Insufficient points`);
      }
      return true;
    }),
  (req, res) => {
    // Validation
    const result = validationResult(req);
    if (!result.isEmpty()) {
      const errors = result.array();
      console.log(errors);

      // // Checking for insufficient point error
      for (const e of errors) {
        if (e.msg == "Insufficient points") {
          return res
            .status(400)
            .send(
              `Insufficent points, currently only have ${totalPoints} points.`
            );
        }
      }

      // Default error
      return res.status(400).send({ errors: result.array() });
    }

    let { points: pointsToSpend } = req.body;
    const response = {};
    // Iterate through transactions and spend points
    for (const tx of transactionList) {
      if (tx.points >= pointsToSpend) {
        payerPoints[tx.payer] -= pointsToSpend;
        response[tx.payer] = (response[tx.payer] ?? 0) - pointsToSpend;
        totalPoints -= pointsToSpend;
        break;
      }

      payerPoints[tx.payer] -= tx.points;
      pointsToSpend -= tx.points;
      response[tx.payer] = (response[tx.payer] ?? 0) - tx.points;
      totalPoints -= tx.points;
    }

    return res.status(200).send(response);
  }
);

/**
 * Get balance
 *
 * @route GET /balance
 *
 */
app.get("/balance", (req, res) => {
  return res.status(200).send(payerPoints);
});

const port = 8000;
app.listen(port, () => console.log(`Listening on port ${port}...`));
