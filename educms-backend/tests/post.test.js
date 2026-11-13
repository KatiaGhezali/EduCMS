const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../src/config/database");

jest.setTimeout(30000);

const API = "/api/v1";
const RUN_ID = `${Date.now()}`;
const TEST_PREFIX = `jest-post-${RUN_ID}`;

let adminToken;
let editorToken;
let authorToken;

let authorPostId;
let adminPostId;

// Extract the post ID from the API response.
const getPostId = (data) => {
  if (!data || typeof data !== "object") {
    return null;
  }

  if (data.id && (data.title !== undefined || data.slug !== undefined)) {
    return data.id;
  }

  for (const value of Object.values(data)) {
    const result = getPostId(value);

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

// Create a post through the API.
const createPost = async (token, role) => {
  const response = await request(app)
    .post(`${API}/posts`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: `Jest ${role} Post ${RUN_ID}`,
      slug: `${TEST_PREFIX}-${role}`,
      content: `Test content created by the ${role} account.`,
      excerpt: "Post created during automated API testing.",
      status: "draft",
    });

  return response;
};

describe("Posts API", () => {
  beforeAll(async () => {
    // Authenticate using the existing seeded accounts.
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
    // Delete only posts created by this test run.
    await pool.query("DELETE FROM posts WHERE slug LIKE $1", [
      `${TEST_PREFIX}-%`,
    ]);

    await pool.end();
  });

  describe("Authentication", () => {
    test("should reject requests without an access token", async () => {
      const response = await request(app).get(`${API}/posts`);

      expect(response.status).toBe(401);
    });
  });

  describe("Post creation", () => {
    test("should allow an author to create a draft post", async () => {
      const response = await createPost(authorToken, "author");

      expect(response.status).toBe(201);

      authorPostId = getPostId(response.body.data);

      expect(authorPostId).toBeTruthy();
    });

    test("should allow an admin to create a post", async () => {
      const response = await createPost(adminToken, "admin");

      expect(response.status).toBe(201);

      adminPostId = getPostId(response.body.data);

      expect(adminPostId).toBeTruthy();
    });
  });

  describe("Post retrieval", () => {
    test("should allow an author to retrieve their own draft", async () => {
      const response = await request(app)
        .get(`${API}/posts/${authorPostId}`)
        .set("Authorization", `Bearer ${authorToken}`);

      expect(response.status).toBe(200);
    });

    test("should allow an admin to retrieve another user's post", async () => {
      const response = await request(app)
        .get(`${API}/posts/${authorPostId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    test("should allow an authenticated user to retrieve the posts list", async () => {
      const response = await request(app)
        .get(`${API}/posts`)
        .set("Authorization", `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
    });
    test("should hide other authors' draft posts from the posts list", async () => {
      const response = await request(app)
        .get(`${API}/posts`)
        .set("Authorization", `Bearer ${authorToken}`);

      expect(response.status).toBe(200);

      const posts = response.body.data;

      // The author should see their own draft.
      expect(posts.some((post) => post.id === authorPostId)).toBe(true);

      // The author should not see another author's draft.
      expect(posts.some((post) => post.id === adminPostId)).toBe(false);
    });
  });

  describe("Post updates and permissions", () => {
    test("should prevent an author from updating another user's post", async () => {
      const response = await request(app)
        .patch(`${API}/posts/${adminPostId}`)
        .set("Authorization", `Bearer ${authorToken}`)
        .send({
          title: "Unauthorized update attempt",
        });

      expect(response.status).toBe(403);
    });

    test("should allow an editor to update a post", async () => {
      const response = await request(app)
        .patch(`${API}/posts/${authorPostId}`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({
          title: `Updated by editor ${RUN_ID}`,
        });

      expect(response.status).toBe(200);
    });
  });

  describe("Post deletion and permissions", () => {
    test("should prevent an author from deleting another user's post", async () => {
      const response = await request(app)
        .delete(`${API}/posts/${adminPostId}`)
        .set("Authorization", `Bearer ${authorToken}`);

      expect(response.status).toBe(403);
    });

    test("should allow an admin to delete a post", async () => {
      const response = await request(app)
        .delete(`${API}/posts/${authorPostId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });
});
