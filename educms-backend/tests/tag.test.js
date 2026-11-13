const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../src/config/database");

jest.setTimeout(30000);

const API = "/api/v1";
const RUN_ID = `${Date.now()}`;
const TEST_PREFIX = `jest-tag-${RUN_ID}`;

let adminToken;
let editorToken;
let authorToken;

let generatedTagId;
let editorTagId;
let duplicateTagId;

// Extract a tag ID from an API response.
const getTagId = (data) => {
  if (!data || typeof data !== "object") {
    return null;
  }

  if (data.id && (data.name !== undefined || data.slug !== undefined)) {
    return data.id;
  }

  for (const value of Object.values(data)) {
    const result = getTagId(value);

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

// Create a tag through the API.
const createTag = async (token, name, slug) => {
  const tagData = { name };

  if (slug !== undefined) {
    tagData.slug = slug;
  }

  return request(app)
    .post(`${API}/tags`)
    .set("Authorization", `Bearer ${token}`)
    .send(tagData);
};

describe("Tags API", () => {
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
    // Delete only tags created during this test run.
    await pool.query("DELETE FROM tags WHERE slug LIKE $1", [
      `${TEST_PREFIX}-%`,
    ]);

    await pool.end();
  });

  describe("Authentication", () => {
    test("should reject requests without an access token", async () => {
      const response = await request(app).get(`${API}/tags`);

      expect(response.status).toBe(401);
    });
  });

  describe("Tag creation", () => {
    test("should allow an admin to create a tag and generate its slug", async () => {
      const response = await createTag(
        adminToken,
        `${TEST_PREFIX} Generated Tag`,
      );

      expect(response.status).toBe(201);

      generatedTagId = getTagId(response.body.data);

      expect(generatedTagId).toBeTruthy();
      expect(response.body.data.slug).toBe(`${TEST_PREFIX}-generated-tag`);
    });

    test("should allow an editor to create a tag with a provided slug", async () => {
      const response = await createTag(
        editorToken,
        `${TEST_PREFIX} Editor Tag`,
        `${TEST_PREFIX}-editor`,
      );

      expect(response.status).toBe(201);

      editorTagId = getTagId(response.body.data);

      expect(editorTagId).toBeTruthy();
      expect(response.body.data.slug).toBe(`${TEST_PREFIX}-editor`);
    });

    test("should generate a unique slug when the slug already exists", async () => {
      const response = await createTag(
        adminToken,
        `${TEST_PREFIX} Duplicate Slug`,
        `${TEST_PREFIX}-editor`,
      );

      expect(response.status).toBe(201);

      duplicateTagId = getTagId(response.body.data);

      expect(duplicateTagId).toBeTruthy();
      expect(response.body.data.slug).toBe(`${TEST_PREFIX}-editor-2`);
    });

    test("should reject a tag with a duplicate name", async () => {
      const response = await createTag(
        adminToken,
        `${TEST_PREFIX} Editor Tag`,
        `${TEST_PREFIX}-another-slug`,
      );

      expect(response.status).toBe(409);
    });

    test("should prevent an author from creating a tag", async () => {
      const response = await createTag(
        authorToken,
        `${TEST_PREFIX} Unauthorized Tag`,
      );

      expect(response.status).toBe(403);
    });
  });

  describe("Tag retrieval", () => {
    test("should allow an authenticated user to retrieve the tag list", async () => {
      const response = await request(app)
        .get(`${API}/tags`)
        .set("Authorization", `Bearer ${authorToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test("should retrieve a tag by its ID", async () => {
      const response = await request(app)
        .get(`${API}/tags/${generatedTagId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(getTagId(response.body.data)).toBe(generatedTagId);
    });

    test("should return 404 for a tag that does not exist", async () => {
      const response = await request(app)
        .get(`${API}/tags/999999999`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    test("should support pagination and search", async () => {
      const response = await request(app)
        .get(`${API}/tags?page=1&limit=5&search=${RUN_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);

      expect(
        response.body.data.every((tag) =>
          tag.name.toLowerCase().includes(RUN_ID.toLowerCase()),
        ),
      ).toBe(true);
    });
  });

  describe("Tag updates and permissions", () => {
    test("should allow an editor to update a tag", async () => {
      const response = await request(app)
        .patch(`${API}/tags/${generatedTagId}`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({
          name: `${TEST_PREFIX} Updated Tag`,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(`${TEST_PREFIX} Updated Tag`);
      expect(response.body.data.slug).toBe(`${TEST_PREFIX}-updated-tag`);
    });

    test("should reject an update without valid fields", async () => {
      const response = await request(app)
        .patch(`${API}/tags/${generatedTagId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    test("should prevent an author from updating a tag", async () => {
      const response = await request(app)
        .patch(`${API}/tags/${generatedTagId}`)
        .set("Authorization", `Bearer ${authorToken}`)
        .send({
          name: "Unauthorized update",
        });

      expect(response.status).toBe(403);
    });
  });

  describe("Tag deletion and permissions", () => {
    test("should prevent an author from deleting a tag", async () => {
      const response = await request(app)
        .delete(`${API}/tags/${duplicateTagId}`)
        .set("Authorization", `Bearer ${authorToken}`);

      expect(response.status).toBe(403);
    });

    test("should allow an admin to delete a tag", async () => {
      const response = await request(app)
        .delete(`${API}/tags/${duplicateTagId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    test("should return 404 when deleting a non-existent tag", async () => {
      const response = await request(app)
        .delete(`${API}/tags/999999999`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});
