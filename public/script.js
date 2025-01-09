const socket = io();

let currentEvent = "Concert Metallica"; // Évènement par défaut

// On stocke les places disponibles et les utilisateurs inscrits pour chaque événement
const eventSpots = {
  "Concert Metallica": 5,
  "Festival Jazz": 8,
};

const registeredUsers = {
  "Concert Metallica": {},
  "Festival Jazz": {},
};

// Met à jour l'interface utilisateur (places disponibles et utilisateurs inscrits)
const updateEventUI = () => {
  document.getElementById(
    "event-name"
  ).textContent = `Événement : ${currentEvent}`;

  document.getElementById("spots-count").textContent = eventSpots[currentEvent];

  const usersList = document.getElementById("users-list");
  usersList.innerHTML = "";

  Object.values(registeredUsers[currentEvent]).forEach((user) => {
    const li = document.createElement("li");
    li.textContent = `${user.name} (${user.tickets} ticket(s))`;
    usersList.appendChild(li);
  });
};

// Gestion de la sélection d'un événement via la barre latérale
document.querySelectorAll(".sidebar a").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const eventName = link.textContent;
    currentEvent = eventName;
    socket.emit("selectEvent", eventName); // On notifie le serveur de l'événement sélectionné
  });
});

// Gestion de la soumission du formulaire d'inscription
document.getElementById("registration-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("name-input").value.trim();
  const tickets = parseInt(document.getElementById("ticket-input").value, 10);

  if (!name) {
    document.getElementById("error-message").textContent =
      "Le prénom est requis.";
    return;
  }

  if (tickets > 3) {
    document.getElementById("error-message").textContent =
      "Vous ne pouvez pas réserver plus de 3 tickets.";
    return;
  }

  document.getElementById("name-input").value = "";
  document.getElementById("ticket-input").value = "";

  // Envoie les données d'inscription au serveur
  socket.emit("register", { name, tickets, event: currentEvent });
});

// Écoute des mises à jour des places disponibles
socket.on("updateSpots", (spots) => {
  eventSpots[currentEvent] = spots;
  updateEventUI();
});

// Écoute des mises à jour des utilisateurs inscrits
socket.on("updateUsers", (users) => {
  registeredUsers[currentEvent] = users;
  updateEventUI();
});

// Affiche un message d'erreur en cas de problème
socket.on("errorMessage", (message) => {
  document.getElementById("error-message").textContent = message;
});

socket.on("registrationSuccess", ({ name, tickets, event }) => {
  console.log(`${name} a réservé ${tickets} ticket(s) pour ${event}.`);
  updateEventUI();
});

// Met à jour l'interface utilisateur au chargement initial
updateEventUI();

// Cette partie concerne juste l'affichage de l'élément actif (évènement sélectionné) dans la barre latérale
const links = document.querySelectorAll(".sidebar a");
links.forEach((link) => {
  link.addEventListener("click", () => {
    links.forEach((l) => l.classList.remove("active")); // Retire "active" de l'autre évènement (Ici il y en a que 2)
    link.classList.add("active"); // Ajoute "active" au lien cliqué
  });
});
