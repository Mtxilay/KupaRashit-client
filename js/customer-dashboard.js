document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("dishes-container");
  const token = localStorage.getItem("userToken");

  if (!token) {
    alert("Missing token, please log in again.");
    window.location.href = "/pages/customerlogin.html";
    return;
  }

  loadDishes();

  document.querySelectorAll(".sidebar-btn").forEach(button => {
    button.addEventListener("click", () => {
      const category = button.textContent.trim();
      if (["Best Sellers", "Starters", "Main Courses", "Side Dishes", "Desserts", "Beverages"].includes(category)) {
        loadDishes(category);
      }
    });
  });

  async function loadDishes(categoryFilter = null) {
    container.innerHTML = "";
    try {
      const res = await fetch("https://kuparashit-server.onrender.com/api/dishes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Unauthorized or server error");

      const dishes = await res.json();
      const filtered = categoryFilter ? dishes.filter(d => formatCategory(d.category) === categoryFilter) : dishes;

      filtered.forEach(dish => {
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
        card.querySelector(".add-btn").addEventListener("click", () => {
          addToOrder(dish);
          showOrderActionButtons();
        });

        container.appendChild(card);
      });
    } catch (err) {
      console.error("Failed to load dishes:", err);
      container.innerHTML = `<p>Failed to load dishes. Please try again later.</p>`;
    }
  }

  function showOrderActionButtons() {
    const sidebar = document.getElementById("dynamic-buttons");

    if (!document.getElementById("view-order-btn")) {
      const viewBtn = document.createElement("button");
      viewBtn.id = "view-order-btn";
      viewBtn.className = "sidebar-btn btn-pink";
      viewBtn.textContent = "View Order";
      sidebar.appendChild(viewBtn);
      viewBtn.addEventListener("click", showOrderModal);
    }

    if (!document.getElementById("pay-btn")) {
      const payBtn = document.createElement("button");
      payBtn.id = "pay-btn";
      payBtn.className = "sidebar-btn btn-green";
      payBtn.textContent = "Payment $";
      sidebar.appendChild(payBtn);
    }
  }

  function addToOrder(dish) {
    let order = JSON.parse(localStorage.getItem("currentOrder")) || [];
    const existing = order.find(item => item.name === dish.name);
    if (existing) {
      existing.quantity += 1;
    } else {
      order.push({ name: dish.name, price: dish.price, quantity: 1 });
    }
    localStorage.setItem("currentOrder", JSON.stringify(order));
  }

  function formatCategory(cat) {
    const map = {
      "Best Seller": "Best Sellers",
      "Starter": "Starters",
      "Main Course": "Main Courses",
      "Side Dish": "Side Dishes",
      "Dessert": "Desserts",
      "Beverage": "Beverages",
      "Appetizer": "Starters",
    };
    return map[cat] || cat;
  }

  function showOrderModal() {
    const modal = document.getElementById("order-summary-modal");
    const orderItemsContainer = document.getElementById("order-items");
    const totalPriceElement = document.getElementById("order-total-price");

    let order = JSON.parse(localStorage.getItem("currentOrder")) || [];
    orderItemsContainer.innerHTML = "";
    let total = 0;

    order.forEach((item, index) => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "order-item";
      itemDiv.innerHTML = `
        <span>${item.quantity}× ${item.name} - ${item.price.toFixed(2)}$</span>
        <div class="quantity-controls">
          <button class="decrease" data-index="${index}">−</button>
          <button class="increase" data-index="${index}">+</button>
          <button class="remove" data-index="${index}">✕</button>
        </div>
      `;
      orderItemsContainer.appendChild(itemDiv);
      total += item.quantity * item.price;
    });

    totalPriceElement.textContent = `${total.toFixed(2)}$`;
    modal.classList.remove("hidden");
  }

  document.addEventListener("click", (e) => {
    const index = e.target.dataset?.index;
    if (index !== undefined) {
      let order = JSON.parse(localStorage.getItem("currentOrder")) || [];

      if (e.target.classList.contains("increase")) {
        order[index].quantity += 1;
      } else if (e.target.classList.contains("decrease")) {
        order[index].quantity = Math.max(1, order[index].quantity - 1);
      } else if (e.target.classList.contains("remove")) {
        order.splice(index, 1);
      }

      localStorage.setItem("currentOrder", JSON.stringify(order));
      showOrderModal();
    }

    if (e.target && e.target.id === "cancel-order") {
      document.getElementById("order-summary-modal").classList.add("hidden");
    }

    if (e.target && e.target.id === "place-order") {
      const order = JSON.parse(localStorage.getItem("currentOrder")) || [];
      if (order.length === 0) return alert("Order is empty");

      fetch("https://kuparashit-server.onrender.com/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: order }),
      })
        .then(res => {
          if (!res.ok) throw new Error("Order failed");
          alert("Order placed successfully!");
          localStorage.removeItem("currentOrder");
          document.getElementById("order-summary-modal").classList.add("hidden");
        })
        .catch(err => {
          console.error(err);
          alert("Failed to place order.");
        });
    }
  });
});
