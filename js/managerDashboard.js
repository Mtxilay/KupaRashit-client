// ===== Run on page load =====
document.addEventListener("DOMContentLoaded", () => {
document.getElementById("manualModeBtn").addEventListener("click",async () => {
  document.getElementById("manualDishForm").classList.remove("hidden");
  document.getElementById("searchDishContainer").classList.add("hidden"); // Hides both search + results
  document.getElementById("manualModeBtn").classList.add("active");
  document.getElementById("searchModeBtn").classList.remove("active");
  await loadSettings();
});

document.getElementById("searchModeBtn").addEventListener("click", () => {
  document.getElementById("manualDishForm").classList.add("hidden");
  document.getElementById("searchDishContainer").classList.remove("hidden"); // Shows both
  document.getElementById("searchModeBtn").classList.add("active");
  document.getElementById("manualModeBtn").classList.remove("active");



});

    
  renderDishes();
});
// ===== Global variables =====
const selectedIngredientIds = new Set();
let renderedDishIds = new Set();

let allIngredients = []; // List of all available ingredients
let selectedIngredients = []; // What the dish currently uses
let selectedDishId = null;
let selectedDish = null;
let pieChartInstance = null;
let allDishes = [];
let newDishIngredients = [];





async function loadAllIngredients(token) {
  try {
    const res = await fetch("https://kuparashit-server.onrender.com/api/ingredients", {
      headers: { Authorization: `Bearer ${token}` },
    });
    allIngredients = await res.json();
  } catch (err) {
    console.error("Failed to fetch ingredients list:", err);
  }
}


// ===== Fetch and render all dishes =====
async function renderDishes() {
  const token = localStorage.getItem("userToken");
  if (!token) {
    console.error("No auth token found.");
    return;
  }

  await loadAllIngredients(token);

  try {
    const res = await fetch("https://kuparashit-server.onrender.com/api/dishes", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const dishes = await res.json();
    allDishes = dishes;

    for (const dish of dishes) {
      await renderDishCard(dish, token);
    }
  } catch (error) {
    console.error("Error loading dishes:", error);
  }
}

async function renderDishCard(dish, token) {
  const container = document.querySelector(".card-grid");
await loadSettings();
  // Check if this dish already exists in the DOM to avoid duplicates
  const existing = container.querySelector(`[data-dish-id="${dish._id}"]`);
  if (existing) {
  const priceDiv = existing.querySelector(".dish-price");
  const currency = window.currentSettings?.currency ?? "$";
  priceDiv.textContent = `${currency}${dish.price.toFixed(2)}`;
  return;
}

  const rating = await fetchRating(dish._id, token);
  const stars = generateStars(rating);
  const currency = window.currentSettings?.currency ?? "$";
  const card = document.createElement("div");
  card.className = "dish-card";
  card.setAttribute("data-dish-id", dish._id);
  card.innerHTML = `
    <h3>${dish.name}</h3>
    <div class="card-content">
      <div class="card-left">
        <div class="card-buttons">
          <button class="edit-btn">Edit</button>
          <button class="stats-btn">Stats</button>
          <button class="ingredients-btn">Ingredients</button>
          <button class="delete-btn">Delete</button>
        </div>
        <div class="card-info">
          <div class="stars">${stars}</div>
          <div class="dish-price">${currency}${dish.price.toFixed(2)}</div>
        </div>
      </div>
      <img class="card-image" src="${dish.image}" alt="${dish.name}" />
    </div>
  `;

  // Stats button
  const statsBtn = card.querySelector(".stats-btn");
  statsBtn.addEventListener("click", async () => {
    try {
      const res = await fetch(`https://kuparashit-server.onrender.com/api/statistics/dish/${dish._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch stats");

      const dishStats = await res.json();

      // Generate global breakdown
      const breakdown = {};
      for (const d of allDishes) {
        const sales = d.salesData || [];
        const totalQty = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
        breakdown[d.name] = totalQty;
      }

      openDishStatsModal(dishStats, breakdown);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      showAlert("Failed to load statistics.");
    }
  });

  // Delete button
  const deleteBtn = card.querySelector(".delete-btn");
  deleteBtn.addEventListener("click", () => {
    const modal = document.getElementById("confirmModal");
    const confirmText = document.getElementById("confirmText");

    const oldYes = document.getElementById("confirmYes");
    const oldNo = document.getElementById("confirmNo");
    const confirmYes = oldYes.cloneNode(true);
    const confirmNo = oldNo.cloneNode(true);
    oldYes.parentNode.replaceChild(confirmYes, oldYes);
    oldNo.parentNode.replaceChild(confirmNo, oldNo);

    confirmText.textContent = `Are you sure you want to delete "${dish.name}"?`;
    modal.classList.remove("hidden");

    confirmYes.addEventListener("click", async () => {
      modal.classList.add("hidden");
      try {
        const res = await fetch(`https://kuparashit-server.onrender.com/api/dishes/${dish._id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to delete dish");
        card.remove();
        console.log(`Deleted: ${dish.name}`);
      } catch (err) {
        console.error("Error deleting dish:", err);
        showAlert("Failed to delete the dish.");
      }
    });

    confirmNo.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  });

  // Edit logic
  setupEditModal(card, dish, token);
  container.appendChild(card);
}



