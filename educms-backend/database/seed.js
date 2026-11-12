const path = require("path");

// Load environment variables
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const bcrypt = require("bcryptjs");
const { pool } = require("../src/config/database");

// Seed initial users
const seedUsers = async (client) => {
  const users = [
    {
      username: "admin",
      email: "admin@educms.local",
      password: process.env.SEED_ADMIN_PASSWORD,
      firstName: "System",
      lastName: "Administrator",
      role: "admin",
    },
    {
      username: "editor",
      email: "editor@educms.local",
      password: process.env.SEED_EDITOR_PASSWORD,
      firstName: "Content",
      lastName: "Editor",
      role: "editor",
    },
    {
      username: "author",
      email: "author@educms.local",
      password: process.env.SEED_AUTHOR_PASSWORD,
      firstName: "Content",
      lastName: "Author",
      role: "author",
    },
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);

    await client.query(
      `INSERT INTO users (
                username,
                email,
                password_hash,
                first_name,
                last_name,
                role,
                is_active,
                email_verified
            )
            VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)
            ON CONFLICT DO NOTHING`,
      [
        user.username,
        user.email,
        passwordHash,
        user.firstName,
        user.lastName,
        user.role,
      ],
    );
  }

  console.log("Initial users seeded successfully.");
};

// Seed initial posts
const seedPosts = async (client) => {
  const authorResult = await client.query(
    `SELECT id FROM users WHERE username = 'author'`,
  );

  const authorId = authorResult.rows[0].id;

  const programmingCategory = await client.query(
    `SELECT id FROM categories WHERE slug = 'programming'`,
  );

  const studyCategory = await client.query(
    `SELECT id FROM categories WHERE slug = 'study-resources'`,
  );

  const posts = [
    {
      title: "Getting Started with JavaScript",
      slug: "getting-started-with-javascript",
      excerpt: "An introduction to JavaScript and its fundamental concepts.",
      content:
        "JavaScript is a programming language used to create interactive websites. It allows developers to build dynamic web applications. Learning variables, functions, arrays, and objects provides a strong foundation for JavaScript development.",
      categoryId: programmingCategory.rows[0].id,
      metaTitle: "Getting Started with JavaScript",
      metaDescription: "Learn the fundamentals of JavaScript programming.",
    },
    {
      title: "Effective Study Techniques for Students",
      slug: "effective-study-techniques-for-students",
      excerpt:
        "Discover practical techniques to improve your learning and productivity.",
      content:
        "Effective studying requires organization, consistency, and active learning. Students can improve their results by setting clear goals, creating study schedules, taking regular breaks, and reviewing their notes. Practice and repetition also help strengthen long-term memory.",
      categoryId: studyCategory.rows[0].id,
      metaTitle: "Effective Study Techniques",
      metaDescription:
        "Explore practical study techniques for better learning.",
    },
  ];

  for (const post of posts) {
    const result = await client.query(
      `INSERT INTO posts (
                title,
                slug,
                excerpt,
                content,
                author_id,
                category_id,
                status,
                meta_title,
                meta_description,
                published_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'published', $7, $8, CURRENT_TIMESTAMP)
            ON CONFLICT (slug) DO NOTHING
            RETURNING id`,
      [
        post.title,
        post.slug,
        post.excerpt,
        post.content,
        authorId,
        post.categoryId,
        post.metaTitle,
        post.metaDescription,
      ],
    );

    if (result.rows.length > 0) {
      console.log(`Post created: ${post.title}`);
    }
  }

  console.log("Initial posts seeded successfully.");
};

// Associate posts with tags
const seedPostTags = async (client) => {
  const associations = [
    {
      postSlug: "getting-started-with-javascript",
      tagSlugs: ["javascript", "tutorial"],
    },
    {
      postSlug: "effective-study-techniques-for-students",
      tagSlugs: ["tutorial", "announcements"],
    },
  ];

  for (const association of associations) {
    const postResult = await client.query(
      "SELECT id FROM posts WHERE slug = $1",
      [association.postSlug],
    );

    if (postResult.rows.length === 0) {
      continue;
    }

    const postId = postResult.rows[0].id;

    for (const tagSlug of association.tagSlugs) {
      const tagResult = await client.query(
        "SELECT id FROM tags WHERE slug = $1",
        [tagSlug],
      );

      if (tagResult.rows.length === 0) {
        continue;
      }

      await client.query(
        `INSERT INTO post_tags (post_id, tag_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING`,
        [postId, tagResult.rows[0].id],
      );
    }
  }

  console.log("Post-tag associations seeded successfully.");
};

// Run the seed process
const runSeed = async () => {
  let client;

  try {
    // Validate seed passwords
    const passwords = [
      process.env.SEED_ADMIN_PASSWORD,
      process.env.SEED_EDITOR_PASSWORD,
      process.env.SEED_AUTHOR_PASSWORD,
    ];

    if (passwords.some((password) => !password || password.length < 12)) {
      throw new Error(
        "All three seed passwords must be configured and contain at least 12 characters.",
      );
    }

    console.log("Starting database seeding...");

    client = await pool.connect();

    await client.query("BEGIN");

    await seedUsers(client);
    await seedPosts(client);
    await seedPostTags(client);

    await client.query("COMMIT");

    console.log("Database seeding completed successfully!");
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }

    console.error("Database seeding failed:", error.message);

    process.exitCode = 1;
  } finally {
    if (client) {
      client.release();
    }

    await pool.end();
  }
};

runSeed();
