const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

    const userCollection = db.collection('users')
    const foodCollection = db.collection('foods')
    const restaurantsCollection = db.collection('restaurants')
    const cartCollection = db.collection('cart')


    // User Api

    app.post('/users', async (req, res) => {
      const user = req.body;

      const existingUser = await userCollection.findOne({
        email: user.email,
      })

      if (existingUser) {
        return res.send({
          message: 'User already exists'
        })
      }

      const userWithCreatedAt = {
        ...user,
        createdAt: new Date()
      };


      const result = await userCollection.insertOne(userWithCreatedAt);

      res.send(result)
    })


    // food Api
    app.post('/foods', async (req, res) => {
      const foodData = req.body;

      const result = await foodCollection.insertOne(foodData);

      res.send(result)
    })

    app.get('/foods', async (req, res) => {
      const foods = await foodCollection.find().toArray();

      res.send(foods)
    })


    app.get('/foods/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };


      const food = await foodCollection.findOne(query);

      res.send(food)

    })


    // cart Api
    app.post('/cart', async (req, res) => {
      try {
        const cartItem = req.body;

        const existingItem = await cartCollection.findOne({
          userEmail: cartItem.userEmail,
          foodId: cartItem.foodId
        });

        if (existingItem) {
          const result = await cartCollection.updateOne(
            { _id: existingItem._id },
            {
              $inc: {
                quantity: 1
              }
            }
          );

          return res.send({
            success: true,
            message: "Cart quantity increased",
            result
          });
        }

        const result = await cartCollection.insertOne(cartItem);

        res.send({
          success: true,
          message: "Added to cart",
          result
        });

      } catch (error) {
        console.error(error);

        res.status(500).send({
          success: false,
          message: error.message
        });
      }
    });


    // Restaurents api
    app.post('/restaurants', async (req, res) => {
      const restaurants = req.body;

      const result = await restaurantsCollection.insertOne(restaurants);
      res.send(result)
    })

    app.get('/restaurants', async (req, res) => {
      const restaurants = (await restaurantsCollection.find().sort({ rating: -1 }).toArray());

      res.send(restaurants)
    })

    app.get('/restaurants/:id', async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) }

      const result = await restaurantsCollection.findOne(query);

      res.send(result);
    })



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