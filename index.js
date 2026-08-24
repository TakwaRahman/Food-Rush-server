const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-z4lejrv-shard-00-00.t7hbkhr.mongodb.net:27017,ac-z4lejrv-shard-00-01.t7hbkhr.mongodb.net:27017,ac-z4lejrv-shard-00-02.t7hbkhr.mongodb.net:27017/?ssl=true&replicaSet=atlas-o8z6bn-shard-0&authSource=admin&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db('food-rush-db');


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('FoodRush Server is Running!');
});


// Start server
app.listen(port, () => {
    console.log(`FoodRush server running on port ${port}`);
});