// ===== Handle Edit Dish Modal =====
function setupEditModal(card, dish, token) {
  const editBtn = card.querySelector(".edit-btn");
  const ingredientsBtn = card.querySelector(".ingredients-btn");
  const statsBtn = card.querySelector(".stats-btn");
ingredientsBtn.addEventListener("click", async () => {
  await loadAllIngredients(token); // populate global allIngredients
  openAddIngredientsModal(dish); // show modal with current ingredients selected
});


  editBtn.addEventListener("click",async () => {
    const modal = document.getElementById("editDishModal");
    const nameInput = document.getElementById("editDishName");
    const priceInput = document.getElementById("editDishPrice");
    const descriptionInput = document.getElementById("editDishDescription");
    const cancelBtn = document.getElementById("editCancelBtn");
    const autoBtn = document.getElementById("autoPriceBtn");
    const autoModal = document.getElementById("autoCalcModal")
    const confirmBtn = document.getElementById("editConfirmBtn");
    const categorySelect = document.getElementById("editDishCategory");
    const addIngredientBtn = document.getElementById("addIngredientBtn");

    categorySelect.value = dish.category || "Other";


    if (!modal || !nameInput || !priceInput || !descriptionInput || !cancelBtn || !confirmBtn) {
      console.error("One or more modal elements not found");
      return;
    }

    // Fill form
    nameInput.value = dish.name;
    priceInput.value = dish.price;
    descriptionInput.value = dish.description || "";

    
    
    // Show modal
    modal.classList.remove("hidden");
     await renderIngredientTags(dish, token);
  confirmBtn.onclick = async () => {
  try {
    const updatedDish = {
      name: nameInput.value.trim(),
      price: parseFloat(priceInput.value),
      description: descriptionInput.value.trim(),
      category: categorySelect.value,
    };

    console.log("Sending update:", updatedDish);
    updateAlertShow("Updating dish...")
    const res = await fetch(`https://kuparashit-server.onrender.com/api/dishes/${dish._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updatedDish)
    });

    if (!res.ok) throw new Error("Failed to update dish");


    const saved = await res.json();
    const updated = saved.dish || saved;


    const dishIndex = allDishes.findIndex(d => d._id === updated._id);
    if (dishIndex !== -1) {
      allDishes[dishIndex] = updated;
    }

 
    renderSingleDishCard(updated, token);

    modal.classList.add("hidden");
    updateAlertClose();
  } catch (err) {
    console.error("Error updating dish:", err);
    showAlert("Failed to update dish.");
  }
};


//Auto calc button
autoBtn.onclick = async () => {
  try {
    const statRes = await fetch(`https://kuparashit-server.onrender.com/api/statistics/dish/${dish._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const stats = await statRes.json();

    // Fill inputs
    document.getElementById("autoIngCost").value = stats.ingredientCost.toFixed(2);
    document.getElementById("autoOpCost").value = stats.operationalCost.toFixed(2);
    document.getElementById("autoTotalCost").value = (stats.ingredientCost + stats.operationalCost).toFixed(2);
    document.getElementById("autoRecPrice").value = stats.suggestedPrice.toFixed(2);

    // Show modal

    autoModal.classList.remove("hidden");
    autoModal.classList.add("show");

    // Cancel button
    document.getElementById("autoCancelBtn").onclick = () => {
      autoModal.classList.add("hidden");
      autoModal.classList.remove("show");
    };

    // Apply button
    document.getElementById("autoApplyBtn").onclick = () => {
      priceInput.value = stats.suggestedPrice.toFixed(2);
      autoModal.classList.add("hidden");
      autoModal.classList.remove("show");
    };
  } catch (err) {
    console.error("Auto-calculate failed:", err.message, err);

    showAlert("Failed to fetch auto calculation data.");
  }
};


/*ingredients button*/
addIngredientBtn.onclick = async () => {
  await loadAllIngredients(token); // load all ingredients from DB
  openAddIngredientsModal(dish);   // pass the full dish object!
};




//Get ingredients names and render tags
function renderIngredientTags(dish) {
  const ingredientTagsContainer = document.getElementById("ingredientTags");
  ingredientTagsContainer.innerHTML = ""; // Clear old tags

  selectedIngredientIds.clear();

  if (!dish.ingredients || dish.ingredients.length === 0) return;

  console.log("rendering tags locally");

  dish.ingredients.forEach(item => {
    const ingredientId = typeof item.ingredient === 'string'
      ? item.ingredient
      : item.ingredient?._id;

    const ingredient = allIngredients.find(ing => ing._id === ingredientId);

    if (!ingredient) {
      console.warn(`⚠️ Ingredient ${ingredientId} not found in allIngredients`);
      return;
    }

    const tag = document.createElement("div");
    tag.className = "ingredient-tag";
    tag.textContent = ingredient.name;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "X";
    removeBtn.className = "remove-ingredient-btn";

    removeBtn.onclick = () => {
      const confirmModal = document.getElementById("confirmModal");
      const confirmText = document.getElementById("confirmText");
      const oldYes = document.getElementById("confirmYes");
      const oldNo = document.getElementById("confirmNo");

      const confirmYes = oldYes.cloneNode(true);
      const confirmNo = oldNo.cloneNode(true);
      oldYes.parentNode.replaceChild(confirmYes, oldYes);
      oldNo.parentNode.replaceChild(confirmNo, oldNo);

      confirmText.textContent = `Remove "${ingredient.name}" from this dish?`;
      confirmModal.classList.remove("hidden");

      confirmYes.onclick = async () => {
        confirmModal.classList.add("hidden");

        try {
          const updatedIngredients = dish.ingredients.filter(item =>
            (item.ingredient || item._id) !== ingredientId
          );

          const updatedDish = {
            name: dish.name,
            price: dish.price,
            description: dish.description || "",
            category: dish.category || "Other",
            ingredients: updatedIngredients
          };

          const updateRes = await fetch(`https://kuparashit-server.onrender.com/api/dishes/hard/${dish._id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("userToken")}`,
            },
            body: JSON.stringify(updatedDish),
          });

          if (!updateRes.ok) throw new Error("Failed to update ingredients");

          tag.remove();
          selectedIngredientIds.delete(ingredientId);
          dish.ingredients = updatedIngredients;
        } catch (err) {
          console.error("Error removing ingredient:", err);
          showAlert("Failed to update dish.");
        }
      };

      confirmNo.onclick = () => {
        confirmModal.classList.add("hidden");
      };
    };

    tag.appendChild(removeBtn);
    ingredientTagsContainer.appendChild(tag);
    selectedIngredientIds.add(ingredientId);
  });
}


    // Cancel button
    cancelBtn.onclick = () => {
      modal.classList.add("hidden");
    };
  });
}

