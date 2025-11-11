const express= require('express')
const cors = require('cors')
const app=express()
const port=process.env.PORT||5000
app.use(cors())
app.use(express.json())
require('dotenv').config()
const jwt = require("jsonwebtoken");



const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.fxxuhv1.mongodb.net/?appName=Cluster0`;

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
    await client.connect();
    const db = client.db("careercraft");
    const usersCollection = db.collection("users");

    app.post('/jwt',async(req,res)=>{
        const user=req.body;
        const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
            expiresIn:'24h'
        })
        res.send({ token });
    })

    const verifyToken=(req,res,next)=>{
        console.log("hi",req.headers.authorization);
        if(!req.headers.authorization){
            return res.status(401).send({message:"Access Denied"});
        }
        const token=req.headers.authorization.split(" ")[1];
        jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
            if(err){
                return res.status(401).send({message:"Access Denied"});
            }
            req.decoded=decoded;
            next();
        })
    }

    const verifyAdmin=async(req,res,next)=>{
        const email=req.decoded.email;
        const query={email:email};
        const user= await usersCollection.findOne(query);
        if(user?.role!=="admin"){
            return res.status(403).send({message:"Forbidden Access"});
        }
        next();
    }


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

    app.get("/user/:email",verifyToken,async(req,res)=>{
        const email=req.params.email;
        console.log(email)
        if(email!=req.decoded.email){
            return res.status(403).send({ message: "Forbidden access." });
        }
        const query={email:email};
        const existingUser=await usersCollection.findOne(query);
        res.send(existingUser);
    })

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
  }finally{

  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send("Hello");
})

app.listen(port,()=>{
    console.log(`Running on port ${port}`);
})
