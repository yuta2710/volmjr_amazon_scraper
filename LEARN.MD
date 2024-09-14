What I've learn in this project? 
# Authentication 
## Payload Concepts 
The payload in the context of a JWT (JSON Web Token) is an essential part of the token, and it holds the information (claims) about the user or entity being authenticated

1. What is the Payload in a JWT?
A JWT is composed of three parts:

Header: Contains metadata about the token, such as the type (JWT) and the algorithm used to sign the token (HS256, for example).
Payload: Contains the claims or the data. This could be anything you want to store in the token (e.g., userId, role, etc.).
Signature: Verifies the integrity of the token and ensures it wasn't tampered with.
For example, a decoded JWT payload might look like this:
```typescript
{
  "sub": "1234567890",
  "name": "John Doe",
  "role": "admin",
  "exp": 1726287105  // Expiration timestamp
}
```
2. Why Do We Need the Payload?
The payload contains crucial information about the authenticated user or entity. Here's why it's important:

a. Identifying the User
The payload often contains the user's id, email, or some identifier (sub or subject), which allows your backend to know who is making the request. Without this information, the backend can't associate the request with a specific user.

For example:
```typescript
{
  "sub": "user_id_123",
  "email": "user@example.com",
  "role": "user"
}
```
The payload informs the backend who is making the request, which can then be used to fetch user-specific data or perform actions on behalf of that user.

b. Authorization
The payload typically contains information about the user's role or permissions, which can be used to determine what actions the user is allowed to perform. For example:

```typescript
{
  "sub": "123",
  "role": "admin"
}
```
With this information in the payload, you can check if the user has the appropriate role to access certain resources or perform certain actions.

c. Token Expiry
Tokens have an expiration time, which is stored in the payload (usually as exp). This ensures that tokens are only valid for a limited amount of time, forcing users to re-authenticate after a certain period for security reasons.

For example:

```typescript
{
  "sub": "123",
  "exp": 1726287105
}
```

The exp claim helps the backend determine whether the token has expired and whether the user needs to re-authenticate.

d. Avoiding Additional Database Lookups
In some cases, the payload allows you to avoid having to query the database to get basic user information. If the JWT payload contains everything you need (e.g., user ID, role, etc.), you don't need to hit the database to retrieve that data again.

3. Example of Using the Payload
Here’s how the payload is used in your code:

```typescript
try {
  const payload: Token | jwt.JsonWebTokenError = await verifyToken(token);

  if(payload instanceof jwt.JsonWebTokenError) {
    return next(AppError.unauthorized("Invalid or expired token."));
  }

  // Extract user details from payload
  const userId = payload.sub; // assuming the user's ID is stored in `sub`

  // Use the userId to fetch additional user data or authorize actions
  // For example, fetch the user from your database or check their role
  const { data: { user } } = await supabase.auth.getUser();
  
  req.user = user;
  next();
} catch (error) {
  return next(AppError.badRequest("An error occurred during token verification."));
}
```
4. What Happens if We Don’t Use the Payload?
- Without the payload, you wouldn’t know which user is making the request or whether they are authorized to perform certain actions.
- You also wouldn’t know whether the token has expired, as the expiration time (exp) is stored in the payload.
- You would have to make additional database queries to fetch basic user information (such as userId, role, etc.), which could lead to performance issues.

# Conclusion
The payload is essential because it carries the information required to identify, authenticate, and authorize the user making the request. It also carries critical security information such as the token's expiration time, helping the backend determine if the token is still valid.

By extracting the payload from the JWT, you can perform actions like verifying the user's identity, checking their roles/permissions, and ensuring that the token hasn't expired—all of which are vital for securing your application's routes and resources.

## Seeder/dropper bash script 