function renderSingleDishCard(dish, token) {
  console.log("Rendering dish:", dish);  
  if (!dish || !dish._id) {
    console.error("Invalid dish object:", dish);
    return;
  }

  const oldCard = document.querySelector(`[data-dish-id="${dish._id}"]`);
  if (oldCard) oldCard.remove();
  renderDishCard(dish, token);
}


// ===== Get Average Rating =====
async function fetchRating(dishId, token) {
  try {
    const res = await fetch(`https://kuparashit-server.onrender.com/api/statistics/dish/${dishId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const stats = await res.json();
    return stats.averageRating || 0;
  } catch (err) {
    console.error(`Error fetching stats for dish ${dishId}:`, err);
    return 0;
  }
}




// ===== Render Stars (★ ☆) =====
function generateStars(rating) {
  const fullCount = Math.round(rating || 0);
  const emptyCount = 5 - fullCount;
  const full = '<span class="star">★</span>'.repeat(fullCount);
  const empty = '<span class="star">☆</span>'.repeat(emptyCount);
  return full + empty;
}

function openAddIngredientsModal(dish) {
  selectedDishId = dish._id;
  selectedDish=dish;

  // 🆕 Reconstruct selectedIngredients from the dish.ingredients list
  selectedIngredients = (dish.ingredients || []).map(item => {
    const id = typeof item.ingredient === 'string' ? item.ingredient : item.ingredient?._id;
    const name = item.ingredient?.name || '';
    const price = item.ingredient?.price ?? 1;
    const image = item.ingredient?.imageUrl || '';

    return {
      ingredient: id,
      quantity: item.quantity || 1,
      price,
      name,
      image
    };
  });

  renderIngredientsGrid();
  document.getElementById('addIngredientsModal').classList.remove('hidden');
}

console.log("rendering ingredients");
function renderIngredientsGrid() {
  const grid = document.getElementById('ingredientGrid');
  grid.innerHTML = '';
console.log("selected ingredients:");
console.table(selectedIngredients); // Or:
console.log(JSON.stringify(selectedIngredients, null, 2));

  allIngredients.forEach(ing => {
const isSelected = selectedIngredients.find(sel => {
  return String(sel.ingredient) === String(ing._id) || String(sel._id) === String(ing._id);
});



    const quantity = isSelected?.quantity || 1;
    const price = isSelected?.price ?? ing.price ?? 1;
    const imgUrl = ing.imageUrl;
      const currency = window.currentSettings?.currency ?? "$";
    const card = document.createElement('div');
    card.className = 'ingredient-card';
    console.log(`🧩 ${ing.name} (${ing._id}) → selected:`, isSelected);

    card.innerHTML = `
      <div class="card-header">
        <span class="ingredient-name">${ing.name}</span>
        <input type="checkbox" class="use-checkbox" value="${ing._id}" 
          ${isSelected ? "checked" : ""} onchange="toggleIngredient('${ing._id}')">
      </div>
      <img src="${imgUrl}" alt="${ing.name}">
      <div class="input-row">
        <label>Qty(gr/ml): 
          <input type="number" class="qty-input" min="1" value="${quantity}" data-id="${ing._id}">
        </label>
      </div>
      <div class="input-row">
        <label>Price: 
          <input type="number" class="price-input" step="0.01" value="${price}" data-id="${ing._id}">
        </label>
      </div>
      <div class="input-row">
        Total: ${currency}<span class="total-output" data-id="${ing._id}">
          ${(quantity * price / 100).toFixed(2)}
        </span>
         <button class="delete-ingredient-btn">Delete</button>
      </div>
    `;

    grid.appendChild(card);
    //Delete ingredient
   const deleteBtn = card.querySelector(".delete-ingredient-btn");

deleteBtn.addEventListener("click", async () => {
  const modal = document.getElementById("confirmModal");
  const confirmText = document.getElementById("confirmText");

  // Remove previous listeners by cloning
  const oldYes = document.getElementById("confirmYes");
  const oldNo = document.getElementById("confirmNo");
  const confirmYes = oldYes.cloneNode(true);
  const confirmNo = oldNo.cloneNode(true);
  oldYes.parentNode.replaceChild(confirmYes, oldYes);
  oldNo.parentNode.replaceChild(confirmNo, oldNo);

  confirmText.textContent = `Are you sure you want to delete ingredient "${ing.name}"?`;
  modal.classList.remove("hidden");

  confirmYes.addEventListener("click", async () => {
    modal.classList.add("hidden");

    try {
      const res = await fetch(`https://kuparashit-server.onrender.com/api/ingredients/${ing._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (!res.ok) throw new Error("Failed to delete ingredient");

      // Remove from DOM
      card.remove();
      showAlert(`Ingredient "${ing.name}" deleted.`);
    } catch (err) {
      console.error("Delete error:", err);
      showAlert("Error deleting ingredient.");
    }
  });

  confirmNo.addEventListener("click", () => {
    modal.classList.add("hidden");
  });
});


    const qtyInput = card.querySelector(".qty-input");
    const priceInput = card.querySelector(".price-input");

    if (qtyInput) qtyInput.onchange = () => toggleIngredient(ing._id);
    if (priceInput) priceInput.onchange = () => toggleIngredient(ing._id);

    const updateTotal = () => {
      const newQty = parseFloat(qtyInput.value) || 1;
      const newPrice = parseFloat(priceInput.value) || 0;

      // Update data in selectedIngredients
      const target = selectedIngredients.find(sel =>
        sel.ingredient === ing._id ||
        sel.ingredient?._id === ing._id ||
        sel._id === ing._id
      );

      if (target) {
        target.quantity = newQty;
        target.price = newPrice;
      }

      const totalEl = card.querySelector(".total-output");
      totalEl.textContent = (newQty * newPrice / 100).toFixed(2);
    };

    qtyInput.addEventListener("input", updateTotal);
    priceInput.addEventListener("input", updateTotal);
  });
}
function toggleIngredient(ingredientId) {
  const checkbox = document.querySelector(`input.use-checkbox[value="${ingredientId}"]`);
  const quantityInput = document.querySelector(`.qty-input[data-id="${ingredientId}"]`);
  const priceInput = document.querySelector(`.price-input[data-id="${ingredientId}"]`);

  const qty = parseFloat(quantityInput?.value) || 1;
  const price = parseFloat(priceInput?.value) || 0;

  const index = selectedIngredients.findIndex(sel =>
    String(sel.ingredient) === String(ingredientId) || String(sel._id) === String(ingredientId)
  );

  if (checkbox?.checked) {
    if (index === -1) {
      selectedIngredients.push({
        ingredient: ingredientId,
        quantity: qty,
        price: price
      });
    } else {
      selectedIngredients[index].quantity = qty;
      selectedIngredients[index].price = price;
    }

    // ✅ Add tag if not already present
    const tagExists = document.querySelector(`#ingredientTags [data-id="${ingredientId}"]`);
    if (!tagExists) {
      const ing = allIngredients.find(i => i._id === ingredientId);
      if (ing) {
        const tag = document.createElement("div");
        tag.className = "ingredient-tag";
        tag.dataset.id = ingredientId;
        tag.innerHTML = `
          ${ing.name}
          <button onclick="removeIngredientTag('${ingredientId}')">X</button>
        `;
        document.getElementById("ingredientTags").appendChild(tag);
      }
    }

  } else if (index !== -1) {
    selectedIngredients.splice(index, 1);

    // ❌ Remove tag
    const tag = document.querySelector(`#ingredientTags [data-id="${ingredientId}"]`);
    if (tag) tag.remove();
  }

  console.log("✅ selectedIngredients now:", selectedIngredients);
}
function removeIngredientTag(id) {
  const checkbox = document.querySelector(`input.use-checkbox[value="${id}"]`);
  if (checkbox) checkbox.checked = false;
  toggleIngredient(id); // sync data and UI
}





