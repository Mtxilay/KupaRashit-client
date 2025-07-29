document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const usernameInput = document.getElementById("Username");
  const passwordInput = document.getElementById("password");
  const errorText = document.getElementById("errorMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      showError("אנא מלאי את כל השדות");
      return;
    }

    try {
      const response = await fetch("https://kuparashit-server.onrender.com/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.message || "שם משתמש או סיסמה לא נכונים");
        return;
      }

      localStorage.setItem("userToken", data.token);

      // 🔓 חילוץ userId מהטוקן (כי הוא לא מגיע מהשרת ישירות)
      const payloadBase64 = data.token.split(".")[1];
      const payloadJson = JSON.parse(atob(payloadBase64));
      localStorage.setItem("userId", payloadJson.userId); // ← זה היה חסר

      const isAdminLogin = window.location.pathname.includes("adminlogin");

      if (isAdminLogin) {
        window.location.href = "/pages/admindashboard.html";
      } else {
        window.location.href = "/pages/customerdashboard.html";
      }

    } catch (err) {
      console.error("Login error:", err);
      showError("שגיאה בשרת, נסי שוב מאוחר יותר.");
    }
  });

  function showError(message) {
    errorText.textContent = message;
    errorText.style.color = "red";
  }
});
