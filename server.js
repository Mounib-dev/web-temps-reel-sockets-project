import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static("public"));

// On stock les évènements (simulation seulement, c'est à dire qu'à chaque fois qu'on relance l'appli, tout se remet à l'état initial mais le but ici est de simuler une base de données)
const events = {
  "Concert Metallica": { spots: 5, users: {} },
  "Festival Jazz": { spots: 8, users: {} },
};

// On envoie la page HTML
app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "/index.html"));
});

// On attend qu'un utilisateur se connecte
io.on("connection", (socket) => {
  console.log("Un utilisateur s'est connecté");

  // On écoute depuis le Socket Frontend l'évènement "selectEvent", à chaque fois qu'un évènement est sélectionné, on émet l'information de l'event sélectionné qu'on écoute ici
  socket.on("selectEvent", (eventName) => {
    if (!events[eventName]) {
      // Envoie un message d'erreur si l'événement est invalide
      socket.emit("errorMessage", "Événement invalide.");
      return;
    }

    // Met à jour les places disponibles et la liste des utilisateurs pour l'événement sélectionné
    socket.join(eventName);
    socket.emit("updateSpots", events[eventName].spots);
    socket.emit("updateUsers", events[eventName].users);
  });

  // Écoute l'événement "register" pour gérer une inscription
  socket.on("register", ({ name, tickets, event }) => {
    if (!events[event]) {
      // Envoie un message d'erreur si l'événement est invalide
      socket.emit("errorMessage", "Événement invalide.");
      return;
    }

    const eventInfo = events[event];
    const user = eventInfo.users[socket.id];

    // Vérifie si le nom est déjà pris
    const isNameTaken = Object.values(eventInfo.users).some(
      (user) => user.name === name
    );

    if (isNameTaken) {
      socket.emit("errorMessage", `Le nom "${name}" est déjà utilisé.`);
      return;
    }

    // Vérifie si le nombre total de tickets dépasse la limite (3 maximum par utilisateur)
    if (user && user.tickets + tickets > 3) {
      socket.emit(
        "errorMessage",
        "Vous ne pouvez pas réserver plus de 3 tickets."
      );
      return;
    }
    // Vérifie si le nombre de places disponibles est suffisant
    if (eventInfo.spots - tickets < 0) {
      socket.emit("errorMessage", "Pas assez de places disponibles.");
      return;
    }
    // Enregistre l'utilisateur avec le nombre de tickets réservés
    if (!user) {
      eventInfo.users[socket.id] = { name, tickets };
    } else {
      eventInfo.users[socket.id].tickets += tickets;
    }
    // Met à jour le nombre de places disponibles
    eventInfo.spots -= tickets;

    // Notifie tous les utilisateurs de la "room" de la mise à jour
    io.to(event).emit("updateSpots", eventInfo.spots);
    io.to(event).emit("updateUsers", eventInfo.users);

    // Informer uniquement le client actuel pour une confirmation rapide
    socket.emit("registrationSuccess", { name, tickets, event });
  });

  // Gestion de la déconnexion d'un utilisateur
  socket.on("disconnect", () => {
    for (const [event, info] of Object.entries(events)) {
      if (info.users[socket.id]) {
        // Réattribue les tickets de l'utilisateur aux places disponibles
        // Bien sûr dans un cas réel, si quelqu'un a acheté des tickets, il les garde, mais ici, nous n'avons pas la base de données, on la simule seulement
        info.spots += info.users[socket.id].tickets;
        delete info.users[socket.id];
        // Met à jour les places et utilisateurs dans la "room"
        io.to(event).emit("updateSpots", info.spots);
        io.to(event).emit("updateUsers", info.users);
      }
    }
    console.log("Un utilisateur s'est déconnecté");
  });
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