function openEditIngredientModal(ingredientId) {
  const ing = selectedIngredients.find(i =>
    i.ingredient === ingredientId || i.ingredient?._id === ingredientId
  );
  if (!ing) return;

  const name = ing.name || ing.ingredient?.name || "Unknown";
  const image = ing.image || ing.ingredient?.imageUrl || '';
  const currency = window.currentSettings?.currency ?? "$";
  const html = `
    <h3>Edit ${name}</h3>
    <img src="${image}" style="width:80px"><br>
    Quantity: <input type="number" id="qtyInput" value="${ing.quantity}" min="1"><br>
    Price: <input type="number" id="priceInput" value="${ing.price}" step="0.01"><br>
    <strong>Total:${currency} <span id="totalCost"></span></strong><br><br>
    <button onclick="saveIngredientEdit('${ingredientId}')">Save</button>
    <button onclick="closeModal('editIngredientModal')">Cancel</button>
  `;

  document.getElementById('editModalContent').innerHTML = html;
  updateTotalCost();
  document.getElementById('qtyInput').addEventListener('input', updateTotalCost);
  document.getElementById('priceInput').addEventListener('input', updateTotalCost);
  document.getElementById('editIngredientModal').classList.remove('hidden');
}

function updateTotalCost() {
  const qty = parseFloat(document.getElementById('qtyInput').value) || 0;
  const price = parseFloat(document.getElementById('priceInput').value) || 0;
  document.getElementById('totalCost').innerText = (qty * price / 100).toFixed(2) + ' ₪';
}

