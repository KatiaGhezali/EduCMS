import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import ReplyOutlinedIcon from "@mui/icons-material/ReplyOutlined";

import { getPostById } from "../../services/postService";
import {
  getCommentsByPost,
  createComment,
} from "../../services/commentService";

import { useAuth } from "../../context/AuthContext";

// Display a comment and its nested replies.
function CommentThread({
  comment,
  canComment,
  onReply,
  getCommentAuthor,
  formatCommentDate,
}) {
  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography fontWeight={600}>{getCommentAuthor(comment)}</Typography>

          <Typography variant="caption" color="text.secondary">
            {formatCommentDate(comment.created_at)}
          </Typography>
        </Box>

        {canComment && (
          <Button
            size="small"
            startIcon={<ReplyOutlinedIcon />}
            onClick={() => onReply(comment)}
            sx={{ textTransform: "none" }}
          >
            Reply
          </Button>
        )}
      </Box>

      <Typography
        variant="body1"
        sx={{
          mt: 1,
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          lineHeight: 1.7,
        }}
      >
        {comment.content}
      </Typography>

      {comment.replies?.length > 0 && (
        <Box
          sx={{
            ml: { xs: 2, sm: 4 },
            mt: 2,
            pl: 2,
            borderLeft: "2px solid",
            borderColor: "divider",
          }}
        >
          <Stack spacing={2}>
            {comment.replies.map((reply) => (
              <CommentThread
                key={reply.id}
                comment={reply}
                canComment={canComment}
                onReply={onReply}
                getCommentAuthor={getCommentAuthor}
                formatCommentDate={formatCommentDate}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

function PostDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isModerator = ["admin", "editor"].includes(user?.role);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Comments
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [totalComments, setTotalComments] = useState(0);

  // Comment form
  const [commentContent, setCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentMessage, setCommentMessage] = useState(null);

  // Reply form
  const [replyTo, setReplyTo] = useState(null);

  // Retrieve the post
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError("");

        const postData = await getPostById(id);
        setPost(postData);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load this post. It may not exist or you may not have permission to read it.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  // Retrieve approved comments for this post
  useEffect(() => {
    const fetchComments = async () => {
      if (!post) return;

      // Regular users can only retrieve comments on published posts.
      if (post.status !== "published" && !isModerator) {
        setComments([]);
        setTotalComments(0);
        return;
      }

      try {
        setLoadingComments(true);
        setCommentsError("");

        const response = await getCommentsByPost(id, {
          page: 1,
          limit: 100,
          status: "approved",
        });

        setComments(response.comments || []);
        setTotalComments(response.totalComments || 0);
      } catch (err) {
        setCommentsError(
          err.response?.data?.message || "Unable to load comments.",
        );
      } finally {
        setLoadingComments(false);
      }
    };

    fetchComments();
  }, [id, post, isModerator]);

  const formatDate = (date) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCommentDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCommentAuthor = (comment) => {
    const fullName =
      `${comment.first_name || ""} ${comment.last_name || ""}`.trim();

    return fullName || comment.username || "Unknown user";
  };

  // Submit a new comment or reply
  const handleSubmitComment = async (event) => {
    event.preventDefault();

    if (!commentContent.trim()) return;

    try {
      setSubmittingComment(true);
      setCommentMessage(null);

      const commentData = {
        content: commentContent.trim(),
      };

      if (replyTo) {
        commentData.parentId = replyTo.id;
      }

      await createComment(id, commentData);

      setCommentContent("");
      setReplyTo(null);

      setCommentMessage({
        severity: "success",
        text: "Your comment has been submitted and is awaiting moderator approval.",
      });
    } catch (err) {
      setCommentMessage({
        severity: "error",
        text:
          err.response?.data?.message ||
          "Unable to submit your comment. Please try again.",
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReplyClick = (comment) => {
    setReplyTo(comment);
    setCommentMessage(null);
    setCommentContent("");
  };

  const handleCancelReply = () => {
    setReplyTo(null);
    setCommentContent("");
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !post) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackOutlinedIcon />}
          onClick={() => navigate("/dashboard/posts")}
          sx={{ mb: 3, textTransform: "none" }}
        >
          Back to Posts
        </Button>

        <Alert severity="error">{error || "Post not found."}</Alert>
      </Box>
    );
  }

  const author =
    post.author?.username ||
    post.author?.name ||
    post.author ||
    post.author_name ||
    "Unknown author";

  const category =
    post.category?.name ||
    post.category ||
    post.category_name ||
    "Uncategorized";

  const commentsEnabled = post.comments_enabled !== false;

  const canComment =
    commentsEnabled && (post.status === "published" || isModerator);

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      <Button
        startIcon={<ArrowBackOutlinedIcon />}
        onClick={() => navigate("/dashboard/posts")}
        sx={{ mb: 3, textTransform: "none" }}
      >
        Back to Posts
      </Button>

      {/* Post content */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 5 },
          border: "1px solid #EAECF0",
          borderRadius: 3,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          sx={{ mb: 3 }}
        >
          <Chip label={category} color="primary" variant="outlined" />

          <Chip
            label={post.status}
            color={post.status === "published" ? "success" : "default"}
            size="small"
            sx={{ textTransform: "capitalize" }}
          />
        </Stack>

        <Typography
          variant="h3"
          component="h1"
          fontWeight={700}
          sx={{
            fontSize: { xs: "2rem", md: "2.5rem" },
            lineHeight: 1.2,
            mb: 2,
            overflowWrap: "anywhere",
          }}
        >
          {post.title}
        </Typography>

        {post.excerpt && (
          <Typography
            variant="h6"
            color="text.secondary"
            fontWeight={400}
            sx={{ mb: 3, lineHeight: 1.6 }}
          >
            {post.excerpt}
          </Typography>
        )}

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            mb: 4,
            color: "text.secondary",
          }}
        >
          <Typography variant="body2">By {author}</Typography>

          <Typography variant="body2">•</Typography>

          <Typography variant="body2">
            {formatDate(post.published_at || post.created_at)}
          </Typography>

          {post.reading_time && (
            <>
              <Typography variant="body2">•</Typography>
              <Typography variant="body2">
                {post.reading_time} min read
              </Typography>
            </>
          )}
        </Box>

        <Box
          sx={{
            borderTop: "1px solid #EAECF0",
            pt: 4,
          }}
        >
          <Typography
            component="div"
            variant="body1"
            sx={{
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              lineHeight: 1.9,
              fontSize: "1rem",
              color: "text.primary",
            }}
          >
            {post.content}
          </Typography>
        </Box>
      </Paper>

      {/* Comments section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Comments ({totalComments})
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Join the discussion and share your thoughts.
        </Typography>

        {!commentsEnabled ? (
          <Alert severity="info">Comments are disabled for this post.</Alert>
        ) : (
          <>
            {/* Comment form */}
            {canComment && (
              <Paper
                component="form"
                onSubmit={handleSubmitComment}
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  border: "1px solid #EAECF0",
                  borderRadius: 3,
                }}
              >
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  {replyTo
                    ? `Replying to ${getCommentAuthor(replyTo)}`
                    : "Leave a comment"}
                </Typography>

                {replyTo && (
                  <Button
                    size="small"
                    onClick={handleCancelReply}
                    sx={{ mb: 2, textTransform: "none" }}
                  >
                    Cancel reply
                  </Button>
                )}

                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  maxRows={8}
                  placeholder={
                    replyTo ? "Write your reply..." : "Share your thoughts..."
                  }
                  value={commentContent}
                  onChange={(event) => setCommentContent(event.target.value)}
                  inputProps={{ maxLength: 5000 }}
                />

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    mt: 2,
                  }}
                >
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SendOutlinedIcon />}
                    disabled={submittingComment || !commentContent.trim()}
                    sx={{ textTransform: "none" }}
                  >
                    {submittingComment
                      ? "Submitting..."
                      : replyTo
                        ? "Submit reply"
                        : "Submit comment"}
                  </Button>
                </Box>

                {commentMessage && (
                  <Alert severity={commentMessage.severity} sx={{ mt: 2 }}>
                    {commentMessage.text}
                  </Alert>
                )}
              </Paper>
            )}

            {!canComment && post.status !== "published" && (
              <Alert severity="info" sx={{ mb: 3 }}>
                Comments are available when this post is published.
              </Alert>
            )}

            {/* Existing approved comments */}
            <Paper
              elevation={0}
              sx={{
                border: "1px solid #EAECF0",
                borderRadius: 3,
                p: { xs: 2, sm: 3 },
              }}
            >
              {loadingComments ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    py: 4,
                  }}
                >
                  <CircularProgress size={28} />
                </Box>
              ) : commentsError ? (
                <Alert severity="error">{commentsError}</Alert>
              ) : comments.length === 0 ? (
                <Box sx={{ py: 3, textAlign: "center" }}>
                  <Typography color="text.secondary">
                    No comments yet. Be the first to share your thoughts!
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={3}>
                  {comments.map((comment) => (
                    <CommentThread
                      key={comment.id}
                      comment={comment}
                      canComment={canComment}
                      onReply={handleReplyClick}
                      getCommentAuthor={getCommentAuthor}
                      formatCommentDate={formatCommentDate}
                    />
                  ))}
                </Stack>
              )}
            </Paper>
          </>
        )}
      </Box>
    </Box>
  );
}

export default PostDetailsPage;
