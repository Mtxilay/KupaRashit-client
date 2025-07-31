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
    let dishes;

    if (categoryFilter === "Best Sellers") {
      const res = await fetch("https://kuparashit-server.onrender.com/api/statistics/top-selling", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch best sellers");
      dishes = await res.json();
    } else {
      const res = await fetch("https://kuparashit-server.onrender.com/api/dishes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Unauthorized or server error");
      dishes = await res.json();
      if (categoryFilter) {
        dishes = dishes.filter(d => formatCategory(d.category) === categoryFilter);
      }
    }

    dishes.forEach(dish => {
      const card = document.createElement("div");
      card.className = "dish-card";
      card.innerHTML = `
        <h3>${dish.name}</h3>
        <img src="${dish.image}" alt="${dish.name}">
        <div class="actions">
          <button class="view-btn">View</button>
          <button class="add-btn">Add to Order</button>
        </div>
        <button class="rate-btn">Rate & Review</button>
        <div class="price">${dish.price?.toFixed(2) || "N/A"}$</div>
      `;

      fetch(`https://kuparashit-server.onrender.com/api/reviews/dish/${dish._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(reviews => {
        const avg = reviews.length === 0 ? 0 : reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
        const fullStars = Math.floor(avg);
        const halfStar = avg - fullStars >= 0.5;
        const starsHtml = "★".repeat(fullStars) + (halfStar ? "½" : "") + "☆".repeat(5 - fullStars - (halfStar ? 1 : 0));

        const ratingDiv = document.createElement("div");
        ratingDiv.className = "dish-rating";
        ratingDiv.innerHTML = `${starsHtml} (${avg.toFixed(1)})`;
        card.appendChild(ratingDiv);
      });

      card.querySelector(".add-btn").addEventListener("click", () => {
        addToOrder(dish);
        showOrderActionButtons();
      });

      card.querySelector(".view-btn").addEventListener("click", () => {
        showDishModal(dish);
      });

      container.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load dishes:", err);
    container.innerHTML = "<p>Failed to load dishes. Please try again later.</p>";
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
      "Appetizer": "Starters",
    };
    return map[cat] || cat;
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
    const existing = order.find(item => item.dishId === dish._id);
    if (existing) {
      existing.quantity += 1;
    } else {
      order.push({ dishId: dish._id, name: dish.name, price: dish.price, quantity: 1 });
    }
    localStorage.setItem("currentOrder", JSON.stringify(order));
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

  function showDishModal(dish) {
    let existing = document.getElementById("dish-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "dish-modal";
    modal.className = "dish-modal";

    modal.innerHTML = `
      <div class="dish-modal-content">
        <h2>${dish.name}</h2>
        <img src="${dish.image}" alt="${dish.name}" />
        <p>${dish.description || "No description available."}</p>
        <button id="close-dish-modal" class="btn-red">Close</button>
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById("close-dish-modal").addEventListener("click", () => modal.remove());
  }

  let selectedRating = 0;
  let currentDishForReview = null;

  document.addEventListener("click", (e) => {
    const index = e.target.dataset?.index;
    if (index !== undefined) {
      let order = JSON.parse(localStorage.getItem("currentOrder")) || [];
      if (e.target.classList.contains("increase")) order[index].quantity += 1;
      else if (e.target.classList.contains("decrease")) order[index].quantity = Math.max(1, order[index].quantity - 1);
      else if (e.target.classList.contains("remove")) order.splice(index, 1);
      localStorage.setItem("currentOrder", JSON.stringify(order));
      showOrderModal();
    }

    if (e.target.id === "cancel-order") {
      document.getElementById("order-summary-modal").classList.add("hidden");
    }

    if (e.target.id === "place-order") {
      const order = JSON.parse(localStorage.getItem("currentOrder")) || [];
      if (order.length === 0) return alert("Order is empty");

      const comment = document.getElementById("order-comment-input").value;
      const customerName = "Test User";
      const dishes = order.map(item => ({ dishId: item.dishId, quantity: item.quantity }));

      fetch("https://kuparashit-server.onrender.com/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ customerName, dishes, comment }),
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


    if (e.target.classList.contains("rate-btn")) {
      const dishCard = e.target.closest(".dish-card");
      const dishName = dishCard.querySelector("h3").textContent;
      currentDishForReview = dishName;
      document.getElementById("review-dish-name").textContent = `Rate & Review: ${dishName}`;
      document.getElementById("review-modal").classList.add("show");
      selectedRating = 0;
      updateStars(0);
      document.getElementById("review-comment").value = "";
    }

    if (e.target.id === "cancel-review") {
      document.getElementById("review-modal").classList.remove("show");
    }

    if (e.target.closest(".stars span")) {
      selectedRating = parseInt(e.target.dataset.value);
      updateStars(selectedRating);
    }

    if (e.target.id === "submit-review") {
      const comment = document.getElementById("review-comment").value.trim();
      if (selectedRating === 0) return alert("Please select a star rating.");
      if (!comment) return alert("Please write a comment.");

      fetch("https://kuparashit-server.onrender.com/api/dishes", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => res.json())
      .then(dishes => {
        const dish = dishes.find(d => d.name === currentDishForReview);
        if (!dish) throw new Error("Dish not found");

        return fetch("https://kuparashit-server.onrender.com/api/reviews", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ dishId: dish._id, rating: selectedRating, comment })
        });
      })
      .then(res => {
        if (!res.ok) throw new Error("Failed to submit review");
        alert("Review submitted successfully!");
        document.getElementById("review-modal").classList.remove("show");
      })
      .catch(err => {
        console.error(err);
        alert("Error submitting review.");
      });
    }


    if (e.target.closest(".dish-rating")) {
      const dishCard = e.target.closest(".dish-card");
      const dishName = dishCard.querySelector("h3").textContent;

      fetch("https://kuparashit-server.onrender.com/api/dishes", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(dishes => {
        const dish = dishes.find(d => d.name === dishName);
        if (!dish) throw new Error("Dish not found");

        return fetch(`https://kuparashit-server.onrender.com/api/reviews/dish/${dish._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      })
      .then(res => res.json())
      .then(reviews => {
        const listContainer = document.getElementById("review-list-content");
        listContainer.innerHTML = "";
        if (reviews.length === 0) {
          listContainer.innerHTML = "<p>No reviews yet for this dish.</p>";
        } else {
          reviews.forEach(r => {
            const entry = document.createElement("div");
            entry.className = "review-entry";
            const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
            entry.innerHTML = `<div class="stars">${stars}</div><div class="comment">${r.comment}</div>`;
            listContainer.appendChild(entry);
          });
        }
        document.getElementById("all-reviews-modal").classList.add("show");
      });
    }

    if (e.target.id === "close-reviews-modal") {
      document.getElementById("all-reviews-modal").classList.remove("show");
    }
  });

  function updateStars(rating) {
    document.querySelectorAll("#star-rating span").forEach(span => {
      const value = parseInt(span.dataset.value);
      span.classList.toggle("active", value <= rating);
    });
  }
});