function saveIngredientEdit(ingredientId) {
  const qty = parseFloat(document.getElementById('qtyInput').value);
  const price = parseFloat(document.getElementById('priceInput').value);

  const ing = selectedIngredients.find(i =>
    i.ingredient === ingredientId || i.ingredient?._id === ingredientId
  );
  if (ing) {
    ing.quantity = qty;
    ing.price = price;
  }

  closeModal('editIngredientModal');
  renderIngredientsGrid();
}

async function saveIngredients() {
  console.log("saving ingredients");
  const token = localStorage.getItem("userToken");

  if (!selectedDish) {
    showAlert("Dish not loaded properly");
    return;
  }

  const normalizedIngredients = selectedIngredients.map(ing => ({
    ingredient: ing.ingredient?._id || ing.ingredient || ing._id,
    quantity: ing.quantity,
  }));

  if (!selectedDish._id) {
    newDishIngredients = normalizedIngredients;
    closeModal("addIngredientsModal");
    return;
  }

  const updatedDish = {
    name: selectedDish.name,
    price: selectedDish.price,
    description: selectedDish.description || "",
    category: selectedDish.category || "Other",
    image: selectedDish.image || "",
    ingredients: normalizedIngredients,
  };

  try {
    const res = await fetch(`https://kuparashit-server.onrender.com/api/dishes/hard/${selectedDish._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updatedDish),
    });

    if (!res.ok) throw new Error("Failed to update dish");

    for (const ing of selectedIngredients) {
      const id = ing.ingredient?._id || ing.ingredient || ing._id;
      if (!id) continue;

      try {
        updateAlertShow("Updating ingredients...")
        await fetch(`https://kuparashit-server.onrender.com/api/ingredients/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ price: ing.price }),
        });
      } catch (err) {
        console.warn(`Failed to update ingredient ${id}:`, err.message);
      }
    }

    // 🔁 Update only the edited dish locally
    const dishIndex = allDishes.findIndex(d => d._id === selectedDish._id);
    if (dishIndex !== -1) {
      allDishes[dishIndex] = {
        ...selectedDish,
        ...updatedDish,
        ingredients: normalizedIngredients,
      };
      renderSingleDishCard(allDishes[dishIndex]); // Only re-render that one
    }

    newDishIngredients = [...normalizedIngredients];
    closeModal("addIngredientsModal");
    updateAlertClose();
  } catch (err) {
    console.error("Save failed:", err);
    showAlert("Error saving dish.");
  }
}


function updateTotalCost() {
  const qty = parseFloat(document.getElementById('qtyInput').value) || 0;
  const price = parseFloat(document.getElementById('priceInput').value) || 0;
  document.getElementById('totalCost').innerText = (qty * price / 100).toFixed(2) + ' ₪';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("hidden");
  }
}

/*Pie chart generator*/
function generatePieChart(salesBreakdown) {
  const ctx = document.getElementById('statsPieChart').getContext('2d');

  // Destroy previous chart if it exists
  if (pieChartInstance) {
    pieChartInstance.destroy();
  }

  const labels = Object.keys(salesBreakdown);
  const data = Object.values(salesBreakdown);

  const totalSales = data.reduce((sum, val) => sum + val, 0);

  if (totalSales === 0) {
    // Replace with a dummy "No Data" chart
    pieChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['No Sales Data'],
        datasets: [{
          data: [1],
          backgroundColor: ['#ccc']
        }]
      },
      options: {
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
    return;
  }

  // Normal chart
  pieChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        label: 'Sales Breakdown',
        data,
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}


