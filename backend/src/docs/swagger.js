import swaggerJsdoc from "swagger-jsdoc";
import { env } from "../config/env.js";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Javify API",
    version: "1.0.0",
    description:
      "OpenAPI specification for the Javify backend, including auth, challenge, user, and health endpoints.",
  },
  servers: [
    {
      url: `http://localhost:${env.PORT || 4000}`,
      description: "Local development server",
    },
    {
      url: "/",
      description: "Runtime environment",
    },
  ],
  tags: [
    { name: "Auth", description: "Authentication and OTP flows" },
    { name: "Users", description: "User profile and account APIs" },
    { name: "Challenges", description: "Coding challenge metadata APIs" },
    { name: "Health", description: "Service health checks" },
  ],
};

export const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: ["./src/routes/*.js", "./src/server.js"],
});
