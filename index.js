import express from "express";
import cors from "cors";
import axios from "axios";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import bcrypt from "bcrypt";
import dayjs from "dayjs";

const participantSchema = joi.object({
    name: joi.string().required().min(3)
});

const messagesSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required().valid("message", "private_message"),
})

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

const mongoCLient = new MongoClient("mongodb://localhost:27017");

try {
    await mongoCLient.connect();
    console.log("MongoDB conectado!")
} catch (error) {
    console.log(error);
}

const db = mongoCLient.db("ApiBatePapoUol");
const collectionParticipants = db.collection("participants");
const collectionMessages = db.collection("messages");

app.post("/participants", async (req, res) => {

    const body = req.body;

    const { error } = participantSchema.validate(body, { abortEarly: false });

    if (error) {
        const errors = error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    }

    try {
        const encontrarNome = await collectionParticipants.findOne({ name: body.name });
        if (encontrarNome) {
            return res.status(409).send({ message: "Esse nome já existe! Por favor, escolha outro." })
        }

        await collectionParticipants.insertOne({ ...body, lastStatus: Date.now() });

        await collectionMessages.insertOne({ 
            from: body.name, 
            to: 'Todos', 
            text: 'entra na sala...', 
            type: 'status', 
            time: dayjs().locale("pt").format("HH:mm:s A") })

        res.status(201).send("Post dado")
    } catch (error) {
        console.log(error);
        res.status(400).send("Deu erro");
    }
});

app.get("/participants", async (req, res) => {

    try {
        let participants = await collectionParticipants.find().toArray();
        res.status(200).send(participants);
    } catch (error) {
        console.log(error);
        res.status(400).send("Deu erro");
    }
});

app.delete("/participants/:id", async (req, res) => {
    const { id } = req.params;

    try {
        console.log(id)
       const teste= await collectionParticipants.deleteOne({ _id:ObjectId(id) });
       console.log(teste)
        res.status(200).send({ message: "Participante apagado com sucesso!" })
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: error.message });
    }
})

app.post("/messages", async (req, res) => {

    const body = req.body;
    const { User } = req.headers;

    const { error } = messagesSchema.validate(body, { abortEarly: false });

    if (error) {
        const errors = error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    }

    if (!User) {
        return res.status(422).send({ message: "Envie o from" });
    }

    try {
        await collectionMessages.insertOne({ ...body, from: User, time: dayjs().locale("pt").format("HH:MM:s A") })
        res.sendStatus(201)
    } catch (error) {
        console.log(error);
        res.status(400).send("Deu erro");
    }

});

app.get("/messages", async (req, res) => {

    try {
        const messages = await collectionMessages.find().toArray();
        res.status(200).send(messages);
    } catch (error) {
        console.log(error);
        res.status(400).send("Um erro no get das msgs")
    }
});

app.post("/status", async (req, res) => {
    const { User } = req.headers;

    try {
        let participant = await collectionParticipants.findOne({ name: User })
        res.send(participant)
    } catch (error) {

    }
});

app.listen(5000, () => console.log("Server running in port: 500"));