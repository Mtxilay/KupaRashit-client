document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("dishes-container");
  const token = localStorage.getItem("token");

  if (!token) {
    alert("You must be logged in");
    window.location.href = "login.html";
    return;
  }

  fetch("https://kuparashit-server.onrender.com/api/dishes", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  })
    .then(res => {
      if (!res.ok) {
        throw new Error("Failed to fetch dishes");
      }
      return res.json();
    })
    .then(dishes => {
      renderDishes(dishes);
    })
    .catch(err => {
      console.error(err);
      container.innerHTML = `<p class="error">Failed to load dishes</p>`;
    });
});

function renderDishes(dishes) {
  const container = document.getElementById("dishes-container");
  container.innerHTML = "";

  dishes.forEach(dish => {
    const card = document.createElement("div");
    card.className = "dish-card";
    card.innerHTML = `
      <h3>${dish.name}</h3>
      <img src="${dish.image}" alt="${dish.name}" />
      <p>${dish.price.toFixed(2)}$</p>
      <div class="actions">
        <button>Edit</button>
        <button>Stats</button>
        <button>Ingredients</button>
        <button>Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
}
