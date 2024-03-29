const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const app = express();
require("dotenv").config();

const mongoURL = process.env.MONGO_URL;
const port = process.env.PORT || 4000;

const url = `${mongoURL}`;
const dbName = "wazirx";
const collectionName = "tickers";
app.use(cors());
const axios = require("axios");
const cron = require("node-cron");

// Define a task to run every 2 minutes

let config = {
  method: "get",
  maxBodyLength: Infinity,
  url: "https://api.wazirx.com/api/v2/tickers",
  headers: {},
};

app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

cron.schedule("*/2 * * * *", async () => {
  try {
    const response = await axios.request(config);
    const first10Items = [];

    let count = 0;

    for (const key in response.data) {
      if (count < 10) {
        const tickerData = {
          name: key,
          last: response.data[key]["last"],
          buy: response.data[key]["buy"],
          sell: response.data[key]["sell"],
          volume: response.data[key]["volume"],
          baseUnit: response.data[key]["base_unit"],
        };

        first10Items.push(tickerData);
        count++;
      } else {
        break;
      }
    }

    // Connect to MongoDB Atlas
    const client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection(collectionName);

      // Clear existing data
      await collection.deleteMany({});

      // Insert the new data
      await collection.insertMany(first10Items);

      console.log("Task completed successfully");
    } catch (error) {
      console.error("Error connecting to MongoDB:", error);
    } finally {
      // Close the MongoDB connection
      await client.close();
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }
});

app.get("/getTickers", async (req, res) => {
  try {
    // Connect to MongoDB Atlas
    const client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection(collectionName);

      // Find all documents in the collection and convert them to an array
      const tickerData = await collection.find({}).toArray();

      // Close the MongoDB connection
      await client.close();

      // Send the ticker data as JSON response
      res.json(tickerData);
    } catch (error) {
      console.error("Error connecting to MongoDB:", error);
      res.status(500).json({ error: "An error occurred" });
    } finally {
      // Close the MongoDB connection
      await client.close();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.get("/getDocuments", async (req, res) => {
  try {
    const client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection(collectionName);

      const documents = await collection.find({}).limit(10).toArray();

      res.json(documents);
    } catch (error) {
      console.error("Error connecting to MongoDB:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      // Close the MongoDB connection
      await client.close();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
