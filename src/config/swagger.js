const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "NomaApp API",
      version: "1.0.0",
      description: "API documentation for NomaApp AI backend",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
    // components: {
    //   securitySchemes: {
    //     bearerAuth: {
    //       type: "http",
    //       scheme: "bearer",
    //       bearerFormat: "JWT",
    //     },
    //   },
    // },
    // security: [
    //   {
    //     bearerAuth: [],
    //   },
    // ],
  },
  apis: ["./src/modules/**/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;