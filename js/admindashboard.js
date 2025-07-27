document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('dishes-container');

  try {
    const res = await fetch('/api/dishes');
    const dishes = await res.json();

    dishes.forEach(dish => {
      const card = document.createElement('div');
      card.className = 'dish-card';

      card.innerHTML = `
        <h3>${dish.name}</h3>
        <div class="action-buttons">
          <button class="edit-btn">✏️ Edit</button>
          <button class="stats-btn">📊 Stats</button>
          <button class="ing-btn">Ingredients</button>
          <button class="delete-btn">🗑️ Delete</button>
        </div>
        <img src="${dish.image}" alt="${dish.name}" />
        <div class="price">${dish.price.toFixed(2)}$</div>
      `;

      container.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to fetch dishes:', err);
  }
});
