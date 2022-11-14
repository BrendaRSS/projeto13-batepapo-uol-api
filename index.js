import express from "express";
import cors from "cors";
import axios from "axios";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import bcrypt from "bcrypt";
import dayjs from "dayjs";

let quinzeSegundos = 5;
let nameParticipantAcctual = "";

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

const mongoCLient = new MongoClient(process.env.MONGO_URI);

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
    nameParticipantAcctual = body.name;

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
            time: dayjs().locale("pt").format("HH:mm:s")
        })

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
        const teste = await collectionParticipants.deleteOne({ _id: ObjectId(id) });
        console.log(teste)
        res.status(200).send({ message: "Participante apagado com sucesso!" })
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: error.message });
    }
})

app.post("/messages", async (req, res) => {

    const body = req.body;
    const { fulano } = req.headers;
    console.log(fulano)

    const { error } = messagesSchema.validate(body, { abortEarly: false });

    if (error) {
        const errors = error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    }

    if (!fulano) {
        return res.status(422).send({ message: "Envie o fulano" });
    }

    try {
        const participanteEncontrado = await collectionParticipants.findOne({ name: fulano });
        if (!participanteEncontrado) {
            return res.status(422).send({ message: "Participante inexistente" });
        }

        await collectionMessages.insertOne({ ...body, from: fulano, time: dayjs().locale("pt").format("HH:mm:s") })
        res.sendStatus(201)
    } catch (error) {
        console.log(error);
        res.status(400).send("Deu erro");
    }

});

app.get("/messages", async (req, res) => {
    const { fulano } = req.headers;
    const { Limit } = req.query;
    console.log(fulano)
    try {
        const messages = await collectionMessages.find().toArray();

        const messagesForHeader = messages.filter((message)=>
            message.to === nameParticipantAcctual || 
            message.to === "Todos"|| 
            message.to === "todos" ||
            message.type==="message" ||
            message.from === fulano
        )
       
        if (Limit) {
            let newMessages = []
            for (let i = 1; i <= Limit; i++) {
                newMessages.push(messagesForHeader[messagesForHeader.length - i]);
            }
            return res.status(200).send(newMessages);
        }
        res.status(200).send(messagesForHeader);
    } catch (error) {
        console.log(error);
        res.status(400).send("Um erro no get das msgs")
    }
});


app.post("/status", async (req, res) => {
    const { fulano } = req.headers;
    const segundosAtuais = Date.now();

    try {
        let participant = await collectionParticipants.findOne({ name: fulano });
        if (!participant) {
            return res.status(404).send("Usuário não encontrado.")
        }

        const listaParticipantes = await collectionParticipants.find().toArray();
        const participantesParaDeletar = listaParticipantes.filter((participante) =>
            Number(segundosAtuais) - Number(participante.lastStatus) >= 10000);
        if (quinzeSegundos === 15) {

            for (const participante of participantesParaDeletar) {
                await collectionParticipants.deleteOne({ _id: ObjectId(participante._id) });
                await collectionMessages.insertOne({
                    from: participante.name,
                    to: 'Todos',
                    text: 'sai da sala...',
                    type: 'status',
                    time: dayjs().locale("pt").format("HH:mm:s")
                });

            }
            quinzeSegundos = 5;
            return res.status(201).send("Participante deletado")
            
        } else {
            quinzeSegundos += 5;
        }

        let newLastStatus = { ...participant, lastStatus: segundosAtuais };
        await collectionParticipants.updateOne({ _id: ObjectId(participant._id) }, { $set: newLastStatus });
        return res.status(201).send("lastStatus atualizado!");
    } catch (error) {
        console.log(error);
        return res.status(400).send("Deu erro");
    }
})

app.listen(5000, () => console.log("Server running in port: 5000"));