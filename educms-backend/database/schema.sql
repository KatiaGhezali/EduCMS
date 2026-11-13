-- ==========================================
-- 1. USERS
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,

    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    first_name VARCHAR(100),
    last_name VARCHAR(100),

    role VARCHAR(20) NOT NULL DEFAULT 'subscriber'
        CHECK (role IN ('admin', 'editor', 'author', 'subscriber')),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx
ON users (LOWER(username));

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx
ON users (LOWER(email));

-- ==========================================
-- 1.1 REFRESH TOKENS
-- ==========================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    token_hash VARCHAR(64) NOT NULL UNIQUE,

    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Find refresh tokens belonging to a user
CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx
ON refresh_tokens (user_id);

-- Find expired tokens when performing cleanup
CREATE INDEX IF NOT EXISTS refresh_tokens_expires_at_idx
ON refresh_tokens (expires_at);

-- ==========================================
-- 2. CATEGORIES
-- ==========================================

CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,

    parent_id BIGINT REFERENCES categories(id)
        ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. MEDIA
-- ==========================================

CREATE TABLE IF NOT EXISTS media (
    id BIGSERIAL PRIMARY KEY,

    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,

    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size >= 0),

    alt_text VARCHAR(255),

    uploaded_by BIGINT REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. POSTS
-- ==========================================

CREATE TABLE IF NOT EXISTS posts (
    id BIGSERIAL PRIMARY KEY,

    title VARCHAR(255) NOT NULL,
    slug VARCHAR(280) NOT NULL UNIQUE,

    excerpt TEXT,
    content TEXT NOT NULL,

    author_id BIGINT NOT NULL REFERENCES users(id)
        ON DELETE RESTRICT,

    category_id BIGINT REFERENCES categories(id)
        ON DELETE SET NULL,

    featured_media_id BIGINT REFERENCES media(id)
        ON DELETE SET NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),

    meta_title VARCHAR(255),
    meta_description VARCHAR(500),

    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    comments_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    view_count BIGINT NOT NULL DEFAULT 0
        CHECK (view_count >= 0),

    reading_time INTEGER NOT NULL DEFAULT 1
        CHECK (reading_time > 0),

    published_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT published_posts_require_date
        CHECK (status <> 'published' OR published_at IS NOT NULL)
);
-- ==========================================
-- 4.1 POST REVISIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS post_revisions (
    revision_id BIGSERIAL PRIMARY KEY,

    post_id BIGINT NOT NULL REFERENCES posts(id)
        ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    slug VARCHAR(280) NOT NULL,

    content TEXT NOT NULL,
    excerpt TEXT,

    category_id BIGINT REFERENCES categories(id)
        ON DELETE SET NULL,

    status VARCHAR(20) NOT NULL
        CHECK (status IN ('draft', 'published', 'archived')),

    published_at TIMESTAMP WITH TIME ZONE,

    revision_number INTEGER NOT NULL
        CHECK (revision_number > 0),

    created_by BIGINT REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_post_revision
        UNIQUE (post_id, revision_number)
);

-- Find revisions belonging to a post
CREATE INDEX IF NOT EXISTS post_revisions_post_id_idx
ON post_revisions(post_id);

-- Retrieve revisions by creation date
CREATE INDEX IF NOT EXISTS post_revisions_created_at_idx
ON post_revisions(created_at DESC);

-- ==========================================
-- 5. TAGS
-- ==========================================

