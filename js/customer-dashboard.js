// customer-dashboard.js (מוכן עם כל הלוגיקה)
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  // יצירת מודאל ההזמנה אם לא קיים
  if (!document.getElementById("order-summary-modal")) {
    const modal = document.createElement("div");
    modal.id = "order-summary-modal";
    modal.className = "modal hidden";
    modal.innerHTML = `
      <div class="modal-content">
        <div id="order-items" class="order-list"></div>
        <div class="order-footer">
          <p>Total: <span id="order-total-price">0.00$</span></p>
          <div class="order-buttons">
            <button id="place-order" class="btn-green">Place Order</button>
            <button id="cancel-order" class="btn-red">Cancel</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  function showOrderModal() {
    const modal = document.getElementById("order-summary-modal");
    const orderItemsContainer = document.getElementById("order-items");
    const totalPriceElement = document.getElementById("order-total-price");

    const order = JSON.parse(localStorage.getItem("currentOrder")) || [];
    orderItemsContainer.innerHTML = "";
    let total = 0;

    order.forEach(item => {
      const line = document.createElement("div");
      line.textContent = `${item.quantity}X ${item.name} ${item.price.toFixed(2)}$`;
      orderItemsContainer.appendChild(line);
      total += item.quantity * item.price;
    });

    totalPriceElement.textContent = `${total.toFixed(2)}$`;
    modal.classList.remove("hidden");
  }

  // לחצן ביטול וסגירת מודאל
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "cancel-order") {
      document.getElementById("order-summary-modal").classList.add("hidden");
    }
  });

  // שליחת הזמנה לשרת
  document.addEventListener("click", async (e) => {
    if (e.target && e.target.id === "place-order") {
      const order = JSON.parse(localStorage.getItem("currentOrder")) || [];
      if (order.length === 0) return alert("Order is empty");

      try {
        const res = await fetch("https://kuparashit-server.onrender.com/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ items: order }),
        });

        if (!res.ok) throw new Error("Failed to place order");

        alert("Order placed successfully!");
        localStorage.removeItem("currentOrder");
        document.getElementById("order-summary-modal").classList.add("hidden");
      } catch (err) {
        console.error("Order error:", err);
        alert("Failed to place order");
      }
    }
  });
});
