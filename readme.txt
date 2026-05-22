# KupaRashit Client

Frontend client for **KupaRashit**, a full-stack restaurant management project.

This repository contains the client-side application used by managers and customers. The client communicates with the KupaRashit backend API and includes separate flows for restaurant staff and customers.

## Tech Stack

- HTML
- CSS
- JavaScript
- REST API communication with the backend server

## Project Overview

KupaRashit is a restaurant management project with two main user flows:

### Manager side

- Login
- View and manage dishes
- Add new dishes
- Import dishes from MealDB
- Manage ingredients
- View statistics
- View reviews
- Manage settings

### Customer side

- Browse dishes by category
- View dish details
- Add dishes to an order
- View and edit the current order
- Place an order
- Use the payment flow
- Submit dish reviews

## Main Features

### Entry Screen

The application starts with a simple choice between:

```txt
Staff
Customer
```

This separates the manager flow from the customer flow.

### Manager Dashboard

The manager dashboard includes sections for:

- Dishes
- Statistics
- Reviews
- Settings
- Add Ingredient
- Add Dish

The manager can add dishes manually or import dish data from MealDB.

### Dish Management

Managers can work with dish data such as:

- Name
- Price
- Description
- Category
- Image URL
- Ingredients

The dashboard also includes edit, delete, statistics, and ingredient actions for dishes.

### Ingredient Management

The manager dashboard includes an ingredient section where ingredients can be added and selected for dishes.

Ingredient fields include:

- Name
- Price
- Unit
- Image URL

### Statistics

The statistics section displays restaurant and dish-related data, including:

- Average rating
- Total revenue
- Total dishes sold
- Top sellers
- Top rated dishes
- Dish-level statistics
- Recommended price fields

### Customer Dashboard

The customer dashboard allows customers to browse dishes and interact with the menu.

Customer categories include:

- Best Sellers
- Starters
- Main Courses
- Side Dishes
- Desserts
- Beverages

Customers can add dishes to an order, view the current order, place an order, and submit reviews.

### Payment Flow

The client includes a payment modal used during the customer order flow.

The payment form collects basic payment details and then sends the order/payment request to the backend.

This should be treated as a demo/academic payment flow unless the backend is fully configured and tested for production use.

## Project Structure

```txt
KupaRashit-client/
│
├── css/                 # Stylesheets
├── images/              # Images and UI assets
├── js/                  # JavaScript files
│   ├── api.js
│   ├── customer-dashboard.js
│   ├── dashboard.js
│   ├── data.js
│   ├── login.js
│   ├── managerDashboard.js
│   └── payment.js
│
├── pages/               # HTML pages
│   ├── add-dish.html
│   ├── admindashboard.html
│   ├── adminlogin.html
│   ├── customerdashboard.html
│   ├── customerlogin.html
│   └── menu.html
│
├── index.html
└── README.md
```

## Running the Project

Clone the repository:

```bash
git clone https://github.com/Mtxilay/KupaRashit-client.git
cd KupaRashit-client
```

Open the project in VS Code and run it with a local static server, such as the Live Server extension.

Start from:

```txt
index.html
```

## Backend Requirement

This client requires the KupaRashit backend server.

Backend repository:

```txt
KupaRashit-server
```

The backend is responsible for:

- Authentication
- Dishes
- Ingredients
- Orders
- Reviews
- Payment handling
- Statistics
- Settings
- MealDB import
- Cash register import

## API Base URL Note

Some JavaScript files call the deployed backend directly, while `api.js` currently contains a local API base URL.

Before running the project, make sure the frontend points to the correct backend server address.

Example local backend:

```js
const API_BASE = "http://localhost:5000/api";
```

Example deployed backend:

```js
const API_BASE = "https://kuparashit-server.onrender.com/api";
```

## Notes for Recruiters

This project demonstrates:

- Building a multi-page frontend using HTML, CSS, and JavaScript
- Connecting a frontend to a Node.js/Express REST API
- Working with authenticated API requests
- Implementing CRUD-based dashboard behavior
- Managing dynamic UI state with vanilla JavaScript
- Building separate manager and customer flows
- Handling menu, order, review, statistics, and settings features
