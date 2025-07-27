document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("dishes-container");
  const token = localStorage.getItem("userToken");

  if (!token) {
    alert("Missing token, please log in again.");
    window.location.href = "/pages/customerlogin.html";
    return;
  }

  try {
    const res = await fetch("https://kuparashit-server.onrender.com/api/dishes", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error("Unauthorized or server error");
    }

    const dishes = await res.json();

    dishes.forEach(dish => {
      const card = document.createElement("div");
      card.className = "dish-card";

      card.innerHTML = `
        <h3>${dish.name}</h3>
        <img src="${dish.image}" alt="${dish.name}">
        <div class="actions">
          <button class="view-btn">View</button>
          <button class="change-btn">Change</button>
          <button class="add-btn">Add to Order</button>
        </div>
        <button class="rate-btn">Rate & Review</button>
        <div class="price">${dish.price.toFixed(2)}$</div>
      `;

      container.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load dishes:", err);
    container.innerHTML = `<p>Failed to load dishes. Please try again later.</p>`;
  }
});
