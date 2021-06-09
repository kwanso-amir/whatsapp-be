import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import Pusher from "pusher";
import Messages from "./dbMessages.js";

// APP config
const app = express();
const port = process.env.PORT || 9000;

const pusher = new Pusher({
  appId: "1216118",
  key: "9048dd8edcb49a672b4b",
  secret: "b6ece3f33bb6abd0c538",
  cluster: "ap2",
  useTLS: true,
});

// Midlewares
app.use(express.json());
dotenv.config();
app.use(cors());

// DB Config
mongoose.connect(process.env.MANGO_DB_ALTAS, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.once("open", () => {
  console.log("DB connected...");

  const changeStream = db.collection("messagecontents").watch();

  changeStream.on("change", (change) => {
    console.log("A change occured: ", change);

    if (change.operationType === "insert") {
      const messageDetails = change.fullDocument;
      pusher.trigger("messages", "inserted", {
        id: messageDetails._id,
        name: messageDetails.user,
        message: messageDetails.message,
        timestamp: messageDetails.timestamp,
        received: messageDetails.received,
      });
    } else {
      console.log("Unknown trigger for pusher....");
    }
  });
});

// API routes
app.get("/", (req, res) => res.status(200).send("Hello WORLD!!!"));

app.get("/messages/sync", (req, res) => {
  Messages.find((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(data);
    }
  });
});

app.post("/messages/new", (req, res) => {
  const dbMessage = req.body;

  Messages.create(dbMessage, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(data);
    }
  });
});

// Listening
app.listen(port, () => console.log(`listening on localhost:${port}`));