CREATE TABLE IF NOT EXISTS tags (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. POST_TAGS
-- ==========================================

CREATE TABLE IF NOT EXISTS post_tags (
    post_id BIGINT NOT NULL REFERENCES posts(id)
        ON DELETE CASCADE,

    tag_id BIGINT NOT NULL REFERENCES tags(id)
        ON DELETE CASCADE,

    PRIMARY KEY (post_id, tag_id)
);

-- ==========================================
-- 7. COMMENTS
-- ==========================================

CREATE TABLE IF NOT EXISTS comments (
    id BIGSERIAL PRIMARY KEY,

    post_id BIGINT NOT NULL REFERENCES posts(id)
        ON DELETE CASCADE,

    user_id BIGINT NOT NULL REFERENCES users(id)
        ON DELETE RESTRICT,

    parent_id BIGINT REFERENCES comments(id)
        ON DELETE SET NULL,

    content TEXT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT comment_cannot_parent_itself
        CHECK (parent_id IS NULL OR parent_id <> id)
);

-- ==========================================
-- 8. ACTIVITY LOG
-- ==========================================

CREATE TABLE IF NOT EXISTS activity_log (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT REFERENCES users(id)
        ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,

    entity_type VARCHAR(50),
    entity_id BIGINT,

    details JSONB NOT NULL DEFAULT '{}'::JSONB,

    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- 9. DATABASE INDEXES
-- ==========================================

-- Users
CREATE INDEX IF NOT EXISTS users_role_idx
ON users(role);

CREATE INDEX IF NOT EXISTS users_active_idx
ON users(is_active);

-- Categories
CREATE INDEX IF NOT EXISTS categories_parent_idx
ON categories(parent_id);

-- Posts
CREATE INDEX IF NOT EXISTS posts_author_idx
ON posts(author_id);

CREATE INDEX IF NOT EXISTS posts_category_idx
ON posts(category_id);

CREATE INDEX IF NOT EXISTS posts_status_idx
ON posts(status);

CREATE INDEX IF NOT EXISTS posts_published_at_idx
ON posts(published_at DESC);

CREATE INDEX IF NOT EXISTS posts_created_at_idx
ON posts(created_at DESC);

CREATE INDEX IF NOT EXISTS posts_featured_idx
ON posts(is_featured);

-- Post tags
CREATE INDEX IF NOT EXISTS post_tags_tag_idx
ON post_tags(tag_id);

-- Comments
CREATE INDEX IF NOT EXISTS comments_post_idx
ON comments(post_id);

CREATE INDEX IF NOT EXISTS comments_user_idx
ON comments(user_id);

CREATE INDEX IF NOT EXISTS comments_parent_idx
ON comments(parent_id);

CREATE INDEX IF NOT EXISTS comments_status_idx
ON comments(status);

-- Media
CREATE INDEX IF NOT EXISTS media_uploaded_by_idx
ON media(uploaded_by);

-- Activity log
CREATE INDEX IF NOT EXISTS activity_log_user_idx
ON activity_log(user_id);

CREATE INDEX IF NOT EXISTS activity_log_action_idx
ON activity_log(action);

CREATE INDEX IF NOT EXISTS activity_log_entity_idx
ON activity_log(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS activity_log_created_at_idx
ON activity_log(created_at DESC);

-- ==========================================
-- 10. AUTOMATIC UPDATED_AT TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Categories
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Posts
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;

CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Comments
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;

CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 11. POST STATISTICS VIEW
-- ==========================================

CREATE OR REPLACE VIEW post_statistics AS
SELECT
    p.id AS post_id,
    p.title,
    p.slug,
    p.status,

    u.username AS author,

    c.name AS category,

    p.view_count,

    (
        SELECT COUNT(*)
        FROM comments cm
        WHERE cm.post_id = p.id
          AND cm.status = 'approved'
    ) AS comment_count,

    (
        SELECT COUNT(*)
        FROM post_tags pt
        WHERE pt.post_id = p.id
    ) AS tag_count,

    p.created_at,
    p.published_at

FROM posts p

JOIN users u ON p.author_id = u.id

LEFT JOIN categories c ON p.category_id = c.id;

-- ==========================================
-- 12. USER STATISTICS VIEW
-- ==========================================

CREATE OR REPLACE VIEW user_statistics AS
SELECT
    u.id AS user_id,
    u.username,
    u.email,
    u.role,
    u.is_active,

    COALESCE(p.total_posts, 0) AS total_posts,

    COALESCE(p.published_posts, 0) AS published_posts,

    COALESCE(p.total_views, 0) AS total_views,

    COALESCE(cm.total_comments, 0) AS total_comments

FROM users u

LEFT JOIN (
    SELECT
        author_id,

        COUNT(*) AS total_posts,

        COUNT(*) FILTER (
            WHERE status = 'published'
        ) AS published_posts,

        SUM(view_count) AS total_views

    FROM posts
    GROUP BY author_id
) p ON u.id = p.author_id

LEFT JOIN (
    SELECT
        user_id,
        COUNT(*) AS total_comments

    FROM comments
    GROUP BY user_id
) cm ON u.id = cm.user_id;

-- ==========================================
-- 13. CATEGORY POST COUNT FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION get_category_post_count(
    p_category_id BIGINT
)
RETURNS INTEGER AS $$
DECLARE
    total_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER
    INTO total_count
    FROM posts
    WHERE category_id = p_category_id;

    RETURN total_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 14. READING TIME FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION calculate_reading_time(
    post_content TEXT
)
RETURNS INTEGER AS $$
DECLARE
    word_count INTEGER;
    reading_minutes INTEGER;
BEGIN
    IF post_content IS NULL OR LENGTH(TRIM(post_content)) = 0 THEN
        RETURN 1;
    END IF;

    word_count := ARRAY_LENGTH(
        REGEXP_SPLIT_TO_ARRAY(TRIM(post_content), '\s+'),
        1
    );

    reading_minutes := CEIL(word_count::NUMERIC / 200);

    RETURN GREATEST(reading_minutes, 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==========================================
-- 15. INITIAL CATEGORIES
-- ==========================================

INSERT INTO categories (name, slug, description)
VALUES
    ('Programming', 'programming', 'Programming tutorials and resources.'),
    ('Database Management', 'database-management', 'Database concepts and tutorials.'),
    ('Study Resources', 'study-resources', 'Educational materials and study guides.')
ON CONFLICT (slug) DO NOTHING;


-- Subcategory
INSERT INTO categories (name, slug, description, parent_id)
SELECT
    'Web Development',
    'web-development',
    'Frontend and backend web development resources.',
    id
FROM categories
WHERE slug = 'programming'
ON CONFLICT (slug) DO NOTHING;


-- ==========================================
-- 16. INITIAL TAGS
-- ==========================================

INSERT INTO tags (name, slug)
VALUES
    ('JavaScript', 'javascript'),
    ('React', 'react'),
    ('Node.js', 'nodejs'),
    ('PostgreSQL', 'postgresql'),
    ('Tutorial', 'tutorial'),
    ('Announcements', 'announcements')
ON CONFLICT (slug) DO NOTHING;