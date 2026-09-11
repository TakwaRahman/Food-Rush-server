const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


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
          return res.send({
            success: false,
            alreadyExists: true,
            message: "This food is already in your cart"
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

    app.get('/cart', async (req, res) => {
      const email = req.query.email;

      const result = await cartCollection.find({ userEmail: email }).toArray();

      res.send(result)
    })


    app.delete('/cart/:id', async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) }

      const result = await cartCollection.deleteOne(query);

      res.send(result)
    })

    // Stripe Checkout API
    // Stripe Checkout API
    app.post('/create-checkout-session', async (req, res) => {
      try {
        const { cartItems, userEmail } = req.body;

        if (!cartItems || cartItems.length === 0) {
          return res.status(400).send({
            success: false,
            message: "Cart is empty"
          });
        }

        // Subtotal
        const subtotal = cartItems.reduce(
          (total, item) =>
            total +
            Number(item.price) * (Number(item.quantity) || 1),
          0
        );

        // 10% discount
        const discount = subtotal * 0.10;

        // Delivery fee
        const deliveryFee = 5;

        // Final total
        const total = subtotal - discount + deliveryFee;

        // Food items
        const foodLineItems = cartItems.map(item => ({
          price_data: {
            currency: 'usd',

            product_data: {
              name: item.name || item.foodName || "Food Item",

              // যদি তোমার image field "photo" হয়
              images: item.photo ? [item.photo] : [],
            },

            unit_amount: Math.round(Number(item.price)),
          },

          quantity: Number(item.quantity) || 1,
        }));

        // Delivery fee
        const deliveryLineItem = {
          price_data: {
            currency: 'usd',

            product_data: {
              name: 'Delivery Fee',
            },

            unit_amount: Math.round(deliveryFee),
          },

          quantity: 1,
        };

        const coupon = await stripe.coupons.create({
          percent_off: 10,
          duration: 'once'
        });

        // Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],

          line_items: [
            ...foodLineItems,
            deliveryLineItem
          ],

          mode: 'payment',

          customer_email: userEmail,

          success_url: 'http://localhost:5173/payment-success',

          cancel_url: 'http://localhost:5173/cart',

          discounts: [
            {
              coupon: coupon.id
            }
          ],

          metadata: {
            userEmail,
            subtotal: subtotal.toString(),
            discount: discount.toString(),
            deliveryFee: deliveryFee.toString(),
            total: total.toString()
          }
        });

        res.send({
          success: true,
          url: session.url
        });

      } catch (error) {
        console.error("Stripe Error:", error);

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