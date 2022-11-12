import express from "express";
import cors from "cors";
import axios from "axios";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import bcrypt from "bcrypt";

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

const mongoCLient = new MongoClient("mongodb://localhost:27017");

try{
   await mongoCLient.connect();
   console.log("MongoDB conectado!")
} catch (error){
    console.log(error);
}

const db = mongoCLient.db("ApiBatePapoUol");
const collectionParticipants = db.collection("participants");
const collectionMessages = db.collection("messages");

app.post("/participants", async (req, res) => {

    const {name}= req.body;

    try{
       await collectionParticipants.insertOne({
            name: name
        })
        res.status(200).send("Post dado")
    } catch (error){
        console.log(error);
        res.status(400).send("Deu erro");
    }
});

app.get("/participants", async (req, res) => {

    try{
        let participants = await collectionParticipants.find().toArray();
        res.status(200).send(participants);
    } catch (error){
        console.log(error);
        res.status(400).send("Deu erro");
    }
});

app.post("/messages", async (req, res) => {

    const {to, text, type} = req.body

    try{
        await collectionMessages.insertOne({
            to: to,
            text: text,
            type: type
         })
         res.status(200).send("Deu certo")
     } catch (error){
         console.log(error);
         res.status(400).send("Deu erro");
     }

});

app.get("/messages", async (req, res) => {

    try{
        const messages =  await collectionMessages.find().toArray();
        res.status(200).send(messages);
    } catch (error){
        console.log(error);
        res.status(400).send("Um erro no get das msgs")
    }
});

// app.post("/status", (req, res) => {
   
// });

app.listen(5000, ()=>console.log("Server running in port: 500"));