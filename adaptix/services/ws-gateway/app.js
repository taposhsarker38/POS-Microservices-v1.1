// services/ws-gateway/app.js
import "./tracing.js"; // Must be first
import express from "express";
import http from "http";
import { Server } from "socket.io";
import amqp from "amqplib";
import fs from "fs";
import jwt from "jsonwebtoken";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis"; // Standard import
import cors from "cors";

const PORT = process.env.PORT || 9001;
const AMQP_URL = process.env.AMQP_URL || "amqp://guest:guest@rabbitmq:5672/";
const EXCHANGE = process.env.AMQP_EXCHANGE || "events";
const PUBLIC_KEY_PATH = process.env.PUBLIC_KEY_PATH || "/keys/public.pem";
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || "*";
const AUTH_ISSUER = process.env.AUTH_ISSUER || "prod-client-kid";

async function loadPublicKey() {
  try {
    return fs.readFileSync(PUBLIC_KEY_PATH, "utf8");
  } catch (e) {
    console.warn(
      "Public key not found at",
      PUBLIC_KEY_PATH,
      "— JWT verification will fail if used."
    );
    return null;
  }
}

const app = express();
app.use(cors({ origin: ALLOW_ORIGIN, credentials: true }));
app.get("/", (req, res) => res.json({ status: "ws-gateway ok" }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ALLOW_ORIGIN, methods: ["GET", "POST"], credentials: true },
  pingInterval: 25000,
  pingTimeout: 60000,
});

// setup redis adapter if redis url present (for horizontal scaling)
async function setupRedisAdapter() {
  try {
    console.log("Redis URL:", REDIS_URL);
    // Use standard ioredis constructor
    const pubClient = new Redis(REDIS_URL);
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Redis adapter connected");
  } catch (err) {
    console.warn("Redis adapter not configured:", err.message);
  }
}

async function startAMQPConsumer(onMessage) {
  const conn = await amqp.connect(AMQP_URL);
  const ch = await conn.createChannel();
  await ch.assertExchange(EXCHANGE, "topic", { durable: true });
  const q = await ch.assertQueue("", { exclusive: true });
  await ch.bindQueue(q.queue, EXCHANGE, "");

  console.log("AMQP consumer bound to exchange:", EXCHANGE);

  ch.consume(
    q.queue,
    (msg) => {
      if (!msg) return;
      let payload;
      try {
        payload = JSON.parse(msg.content.toString());
      } catch (e) {
        console.error("Failed to parse AMQP message", e);
        return;
      }
      onMessage(payload);
    },
    { noAck: true }
  );
}

(async () => {
  const publicKey = await loadPublicKey();
  await setupRedisAdapter();

  // JWT validate helper
  function verifyToken(token) {
    if (!token) return null;
    try {
      // token expected as Bearer <token> or raw token
      if (token.startsWith("Bearer ")) token = token.slice(7);
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ["RS256"],
        issuer: AUTH_ISSUER,
      });
      return decoded; // should contain sub, user_id, etc
    } catch (err) {
      console.warn("JWT verify failed:", err.message);
      return null;
    }
  }

  // Socket auth on connection (token in query or auth payload)
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(); // allow anonymous connections optionally — or reject
    }
    const user = verifyToken(token);
    if (!user) {
      return next(new Error("unauthorized"));
    }
    socket.user = user;
    return next();
  });

  io.on("connection", (socket) => {
    console.log(
      "Client connected",
      socket.id,
      "user=",
      socket.user
        ? socket.user.sub || socket.user.user_id || socket.user.username
        : "anon"
    );

    // allow client to join rooms (only allowed if authorized)
    socket.on("join", (room) => {
      // sanitize room input
      if (typeof room !== "string") return;
      // optionally check permission: e.g., only join company_{id} if socket.user.company == id
      socket.join(room);
      socket.emit("joined", room);
    });

    socket.on("leave", (room) => {
      if (typeof room !== "string") return;
      socket.leave(room);
      socket.emit("left", room);
    });

    socket.on("disconnect", (reason) => {
      console.log("Client disconnected", socket.id, reason);
    });
  });

  // AMQP consumer → broadcast events
  await startAMQPConsumer((payload) => {
    // payload expected shape: { event: 'stock.updated', data: {...}, rooms?: ['company_1'] }
    try {
      const eventName = payload.event || payload.type || "event";
      const data = payload.data ?? payload;
      const rooms = payload.rooms || [];

      if (Array.isArray(rooms) && rooms.length > 0) {
        rooms.forEach((room) => io.to(room).emit(eventName, data));
      } else {
        // global broadcast
        io.emit(eventName, data);
      }
      console.log(
        "Emitted event",
        eventName,
        "to",
        rooms.length ? `${rooms.length} rooms` : "all clients"
      );
    } catch (err) {
      console.error("Failed to broadcast payload", err);
    }
  });

  server.listen(PORT, () => {
    console.log(`WS Gateway listening on ${PORT}`);
  });
})();
