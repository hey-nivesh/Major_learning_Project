# 🔐 Understanding JWT (JSON Web Token)

## 📘 What is JWT?

**JWT (JSON Web Token)** is a compact, URL-safe way to securely transmit
information between a client (like a frontend app) and a server.\
It's mainly used for **authentication and authorization** in web
applications.

------------------------------------------------------------------------

## 🧩 Structure of a JWT

A JWT consists of **three parts**, separated by dots (`.`):

    xxxxx.yyyyy.zzzzz
    |     |     |
    |     |     └── Signature (verifies token integrity)
    |     └──────── Payload (contains user data / claims)
    └────────────── Header (contains metadata)

Example:

    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
    eyJpZCI6IjEyMyIsInVzZXJuYW1lIjoiTml2ZXNoIn0.
    8qZB9dxrH9U0-FVpzqf1-KSpbf7VwI9b5_c2c5Tt-YA

------------------------------------------------------------------------

## 🧠 1️⃣ Header

Defines metadata about the token, mainly: - `alg`: Algorithm used to
sign (e.g., HS256) - `typ`: Type of token (JWT)

``` json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

Then it's **Base64 encoded**.

------------------------------------------------------------------------

## 🧠 2️⃣ Payload

Contains the **claims** --- information about the user or token context.

### Types of Claims:

-   **Registered Claims:** Predefined keys like `iss` (issuer), `exp`
    (expiration), `sub` (subject), `iat` (issued at).
-   **Public Claims:** Custom info like `role`, `username`.
-   **Private Claims:** Agreed info between parties (not public
    standards).

Example payload:

``` json
{
  "id": "12345",
  "username": "nivesh",
  "role": "admin",
  "exp": 1730983200
}
```

Also Base64 encoded.

------------------------------------------------------------------------

## 🧠 3️⃣ Signature

Used to **verify** the token hasn't been altered.

Created using:

    HMACSHA256(
      base64UrlEncode(header) + "." + base64UrlEncode(payload),
      secret
    )

If even a single character in header/payload changes, the signature
becomes invalid.

------------------------------------------------------------------------

## 🔐 How JWT Works in Authentication

### 1. **User Login**

-   User sends credentials (email + password) to `/login`.
-   Server verifies credentials.
-   Server creates a JWT and sends it to the client.

### 2. **Client Stores Token**

-   The frontend stores JWT in `localStorage` or `HTTP-only cookie`.

### 3. **Accessing Protected Routes**

-   Every time the user makes a request, the JWT is sent in the request
    header:

        Authorization: Bearer <token>

### 4. **Server Verifies Token**

-   Server verifies the signature using the same secret key.
-   If valid → grants access; if invalid or expired → denies access.

------------------------------------------------------------------------

## ⚙️ Example in Express.js

### Install

``` bash
npm install jsonwebtoken
```

### Generate Token

``` js
import jwt from "jsonwebtoken";

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};
```

### Verify Token (Middleware)

``` js
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";

export const verifyJWT = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) throw new ApiError(401, "Access Denied: No Token Provided");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach user info
    next();
  } catch (err) {
    throw new ApiError(403, "Invalid or Expired Token");
  }
};
```

------------------------------------------------------------------------

## ⚖️ Best Practices for JWT in Production

1.  **Always store secrets in `.env`.**
2.  **Use short expiration times** (`1h`, `15m`) to reduce exposure
    risk.
3.  **Use Refresh Tokens** to renew access tokens securely.
4.  **Prefer HTTP-only cookies** over `localStorage` for sensitive
    tokens.
5.  **Rotate JWT secrets periodically.**
6.  **Blacklist tokens on logout** if using refresh tokens.
7.  **Avoid storing sensitive data** inside the payload --- it's only
    encoded, not encrypted.

------------------------------------------------------------------------

## 🔍 Common JWT Errors

  ------------------------------------------------------------------------
  Error                  Meaning                          Fix
  ---------------------- -------------------------------- ----------------
  `jwt malformed`        Token format invalid             Check if the
                                                          token is
                                                          complete (3
                                                          parts).

  `jwt expired`          Token lifetime ended             Re-login or
                                                          refresh token.

  `invalid signature`    Tampered token                   Ensure same
                                                          secret key for
                                                          sign & verify.

  `no auth header`       Token missing                    Add token in
                                                          request header.
  ------------------------------------------------------------------------

------------------------------------------------------------------------

## 💡 Key Takeaways

-   JWTs are **stateless** --- no need to store sessions on server.
-   They are **signed, not encrypted** → data is visible if decoded.
-   Perfect for **modern APIs** where clients (React, Flutter, etc.)
    manage their own authentication state.
-   Always **validate and verify** before trusting a token.

------------------------------------------------------------------------

## 📦 Quick Recap Table

  ------------------------------------------------------------------------------------
  Part        Description          Encoded        Example Content
  ----------- -------------------- -------------- ------------------------------------
  Header      Algorithm & type     Base64         `{ "alg": "HS256", "typ": "JWT" }`

  Payload     User data & claims   Base64         `{ "id": "123", "role": "admin" }`

  Signature   Token verification   HMACSHA256     Secret-based hash
  ------------------------------------------------------------------------------------

------------------------------------------------------------------------

### 🚀 Summary

JWT is a lightweight, stateless authentication mechanism widely used in
**REST APIs** and **microservices**.\
It ensures secure client-server communication without constant database
checks, provided it's implemented with strong security practices.
