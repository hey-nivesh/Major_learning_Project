# 🧩 MongoDB Aggregation Pipeline --- Full Beginner to Production Guide

## 📘 What is the Aggregation Pipeline?

The **Aggregation Pipeline** in MongoDB is a **data processing
framework** that allows you to transform, filter, and analyze data in a
collection --- similar to SQL's `GROUP BY`, `JOIN`, and `SUM`
operations, but more flexible.

It processes data through **multiple stages**, where the output of one
stage becomes the input of the next.

Example visualization:

    Collection → [Stage 1: $match] → [Stage 2: $group] → [Stage 3: $sort] → Result

------------------------------------------------------------------------

## 🧠 1️⃣ Basic Structure

In JavaScript (Node.js + Mongoose), an aggregation pipeline is created
using the `.aggregate()` method on a model.

### Example:

``` js
const result = await User.aggregate([
  { $match: { age: { $gte: 18 } } },  // Stage 1: filter users
  { $group: { _id: "$gender", total: { $sum: 1 } } }  // Stage 2: group by gender
]);
```

Each stage is an **object** starting with a MongoDB aggregation operator
(like `$match`, `$group`, `$sort`, etc.).

------------------------------------------------------------------------

## 🧱 2️⃣ Common Aggregation Stages (with Explanations)

  -------------------------------------------------------------------------------------------------------------------------------------------
  Stage                Purpose                   Example
  -------------------- ------------------------- --------------------------------------------------------------------------------------------
  `$match`             Filters documents (like   `{ $match: { status: "active" } }`
                       `WHERE` in SQL)           

  `$group`             Groups documents by a     `{ $group: { _id: "$category", count: { $sum: 1 } } }`
                       field                     

  `$sort`              Sorts documents           `{ $sort: { createdAt: -1 } }`

  `$project`           Selects specific fields   `{ $project: { name: 1, email: 1 } }`

  `$lookup`            Joins another collection  `{ $lookup: { from: "orders", localField: "_id", foreignField: "userId", as: "orders" } }`

  `$unwind`            Deconstructs arrays       `{ $unwind: "$orders" }`

  `$addFields`         Adds new computed fields  `{ $addFields: { totalSpent: { $sum: "$orders.amount" } } }`

  `$limit`             Limits the number of      `{ $limit: 5 }`
                       results                   

  `$skip`              Skips documents           `{ $skip: 10 }`
  -------------------------------------------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

## ⚙️ 3️⃣ Basic Example --- Filtering and Grouping

Suppose we have a `users` collection:

``` json
{
  "name": "Nivesh",
  "gender": "male",
  "age": 22,
  "status": "active"
}
```

We want to count active users by gender.

``` js
const result = await User.aggregate([
  { $match: { status: "active" } },
  { $group: { _id: "$gender", totalUsers: { $sum: 1 } } }
]);

console.log(result);
```

**Output:**

``` json
[
  { "_id": "male", "totalUsers": 10 },
  { "_id": "female", "totalUsers": 7 }
]
```

------------------------------------------------------------------------

## 🧮 4️⃣ Real-World Production Examples

### 🏪 Example 1: E-commerce --- Total Sales by Category

``` js
const salesStats = await Order.aggregate([
  { $match: { status: "completed" } },
  {
    $group: {
      _id: "$category",
      totalRevenue: { $sum: "$amount" },
      avgOrderValue: { $avg: "$amount" },
      orders: { $sum: 1 }
    }
  },
  { $sort: { totalRevenue: -1 } }
]);
```

**Use Case:** Dashboard analytics showing top-performing categories.

------------------------------------------------------------------------

### 👥 Example 2: User Analytics --- Active Users Per Month

``` js
const activeUsers = await User.aggregate([
  {
    $group: {
      _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
      count: { $sum: 1 }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } }
]);
```

**Use Case:** Monthly growth charts in an admin dashboard.

------------------------------------------------------------------------

### 📦 Example 3: Product Reviews --- Average Rating

