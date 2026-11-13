const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../src/config/database");

jest.setTimeout(30000);

const API = "/api/v1";
const RUN_ID = `${Date.now()}`;
const TEST_PREFIX = `jest-category-${RUN_ID}`;

let adminToken;
let editorToken;
let authorToken;

let rootCategoryId;
let childCategoryId;
let duplicateCategoryId;

// Extract a category ID from an API response.
const getCategoryId = (data) => {
  if (!data || typeof data !== "object") {
    return null;
  }

  if (data.id && (data.name !== undefined || data.slug !== undefined)) {
    return data.id;
  }

  for (const value of Object.values(data)) {
    const result = getCategoryId(value);

    if (result) {
      return result;
    }
  }

  return null;
};

// Log in using one of the seeded accounts.
const login = async (email, password) => {
  const response = await request(app)
    .post(`${API}/auth/login`)
    .send({ email, password });

  expect(response.status).toBe(200);

  return response.body.data.accessToken;
};

// Create a category through the API.
const createCategory = async (token, name, slug, parentId) => {
  const categoryData = { name, slug };

  if (parentId !== undefined) {
    categoryData.parentId = parentId;
  }

  return request(app)
    .post(`${API}/categories`)
    .set("Authorization", `Bearer ${token}`)
    .send(categoryData);
};

describe("Categories API", () => {
  beforeAll(async () => {
    adminToken = await login(
      "admin@educms.local",
      process.env.SEED_ADMIN_PASSWORD,
    );

    editorToken = await login(
      "editor@educms.local",
      process.env.SEED_EDITOR_PASSWORD,
    );

    authorToken = await login(
      "author@educms.local",
      process.env.SEED_AUTHOR_PASSWORD,
    );
  });

  afterAll(async () => {
    // Delete only categories created during this test run.
    await pool.query("DELETE FROM categories WHERE slug LIKE $1", [
      `${TEST_PREFIX}-%`,
    ]);

    await pool.end();
  });

  describe("Authentication", () => {
    test("should reject requests without an access token", async () => {
      const response = await request(app).get(`${API}/categories`);

      expect(response.status).toBe(401);
    });
  });

  describe("Category creation", () => {
    test("should allow an admin to create a root category", async () => {
      const response = await createCategory(
        adminToken,
        `Root Category ${RUN_ID}`,
        `${TEST_PREFIX}-root`,
      );

      expect(response.status).toBe(201);

      rootCategoryId = getCategoryId(response.body.data);

      expect(rootCategoryId).toBeTruthy();
    });

    test("should allow an editor to create a child category", async () => {
      const response = await createCategory(
        editorToken,
        `Child Category ${RUN_ID}`,
        `${TEST_PREFIX}-child`,
        rootCategoryId,
      );

      expect(response.status).toBe(201);

      childCategoryId = getCategoryId(response.body.data);

      expect(childCategoryId).toBeTruthy();
    });

    test("should generate a unique slug when the slug already exists", async () => {
      const response = await createCategory(
        adminToken,
        `Duplicate Category ${RUN_ID}`,
        `${TEST_PREFIX}-root`,
      );

      expect(response.status).toBe(201);

      duplicateCategoryId = getCategoryId(response.body.data);

      expect(duplicateCategoryId).toBeTruthy();
      expect(response.body.data.slug).toBe(`${TEST_PREFIX}-root-2`);
    });

    test("should reject a category with a non-existent parent", async () => {
      const response = await createCategory(
        adminToken,
        `Invalid Parent ${RUN_ID}`,
        `${TEST_PREFIX}-invalid-parent`,
        999999999,
      );

      expect(response.status).toBe(400);
    });

    test("should prevent an author from creating a category", async () => {
      const response = await createCategory(
        authorToken,
        `Unauthorized Category ${RUN_ID}`,
        `${TEST_PREFIX}-unauthorized`,
      );

      expect(response.status).toBe(403);
    });
  });

  describe("Category retrieval", () => {
    test("should allow an authenticated user to retrieve the category list", async () => {
      const response = await request(app)
        .get(`${API}/categories`)
        .set("Authorization", `Bearer ${authorToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test("should retrieve a category by its ID", async () => {
      const response = await request(app)
        .get(`${API}/categories/${rootCategoryId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(getCategoryId(response.body.data)).toBe(rootCategoryId);
    });

    test("should return 404 for a category that does not exist", async () => {
      const response = await request(app)
        .get(`${API}/categories/999999999`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    test("should filter categories by parent ID", async () => {
      const response = await request(app)
        .get(`${API}/categories?parentId=${rootCategoryId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      expect(
        response.body.data.some(
          (category) => Number(category.id) === Number(childCategoryId),
        ),
      ).toBe(true);
    });

    test("should retrieve only root categories when parentId is null", async () => {
      const response = await request(app)
        .get(`${API}/categories?parentId=null`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      expect(
        response.body.data.every((category) => category.parent_id === null),
      ).toBe(true);
    });

    test("should support pagination and search", async () => {
      const response = await request(app)
        .get(`${API}/categories?page=1&limit=5&search=${RUN_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe("Category updates and permissions", () => {
    test("should allow an editor to update a category", async () => {
      const response = await request(app)
        .patch(`${API}/categories/${rootCategoryId}`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({
          name: `Updated Root Category ${RUN_ID}`,
        });

      expect(response.status).toBe(200);
    });

    test("should reject assigning a category as its own parent", async () => {
      const response = await request(app)
        .patch(`${API}/categories/${rootCategoryId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          parentId: rootCategoryId,
        });

      expect(response.status).toBe(400);
    });

    test("should reject an update that creates a circular hierarchy", async () => {
      const response = await request(app)
        .patch(`${API}/categories/${rootCategoryId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          parentId: childCategoryId,
        });

      expect(response.status).toBe(400);
    });

    test("should prevent an author from updating a category", async () => {
      const response = await request(app)
        .patch(`${API}/categories/${rootCategoryId}`)
        .set("Authorization", `Bearer ${authorToken}`)
        .send({
          name: "Unauthorized update",
        });

      expect(response.status).toBe(403);
    });
  });

  describe("Category deletion and permissions", () => {
    test("should prevent an author from deleting a category", async () => {
      const response = await request(app)
        .delete(`${API}/categories/${duplicateCategoryId}`)
        .set("Authorization", `Bearer ${authorToken}`);

      expect(response.status).toBe(403);
    });

    test("should allow an admin to delete a parent category", async () => {
      const response = await request(app)
        .delete(`${API}/categories/${rootCategoryId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    test("should keep the child category and remove its parent reference", async () => {
      const response = await request(app)
        .get(`${API}/categories/${childCategoryId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.parent_id).toBeNull();
    });
  });
});