/*Dish stats modal*/
function openDishStatsModal(dishStats, breakdown) {
  const modal = document.getElementById("dishStatsModal");
  if (!modal || !dishStats || !breakdown) return;

  // Title
  document.getElementById("statsDishName").textContent = `Statistics for ${dishStats.name}`;

  // Inputs – use .value instead of .textContent
  document.getElementById("statDailySold").value = dishStats.avgDailySold || 0;
  document.getElementById("statRating").value = dishStats.averageRating?.toFixed(1) ?? "N/A";
  document.getElementById("statIngCost").value = dishStats.ingredientCost?.toFixed(2) ?? "N/A";
  document.getElementById("statOpCost").value = dishStats.operationalCost?.toFixed(2) ?? "N/A";
  document.getElementById("statPrice").value = dishStats.price?.toFixed(2) ?? "N/A";
  document.getElementById("statRecPrice").value = dishStats.suggestedPrice?.toFixed(2) ?? "N/A";
  document.getElementById("statPercentage").value = dishStats.avgDailyPercentage?.toFixed(2) ?? "N/A";
  document.getElementById("reviewsBtn").onclick = () => openDishReviewsModal(dishStats.dishId);
document.getElementById("recommendationsBtn").onclick = () => openDishRecommendationsModal(dishStats.dishId);


  

  // Open modal
  modal.classList.remove("hidden");

  // Pie chart
  generatePieChart(breakdown);
}

async function openDishReviewsModal(dishId) {
  const modal = document.getElementById("dishReviewsModal");
  const list = document.getElementById("reviewsList");
  const title = document.getElementById("reviewsTitle");
  list.innerHTML = "Loading...";
  title.textContent = "Dish Reviews";

  try {
    const token = localStorage.getItem("userToken");
    const res = await fetch(`https://kuparashit-server.onrender.com/api/reviews/dish/${dishId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to fetch reviews");

    const reviews = await res.json();
    list.innerHTML = "";

    if (reviews.length === 0) {
      list.innerHTML = "<p>No reviews found for this dish.</p>";
    } else {
      for (const review of reviews) {
        const date = new Date(review.date);
        const stars = generateStars(review.rating || 0);
        const item = document.createElement("div");
        item.className = "review-item";
        item.innerHTML = `
          <p><strong>Date:</strong> ${date.toLocaleDateString()} <strong>Hour:</strong> ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} <strong>Rating:</strong> ${stars}</p>
          <p>${review.comment}</p>
        `;
        list.appendChild(item);
      }
    }

    modal.classList.remove("hidden");
  } catch (err) {
    console.error("Error loading reviews:", err);
    list.innerHTML = "<p>Failed to load reviews.</p>";
  }
}


async function openDishRecommendationsModal(dishId) {
  const modal = document.getElementById("dishRecommendationsModal");
  const p = document.getElementById("recommendationsText");
  p.textContent = "Loading...";

  try {
    const token = localStorage.getItem("userToken");
    const res = await fetch(`https://kuparashit-server.onrender.com/api/statistics/dish/${dishId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const stats = await res.json();
    p.textContent = stats.recommendation || "No recommendation available.";
    modal.classList.remove("hidden");
  } catch (err) {
    console.error("Error fetching recommendation:", err);
    p.textContent = "Failed to load recommendation.";
  }
}

//Add dish



document.getElementById("confirmAddDishBtn").addEventListener("click", async () => {
  console.log("add clicked");
  const token = localStorage.getItem("userToken");

  const name = document.getElementById("newDishName").value.trim();
  const price = parseFloat(document.getElementById("newDishPrice").value);
  const description = document.getElementById("newDishDescription").value.trim();
  const category = document.getElementById("newDishCategory").value;
  const image = document.getElementById("newDishImage").value.trim();

  if (!name || isNaN(price) || price <= 0) {
    return showAlert("Please fill out the name and valid price.");
  }

  const dishData = {
    name,
    price,
    description,
    category,
    image,
    ingredients: []
  };

  try {
    console.log("saving...")
    const res = await fetch("https://kuparashit-server.onrender.com/api/dishes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dishData)
    });

    if (!res.ok) throw new Error("Failed to add dish");

    const createdDish = await res.json();
    console.log(res);
    showAlert(`✅ "${createdDish.name}" added!`);
    renderDishCard(createdDish, token); // Rerender
    newDishIngredients = [];

  } catch (err) {
    console.error("Add dish error:", err);
    showAlert("❌ Error adding dish.");
  }
});



// 🧠 Get the auth token (required for any protected fetch requests)
const token = localStorage.getItem("userToken");
if (!token) {
  console.error("No auth token found");
  showAlert("You are not logged in.");
}


