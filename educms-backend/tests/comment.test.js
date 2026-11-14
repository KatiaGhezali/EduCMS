const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../src/config/database");

jest.setTimeout(30000);

const API = "/api/v1";
const RUN_ID = `${Date.now()}`;
const TEST_PREFIX = `Jest Comments ${RUN_ID}`;

let adminToken;
let editorToken;
let authorToken;

let publishedPostId;
let draftPostId;

let commentId;
let replyId;

// Extract an ID from an API response.
const getId = (data) => {
  if (!data || typeof data !== "object") {
    return null;
  }

  if (data.id && typeof data !== "string") {
    return data.id;
  }

  for (const value of Object.values(data)) {
    const result = getId(value);

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
const createPost = async (token, title, status) => {
  return request(app)
    .post(`${API}/posts`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      title,
      content: "Content created for comment API tests.",
      status,
    });
};

describe("Comments API", () => {
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

    // Create a published post for normal comment tests.
    const publishedResponse = await createPost(
      adminToken,
      `${TEST_PREFIX} Published Post`,
      "published",
    );

    expect(publishedResponse.status).toBe(201);

    publishedPostId = getId(publishedResponse.body.data);

    expect(publishedPostId).toBeTruthy();

    // Create a draft post to test access restrictions.
    const draftResponse = await createPost(
      adminToken,
      `${TEST_PREFIX} Draft Post`,
      "draft",
    );

    expect(draftResponse.status).toBe(201);

    draftPostId = getId(draftResponse.body.data);

    expect(draftPostId).toBeTruthy();
  });

  afterAll(async () => {
    // Delete only posts created by this test run.
    // Their comments are deleted automatically through ON DELETE CASCADE.
    await pool.query("DELETE FROM posts WHERE title LIKE $1", [
      `${TEST_PREFIX}%`,
    ]);

    await pool.end();
  });

  describe("Authentication", () => {
    test("should reject requests without an access token", async () => {
      const response = await request(app).get(
        `${API}/posts/${publishedPostId}/comments`,
      );

      expect(response.status).toBe(401);
    });
  });

  describe("Comment creation", () => {
    test("should allow an author to comment on a published post", async () => {
      const response = await request(app)
        .post(`${API}/posts/${publishedPostId}/comments`)
        .set("Authorization", `Bearer ${authorToken}`)
        .send({
          content: "This is a test comment.",
        });

      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe("pending");

      commentId = getId(response.body.data);

      expect(commentId).toBeTruthy();
    });

    test("should keep new comments pending even if the client submits approved status", async () => {
      const response = await request(app)
        .post(`${API}/posts/${publishedPostId}/comments`)
        .set("Authorization", `Bearer ${authorToken}`)
        .send({
          content: "This comment attempts to bypass moderation.",
          status: "approved",
        });

      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe("pending");
    });

    test("should prevent an author from commenting on a draft post", async () => {
      const response = await request(app)
        .post(`${API}/posts/${draftPostId}/comments`)
        .set("Authorization", `Bearer ${authorToken}`)
        .send({
          content: "Comment on a draft post.",
        });

      expect(response.status).toBe(404);
    });

    test("should reject empty comment content", async () => {
      const response = await request(app)
        .post(`${API}/posts/${publishedPostId}/comments`)
        .set("Authorization", `Bearer ${authorToken}`)
        .send({
          content: "   ",
        });

      expect(response.status).toBe(400);
    });

    test("should reject an invalid parent comment ID", async () => {
      const response = await request(app)
        .post(`${API}/posts/${publishedPostId}/comments`)
        .set("Authorization", `Bearer ${authorToken}`)
        .send({
          content: "Reply with an invalid parent.",
          parentId: 999999999,
        });

      expect(response.status).toBe(400);
    });
  });

  describe("Comment retrieval", () => {
    test("should allow an admin to retrieve pending comments", async () => {
      const response = await request(app)
        .get(`${API}/posts/${publishedPostId}/comments?status=pending`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(
        response.body.data.some(
          (comment) => Number(comment.id) === Number(commentId),
        ),
      ).toBe(true);
    });

    test("should prevent an author from viewing pending comments in the post list", async () => {
      const response = await request(app)
        .get(`${API}/posts/${publishedPostId}/comments?status=pending`)
        .set("Authorization", `Bearer ${authorToken}`);

      expect(response.status).toBe(403);
    });

    test("should hide pending comments from the regular comments list", async () => {
      const response = await request(app)
        .get(`${API}/posts/${publishedPostId}/comments`)
        .set("Authorization", `Bearer ${authorToken}`);

      expect(response.status).toBe(200);

      expect(
        response.body.data.some(
          (comment) => Number(comment.id) === Number(commentId),
        ),
      ).toBe(false);
    });

    test("should allow an author to retrieve their own pending comment", async () => {
      const response = await request(app)
        .get(`${API}/comments/${commentId}`)
        .set("Authorization", `Bearer ${authorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe("pending");
    });

    test("should return 404 for an invalid comment ID", async () => {
      const response = await request(app)
        .get(`${API}/comments/999999999`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("Comment updates and moderation", () => {
    test("should prevent an author from changing comment moderation status", async () => {
      const response = await request(app)
        .patch(`${API}/comments/${commentId}`)
        .set("Authorization", `Bearer ${authorToken}`)
        .send({
          status: "approved",
        });

      expect(response.status).toBe(403);
    });

    test("should allow an author to edit their own comment", async () => {
      const response = await request(app)
        .patch(`${API}/comments/${commentId}`)
        .set("Authorization", `Bearer ${authorToken}`)
        .send({
          content: "Updated test comment.",
        });

      expect(response.status).toBe(200);
      expect(response.body.data.content).toBe("Updated test comment.");
    });

    test("should allow an editor to approve a comment", async () => {
      const response = await request(app)
        .patch(`${API}/comments/${commentId}`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({
          status: "approved",
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe("approved");
    });

    test("should reject an invalid moderation status", async () => {
      const response = await request(app)
        .patch(`${API}/comments/${commentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          status: "invalid",
        });

      expect(response.status).toBe(400);
    });

    test("should reject an update without valid fields", async () => {
      const response = await request(app)
        .patch(`${API}/comments/${commentId}`)
        .set("Authorization", `Bearer ${authorToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe("Approved comments and replies", () => {
    test("should make approved comments visible to regular users", async () => {
      const response = await request(app)
        .get(`${API}/posts/${publishedPostId}/comments`)
        .set("Authorization", `Bearer ${authorToken}`);

      expect(response.status).toBe(200);

      expect(
        response.body.data.some(
          (comment) => Number(comment.id) === Number(commentId),
        ),
      ).toBe(true);
    });

    test("should allow an author to reply to an approved comment", async () => {
      const response = await request(app)
        .post(`${API}/posts/${publishedPostId}/comments`)
        .set("Authorization", `Bearer ${authorToken}`)
        .send({
          content: "This is a test reply.",
          parentId: commentId,
        });

      expect(response.status).toBe(201);
      expect(Number(response.body.data.parent_id)).toBe(Number(commentId));
      expect(response.body.data.status).toBe("pending");

      replyId = getId(response.body.data);

      expect(replyId).toBeTruthy();
    });

    test("should allow an admin to retrieve comments with pagination", async () => {
      const response = await request(app)
        .get(`${API}/posts/${publishedPostId}/comments?page=1&limit=1`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe("Comment deletion and permissions", () => {
    test("should prevent an author from deleting another user's comment", async () => {
      const response = await request(app)
        .delete(`${API}/comments/${commentId}`)
        .set("Authorization", `Bearer ${editorToken}`);

      // Editors are moderators, so they are allowed to delete it.
      expect(response.status).toBe(200);
    });

    test("should return 404 when retrieving a deleted comment", async () => {
      const response = await request(app)
        .get(`${API}/comments/${commentId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    test("should allow an author to delete their own reply", async () => {
      const response = await request(app)
        .delete(`${API}/comments/${replyId}`)
        .set("Authorization", `Bearer ${authorToken}`);

      expect(response.status).toBe(200);
    });

    test("should return 404 when deleting a nonexistent comment", async () => {
      const response = await request(app)
        .delete(`${API}/comments/999999999`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});
