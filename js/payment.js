document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("userToken");
  if (!token) return;

  document.addEventListener("click", async (e) => {
    // פתיחת מודל התשלום
    if (e.target && e.target.id === "pay-btn") {
      const order = JSON.parse(localStorage.getItem("currentOrder")) || [];
      if (order.length === 0) return alert("Your order is empty.");

      let total = order.reduce((sum, item) => sum + item.price * item.quantity, 0);
      document.getElementById("paymentTotal").textContent = `${total.toFixed(2)}$`;

      document.getElementById("paymentModal").classList.remove("hidden");
    }

    // סגירת מודל התשלום
    if (e.target && e.target.id === "cancelPayment") {
      document.getElementById("paymentModal").classList.add("hidden");
    }

    // אישור תשלום
    if (e.target && e.target.id === "confirmPayment") {
      const cardNumber = document.getElementById("cardNumber").value.trim();
      const expDate = document.getElementById("expDate").value.trim();
      const ccv = document.getElementById("ccv").value.trim();
      const holder = document.getElementById("cardHolder").value.trim();

      if (!cardNumber || !expDate || !ccv || !holder) {
        alert("Please fill in all fields.");
        return;
      }

      const order = JSON.parse(localStorage.getItem("currentOrder")) || [];
      if (order.length === 0) return alert("Order is empty");

      const comment = document.getElementById("order-comment-input")?.value || "";
      const customerName = "Test User";
      const dishes = order.map(item => ({ dishId: item.dishId, quantity: item.quantity }));

      try {
        // יצירת הזמנה
        const orderRes = await fetch("https://kuparashit-server.onrender.com/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ customerName, dishes, comment }),
        });

        if (!orderRes.ok) throw new Error("Failed to create order");
        const orderData = await orderRes.json();
    

        // תשלום
        const paymentRes = await fetch(`https://kuparashit-server.onrender.com/api/payments/${orderData._id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ cardNumber, expDate, ccv, holder }),
        });
   console.log(orderData._id);
        if (!paymentRes.ok) throw new Error("Payment failed");

        alert("Payment successful!");
        document.getElementById("paymentModal").classList.add("hidden");
        document.getElementById("order-summary-modal").classList.add("hidden");
        localStorage.removeItem("currentOrder");
      } catch (err) {
        console.error("Payment error:", err);
        alert("Payment failed.");
      }
    }
  });
});