``` js
const productRatings = await Review.aggregate([
  { $match: { productId: mongoose.Types.ObjectId(productId) } },
  {
    $group: {
      _id: "$productId",
      avgRating: { $avg: "$rating" },
      totalReviews: { $sum: 1 }
    }
  }
]);
```

**Use Case:** Product page showing average user rating.

------------------------------------------------------------------------

### 💸 Example 4: Join Collections --- Users and Their Orders

``` js
const userOrders = await User.aggregate([
  {
    $lookup: {
      from: "orders",
      localField: "_id",
      foreignField: "userId",
      as: "orders"
    }
  },
  { $project: { name: 1, email: 1, totalOrders: { $size: "$orders" } } }
]);
```

**Use Case:** Display user profiles with their total order count ---
similar to an e-commerce admin panel.

------------------------------------------------------------------------

### 📊 Example 5: Revenue Over Time

``` js
const revenueOverTime = await Payment.aggregate([
  { $match: { status: "successful" } },
  {
    $group: {
      _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
      totalRevenue: { $sum: "$amount" }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } }
]);
```

**Use Case:** Finance analytics --- revenue visualization for each
month.

------------------------------------------------------------------------

## 🧰 5️⃣ Combining Pipelines with Pagination and Search

Real-world dashboards often combine `$match`, `$skip`, `$limit`, and
`$sort`.

Example: Fetch users with search + pagination:

``` js
const search = "nivesh";
const page = 1;
const limit = 10;

const users = await User.aggregate([
  { $match: { name: { $regex: search, $options: "i" } } },
  { $sort: { createdAt: -1 } },
  { $skip: (page - 1) * limit },
  { $limit: limit },
  { $project: { name: 1, email: 1, createdAt: 1 } }
]);
```

**Use Case:** Admin panels or API endpoints that return paginated data
efficiently.

------------------------------------------------------------------------

## ⚠️ 6️⃣ Tips for Production

  -----------------------------------------------------------------------
  Practice                     Why It Matters
  ---------------------------- ------------------------------------------
  Always use indexes on        Increases performance drastically
  `$match` and `$lookup`       
  fields                       

  Use `$project` early         Reduces memory by limiting fields

  Avoid `$unwind` on large     Can blow up data volume
  arrays unnecessarily         

  Chain `$limit` and `$skip`   Optimizes pagination
  after `$sort`                

  Prefer pipeline-based        Server-side computation is faster
  analytics over `.find()` +   
  `.map()`                     
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 🔍 7️⃣ Debugging and Testing Aggregations

You can test your pipelines directly in: - **MongoDB Compass →
Aggregation Tab** - **MongoDB Playground (VS Code Extension)** - **Mongo
Shell / Mongosh**

These tools visualize stages and help debug logic visually.

------------------------------------------------------------------------

## 📦 Summary Table of Core Operators

  ------------------------------------------------------------------------------------------------------------------------------------------------
  Operator               Description                  Example
  ---------------------- ---------------------------- --------------------------------------------------------------------------------------------
  `$match`               Filter documents             `{ $match: { status: "active" } }`

  `$group`               Group and compute totals     `{ $group: { _id: "$city", total: { $sum: 1 } } }`

  `$sort`                Sort documents               `{ $sort: { total: -1 } }`

  `$project`             Select specific fields       `{ $project: { name: 1, _id: 0 } }`

  `$lookup`              Join with another collection `{ $lookup: { from: "orders", localField: "_id", foreignField: "userId", as: "orders" } }`

  `$unwind`              Flatten array fields         `{ $unwind: "$orders" }`

  `$limit`               Restrict result count        `{ $limit: 10 }`
  ------------------------------------------------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

## 🚀 Final Thoughts

Aggregation pipelines are **the backbone of MongoDB analytics**.\
They allow your backend to handle complex queries (filtering, analytics,
joins, charts) **directly in the database** without loading all data
into memory.

Used correctly, they make your Express + MongoDB backend **fast,
scalable, and production-ready**.
