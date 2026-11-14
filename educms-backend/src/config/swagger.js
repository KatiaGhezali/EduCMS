const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "EduCMS API",
      version: "1.0.0",
      description:
        "REST API documentation for the EduCMS content management system.",
    },

    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}/api/${process.env.API_VERSION || "v1"}`,
        description: "Local development server",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT access token.",
        },
      },
    },
  },

  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