function renderMealCards(meals) {
  const container = document.getElementById("mealSearchResults");
  container.innerHTML = "";

  meals.forEach(meal => {
    const card = document.createElement("div");
    card.className = "meal-card";
    card.innerHTML = `
      <h4>${meal.strMeal}</h4>
      <img src="${meal.strMealThumb}" width="120" />
      <p><strong>Category:</strong> ${meal.strCategory || "N/A"}</p>
      <button id="import-btn" class="import-meal-btn" data-id="${meal.idMeal}">Import</button>
    `;
    container.appendChild(card);
  });

  // Attach event listeners after rendering
document.querySelectorAll('.import-meal-btn').forEach(button => {
  button.addEventListener('click', async () => {
    const mealId = button.dataset.id;
    try {
      const res = await fetch(`https://kuparashit-server.onrender.com/api/mealdb/import/${mealId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('userToken')}`
        }
      });

      if (!res.ok) throw new Error("Import failed");

      const importedDish = await res.json();
      console.log("Imported Dish:", importedDish);
      showAlert(`Dish imported successfully!`);
      renderDishes(); // Refresh dish list
    } catch (err) {
      console.error("Import error:", err);
      showAalert("Failed to import dish.");
    }
  });
});

}

 document.getElementById("mealSearchBtn").addEventListener("click", async () => {
    const query = document.getElementById("mealSearchInput").value.trim();
    if (!query) return showAlert("Please enter a dish name");

    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!data.meals) {
        document.getElementById("mealSearchResults").innerHTML = "<p>No meals found.</p>";
        return;
      }

      renderMealCards(data.meals);
    } catch (err) {
      console.error("Error searching MealDB:", err);
      showAlert("Failed to search meals.");
    }
  });


  //Statistics

async function loadStatisticsData() {
  const token = localStorage.getItem('userToken');

  console.log("loading restaurant statistics");
  try {
    // 🔹 Fetch and render top sellers
    const topSellers = await fetch('https://kuparashit-server.onrender.com/api/statistics/top-selling', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => res.json());

    const topSellersList = document.getElementById('top-sellers-list');
    topSellersList.innerHTML = '';

    for (const dish of topSellers) {
      const imageUrl = await getDishImageById(dish._id);
      const card = document.createElement('div');
      card.className = 'simple-stat-card';

     card.innerHTML = `
  <div class="info">
    <h4>${dish.name}</h4>
  </div>
  <img src="${imageUrl || 'https://via.placeholder.com/80'}" alt="${dish.name}">
  <div class="info">
    <p>Sold: ${dish.totalSold}</p>
  </div>
`;

      topSellersList.appendChild(card);
    }

    // 🔹 Fetch and render top rated
    const topRated = await fetch('https://kuparashit-server.onrender.com/api/statistics/top-rated', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => res.json());

    const topRatedList = document.getElementById('top-rated-list');
    topRatedList.innerHTML = '';

    for (const dish of topRated) {
      const imageUrl = await getDishImageById(dish._id);
      const card = document.createElement('div');
      card.className = 'simple-stat-card';

card.innerHTML = `
  <div class="info">
    <h4>${dish.name}</h4>
  </div>
  <img src="${imageUrl || 'https://via.placeholder.com/80'}" alt="${dish.name}">
  <div class="info">
    <p>Rating: ${dish.avgRating} ⭐</p>
  </div>
`;
      topRatedList.appendChild(card);
    }

      // 🔹 Compute global statistics on frontend
let totalRevenue = 0;
let totalDishesSold = 0;
let totalRating = 0;
let ratedDishesCount = 0;
console.log(allDishes);
for (const dish of allDishes) {
  const sales = dish.salesData || [];
  const totalSold = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);

  totalDishesSold += totalSold;
  totalRevenue += (dish.price || 0) * totalSold;

  const rating = await fetchRating(dish._id, token); 
  if (rating > 0) {
    totalRating += rating;
    ratedDishesCount++;
  }
}

const avgRating = ratedDishesCount ? totalRating / ratedDishesCount : 0;

// 🔹 Update UI
document.querySelector('#average-rating span').textContent = avgRating.toFixed(2);
document.querySelector('#total-revenue span').textContent = `$${totalRevenue.toFixed(2)}`;
document.querySelector('#total-dishes-sold span').textContent = totalDishesSold.toString();

  } catch (err) {
    console.error("Failed to load stats:", err);
  }



}

async function getDishImageById(dishId) {
  const response = await fetch(`https://kuparashit-server.onrender.com/api/dishes/${dishId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const dish = await response.json();
  return dish.image || 'https://via.placeholder.com/80';
}

//Reviews

async function loadAllReviews() {
  const token = localStorage.getItem('userToken');
  const container = document.getElementById('all-reviews-container');
  container.innerHTML = '';

  try {
    // Fetch all reviews
    const res = await fetch('https://kuparashit-server.onrender.com/api/reviews', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const reviews = await res.json();

    // Group reviews by dishId
    const grouped = {};
    for (let review of reviews) {
      if (!grouped[review.dishId]) grouped[review.dishId] = [];
      grouped[review.dishId].push(review);
    }

    for (let dishId in grouped) {
      // Fetch dish info
      const dishRes = await fetch(`https://kuparashit-server.onrender.com/api/dishes/${dishId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!dishRes.ok) continue; // skip if dish not found
      const dish = await dishRes.json();

      const card = document.createElement('div');
      card.className = 'review-dish-card';
      card.innerHTML = `<h3>${dish.name}</h3>`;

      grouped[dishId].forEach(r => {
        const createdAt = new Date(r.date);
        if (isNaN(createdAt)) return; // skip invalid

        const date = createdAt.toLocaleDateString('en-GB');
        const time = createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);

        const reviewBox = document.createElement('div');
        reviewBox.className = 'review-box';
        reviewBox.innerHTML = `
          <p><strong>Date:</strong> ${date} &nbsp; <strong>Hour:</strong> ${time} &nbsp; <strong>Rating:</strong> ${stars}</p>
          <p>${r.comment || ''}</p>
        `;

        card.appendChild(reviewBox);
      });

      container.appendChild(card);
    }

  } catch (err) {
    console.error("Failed to load reviews", err);
    container.innerHTML = `<p>Error loading reviews.</p>`;
  }
}
//Add ingredient

