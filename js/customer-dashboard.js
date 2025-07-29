document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("dishes-container");
  const token = localStorage.getItem("userToken");

  if (!token) {
    alert("Missing token, please log in again.");
    window.location.href = "/pages/customerlogin.html";
    return;
  }

  // טען מנות מהשרת
  loadDishes();

  // מאזינים ללחיצה על קטגוריות
  document.querySelectorAll(".sidebar-btn").forEach(button => {
    button.addEventListener("click", () => {
      const category = button.textContent.trim();
      if (
        ["Best Sellers", "Starters", "Main Courses", "Side Dishes", "Desserts", "Beverages"].includes(category)
      ) {
        loadDishes(category);
      }
    });
  });

  async function loadDishes(categoryFilter = null) {
    container.innerHTML = ""; // נקה קודם

    try {
      const res = await fetch("https://kuparashit-server.onrender.com/api/dishes", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("Unauthorized or server error");

      const dishes = await res.json();

      const filtered = categoryFilter
        ? dishes.filter(d => formatCategory(d.category) === categoryFilter)
        : dishes;

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

        const addBtn = card.querySelector(".add-btn");
        addBtn.addEventListener("click", () => {
          showOrderActionButtons(); // הצגת כפתורים ב־sidebar
          // כאן אפשר להוסיף גם לוגיקה להוספה להזמנה בפועל
        });

        container.appendChild(card);
      });
    } catch (err) {
      console.error("Failed to load dishes:", err);
      container.innerHTML = `<p>Failed to load dishes. Please try again later.</p>`;
    }
  }

  // הצגת כפתורי "View Order", "Add to Order", "Payment $"
  function showOrderActionButtons() {
    const sidebar = document.getElementById("sidebar");

    if (!document.getElementById("view-order-btn")) {
      const viewBtn = document.createElement("button");
      viewBtn.id = "view-order-btn";
      viewBtn.className = "sidebar-btn btn-pink";
      viewBtn.textContent = "View Order";
      sidebar.appendChild(viewBtn);
    }

   // if (!document.getElementById("add-to-order-btn")) {
      //const addBtn = document.createElement("button");
     // addBtn.id = "add-to-order-btn";
     // addBtn.className = "sidebar-btn btn-orange";
     // addBtn.textContent = "Add to Order";
      //sidebar.appendChild(addBtn);
    //} 

    if (!document.getElementById("pay-btn")) {
      const payBtn = document.createElement("button");
      payBtn.id = "pay-btn";
      payBtn.className = "sidebar-btn btn-green";
      payBtn.textContent = "Payment $";
      sidebar.appendChild(payBtn);
    }
  }


  function formatCategory(cat) {
    const map = {
      "Best Seller": "Best Sellers",
      "Starter": "Starters",
      "Main Course": "Main Courses",
      "Side Dish": "Side Dishes",
      "Dessert": "Desserts",
      "Beverage": "Beverages",
      "Appetizer": "Starters" 
    };
    return map[cat] || cat;
  }
});