document.getElementById('add-ingredient-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = localStorage.getItem('userToken');

  const name = document.getElementById('ingredient-name').value.trim();
  const price = parseFloat(document.getElementById('ingredient-price').value);
  const image = document.getElementById('ingredient-image').value.trim();
  const unit = document.getElementById('ingredient-unit').value.trim();

  // ✅ Check for duplicate by name (case-insensitive)
  const existing = allIngredients.find(ing =>
    ing.name.trim().toLowerCase() === name.toLowerCase()
  );

  if (existing) {
    document.getElementById('add-ingredient-message').textContent = `⚠️ Ingredient "${name}" already exists`;
    return;
  }

  try {
    const res = await fetch('https://kuparashit-server.onrender.com/api/ingredients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name, unit, price, image })
    });

    if (!res.ok) throw new Error('Failed to add ingredient');

    const newIngredient = await res.json();
    allIngredients.push(newIngredient); // ✅ Update local cache
    document.getElementById('add-ingredient-message').textContent = '✅ Ingredient added successfully';
    e.target.reset();
  } catch (err) {
    document.getElementById('add-ingredient-message').textContent = '❌ Error: ' + err.message;
  }
});

//Settings

document.getElementById("save-settings-btn").onclick = () => {
  console.log("Save button clicked"); 
  saveSettings();
};

  document.getElementById("log-out").onclick = () => {
try {
    localStorage.removeItem("userToken");
    window.location.href = "../pages/adminlogin.html"
}
      catch (err) {
         console.error("Logout error:", err);
  }
}


async function loadSettings() {
  try {
    const res = await fetch("https://kuparashit-server.onrender.com/api/settings", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("userToken")}`
      }
    });

    if (!res.ok) throw new Error("Failed to fetch settings");

    const settings = await res.json();


    document.getElementById("op-cost").value = settings.operationalCostRate ?? 0.2;
    document.getElementById("markup").value = settings.priceMarkup ?? 1.4;
    document.getElementById("currency").value = settings.currency ?? "$";
    console.log("currency is:"+currency);
    document.getElementById("auto-calc").checked = settings.autoCalculate ?? true;


    window.currentSettings = settings;

    console.log("Loaded settings:", settings);
  } catch (err) {
    console.error("Error loading settings:", err);
  }
}

async function saveSettings() {
  const settings = {
    userId: localStorage.getItem("userId"),  // ✅ send userId from frontend
    operationalCostRate: parseFloat(document.getElementById("op-cost").value),
    priceMarkup: parseFloat(document.getElementById("markup").value),
    currency: document.getElementById("currency").value,
    autoCalculate: document.getElementById("auto-calc").checked
  };
    console.log("currency is:"+currency);
  try {
    const res = await fetch("https://kuparashit-server.onrender.com/api/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`
      },
      body: JSON.stringify(settings)
    });

    if (!res.ok) throw new Error("Failed to save settings");
     window.currentSettings = settings;
    showAlert("Settings saved!");

    window.location.reload();

  } catch (err) {
    console.error(err);
  }
}


//Navigation Menu

function navigate(sectionId) {
  // Hide all sections
  document.querySelectorAll(".main-section").forEach(sec => {
    sec.classList.add("hidden");
  });

  // Show the one we want
  const sectionToShow = document.getElementById(sectionId);
  if (sectionToShow) sectionToShow.classList.remove("hidden");

  // Optional: refresh dish list if needed
  if (sectionId === "dish-list") {
    renderDishes();
  }

    if (sectionId === "statistics-section") {
    loadStatisticsData();
  }

  if (sectionId === "reviews-section") {
  loadAllReviews();
}

  if (sectionId === "settings-section") {
    loadSettings(); 
  }

}



//Alerts

function showAlert(message) {
  const modal = document.getElementById("alertModal");
  const messageEl = document.getElementById("alertMessage");
  const okBtn = document.getElementById("alertOk");

  messageEl.textContent = message;
  modal.classList.remove("hidden");

  const close = () => {
    modal.classList.add("hidden");
    okBtn.removeEventListener("click", close);
  };

  okBtn.addEventListener("click", close);
}

function updateAlertShow(message) {
  const modal = document.getElementById("updatealertModal");
  const messageEl = document.getElementById("updatealertMessage");

  messageEl.textContent = message;
  modal.classList.remove("hidden");

  document.body.classList.add("modal-open");
}

function updateAlertClose() {
  const modal = document.getElementById("updatealertModal");
  modal.classList.add("hidden");

  document.body.classList.remove("modal-open");
}
